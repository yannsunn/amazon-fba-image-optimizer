'use client';

import { useState } from 'react';

interface BatchInfo {
  batch_id: string;
  total_images: number;
  processed_at: string;
  image_urls: string[];
  status: string;
}

interface Props {
  batchInfo: BatchInfo;
  onReset: () => void;
}

export default function DownloadManager({ batchInfo, onReset }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError(null);
    
    try {
      // 画像URLをクエリパラメータとして渡す
      const urls = batchInfo.image_urls.join(',');
      const response = await fetch(`/api/batch/${batchInfo.batch_id}/download?urls=${encodeURIComponent(urls)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // ZIPファイルをダウンロード
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // ダウンロードリンクを作成
      const link = document.createElement('a');
      link.href = url;
      link.download = `amazon-fba-optimized-${batchInfo.batch_id}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // メモリを解放
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('ダウンロードエラー:', error);
      setDownloadError(error instanceof Error ? error.message : 'ダウンロード中にエラーが発生しました');
    } finally {
      setDownloading(false);
    }
  };

  const handleIndividualDownload = async (imageUrl: string, index: number) => {
    try {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `optimized-image-${index + 1}.jpg`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('個別ダウンロードエラー:', error);
    }
  };

  const processedDate = new Date(batchInfo.processed_at).toLocaleString('ja-JP');

  return (
    <div className="space-y-6">
      {/* 完了メッセージ */}
      <div className="card bg-success-50 border-success-200">
        <div className="flex items-center mb-4">
          <div className="text-success-500 mr-3 text-2xl">✅</div>
          <div>
            <h2 className="text-2xl font-bold text-success-700">
              処理完了！
            </h2>
            <p className="text-success-600">
              {batchInfo.total_images}枚の画像が正常に最適化されました
            </p>
          </div>
        </div>

        {/* バッチ情報 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-success-700">
              {batchInfo.total_images}
            </div>
            <div className="text-sm text-success-600">処理枚数</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-success-700">
              2000×2000
            </div>
            <div className="text-sm text-success-600">解像度</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-success-700">
              ≤10MB
            </div>
            <div className="text-sm text-success-600">ファイルサイズ</div>
          </div>
        </div>

        {/* 処理詳細 */}
        <div className="text-sm text-success-600 space-y-1">
          <div>バッチID: {batchInfo.batch_id}</div>
          <div>処理完了: {processedDate}</div>
          <div>ステータス: {batchInfo.status}</div>
        </div>
      </div>

      {/* エラー表示 */}
      {downloadError && (
        <div className="card bg-error-50 border-error-200">
          <div className="flex items-center">
            <div className="text-error-500 mr-3">⚠️</div>
            <div>
              <h3 className="font-semibold text-error-700">ダウンロードエラー</h3>
              <p className="text-error-600">{downloadError}</p>
            </div>
          </div>
        </div>
      )}

      {/* ダウンロードオプション */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-4">ダウンロード</h3>
        
        {/* 一括ダウンロード */}
        <div className="space-y-4">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="btn-success w-full"
          >
            {downloading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ZIPファイル準備中...
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <span className="mr-2">📦</span>
                全画像を一括ダウンロード (ZIP)
              </div>
            )}
          </button>

          <div className="text-sm text-gray-600 text-center">
            または個別にダウンロード
          </div>
        </div>
      </div>

      {/* 個別ダウンロード */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-4">個別ダウンロード</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {batchInfo.image_urls && batchInfo.image_urls.map((url, index) => (
            <div key={index} className="relative group">
              <img
                src={url}
                alt={`Optimized ${index + 1}`}
                className="w-full h-32 object-cover rounded border"
              />
              <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                <button
                  onClick={() => handleIndividualDownload(url, index)}
                  className="bg-white text-blue-600 px-4 py-2 rounded text-sm font-medium hover:bg-gray-100 shadow-lg"
                >
                  ダウンロード
                </button>
              </div>
              <div className="text-xs text-center mt-1">
                画像 {index + 1}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 使用方法 */}
      <div className="card bg-primary-50 border-primary-200">
        <h3 className="text-lg font-semibold text-primary-700 mb-2">
          🎯 Amazon FBAでの使用方法
        </h3>
        <ol className="text-sm text-primary-600 space-y-1">
          <li>1. 最適化された画像をダウンロード</li>
          <li>2. Amazon Seller Centralにログイン</li>
          <li>3. 商品ページの編集画面で画像を更新</li>
          <li>4. メイン画像を最初にアップロード</li>
          <li>5. 追加画像を順番にアップロード</li>
          <li>6. 変更を保存して公開</li>
        </ol>
      </div>

      {/* アクションボタン */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={onReset}
          className="flex-1 bg-gray-500 text-white py-3 px-6 rounded-lg hover:bg-gray-600 transition-colors"
        >
          新しい画像を処理
        </button>
        <button
          onClick={() => window.location.reload()}
          className="flex-1 bg-primary-500 text-white py-3 px-6 rounded-lg hover:bg-primary-600 transition-colors"
        >
          ページを更新
        </button>
      </div>
    </div>
  );
}