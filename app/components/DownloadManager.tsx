'use client';

import { useState } from 'react';
import Image from 'next/image';

interface BatchInfo {
  batch_id: string;
  total_images: number;
  processed_at: string;
  image_urls: string[];
  status: string;
  results?: Array<{
    originalName: string;
    outputSize: string;
    optimizedUrl: string;
    dimensions: {
      width: number;
      height: number;
    };
  }>;
}

interface Props {
  batchInfo: BatchInfo;
  onReset: () => void;
}

export default function DownloadManager({ batchInfo, onReset }: Props) {
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadingIndividual, setDownloadingIndividual] = useState(false);


  const handleIndividualDownload = async (imageUrl: string, index: number) => {
    try {
      // Cloudinary URLから適切なファイル形式を取得
      const urlParts = imageUrl.split('.');
      const extension = urlParts[urlParts.length - 1].split('?')[0] || 'jpg';
      
      // プロキシAPIを使用して画像を取得
      const response = await fetch('/api/proxy/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: imageUrl }),
      });
      if (!response.ok) throw new Error('画像の取得に失敗しました');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `Amazon最適化画像_${index + 1}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // メモリを解放
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('個別ダウンロードエラー:', error);
      setDownloadError(`画像 ${index + 1} のダウンロードに失敗しました`);
    }
  };

  const handleDownloadAllIndividually = async () => {
    if (!batchInfo.image_urls || batchInfo.image_urls.length === 0) return;
    
    setDownloadingIndividual(true);
    setDownloadError(null);
    
    try {
      // 各画像を順次ダウンロード（短い間隔で）
      for (let i = 0; i < batchInfo.image_urls.length; i++) {
        await handleIndividualDownload(batchInfo.image_urls[i], i);
        // ブラウザの負荷を軽減するため少し待機
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } catch (error) {
      console.error('一括個別ダウンロードエラー:', error);
      setDownloadError('一部の画像のダウンロードに失敗しました');
    } finally {
      setDownloadingIndividual(false);
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
            <div className="text-sm text-success-600">元画像数</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-success-700">
              {batchInfo.results ? batchInfo.results.length : batchInfo.image_urls.length}
            </div>
            <div className="text-sm text-success-600">生成画像数</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-success-700">
              {batchInfo.results && batchInfo.results.length > 0
                ? [...new Set(batchInfo.results.map(r => r.outputSize))].join(', ')
                : '2000×2000'}
            </div>
            <div className="text-sm text-success-600">出力サイズ</div>
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
        <h3 className="text-xl font-semibold mb-4">💾 ダウンロードオプション</h3>

        <div className="p-4 border rounded-lg bg-gradient-to-br from-green-50 to-green-100">
          <h4 className="font-semibold text-green-700 mb-2">🖼️ 個別ファイルダウンロード</h4>
          <p className="text-sm text-gray-600 mb-3">
            画像を個別ファイルとして一括自動ダウンロード
          </p>
          <button
            onClick={handleDownloadAllIndividually}
            disabled={downloadingIndividual}
            className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {downloadingIndividual ? (
              <>
                <svg className="inline animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                ダウンロード中...
              </>
            ) : (
              <>
                <svg className="inline w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3 3m0 0l-3-3m3 3V8" />
                </svg>
                すべての画像をダウンロード
              </>
            )}
          </button>
        </div>
      </div>

      {/* 個別ダウンロード */}
      <div id="individual-downloads" className="card">
        <h3 className="text-xl font-semibold mb-4">🖼️ 個別ダウンロード</h3>
        
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            💡 ヒント: 画像をクリックすると個別にダウンロードできます
          </p>
        </div>
        
        {batchInfo.results ? (
          // 画像をグループ化して表示
          <div className="space-y-6">
            {Object.entries(
              batchInfo.results.reduce((groups, result) => {
                const name = result.originalName;
                if (!groups[name]) groups[name] = [];
                groups[name].push(result);
                return groups;
              }, {} as Record<string, typeof batchInfo.results>)
            ).map(([originalName, results], groupIndex) => (
              <div key={groupIndex} className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-semibold text-gray-700 mb-3">📄 {originalName}</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {results.map((result, index) => (
                    <div key={index} className="space-y-2">
                      <div className="relative group cursor-pointer" onClick={() => handleIndividualDownload(result.optimizedUrl, groupIndex * 10 + index)}>
                        <Image
                          src={result.optimizedUrl}
                          alt={`${originalName} - ${result.outputSize}`}
                          width={200}
                          height={160}
                          className="w-full h-40 object-cover rounded-lg border-2 border-gray-200 hover:border-blue-400 transition-colors"
                          unoptimized
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-40 transition-opacity rounded-lg flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-700">{result.outputSize}</div>
                        <div className="text-xs text-gray-500">{result.dimensions.width}×{result.dimensions.height}px</div>
                        <button
                          onClick={() => handleIndividualDownload(result.optimizedUrl, groupIndex * 10 + index)}
                          className="text-xs text-blue-600 hover:text-blue-800 hover:underline mt-1"
                        >
                          ダウンロード
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // フォールバック：単純なリスト表示
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {batchInfo.image_urls && batchInfo.image_urls.map((url, index) => (
              <div key={index} className="space-y-2">
                <div className="relative group cursor-pointer" onClick={() => handleIndividualDownload(url, index)}>
                  <Image
                    src={url}
                    alt={`Optimized ${index + 1}`}
                    width={200}
                    height={160}
                    className="w-full h-40 object-cover rounded-lg border-2 border-gray-200 hover:border-blue-400 transition-colors"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-40 transition-opacity rounded-lg flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-700">画像 {index + 1}</div>
                  <button
                    onClick={() => handleIndividualDownload(url, index)}
                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    ダウンロード
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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