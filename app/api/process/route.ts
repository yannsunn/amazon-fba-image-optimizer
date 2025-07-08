import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    // バックエンドが設定されていない場合のエラーメッセージ
    if (!process.env.BACKEND_URL) {
      return NextResponse.json(
        { 
          error: 'Backend URL not configured',
          message: 'Please set BACKEND_URL environment variable in Vercel dashboard'
        },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    
    // バックエンドAPIにリクエストを転送
    const response = await fetch(`${BACKEND_URL}/api/process-images`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.detail || `Backend error: ${response.status}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('API route error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: errorMessage,
        backendUrl: BACKEND_URL 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Image processing API endpoint' });
}