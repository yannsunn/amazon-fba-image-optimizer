'use client';

import { useState } from 'react';
import Image from 'next/image';
import { BatchInfo } from '../types/batch';

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
        <div className="text-center">
          <div className="text-5xl mb-3">✅</div>
          <h2 className="text-2xl font-bold text-success-700 mb-2">完了</h2>
          <p className="text-success-600">
            {batchInfo.results ? batchInfo.results.length : batchInfo.image_urls.length}枚生成
          </p>
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

      {/* 一括ダウンロード */}
      <div className="card">
        <button
          onClick={handleDownloadAllIndividually}
          disabled={downloadingIndividual}
          className="w-full bg-primary-600 text-white px-6 py-4 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg font-medium"
        >
          {downloadingIndividual ? (
            <>
              <svg className="inline animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              ダウンロード中...
            </>
          ) : (
            <>
              ⬇️ すべてダウンロード
            </>
          )}
        </button>
      </div>

      {/* 画像プレビュー */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">画像一覧</h3>
        
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
              <div key={groupIndex} className="space-y-3">
                <h4 className="font-medium text-gray-700 text-sm">{originalName}</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {results.map((result, index) => (
                    <div key={index}>
                      <div className="relative group cursor-pointer" onClick={() => handleIndividualDownload(result.optimizedUrl, groupIndex * 10 + index)}>
                        <Image
                          src={result.optimizedUrl}
                          alt={result.outputSize}
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
                      <div className="text-center mt-1">
                        <div className="text-xs font-medium text-gray-700">{result.outputSize}</div>
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

      {/* やり直しボタン */}
      <div className="text-center">
        <button
          onClick={onReset}
          className="px-8 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
        >
          ← 最初に戻る
        </button>
      </div>
    </div>
  );
}