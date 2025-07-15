import { NextRequest, NextResponse } from 'next/server';
import { getSecurityHeaders } from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;
    
    if (!url) {
      return NextResponse.json(
        { error: '画像URLが指定されていません' },
        { status: 400, headers: getSecurityHeaders() }
      );
    }
    
    // Cloudinary URLの検証
    if (!url.includes('res.cloudinary.com')) {
      return NextResponse.json(
        { error: '無効なURLです' },
        { status: 400, headers: getSecurityHeaders() }
      );
    }
    
    // 画像を取得
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒タイムアウト
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Amazon-FBA-Optimizer/1.0' }
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    
    // レスポンスヘッダーを設定
    const headers = new Headers(getSecurityHeaders());
    headers.set('Content-Type', contentType);
    headers.set('Content-Length', arrayBuffer.byteLength.toString());
    headers.set('Cache-Control', 'public, max-age=31536000'); // 1年間キャッシュ
    
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: headers
    });
    
  } catch (error) {
    console.error('Proxy download error:', error);
    return NextResponse.json(
      { error: 'ダウンロード処理中にエラーが発生しました' },
      { status: 500, headers: getSecurityHeaders() }
    );
  }
}