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
      <div className="text-center mb-8">
        <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-primary-600 mx-auto mb-6"></div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          処理中
        </h2>
        <p className="text-gray-600">
          {steps[currentStep]}
        </p>
      </div>

      {/* プログレスバー */}
      <div className="mb-6">
        <div className="flex justify-between text-sm font-medium text-gray-700 mb-3">
          <span>{Math.round(progress)}%</span>
          <span>{formatTime(elapsedTime)}</span>
        </div>
        <div className="progress-bar h-3">
          <div
            className="progress-fill"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* ステップインジケーター */}
      <div className="flex justify-center items-center space-x-2">
        {steps.map((_, index) => (
          <div
            key={index}
            className={`h-2 rounded-full transition-all ${
              index <= currentStep ? 'w-8 bg-primary-600' : 'w-2 bg-gray-300'
            }`}
          />
        ))}
      </div>
    </div>
  );
}