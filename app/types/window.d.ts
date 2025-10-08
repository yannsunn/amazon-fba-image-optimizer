// グローバルWindow型定義の拡張

declare global {
  interface Window {
    completeProcessing?: () => void;
  }
}

export {};
