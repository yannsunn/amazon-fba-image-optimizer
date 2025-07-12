'use client';

import { useState } from 'react';
import ImageUploader from './components/ImageUploader';
import ProcessingStatus from './components/ProcessingStatus';
import DownloadManager from './components/DownloadManager';

interface BatchInfo {
  batch_id: string;
  total_images: number;
  processed_at: string;
  image_urls: string[];
  status: string;
}

export default function Home() {
  const [batchInfo, setBatchInfo] = useState<BatchInfo | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (files: File[]) => {
    setProcessing(true);
    setError(null);
    
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));
    
    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || data.error || `エラーが発生しました (${response.status})`);
      }
      
      if (data.error) {
        throw new Error(data.message || data.error);
      }
      
      // APIレスポンス受信後、ProcessingStatusに完了を通知
      if (window && (window as any).completeProcessing) {
        (window as any).completeProcessing();
      }
      
      // 少し遅延してからダウンロード画面を表示
      setTimeout(() => {
        setBatchInfo(data);
        setProcessing(false);
      }, 2000);
      
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
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Amazon FBA商品画像の品質向上
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          AI技術を使用して画像を2000x2000pxに最適化し、
          Amazon FBAの要件に適合した高品質な商品画像を作成します。
        </p>
      </div>

      {/* 機能説明 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card text-center">
          <div className="text-4xl mb-4">🎯</div>
          <h3 className="text-lg font-semibold mb-2">AI画像強化</h3>
          <p className="text-sm text-gray-600">
            Cloudinary AIで画質を自動最適化
          </p>
        </div>
        <div className="card text-center">
          <div className="text-4xl mb-4">📐</div>
          <h3 className="text-lg font-semibold mb-2">自動リサイズ</h3>
          <p className="text-sm text-gray-600">
            Amazon推奨サイズに自動調整
          </p>
        </div>
        <div className="card text-center">
          <div className="text-4xl mb-4">💾</div>
          <h3 className="text-lg font-semibold mb-2">無料枠管理</h3>
          <p className="text-sm text-gray-600">
            月25,000回の変換まで無料
          </p>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="card bg-error-50 border-error-200">
          <div className="flex items-center">
            <div className="text-error-500 mr-3">⚠️</div>
            <div>
              <h3 className="text-lg font-semibold text-error-700">エラー</h3>
              <p className="text-error-600">{error}</p>
            </div>
          </div>
          <button 
            onClick={handleReset}
            className="mt-4 text-sm text-error-600 hover:text-error-700 underline"
          >
            やり直す
          </button>
        </div>
      )}

      {/* メインコンテンツ */}
      {!batchInfo && !processing && !error && (
        <ImageUploader onUpload={handleUpload} disabled={processing} />
      )}
      
      {processing && (
        <ProcessingStatus 
          onComplete={() => {
            // ProcessingStatusから完了通知を受け取ったときの処理
            console.log('Processing completed!');
          }}
        />
      )}
      
      {batchInfo && !processing && (
        <DownloadManager 
          batchInfo={batchInfo} 
          onReset={handleReset}
        />
      )}

      {/* 使用方法 */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-4">使用方法</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>最大8枚までの画像を選択またはドラッグ＆ドロップ</li>
          <li>「処理開始」ボタンをクリックして自動処理を開始</li>
          <li>処理完了後、最適化された画像をダウンロード</li>
          <li>Amazon FBAにアップロードして商品ページを更新</li>
        </ol>
      </div>
    </div>
  );
}