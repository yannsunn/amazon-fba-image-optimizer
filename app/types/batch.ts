// バッチ処理の型定義

export interface ProcessingResult {
  optimizedUrl: string;
  outputSize: string;
  originalName: string;
  originalUrl?: string;
  processingTime?: number;
  dimensions: {
    width: number;
    height: number;
  };
}

export interface ProcessingError {
  fileName: string;
  error: string;
}

export interface BatchInfo {
  batch_id: string;
  total_images: number;
  processed_at: string;
  image_urls: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processed?: number;
  failed?: number;
  results?: ProcessingResult[];
  errors?: ProcessingError[];
  message?: string;
}
