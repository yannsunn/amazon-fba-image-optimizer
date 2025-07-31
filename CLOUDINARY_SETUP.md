# Cloudinary 無料アカウント設定手順

## 1. アカウント作成
1. [Cloudinary](https://cloudinary.com/users/register/free) にアクセス
2. 無料アカウントを作成

## 2. 認証情報の取得
1. ダッシュボードにログイン
2. 以下の情報をコピー：
   - Cloud Name
   - API Key
   - API Secret

## 3. Vercelで環境変数を設定
以下の環境変数を追加：
```
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

**重要**: 実際の認証情報は絶対にコードやドキュメントにコミットしないでください。
これらの値はCloudinaryダッシュボードから取得し、Vercelの環境変数として直接設定してください。

## 4. 無料枠の制限
- **ストレージ**: 25GB
- **帯域幅**: 月25GB
- **変換**: 月25,000回
- **リセット**: 毎月1日にリセット

## 5. 主な機能
- 自動画質最適化（q_auto）
- フォーマット自動選択（f_auto）
- リサイズ（w_1000,h_1000,c_limit）
- Amazon商品画像用の最適化