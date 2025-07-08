from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import uuid
import asyncio
from datetime import datetime
import os
from image_processor import ImageProcessor
from s3_manager import S3Manager
import tempfile
import shutil

app = FastAPI(title="Amazon FBA Image Optimizer", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize processors
s3_manager = S3Manager(bucket_name=os.getenv("AWS_S3_BUCKET", "amazon-fba-images"))
image_processor = ImageProcessor(s3_manager)

@app.get("/")
async def root():
    return {"message": "Amazon FBA Image Optimizer API"}

@app.post("/api/process-images")
async def process_images(files: List[UploadFile] = File(...)):
    """画像をアップロードして処理"""
    if len(files) > 8:
        raise HTTPException(status_code=400, detail="最大8枚までです")
    
    if not files:
        raise HTTPException(status_code=400, detail="画像ファイルが選択されていません")
    
    # Validate file types
    allowed_types = ["image/jpeg", "image/jpg", "image/png"]
    for file in files:
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400, 
                detail=f"サポートされていないファイル形式: {file.content_type}"
            )
    
    try:
        result = await image_processor.process_batch(files)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"画像処理エラー: {str(e)}")

@app.get("/api/batch/{batch_id}")
async def get_batch_info(batch_id: str):
    """バッチ情報を取得"""
    try:
        info = s3_manager.get_json(f"batches/{batch_id}/batch_info.json")
        return info
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"バッチが見つかりません: {str(e)}")

@app.get("/api/batch/{batch_id}/download-url")
async def get_download_url(batch_id: str):
    """バッチ一括ダウンロード用の署名付きURL生成"""
    try:
        zip_url = s3_manager.create_batch_download(batch_id)
        return {"download_url": zip_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ダウンロードURL生成エラー: {str(e)}")

@app.get("/api/health")
async def health_check():
    """ヘルスチェック"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)