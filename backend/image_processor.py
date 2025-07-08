import cv2
import numpy as np
from PIL import Image, ImageEnhance
import os
import uuid
import tempfile
import asyncio
from typing import List
from fastapi import UploadFile
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ImageProcessor:
    def __init__(self, s3_manager):
        self.s3_manager = s3_manager
        self.target_size = (2000, 2000)
        self.max_file_size = 10 * 1024 * 1024  # 10MB
        
    async def process_batch(self, files: List[UploadFile]) -> dict:
        """バッチで画像を処理"""
        batch_id = str(uuid.uuid4())
        processed_urls = []
        
        # 最大8枚に制限
        files = files[:8]
        
        logger.info(f"Processing batch {batch_id} with {len(files)} images")
        
        with tempfile.TemporaryDirectory() as temp_dir:
            for idx, file in enumerate(files):
                try:
                    # 1. 一時保存
                    temp_path = os.path.join(temp_dir, f"{batch_id}_{idx:02d}_{file.filename}")
                    content = await file.read()
                    
                    with open(temp_path, "wb") as f:
                        f.write(content)
                    
                    # 2. 画像処理
                    processed_path = await self._process_single_image(temp_path)
                    
                    # 3. S3にアップロード
                    s3_key = f"batches/{batch_id}/{idx:02d}_optimized.jpg"
                    s3_url = self.s3_manager.upload_file(processed_path, s3_key)
                    processed_urls.append(s3_url)
                    
                    logger.info(f"Processed image {idx+1}/{len(files)}: {file.filename}")
                    
                except Exception as e:
                    logger.error(f"Error processing image {idx}: {str(e)}")
                    raise
        
        # 4. バッチ情報を保存
        batch_info = {
            "batch_id": batch_id,
            "total_images": len(files),
            "processed_at": datetime.now().isoformat(),
            "image_urls": processed_urls,
            "status": "completed"
        }
        
        # バッチ情報をS3に保存
        self.s3_manager.save_json(
            f"batches/{batch_id}/batch_info.json",
            batch_info
        )
        
        logger.info(f"Batch {batch_id} completed successfully")
        return batch_info
    
    async def _process_single_image(self, image_path: str) -> str:
        """単一画像の処理"""
        try:
            # PIL Imageで読み込み
            with Image.open(image_path) as img:
                # RGBに変換
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # 画像強化処理
                enhanced_img = self._enhance_image(img)
                
                # リサイズ
                resized_img = self._resize_image(enhanced_img)
                
                # 出力パス
                output_path = image_path.replace('.', '_optimized.')
                if not output_path.endswith('.jpg'):
                    output_path = output_path.rsplit('.', 1)[0] + '.jpg'
                
                # 品質最適化しながら保存
                self._save_optimized(resized_img, output_path)
                
                return output_path
                
        except Exception as e:
            logger.error(f"Error processing image {image_path}: {str(e)}")
            raise
    
    def _enhance_image(self, img: Image.Image) -> Image.Image:
        """画像品質の向上"""
        # シャープネス向上
        enhancer = ImageEnhance.Sharpness(img)
        img = enhancer.enhance(1.2)
        
        # コントラスト向上
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(1.1)
        
        # 彩度向上
        enhancer = ImageEnhance.Color(img)
        img = enhancer.enhance(1.1)
        
        return img
    
    def _resize_image(self, img: Image.Image) -> Image.Image:
        """画像のリサイズ"""
        # アスペクト比を保持してリサイズ
        img.thumbnail(self.target_size, Image.Resampling.LANCZOS)
        
        # 正方形のキャンバスに配置
        canvas = Image.new('RGB', self.target_size, (255, 255, 255))
        
        # 中央に配置
        x = (self.target_size[0] - img.width) // 2
        y = (self.target_size[1] - img.height) // 2
        canvas.paste(img, (x, y))
        
        return canvas
    
    def _save_optimized(self, img: Image.Image, output_path: str):
        """最適化して保存"""
        # 品質を段階的に下げてファイルサイズを調整
        for quality in range(95, 69, -5):
            img.save(output_path, 'JPEG', 
                    quality=quality, 
                    optimize=True, 
                    progressive=True)
            
            # ファイルサイズチェック
            if os.path.getsize(output_path) <= self.max_file_size:
                logger.info(f"Saved with quality {quality}, size: {os.path.getsize(output_path)/1024/1024:.1f}MB")
                break
        else:
            # 最低品質でも大きすぎる場合は警告
            logger.warning(f"Image still too large: {os.path.getsize(output_path)/1024/1024:.1f}MB")
    
    def _apply_upscaling(self, img: Image.Image) -> Image.Image:
        """簡易超解像処理（Real-ESRGANの代替）"""
        # OpenCVを使用した簡易超解像
        img_cv = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
        
        # エッジ保持スムージング
        img_cv = cv2.bilateralFilter(img_cv, 9, 75, 75)
        
        # アンシャープマスク
        gaussian = cv2.GaussianBlur(img_cv, (0, 0), 2.0)
        img_cv = cv2.addWeighted(img_cv, 1.5, gaussian, -0.5, 0)
        
        # PIL Imageに戻す
        return Image.fromarray(cv2.cvtColor(img_cv, cv2.COLOR_BGR2RGB))