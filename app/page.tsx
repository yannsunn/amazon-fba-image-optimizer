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
    
    try {
      // 各ファイルを個別にアップロード（分割アップロード）
      const results = [];
      const errors = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('images', file);
        
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
      const batchData = {
        batch_id: batchId,
        total_images: files.length,
        processed_at: new Date().toISOString(),
        image_urls: results.map(result => result.optimizedUrl),
        status: 'completed',
        processed: results.length,
        failed: errors.length,
        results,
        errors,
        message: results.length > 0 ? `${results.length}枚の画像を最適化しました。` : '画像の処理に失敗しました。',
      };
      
      if (results.length === 0 && errors.length > 0) {
        throw new Error(`すべての画像の処理に失敗しました: ${errors[0].error}`);
      }
      
      // APIレスポンス受信後、ProcessingStatusに完了を通知
      if (window && (window as any).completeProcessing) {
        (window as any).completeProcessing();
      }
      
      // 少し遅延してからダウンロード画面を表示
      setTimeout(() => {
        setBatchInfo(batchData);
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
    <div className="space-y-8 animate-fade-in">
      <div className="text-center">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-6">
          Amazon FBA商品画像の品質向上
        </h2>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
          AI技術を使用して画像を2000x2000pxに最適化し、
          Amazon FBAの要件に適合した高品質な商品画像を作成します。
        </p>
      </div>

      {/* 機能説明 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="card text-center group">
          <div className="text-5xl mb-6 transform group-hover:scale-110 transition-transform duration-300">🎯</div>
          <h3 className="text-xl font-semibold mb-3 text-gray-800">AI画像強化</h3>
          <p className="text-gray-600 leading-relaxed">
            Cloudinary AIで画質を自動最適化
          </p>
        </div>
        <div className="card text-center group">
          <div className="text-5xl mb-6 transform group-hover:scale-110 transition-transform duration-300">📐</div>
          <h3 className="text-xl font-semibold mb-3 text-gray-800">自動リサイズ</h3>
          <p className="text-gray-600 leading-relaxed">
            Amazon推奨サイズに自動調整
          </p>
        </div>
        <div className="card text-center group">
          <div className="text-5xl mb-6 transform group-hover:scale-110 transition-transform duration-300">💾</div>
          <h3 className="text-xl font-semibold mb-3 text-gray-800">無料枠管理</h3>
          <p className="text-gray-600 leading-relaxed">
            月25,000回の変換まで無料
          </p>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="card bg-error-50 border-error-200 animate-slide-up">
          <div className="flex items-center">
            <div className="text-error-500 mr-4 text-2xl">⚠️</div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-error-700 mb-2">エラー</h3>
              <p className="text-error-600 leading-relaxed">{error}</p>
            </div>
          </div>
          <button 
            onClick={handleReset}
            className="mt-6 px-6 py-2 bg-error-500 text-white rounded-lg hover:bg-error-600 transition-colors duration-200 font-medium"
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
        <h3 className="text-2xl font-semibold mb-6 text-gray-800">使用方法</h3>
        <ol className="space-y-4">
          <li className="flex items-start space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <span className="flex-shrink-0 w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center font-semibold text-sm">1</span>
            <span className="text-gray-700 leading-relaxed">最大8枚までの画像を選択またはドラッグ＆ドロップ</span>
          </li>
          <li className="flex items-start space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <span className="flex-shrink-0 w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center font-semibold text-sm">2</span>
            <span className="text-gray-700 leading-relaxed">「処理開始」ボタンをクリックして自動処理を開始</span>
          </li>
          <li className="flex items-start space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <span className="flex-shrink-0 w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center font-semibold text-sm">3</span>
            <span className="text-gray-700 leading-relaxed">処理完了後、最適化された画像をダウンロード</span>
          </li>
          <li className="flex items-start space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <span className="flex-shrink-0 w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center font-semibold text-sm">4</span>
            <span className="text-gray-700 leading-relaxed">Amazon FBAにアップロードして商品ページを更新</span>
          </li>
        </ol>
      </div>
    </div>
  );
}