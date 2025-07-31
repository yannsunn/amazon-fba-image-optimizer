import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Amazon FBA画像品質向上ツール | AI画像最適化サービス',
  description: 'AI技術でAmazon FBA商品画像を2000x2000pxに最適化。無料で最大8枚まで同時処理可能。画質向上・リサイズ・圧縮を自動実行し、売上向上をサポートします。',
  keywords: 'Amazon FBA, 画像最適化, AI画像処理, 商品画像, 画質向上, リサイズ, 2000x2000',
  authors: [{ name: 'Amazon FBA Image Optimizer' }],
  robots: 'index, follow',
  metadataBase: new URL('https://amazon-image.awakeinc.co.jp'),
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: 'https://amazon-image.awakeinc.co.jp',
    title: 'Amazon FBA画像品質向上ツール',
    description: 'AI技術でAmazon FBA商品画像を2000x2000pxに最適化。無料で最大8枚まで同時処理可能。',
    siteName: 'Amazon FBA Image Optimizer',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Amazon FBA画像品質向上ツール',
    description: 'AI技術でAmazon FBA商品画像を最適化',
  },
}

export function generateViewport() {
  return {
    width: 'device-width',
    initialScale: 1,
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-6">
                <div className="flex items-center">
                  <h1 className="text-2xl font-bold text-gray-900">
                    Amazon FBA Image Optimizer
                  </h1>
                </div>
                <div className="text-sm text-gray-500">
                  AI画像品質向上ツール
                </div>
              </div>
            </div>
          </header>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}