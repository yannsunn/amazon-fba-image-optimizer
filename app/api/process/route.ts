import { NextRequest, NextResponse } from 'next/server';
import { uploadAndOptimizeImage, checkUsageLimit } from '@/lib/cloudinary';
import {
  validateFileSize,
  validateFileType,
  checkRateLimit,
  getClientIp,
  SECURITY_CONFIG,
  getSecurityHeaders,
} from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    // レート制限チェック
    const clientIp = getClientIp(request);
    const rateLimitCheck = checkRateLimit(clientIp);
    
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { 
          error: 'レート制限エラー',
          message: `リクエストが多すぎます。${rateLimitCheck.retryAfter}秒後に再試行してください。`
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(rateLimitCheck.retryAfter),
            ...getSecurityHeaders(),
          },
        }
      );
    }
    // Cloudinary認証情報チェック
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json(
        { 
          error: 'Cloudinary設定エラー',
          message: 'Vercelの環境変数にCloudinaryの認証情報を設定してください。'
        },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll('images') as File[];
    
    if (files.length === 0) {
      return NextResponse.json(
        { error: '画像ファイルが選択されていません。' },
        { status: 400, headers: getSecurityHeaders() }
      );
    }
    
    // ファイル数チェック
    if (files.length > SECURITY_CONFIG.maxConcurrentUploads) {
      return NextResponse.json(
        { 
          error: 'ファイル数エラー',
          message: `一度にアップロードできるファイルは最大${SECURITY_CONFIG.maxConcurrentUploads}個までです。`
        },
        { status: 400, headers: getSecurityHeaders() }
      );
    }

    // 使用量チェック
    const usageCheck = await checkUsageLimit();
    if (usageCheck.isNearLimit) {
      console.warn('Cloudinary無料枠が80%を超えています:', usageCheck.usage);
    }

    // 並列処理で画像を最適化
    const processPromises = files.map(async (file, index) => {
      // ファイルサイズ検証
      const sizeValidation = validateFileSize(file);
      if (!sizeValidation.valid) {
        return {
          success: false,
          error: {
            fileName: file.name,
            error: sizeValidation.error!,
          },
        };
      }
      
      // ファイルタイプ検証
      const typeValidation = validateFileType(file);
      if (!typeValidation.valid) {
        return {
          success: false,
          error: {
            fileName: file.name,
            error: typeValidation.error!,
          },
        };
      }
      
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = `${Date.now()}_${index}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        
        const result = await uploadAndOptimizeImage(buffer, filename, {
          width: 2000,
          height: 2000,
          quality: '95',
        });
        
        return {
          success: true,
          result: {
            originalName: file.name,
            // メイン最適化画像（2000x2000 JPG）を使用
            optimizedUrl: result.variants.main || result.url,
            mainImageUrl: result.variants.main,
            thumbnailUrl: result.variants.thumbnail,
            size: result.bytes,
            dimensions: {
              width: 2000, // 固定で2000x2000
              height: 2000,
            },
          },
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '不明なエラー';
        return {
          success: false,
          error: {
            fileName: file.name,
            error: errorMessage,
          },
          isQuotaError: errorMessage.includes('無料枠の使用量を超えました'),
        };
      }
    });

    // すべての処理を並列実行
    const processResults = await Promise.allSettled(processPromises);
    
    const results = [];
    const errors = [];
    let quotaExceeded = false;

    // 結果を集計
    for (const result of processResults) {
      if (result.status === 'fulfilled') {
        const { success, result: data, error, isQuotaError } = result.value;
        if (success && data) {
          results.push(data);
        } else if (error) {
          errors.push(error);
          if (isQuotaError) {
            quotaExceeded = true;
          }
        }
      } else {
        // Promise自体が失敗した場合
        errors.push({
          fileName: 'Unknown',
          error: result.reason?.message || '処理中にエラーが発生しました',
        });
      }
    }

    // バッチIDの生成
    const batchId = Date.now().toString();
    
    // 画像URLのリストを作成
    const imageUrls = results.map(result => result.optimizedUrl);
    
    return NextResponse.json({
      batch_id: batchId,
      total_images: files.length,
      processed_at: new Date().toISOString(),
      image_urls: imageUrls,
      status: 'completed',
      // 追加情報
      processed: results.length,
      failed: errors.length,
      results,
      errors,
      usage: usageCheck.usage,
      message: results.length > 0 ? `${results.length}枚の画像を最適化しました。` : '画像の処理に失敗しました。',
    }, {
      headers: getSecurityHeaders(),
    });
    
  } catch (error) {
    console.error('API処理エラー:', error);
    const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました。';
    
    return NextResponse.json(
      { 
        error: 'サーバーエラー',
        message: errorMessage,
      },
      { status: 500, headers: getSecurityHeaders() }
    );
  }
}

// 使用量確認用エンドポイント
export async function GET() {
  try {
    const usage = await checkUsageLimit();
    
    return NextResponse.json({
      message: 'Cloudinary画像最適化API',
      usage: usage.usage,
      isNearLimit: usage.isNearLimit,
      isOverLimit: usage.isOverLimit,
      nextResetDate: usage.nextResetDate,
    });
  } catch (error) {
    return NextResponse.json({
      message: 'Cloudinary画像最適化API',
      error: '使用量の取得に失敗しました。',
    });
  }
}