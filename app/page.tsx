'use client';

import { useState } from 'react';
import ImageUploader from './components/ImageUploader';
import ProcessingStatus from './components/ProcessingStatus';
import DownloadManager from './components/DownloadManager';
import { BatchInfo, ProcessingResult, ProcessingError } from './types/batch';

// 定数定義
const PROCESSING_COMPLETE_DELAY_MS = 2000;

export default function Home() {
  const [batchInfo, setBatchInfo] = useState<BatchInfo | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (files: File[], outputSizes: string[] = ['2000x2000']) => {
    setProcessing(true);
    setError(null);

    try {
      // 各ファイルを個別にアップロード（分割アップロード）
      const results: ProcessingResult[] = [];
      const errors: ProcessingError[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('images', file);
        formData.append('outputSizes', JSON.stringify(outputSizes));
        
        try {
          const response = await fetch('/api/process', {
            method: 'POST',
            body: formData,
            headers: {
              'X-Batch-Index': i.toString(),
              'X-Batch-Total': files.length.toString(),
            },
          });
          
          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.message || data.error || `エラーが発生しました (${response.status})`);
          }
          
          if (data.error) {
            throw new Error(data.message || data.error);
          }
          
          // 個別結果を保存
          if (data.results && data.results.length > 0) {
            results.push(...data.results);
          }
          
        } catch (error) {
          console.error(`File ${i + 1} processing error:`, error);
          errors.push({
            fileName: file.name,
            error: error instanceof Error ? error.message : '処理中にエラーが発生しました'
          });
        }
      }
      
      // 全体的な結果を作成
      const batchId = Date.now().toString();
      const batchData: BatchInfo = {
        batch_id: batchId,
        total_images: files.length,
        processed_at: new Date().toISOString(),
        image_urls: results.map(result => result.optimizedUrl),
        status: 'completed' as const,
        processed: results.length,
        failed: errors.length,
        results,
        errors,
        message: results.length > 0 ? `${results.length}枚の画像を最適化しました。` : '画像の処理に失敗しました。',
      };
      
      if (results.length === 0 && errors.length > 0) {
        throw new Error(`すべての画像の処理に失敗しました: ${errors[0].error}`);
      }

      // ProcessingStatusに完了を通知
      if (typeof window !== 'undefined' && window.completeProcessing) {
        window.completeProcessing();
      }

      // 少し遅延してからダウンロード画面を表示
      setTimeout(() => {
        setBatchInfo(batchData);
        setProcessing(false);
      }, PROCESSING_COMPLETE_DELAY_MS);
      
    } catch (error) {
      console.error('処理エラー:', error);
      setError(error instanceof Error ? error.message : '処理中にエラーが発生しました');
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setBatchInfo(null);
    setError(null);
  };

  return (
    <div className="min-h-screen">
      {/* ヘッダー */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
          Amazon FBA 画像最適化
        </h1>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="card bg-error-50 border-error-200 animate-slide-up mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="text-error-500 mr-3 text-xl">⚠️</div>
              <p className="text-error-700 font-medium">{error}</p>
            </div>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-error-500 text-white rounded-lg hover:bg-error-600 transition-colors text-sm font-medium"
            >
              リセット
            </button>
          </div>
        </div>
      )}

      {/* メインコンテンツ */}
      {!batchInfo && !processing && !error && (
        <ImageUploader onUpload={handleUpload} disabled={processing} />
      )}

      {processing && <ProcessingStatus />}

      {batchInfo && !processing && (
        <DownloadManager
          batchInfo={batchInfo}
          onReset={handleReset}
        />
      )}
    </div>
  );
}