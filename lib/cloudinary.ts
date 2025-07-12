import { v2 as cloudinary } from 'cloudinary';
import type { CloudinaryUploadOptions, CloudinaryUploadResult, CloudinaryUsageLimit } from '../types/api';

// Cloudinary設定を動的に行う
function getCloudinaryConfig() {
  // 環境変数を直接読み込む
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;
  
  console.log('Cloudinary config check:', {
    cloud_name_exists: !!cloud_name,
    api_key_exists: !!api_key,
    api_secret_exists: !!api_secret,
    cloud_name_length: cloud_name?.length || 0,
    api_key_length: api_key?.length || 0,
  });
  
  // 設定が有効か確認
  if (!cloud_name || !api_key || !api_secret) {
    const errorDetails = {
      cloud_name: cloud_name ? 'SET' : 'MISSING',
      api_key: api_key ? 'SET' : 'MISSING',
      api_secret: api_secret ? 'SET' : 'MISSING',
    };
    console.error('Cloudinary configuration missing:', errorDetails);
    throw new Error(`Cloudinary configuration is incomplete: ${JSON.stringify(errorDetails)}`);
  }
  
  return {
    cloud_name,
    api_key,
    api_secret,
  };
}

// 初期化関数
function initCloudinary() {
  try {
    const config = getCloudinaryConfig();
    cloudinary.config(config);
    return true;
  } catch (error) {
    console.error('Failed to initialize Cloudinary:', error);
    return false;
  }
}

// 使用量チェック
export async function checkUsageLimit() {
  // Cloudinaryを初期化
  if (!initCloudinary()) {
    throw new Error('Cloudinary initialization failed');
  }
  
  try {
    const usage = await cloudinary.api.usage();
    
    // 無料枠の制限
    const limits = {
      bandwidth: 25 * 1024 * 1024 * 1024, // 25GB
      storage: 25 * 1024 * 1024 * 1024, // 25GB
      transformations: 25000, // 月25,000回
    };
    
    const currentMonth = new Date().getMonth() + 1;
    const nextResetDate = new Date();
    nextResetDate.setMonth(nextResetDate.getMonth() + 1);
    nextResetDate.setDate(1);
    
    // 使用率を計算
    const bandwidthUsed = usage.bandwidth.used;
    const storageUsed = usage.storage.used;
    const transformationsUsed = usage.transformations.usage;
    
    const bandwidthPercentage = (bandwidthUsed / limits.bandwidth) * 100;
    const storagePercentage = (storageUsed / limits.storage) * 100;
    const transformationsPercentage = (transformationsUsed / limits.transformations) * 100;
    
    // 80%を超えたら警告
    if (bandwidthPercentage > 80 || storagePercentage > 80 || transformationsPercentage > 80) {
      return {
        isNearLimit: true,
        usage: {
          bandwidth: bandwidthPercentage,
          storage: storagePercentage,
          transformations: transformationsPercentage,
        },
        nextResetDate: nextResetDate.toLocaleDateString('ja-JP'),
      };
    }
    
    // 100%を超えたらエラー
    if (bandwidthPercentage >= 100 || storagePercentage >= 100 || transformationsPercentage >= 100) {
      return {
        isOverLimit: true,
        usage: {
          bandwidth: bandwidthPercentage,
          storage: storagePercentage,
          transformations: transformationsPercentage,
        },
        nextResetDate: nextResetDate.toLocaleDateString('ja-JP'),
      };
    }
    
    return {
      isNearLimit: false,
      isOverLimit: false,
      usage: {
        bandwidth: bandwidthPercentage,
        storage: storagePercentage,
        transformations: transformationsPercentage,
      },
    };
  } catch (error) {
    console.error('使用量チェックエラー:', error);
    return {
      isNearLimit: false,
      isOverLimit: false,
      usage: null,
    };
  }
}

// アップロード結果の型定義
interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  variants: {
    main?: string;
    thumbnail?: string;
  };
}

// 画像アップロードと最適化
export async function uploadAndOptimizeImage(
  file: Buffer,
  filename: string,
  options: {
    width?: number;
    height?: number;
    quality?: string;
  } = {}
): Promise<UploadResult> {
  // Cloudinaryを初期化
  if (!initCloudinary()) {
    throw new Error('Cloudinary initialization failed');
  }
  
  // 使用量チェック
  const usageCheck = await checkUsageLimit();
  
  if (usageCheck.isOverLimit) {
    throw new Error(
      `無料枠の使用量を超えました。次回リセット日: ${usageCheck.nextResetDate}\n` +
      `現在の使用状況:\n` +
      `・帯域幅: ${Math.round(usageCheck.usage?.bandwidth || 0)}%\n` +
      `・ストレージ: ${Math.round(usageCheck.usage?.storage || 0)}%\n` +
      `・変換回数: ${Math.round(usageCheck.usage?.transformations || 0)}%`
    );
  }
  
  return new Promise<UploadResult>((resolve, reject) => {
    const uploadOptions = {
      public_id: `amazon-fba/${filename}`,
      resource_type: 'image' as const,
      transformation: [
        {
          // Amazon FBA要件: 2000x2000px
          width: 2000,
          height: 2000,
          crop: 'fill', // 2000x2000にフィットするようにリサイズ
          gravity: 'center', // 中央を基準にクロップ
          quality: 95, // 高品質（95%）
          format: 'jpg', // JPEG形式で統一
          flags: ['progressive'], // プログレッシブJPEG
          // AI画質向上
          effect: 'sharpen:100', // シャープネス向上
          // ノイズ除去とエンハンス
          enhance: true,
        },
      ],
      // Amazon商品画像用の最適化バリエーション
      eager: [
        { 
          width: 2000, 
          height: 2000, 
          crop: 'fill', 
          gravity: 'center',
          quality: 95,
          format: 'jpg',
          flags: ['progressive'],
          effect: 'sharpen:100',
          enhance: true,
        }, // メイン画像（2000x2000）
        { 
          width: 1000, 
          height: 1000, 
          crop: 'fill', 
          gravity: 'center',
          quality: 90,
          format: 'jpg',
        },  // サムネイル（1000x1000）
      ],
    };
    
    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
            variants: {
              main: result.eager?.[0]?.secure_url,
              thumbnail: result.eager?.[1]?.secure_url,
            },
          });
        } else {
          reject(new Error('アップロード結果が取得できませんでした'));
        }
      }
    );
    
    stream.end(file);
  });
}

export default cloudinary;