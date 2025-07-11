import { NextRequest } from 'next/server';

// レート制限用のメモリストア
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// セキュリティ設定
export const SECURITY_CONFIG = {
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE_MB || '10') * 1024 * 1024, // MB to bytes
  maxConcurrentUploads: parseInt(process.env.MAX_CONCURRENT_UPLOADS || '5'),
  rateLimitPerMinute: parseInt(process.env.RATE_LIMIT_PER_MINUTE || '60'),
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',').map(origin => origin.trim()) || ['http://localhost:3000'],
};

// ファイルサイズ検証
export function validateFileSize(file: File): { valid: boolean; error?: string } {
  if (file.size > SECURITY_CONFIG.maxFileSize) {
    return {
      valid: false,
      error: `ファイルサイズが大きすぎます。最大${SECURITY_CONFIG.maxFileSize / 1024 / 1024}MBまでアップロード可能です。`,
    };
  }
  return { valid: true };
}

// ファイルタイプ検証
export function validateFileType(file: File): { valid: boolean; error?: string } {
  if (!SECURITY_CONFIG.allowedMimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: `サポートされていないファイル形式です。対応形式: ${SECURITY_CONFIG.allowedMimeTypes.join(', ')}`,
    };
  }
  return { valid: true };
}

// レート制限チェック
export function checkRateLimit(identifier: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const userLimit = rateLimitStore.get(identifier);

  // 古いエントリをクリーンアップ
  if (userLimit && now > userLimit.resetTime) {
    rateLimitStore.delete(identifier);
  }

  if (!userLimit || now > userLimit.resetTime) {
    // 新しいウィンドウを開始
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + 60 * 1000, // 1分後にリセット
    });
    return { allowed: true };
  }

  if (userLimit.count >= SECURITY_CONFIG.rateLimitPerMinute) {
    // レート制限に達した
    const retryAfter = Math.ceil((userLimit.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // カウントを増やす
  userLimit.count++;
  return { allowed: true };
}

// IPアドレス取得
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip');
  return ip || 'unknown';
}

// CORS検証
export function validateOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return SECURITY_CONFIG.allowedOrigins.includes(origin);
}

// セキュリティヘッダー設定
export function getSecurityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data: blob: https://res.cloudinary.com; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
  };
}

// メモリクリーンアップ（定期的に実行）
export function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// 5分ごとにクリーンアップを実行
if (typeof window === 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}