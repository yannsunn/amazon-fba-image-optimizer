# Amazon FBA Image Optimizer

AI技術を使用してAmazon FBA商品画像を最適化するフルスタックWebアプリケーション

## 🎯 機能

- **AI画像強化**: シャープネス、コントラスト、彩度の自動調整
- **自動リサイズ**: 2000x2000pxの正方形に最適化
- **ファイル最適化**: 10MB以下に圧縮しながら品質を保持
- **バッチ処理**: 最大8枚の画像を同時処理
- **クラウド保存**: AWS S3による安全な画像保存
- **一括ダウンロード**: ZIP形式での一括ダウンロード

## 🏗️ アーキテクチャ

- **フロントエンド**: Next.js + React + TypeScript + Tailwind CSS
- **バックエンド**: FastAPI + Python
- **画像処理**: Pillow + OpenCV
- **ストレージ**: AWS S3
- **デプロイ**: Vercel (フロントエンド) + AWS Lambda (バックエンド)

## 📁 プロジェクト構造

```
amazon-fba-image-optimizer/
├── frontend/                 # Next.js フロントエンド
│   ├── app/
│   │   ├── page.tsx         # メインページ
│   │   ├── layout.tsx       # レイアウト
│   │   ├── globals.css      # スタイル
│   │   ├── api/             # APIルート
│   │   └── components/      # Reactコンポーネント
│   ├── lib/                 # ユーティリティ
│   └── package.json
├── backend/                  # Python処理エンジン
│   ├── main.py              # FastAPIアプリ
│   ├── image_processor.py   # 画像処理ロジック
│   ├── s3_manager.py        # S3管理
│   └── requirements.txt
└── deployment/              # デプロイ設定
    ├── vercel.json
    └── serverless.yml
```

## 🚀 セットアップ

### 1. 環境変数の設定

#### バックエンド (.env)
```bash
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=amazon-fba-images
```

#### フロントエンド (.env.local)
```bash
BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_S3_BUCKET=amazon-fba-images
```

### 2. バックエンドの起動

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. フロントエンドの起動

```bash
cd frontend
npm install
npm run dev
```

## 📋 使用方法

1. **画像選択**: 最大8枚の画像をドラッグ&ドロップまたはクリックで選択
2. **処理開始**: 「処理開始」ボタンをクリック
3. **処理待機**: AI処理の完了を待機（1-3分程度）
4. **ダウンロード**: 最適化された画像をダウンロード
5. **Amazon FBA**: ダウンロードした画像をAmazon Seller Centralにアップロード

## 🔧 技術詳細

### 画像処理パイプライン

1. **画像読み込み**: Pillowによる多形式対応
2. **AI強化処理**: 
   - シャープネス向上 (1.2倍)
   - コントラスト向上 (1.1倍)
   - 彩度向上 (1.1倍)
3. **リサイズ処理**: 
   - アスペクト比保持
   - 2000x2000px正方形キャンバス
   - 中央配置
4. **最適化保存**: 
   - JPEG形式
   - 品質95-70%で動的調整
   - 10MB以下に制限

### API エンドポイント

- `POST /api/process-images`: 画像バッチ処理
- `GET /api/batch/{batch_id}`: バッチ情報取得
- `GET /api/batch/{batch_id}/download-url`: ダウンロードURL生成
- `GET /api/health`: ヘルスチェック

## 🚀 デプロイ

### フロントエンド (Vercel)

```bash
cd frontend
vercel --prod
```

### バックエンド (AWS Lambda)

```bash
cd deployment
serverless deploy
```

## 📊 パフォーマンス

- **処理時間**: 1枚あたり30秒〜1分
- **対応形式**: JPEG, PNG
- **最大バッチ**: 8枚
- **出力解像度**: 2000x2000px
- **ファイルサイズ**: ≤10MB

## 🔒 セキュリティ

- AWS IAM による適切な権限設定
- 一時的なS3署名付きURL
- ファイル形式の検証
- サイズ制限の実装

## 🤝 貢献

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 ライセンス

MIT License

## 🆘 サポート

問題が発生した場合は、以下を確認してください：

1. AWS認証情報が正しく設定されているか
2. S3バケットが存在し、適切な権限があるか
3. すべての依存関係がインストールされているか
4. 環境変数が正しく設定されているか

## 🔄 更新履歴

- v1.0.0: 初回リリース
  - 基本的な画像最適化機能
  - バッチ処理対応
  - S3統合
  - Next.js + FastAPI構成