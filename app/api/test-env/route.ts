import { NextRequest, NextResponse } from 'next/server';
import { getSecurityHeaders } from '@/lib/security';

export async function GET(request: NextRequest) {
  // 環境変数の存在チェック
  const envCheck = {
    CLOUDINARY_CLOUD_NAME: {
      exists: !!process.env.CLOUDINARY_CLOUD_NAME,
      length: process.env.CLOUDINARY_CLOUD_NAME?.length || 0,
      firstChars: process.env.CLOUDINARY_CLOUD_NAME?.substring(0, 3) || 'N/A'
    },
    CLOUDINARY_API_KEY: {
      exists: !!process.env.CLOUDINARY_API_KEY,
      length: process.env.CLOUDINARY_API_KEY?.length || 0,
      firstChars: process.env.CLOUDINARY_API_KEY?.substring(0, 3) || 'N/A'
    },
    CLOUDINARY_API_SECRET: {
      exists: !!process.env.CLOUDINARY_API_SECRET,
      length: process.env.CLOUDINARY_API_SECRET?.length || 0,
      firstChars: 'XXX' // セキュリティのため、シークレットは表示しない
    },
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
  };

  return NextResponse.json({
    message: '環境変数チェック結果',
    env: envCheck,
    timestamp: new Date().toISOString()
  }, {
    headers: getSecurityHeaders()
  });
}