import { NextRequest, NextResponse } from 'next/server';
import { uploadAndOptimizeImage, checkUsageLimit } from '@/lib/cloudinary';

export async function POST(request: NextRequest) {
  try {
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
        { status: 400 }
      );
    }

    // 使用量チェック
    const usageCheck = await checkUsageLimit();
    if (usageCheck.isNearLimit) {
      console.warn('Cloudinary無料枠が80%を超えています:', usageCheck.usage);
    }

    const results = [];
    const errors = [];

    // バッチ処理
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        
        const result = await uploadAndOptimizeImage(buffer, filename, {
          width: 1500,
          height: 1500,
          quality: 'auto:best',
        });
        
        results.push({
          originalName: file.name,
          optimizedUrl: result.url,
          mainImageUrl: result.variants.main,
          thumbnailUrl: result.variants.thumbnail,
          size: result.bytes,
          dimensions: {
            width: result.width,
            height: result.height,
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '不明なエラー';
        errors.push({
          fileName: file.name,
          error: errorMessage,
        });
        
        // 無料枠超過エラーの場合は処理を中断
        if (errorMessage.includes('無料枠の使用量を超えました')) {
          break;
        }
      }
    }

    // バッチIDの生成
    const batchId = Date.now().toString();
    
    return NextResponse.json({
      batchId,
      totalFiles: files.length,
      processed: results.length,
      failed: errors.length,
      results,
      errors,
      usage: usageCheck.usage,
      message: results.length > 0 ? `${results.length}枚の画像を最適化しました。` : '画像の処理に失敗しました。',
    });
    
  } catch (error) {
    console.error('API処理エラー:', error);
    const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました。';
    
    return NextResponse.json(
      { 
        error: 'サーバーエラー',
        message: errorMessage,
      },
      { status: 500 }
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