// API レスポンス型定義

export interface OptimizedImage {
  originalName: string;
  optimizedUrl: string;
  mainImageUrl: string;
  thumbnailUrl: string;
  size: number;
  dimensions: {
    width: number;
    height: number;
  };
}

export interface ProcessError {
  fileName: string;
  error: string;
}

export interface UsageInfo {
  credits: number;
  used: number;
  remaining: number;
  percentage: number;
}

export interface ProcessResponse {
  batchId: string;
  totalFiles: number;
  processed: number;
  failed: number;
  results: OptimizedImage[];
  errors: ProcessError[];
  usage?: UsageInfo;
  message: string;
}

export interface UsageResponse {
  message: string;
  usage?: UsageInfo;
  isNearLimit?: boolean;
  isOverLimit?: boolean;
  nextResetDate?: string;
  error?: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
}

// Cloudinary関連の型定義
export interface CloudinaryUploadOptions {
  width: number;
  height: number;
  quality: string;
}

export interface CloudinaryUploadResult {
  public_id: string;
  version: number;
  signature: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  tags: string[];
  bytes: number;
  type: string;
  etag: string;
  placeholder: boolean;
  url: string;
  secure_url: string;
  variants: {
    main: string;
    thumbnail: string;
  };
}

export interface CloudinaryUsageLimit {
  usage: UsageInfo;
  isNearLimit: boolean;
  isOverLimit: boolean;
  nextResetDate: string;
}

// セキュリティ関連の型定義
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

export interface SecurityConfig {
  maxFileSize: number;
  maxConcurrentUploads: number;
  rateLimitPerMinute: number;
  allowedMimeTypes: string[];
  allowedOrigins: string[];
}

// 処理結果の型定義
export interface ProcessResult {
  success: boolean;
  result?: OptimizedImage;
  error?: ProcessError;
  isQuotaError?: boolean;
}