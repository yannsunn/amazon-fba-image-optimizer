import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { getSecurityHeaders } from '@/lib/security';

export async function POST(
  request: NextRequest,
  { params }: { params: { batchId: string } }
) {
  try {
    const { batchId } = params;
    
    // POSTボディからバッチ情報を取得
    const body = await request.json();
    const imageUrls = body.urls || [];
    
    if (imageUrls.length === 0) {
      return NextResponse.json(
        { error: '画像URLが指定されていません' },
        { status: 400, headers: getSecurityHeaders() }
      );
    }

    // メモリ保護：最大画像数制限
    if (imageUrls.length > 20) {
      return NextResponse.json(
        { error: '一度にダウンロードできる画像は最大20枚までです' },
        { status: 413, headers: getSecurityHeaders() }
      );
    }
    
    // ZIPファイルを作成
    const zip = new JSZip();
    
    // 各画像をダウンロードしてZIPに追加
    for (let i = 0; i < imageUrls.length; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒タイムアウト
        
        const response = await fetch(imageUrls[i], { 
          signal: controller.signal,
          headers: { 'User-Agent': 'Amazon-FBA-Optimizer/1.0' }
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) continue;
        
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // ファイル名を生成（拡張子を保持）
        const extension = imageUrls[i].split('.').pop()?.split('?')[0] || 'jpg';
        const filename = `optimized_${i + 1}.${extension}`;
        
        zip.file(filename, buffer);
      } catch (error) {
        console.error(`Failed to download image ${i}:`, error);
      }
    }
    
    // ZIPファイルを生成
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }
    });
    
    // レスポンスヘッダーを設定
    const headers = new Headers(getSecurityHeaders());
    headers.set('Content-Type', 'application/zip');
    headers.set('Content-Disposition', `attachment; filename="batch_${batchId}.zip"`);
    headers.set('Content-Length', zipBuffer.length.toString());
    
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: headers
    });
    
  } catch (error) {
    console.error('Download API error:', error);
    return NextResponse.json(
      { error: 'ダウンロード処理中にエラーが発生しました' },
      { status: 500, headers: getSecurityHeaders() }
    );
  }
}