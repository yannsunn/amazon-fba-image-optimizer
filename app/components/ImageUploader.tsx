'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import imageCompression from 'browser-image-compression';
import Image from 'next/image';

interface Props {
  onUpload: (files: File[], outputSizes: string[]) => void;
  disabled: boolean;
}

export default function ImageUploader({ onUpload, disabled }: Props) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [outputSizes, setOutputSizes] = useState<string[]>(['2000x2000']);
  const previewsRef = useRef<string[]>([]);

  // サイズ選択のトグルハンドラー
  const handleSizeToggle = useCallback((size: string, checked: boolean) => {
    if (checked) {
      setOutputSizes(prev => [...prev, size]);
    } else {
      setOutputSizes(prev => prev.filter(s => s !== size));
    }
  }, []);

  // previewsの参照を常に最新に保つ
  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);

  // コンポーネントアンマウント時のメモリクリーンアップ
  useEffect(() => {
    return () => {
      previewsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    let filesToProcess = acceptedFiles;

    if (acceptedFiles.length > 8) {
      alert('最大8枚まで選択可能です');
      filesToProcess = acceptedFiles.slice(0, 8);
    }

    // 既存のプレビューをクリア（refを使用して最新の参照にアクセス）
    previewsRef.current.forEach(url => URL.revokeObjectURL(url));

    // 新しいプレビューを生成
    const newPreviews = filesToProcess.map(file => URL.createObjectURL(file));
    setPreviews(newPreviews);
    setSelectedFiles(filesToProcess);
  }, []);

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png']
    },
    maxFiles: 8,
    disabled,
    multiple: true
  });

  const removeFile = (index: number) => {
    // 境界チェック
    if (index < 0 || index >= previews.length) {
      console.warn('Invalid index for removeFile:', index);
      return;
    }

    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);

    // 削除されるプレビューのURLを解放
    if (previews[index]) {
      URL.revokeObjectURL(previews[index]);
    }

    setSelectedFiles(newFiles);
    setPreviews(newPreviews);
  };

  const compressImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 1, // 1MB以下に圧縮
      maxWidthOrHeight: 1920, // 最大解像度
      useWebWorker: true,
      fileType: 'image/jpeg' as const,
      quality: 0.8, // 品質80%
    };

    try {
      const compressedFile = await imageCompression(file, options);
      return compressedFile;
    } catch (error) {
      console.warn('Image compression failed, using original:', error);
      return file;
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    
    setIsCompressing(true);
    try {
      // 各画像を圧縮
      const compressedFiles = await Promise.all(
        selectedFiles.map(file => compressImage(file))
      );
      
      onUpload(compressedFiles, outputSizes);
    } catch (error) {
      console.error('Compression error:', error);
      // 圧縮に失敗した場合は元のファイルを使用
      onUpload(selectedFiles, outputSizes);
    } finally {
      setIsCompressing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ドロップゾーン */}
      <div
        {...getRootProps()}
        className={`upload-area ${isDragActive ? 'dragover' : ''} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="space-y-4">
          <div className="text-6xl" role="img" aria-label="カメラ - 画像アップロード">📸</div>
          {isDragActive ? (
            <p className="text-lg text-primary-600">
              ここに画像をドロップしてください
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-lg">
                画像をドラッグ＆ドロップまたはクリックで選択
              </p>
              <p className="text-sm text-gray-500">
                最大8枚まで、JPEG/PNG形式対応
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ファイル情報 */}
      {selectedFiles.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">
            選択された画像 ({selectedFiles.length}枚)
          </h3>
          
          {/* 出力サイズ選択 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              出力サイズを選択（複数選択可能）
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50">
                <input
                  type="checkbox"
                  value="2000x2000"
                  checked={outputSizes.includes('2000x2000')}
                  onChange={(e) => handleSizeToggle(e.target.value, e.target.checked)}
                  className="sr-only"
                />
                <div className={`flex-1 ${outputSizes.includes('2000x2000') ? 'text-primary-600 font-semibold' : 'text-gray-700'}}`}>
                  <div className="text-lg">2000 × 2000 px</div>
                  <div className="text-sm text-gray-500 mt-1">Amazon FBA標準</div>
                </div>
                <div className={`w-5 h-5 rounded-lg border-2 ${outputSizes.includes('2000x2000') ? 'border-primary-600 bg-primary-600' : 'border-gray-300'} flex items-center justify-center`}>
                  {outputSizes.includes('2000x2000') && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </label>
              
              <label className="relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50">
                <input
                  type="checkbox"
                  value="970x600"
                  checked={outputSizes.includes('970x600')}
                  onChange={(e) => handleSizeToggle(e.target.value, e.target.checked)}
                  className="sr-only"
                />
                <div className={`flex-1 ${outputSizes.includes('970x600') ? 'text-primary-600 font-semibold' : 'text-gray-700'}}`}>
                  <div className="text-lg">970 × 600 px</div>
                  <div className="text-sm text-gray-500 mt-1">横長レイアウト用</div>
                </div>
                <div className={`w-5 h-5 rounded-lg border-2 ${outputSizes.includes('970x600') ? 'border-primary-600 bg-primary-600' : 'border-gray-300'} flex items-center justify-center`}>
                  {outputSizes.includes('970x600') && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </label>
              
              <label className="relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50">
                <input
                  type="checkbox"
                  value="300x300"
                  checked={outputSizes.includes('300x300')}
                  onChange={(e) => handleSizeToggle(e.target.value, e.target.checked)}
                  className="sr-only"
                />
                <div className={`flex-1 ${outputSizes.includes('300x300') ? 'text-primary-600 font-semibold' : 'text-gray-700'}}`}>
                  <div className="text-lg">300 × 300 px</div>
                  <div className="text-sm text-gray-500 mt-1">サムネイル用</div>
                </div>
                <div className={`w-5 h-5 rounded-lg border-2 ${outputSizes.includes('300x300') ? 'border-primary-600 bg-primary-600' : 'border-gray-300'} flex items-center justify-center`}>
                  {outputSizes.includes('300x300') && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </label>
            </div>
            {outputSizes.length === 0 && (
              <p className="text-sm text-error-600 mt-2">※ 少なくとも1つのサイズを選択してください</p>
            )}
          </div>
          
          {/* プレビューグリッド */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {previews.map((url, idx) => (
              <div key={idx} className="relative group">
                <Image
                  src={url}
                  alt={`Preview ${idx + 1}`}
                  width={128}
                  height={128}
                  className="w-full h-32 object-cover rounded border"
                  unoptimized
                />
                <button
                  onClick={() => removeFile(idx)}
                  className="absolute top-2 right-2 bg-error-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-error-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="削除"
                >
                  ×
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b">
                  {selectedFiles[idx].name}
                </div>
              </div>
            ))}
          </div>

          {/* ファイル詳細 */}
          <div className="space-y-2 mb-6">
            {selectedFiles.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                <span className="font-medium">{file.name}</span>
                <span className="text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(1)}MB
                </span>
              </div>
            ))}
          </div>

          {/* アップロードボタン */}
          <button
            onClick={handleUpload}
            disabled={disabled || selectedFiles.length === 0 || isCompressing || outputSizes.length === 0}
            className="btn-primary w-full"
          >
            {isCompressing 
              ? '画像を圧縮中...' 
              : disabled 
                ? '処理中...' 
                : `${selectedFiles.length}枚の画像を処理開始`
            }
          </button>
        </div>
      )}

      {/* 注意事項 */}
      <div className="card bg-warning-50 border-warning-200">
        <h3 className="text-lg font-semibold text-warning-700 mb-2">
          <span role="img" aria-label="クリップボード">📋</span> 処理について
        </h3>
        <ul className="text-sm text-warning-600 space-y-1">
          <li>• 対応形式: JPEG, PNG</li>
          <li>• 最大8枚まで同時処理可能</li>
          <li>• 自動圧縮: アップロード前に1MB以下に圧縮</li>
          <li>• 処理時間: 1枚あたり約30秒〜1分</li>
          <li>• 出力: 選択可能（2000×2000px / 970×600px / 300×300px）</li>
        </ul>
      </div>
    </div>
  );
}