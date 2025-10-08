'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import imageCompression from 'browser-image-compression';
import Image from 'next/image';

interface Props {
  onUpload: (files: File[], outputSizes: string[] | string[][]) => void;
  disabled: boolean;
}

export default function ImageUploader({ onUpload, disabled }: Props) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [outputSizes, setOutputSizes] = useState<string[]>(['2000x2000']);
  const [customWidth, setCustomWidth] = useState('');
  const [customHeight, setCustomHeight] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [individualMode, setIndividualMode] = useState(false);
  const [individualSizes, setIndividualSizes] = useState<Record<number, string[]>>({});
  const previewsRef = useRef<string[]>([]);

  // サイズ選択のトグルハンドラー
  const handleSizeToggle = useCallback((size: string, checked: boolean) => {
    if (checked) {
      setOutputSizes(prev => [...prev, size]);
    } else {
      setOutputSizes(prev => prev.filter(s => s !== size));
    }
  }, []);

  // カスタムサイズ追加
  const handleAddCustomSize = useCallback(() => {
    const width = parseInt(customWidth);
    const height = parseInt(customHeight);

    if (isNaN(width) || isNaN(height) || width < 1 || height < 1 || width > 5000 || height > 5000) {
      alert('1〜5000の範囲で幅と高さを入力してください');
      return;
    }

    const customSize = `${width}x${height}`;
    if (!outputSizes.includes(customSize)) {
      setOutputSizes(prev => [...prev, customSize]);
    }
    setCustomWidth('');
    setCustomHeight('');
    setShowCustom(false);
  }, [customWidth, customHeight, outputSizes]);

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

    // 個別モードの場合、各画像にサイズが設定されているか確認
    if (individualMode) {
      const allHaveSizes = selectedFiles.every((_, idx) =>
        individualSizes[idx] && individualSizes[idx].length > 0
      );
      if (!allHaveSizes) {
        alert('すべての画像にサイズを設定してください');
        return;
      }
    }

    setIsCompressing(true);
    try {
      // 各画像を圧縮
      const compressedFiles = await Promise.all(
        selectedFiles.map(file => compressImage(file))
      );

      // 個別モードの場合は各画像のサイズを配列として送信
      if (individualMode) {
        const individualSizesArray = selectedFiles.map((_, idx) =>
          individualSizes[idx] || []
        );
        onUpload(compressedFiles, individualSizesArray);
      } else {
        onUpload(compressedFiles, outputSizes);
      }
    } catch (error) {
      console.error('Compression error:', error);
      if (individualMode) {
        const individualSizesArray = selectedFiles.map((_, idx) =>
          individualSizes[idx] || []
        );
        onUpload(selectedFiles, individualSizesArray);
      } else {
        onUpload(selectedFiles, outputSizes);
      }
    } finally {
      setIsCompressing(false);
    }
  };

  // 個別サイズのトグル
  const handleIndividualSizeToggle = useCallback((fileIndex: number, size: string, checked: boolean) => {
    setIndividualSizes(prev => {
      const current = prev[fileIndex] || [];
      if (checked) {
        return { ...prev, [fileIndex]: [...current, size] };
      } else {
        return { ...prev, [fileIndex]: current.filter(s => s !== size) };
      }
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* ドロップゾーン */}
      <div
        {...getRootProps()}
        className={`upload-area ${isDragActive ? 'dragover' : ''} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="text-center">
          <div className="text-6xl mb-4">📸</div>
          <p className="text-xl font-medium mb-2">
            {isDragActive ? 'ここにドロップ' : '画像を選択'}
          </p>
          <p className="text-sm text-gray-500">
            最大8枚 / JPEG・PNG
          </p>
        </div>
      </div>

      {/* ファイル情報 */}
      {selectedFiles.length > 0 && (
        <div className="card">
          {/* モード切替 */}
          <div className="mb-6 flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIndividualMode(false)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                !individualMode
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              一括設定
            </button>
            <button
              type="button"
              onClick={() => setIndividualMode(true)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                individualMode
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              個別設定
            </button>
          </div>

          {/* 一括設定モード */}
          {!individualMode && (
            <>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  出力サイズ選択
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
                  <div className="text-base font-medium">2000×2000</div>
                  <div className="text-xs text-gray-500 mt-0.5">標準</div>
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
                  <div className="text-base font-medium">970×600</div>
                  <div className="text-xs text-gray-500 mt-0.5">横長</div>
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
                  <div className="text-base font-medium">300×300</div>
                  <div className="text-xs text-gray-500 mt-0.5">小</div>
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
              <p className="text-sm text-error-600 mt-2">少なくとも1つ選択</p>
            )}
          </div>

          {/* カスタムサイズ */}
          <div className="mb-6">
            {!showCustom ? (
              <button
                type="button"
                onClick={() => setShowCustom(true)}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                ＋ カスタムサイズを追加
              </button>
            ) : (
              <div className="border-2 border-primary-200 rounded-lg p-4 bg-primary-50">
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="number"
                    placeholder="幅"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(e.target.value)}
                    className="w-24 px-3 py-2 border rounded-lg text-center"
                    min="1"
                    max="5000"
                  />
                  <span className="text-gray-500">×</span>
                  <input
                    type="number"
                    placeholder="高さ"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(e.target.value)}
                    className="w-24 px-3 py-2 border rounded-lg text-center"
                    min="1"
                    max="5000"
                  />
                  <span className="text-xs text-gray-500">px</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAddCustomSize}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
                  >
                    追加
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustom(false);
                      setCustomWidth('');
                      setCustomHeight('');
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            )}

            {/* 選択済みサイズ一覧 */}
            {outputSizes.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {outputSizes.map((size) => (
                  <div
                    key={size}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                  >
                    <span>{size}</span>
                    <button
                      type="button"
                      onClick={() => setOutputSizes(prev => prev.filter(s => s !== size))}
                      className="hover:text-primary-900"
                      aria-label={`${size}を削除`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

              </>
            )}

          {/* 個別設定モード */}
          {individualMode && (
            <div className="space-y-4 mb-6">
              <p className="text-sm text-gray-600">各画像に個別のサイズを設定できます</p>
              {selectedFiles.map((file, idx) => (
                <div key={idx} className="border-2 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start gap-4">
                    {/* サムネイル */}
                    <div className="w-20 h-20 flex-shrink-0">
                      <Image
                        src={previews[idx]}
                        alt={file.name}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover rounded border"
                        unoptimized
                      />
                    </div>

                    {/* ファイル名とサイズ選択 */}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700 mb-2">{file.name}</p>

                      {/* サイズチェックボックス */}
                      <div className="grid grid-cols-3 gap-2">
                        {['2000x2000', '970x600', '300x300', ...outputSizes.filter(s => !['2000x2000', '970x600', '300x300'].includes(s))].map((size) => (
                          <label key={size} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={individualSizes[idx]?.includes(size) || false}
                              onChange={(e) => handleIndividualSizeToggle(idx, size, e.target.checked)}
                              className="rounded"
                            />
                            <span>{size}</span>
                          </label>
                        ))}
                      </div>

                      {/* 選択済みサイズ表示 */}
                      {individualSizes[idx] && individualSizes[idx].length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {individualSizes[idx].map((size) => (
                            <span key={size} className="text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded">
                              {size}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* プレビューグリッド */}
          {!individualMode && (
            <div className="grid grid-cols-4 gap-3 mb-6">
            {previews.map((url, idx) => (
              <div key={idx} className="relative group aspect-square">
                <Image
                  src={url}
                  alt={`${idx + 1}`}
                  width={128}
                  height={128}
                  className="w-full h-full object-cover rounded-lg border-2 border-gray-200"
                  unoptimized
                />
                <button
                  onClick={() => removeFile(idx)}
                  className="absolute top-1 right-1 bg-error-500 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-error-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  aria-label="削除"
                >
                  ×
                </button>
              </div>
            ))}
            </div>
          )}

          {/* アップロードボタン */}
          <button
            onClick={handleUpload}
            disabled={
              disabled ||
              selectedFiles.length === 0 ||
              isCompressing ||
              (!individualMode && outputSizes.length === 0)
            }
            className="btn-primary w-full text-lg py-4"
          >
            {isCompressing
              ? '圧縮中...'
              : disabled
                ? '処理中...'
                : `処理開始 (${selectedFiles.length}枚)`
            }
          </button>
        </div>
      )}
    </div>
  );
}