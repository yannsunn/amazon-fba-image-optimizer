import { v2 as cloudinary } from 'cloudinary';
import type { CloudinaryUploadOptions, CloudinaryUploadResult, CloudinaryUsageLimit } from '../types/api';

// Cloudinary設定
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 使用量チェック
export async function checkUsageLimit() {
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
          width: options.width || 1500,
          height: options.height || 1500,
          crop: 'limit', // 最大サイズに制限
          quality: options.quality || 'auto:best', // 自動最高品質
          format: 'auto', // 最適なフォーマットを自動選択
          flags: 'progressive', // プログレッシブJPEG
          dpr: 'auto', // デバイスピクセル比自動調整
        },
      ],
      // Amazon商品画像用の最適化
      eager: [
        { width: 1000, height: 1000, crop: 'limit', quality: 'auto:best' }, // メイン画像
        { width: 500, height: 500, crop: 'limit', quality: 'auto:good' },  // サムネイル
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