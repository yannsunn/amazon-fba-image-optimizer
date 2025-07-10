# Amazon FBA画像最適化システム

Amazon FBAの商品画像を自動的に最適化し、Cloudinaryを使用して高品質な画像処理を実現するWebアプリケーションです。

## 🚀 主な機能

- **画像の自動最適化**: 1500x1500pxの推奨サイズに自動リサイズ
- **バッチ処理**: 複数画像の同時アップロードと並列処理
- **スマート圧縮**: Cloudinaryの自動品質調整で最適なファイルサイズを実現
- **使用量管理**: Cloudinary無料枠の使用状況をリアルタイムで監視
- **セキュリティ**: レート制限、ファイルサイズ制限、CORS保護を実装

## 📋 必要な環境

- Node.js 18.18.0以上
- npm または yarn
- Cloudinaryアカウント（無料枠で利用可能）

## 🛠️ セットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/yannsunn/amazon-fba-image-optimizer.git
cd amazon-fba-image-optimizer
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

`.env.example`をコピーして`.env`ファイルを作成：

```bash
cp .env.example .env
```

以下の環境変数を設定：

```env
# Cloudinary設定（必須）
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# オプション設定
RATE_LIMIT_PER_MINUTE=60
MAX_FILE_SIZE_MB=10
MAX_CONCURRENT_UPLOADS=5
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 でアプリケーションにアクセスできます。

## 🚀 Vercelへのデプロイ

### 1. Vercelアカウントの作成

[Vercel](https://vercel.com)でアカウントを作成し、GitHubアカウントと連携します。

### 2. プロジェクトのインポート

1. Vercelダッシュボードで「New Project」をクリック
2. GitHubリポジトリを選択
3. 環境変数を設定：
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`

### 3. デプロイ

「Deploy」ボタンをクリックすると自動的にビルドとデプロイが実行されます。

## 🔒 セキュリティ機能

- **レート制限**: 1分あたり60リクエストまで（環境変数で調整可能）
- **ファイルサイズ制限**: 最大10MB/ファイル（環境変数で調整可能）
- **ファイルタイプ制限**: JPEG, PNG, GIF, WebPのみ許可
- **CORS保護**: 許可されたオリジンからのみアクセス可能
- **セキュリティヘッダー**: XSS、クリックジャッキング等の攻撃を防止

## 📊 Cloudinary無料枠について

Cloudinaryの無料枠には以下の制限があります：

- **帯域幅**: 25GB/月
- **ストレージ**: 25GB
- **変換回数**: 25,000回/月

アプリケーションは使用量を自動的に監視し、80%を超えると警告を表示します。

## 🛠️ 開発者向け情報

### プロジェクト構造

```
├── app/                    # Next.js App Router
│   ├── api/               # APIエンドポイント
│   └── page.tsx           # メインページ
├── lib/                   # ユーティリティ関数
│   ├── cloudinary.ts      # Cloudinary設定
│   └── security.ts        # セキュリティ機能
├── types/                 # TypeScript型定義
└── public/                # 静的ファイル
```

### 利用可能なスクリプト

```bash
npm run dev      # 開発サーバー起動
npm run build    # プロダクションビルド
npm run start    # プロダクションサーバー起動
npm run lint     # ESLintの実行
```

### パフォーマンス最適化

- 画像処理は並列実行（Promise.allSettled）
- Next.jsの最適化設定（SWC minify、CSS最適化）
- セキュリティヘッダーの自動設定

## 📝 ライセンス

MIT License

## 🤝 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueを作成して変更内容を説明してください。

## 📞 サポート

問題が発生した場合は、[GitHubのIssues](https://github.com/yannsunn/amazon-fba-image-optimizer/issues)で報告してください。