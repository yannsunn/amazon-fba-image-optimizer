'use client';

import { useState, useEffect, useCallback } from 'react';

// 定数定義
const PROGRESS_UPDATE_INTERVAL_MS = 900;
const PROGRESS_MAX_AUTO = 90;
const COMPLETE_CALLBACK_DELAY_MS = 1000;

interface Props {
  onComplete?: () => void;
}

export default function ProcessingStatus({ onComplete }: Props) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  const steps = [
    '画像アップロード中...',
    'AI画像解析中...',
    '品質向上処理中...',
    'リサイズ処理中...',
    'ファイル最適化中...',
    'クラウド保存中...',
    '処理完了まもなく...'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= PROGRESS_MAX_AUTO) return prev;

        const increment = Math.random() * 2.5 + 0.8;
        const newProgress = Math.min(prev + increment, PROGRESS_MAX_AUTO);

        // ステップ更新（最後のステップまで進まないように調整）
        const stepProgress = (newProgress / PROGRESS_MAX_AUTO) * (steps.length - 1);
        const newStep = Math.floor(stepProgress);
        setCurrentStep(Math.min(newStep, steps.length - 2)); // 最後から2番目まで

        return newProgress;
      });
    }, PROGRESS_UPDATE_INTERVAL_MS);

    return () => clearInterval(progressInterval);
  }, [steps.length]);

  // 外部から完了を制御するための関数
  const completeProcessing = useCallback(() => {
    setProgress(100);
    setCurrentStep(steps.length - 1);
    setTimeout(() => {
      onComplete && onComplete();
    }, COMPLETE_CALLBACK_DELAY_MS);
  }, [onComplete, steps.length]);

  // windowオブジェクトに関数を公開（外部から呼び出し可能にする）
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.completeProcessing = completeProcessing;

      return () => {
        if (typeof window !== 'undefined') {
          delete window.completeProcessing;
        }
      };
    }
  }, [completeProcessing]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="card">
      <div className="text-center mb-6">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 mx-auto mb-4"></div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          画像処理中
        </h2>
        <p className="text-gray-600">
          AI技術を使用して画像を最適化しています...
        </p>
      </div>

      {/* プログレスバー */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>進捗</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* 現在のステップ */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-gray-900">
            {steps[currentStep]}
          </span>
          <span className="text-sm text-gray-500">
            {formatTime(elapsedTime)}
          </span>
        </div>
        <div className="text-sm text-gray-600">
          ステップ {currentStep + 1} / {steps.length}
        </div>
      </div>

      {/* 処理ステップ一覧 */}
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div 
            key={index}
            className={`flex items-center text-sm ${
              index < currentStep 
                ? 'text-success-600' 
                : index === currentStep 
                  ? 'text-primary-600 font-medium' 
                  : 'text-gray-400'
            }`}
          >
            <div className={`w-4 h-4 rounded-full mr-3 flex items-center justify-center ${
              index < currentStep 
                ? 'bg-success-500' 
                : index === currentStep 
                  ? 'bg-primary-500' 
                  : 'bg-gray-300'
            }`}>
              {index < currentStep ? (
                <span className="text-white text-xs">✓</span>
              ) : index === currentStep ? (
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              ) : (
                <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
              )}
            </div>
            {step}
          </div>
        ))}
      </div>

      {/* 処理時間の目安 */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-2">処理時間の目安</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <div>• 1枚: 約30秒〜1分</div>
          <div>• 2-4枚: 約1分〜2分</div>
          <div>• 5-8枚: 約2分〜3分</div>
        </div>
      </div>

      {/* 注意事項 */}
      <div className="mt-4 p-4 bg-warning-50 border border-warning-200 rounded-lg">
        <p className="text-sm text-warning-700">
          <span role="img" aria-label="電球">💡</span> 処理中はブラウザを閉じないでください。
          処理が完了するまでお待ちください。
        </p>
      </div>
    </div>
  );
}