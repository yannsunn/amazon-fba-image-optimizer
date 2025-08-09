'use client';

import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import imageCompression from 'browser-image-compression';
import Image from 'next/image';

interface Props {
  onUpload: (files: File[], outputSize: string) => void;
  disabled: boolean;
}

export default function ImageUploader({ onUpload, disabled }: Props) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [outputSize, setOutputSize] = useState<string>('2000x2000');

  // コンポーネントアンマウント時のメモリクリーンアップ
  useEffect(() => {
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 8) {
      alert('最大8枚まで選択可能です');
      acceptedFiles = acceptedFiles.slice(0, 8);
    }

    // 既存のプレビューをクリア
    previews.forEach(url => URL.revokeObjectURL(url));

    // 新しいプレビューを生成
    const newPreviews = acceptedFiles.map(file => URL.createObjectURL(file));
    setPreviews(newPreviews);
    setSelectedFiles(acceptedFiles);
  }, [previews]);

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
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    
    // 削除されるプレビューのURLを解放
    URL.revokeObjectURL(previews[index]);
    
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
      
      onUpload(compressedFiles, outputSize);
    } catch (error) {
      console.error('Compression error:', error);
      // 圧縮に失敗した場合は元のファイルを使用
      onUpload(selectedFiles, outputSize);
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
              出力サイズを選択
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50">
                <input
                  type="radio"
                  name="outputSize"
                  value="2000x2000"
                  checked={outputSize === '2000x2000'}
                  onChange={(e) => setOutputSize(e.target.value)}
                  className="sr-only"
                />
                <div className={`flex-1 ${outputSize === '2000x2000' ? 'text-primary-600 font-semibold' : 'text-gray-700'}}`}>
                  <div className="text-lg">2000 × 2000 px</div>
                  <div className="text-sm text-gray-500 mt-1">Amazon FBA標準</div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 ${outputSize === '2000x2000' ? 'border-primary-600 bg-primary-600' : 'border-gray-300'} flex items-center justify-center`}>
                  {outputSize === '2000x2000' && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
              </label>
              
              <label className="relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50">
                <input
                  type="radio"
                  name="outputSize"
                  value="970x600"
                  checked={outputSize === '970x600'}
                  onChange={(e) => setOutputSize(e.target.value)}
                  className="sr-only"
                />
                <div className={`flex-1 ${outputSize === '970x600' ? 'text-primary-600 font-semibold' : 'text-gray-700'}}`}>
                  <div className="text-lg">970 × 600 px</div>
                  <div className="text-sm text-gray-500 mt-1">横長レイアウト用</div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 ${outputSize === '970x600' ? 'border-primary-600 bg-primary-600' : 'border-gray-300'} flex items-center justify-center`}>
                  {outputSize === '970x600' && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
              </label>
              
              <label className="relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50">
                <input
                  type="radio"
                  name="outputSize"
                  value="300x300"
                  checked={outputSize === '300x300'}
                  onChange={(e) => setOutputSize(e.target.value)}
                  className="sr-only"
                />
                <div className={`flex-1 ${outputSize === '300x300' ? 'text-primary-600 font-semibold' : 'text-gray-700'}}`}>
                  <div className="text-lg">300 × 300 px</div>
                  <div className="text-sm text-gray-500 mt-1">サムネイル用</div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 ${outputSize === '300x300' ? 'border-primary-600 bg-primary-600' : 'border-gray-300'} flex items-center justify-center`}>
                  {outputSize === '300x300' && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
              </label>
            </div>
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
            disabled={disabled || selectedFiles.length === 0 || isCompressing}
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