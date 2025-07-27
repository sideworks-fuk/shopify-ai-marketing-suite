# Azure App Service 基本認証有効化ガイド

## 📅 日付: 2025年7月20日

## ❌ 問題
GitHub Actions での Azure App Service 自動デプロイ時に以下のエラーが発生：
```
発行プロファイルのダウンロード
基本認証は無効になっています。
```

## 🔧 解決方法

### 1. Azure Portal での基本認証有効化

#### 手順:
1. **Azure Portal** にアクセス
2. **リソースグループ**: `ShopifyApp`
3. **App Service**: `shopifyaimarketing-api-eastasia`
4. **左メニュー** → **「設定」** → **「構成」**
5. **「全般設定」** タブをクリック
6. **「基本認証」** セクションを見つける
7. **「SCM 基本認証」** を **「オン」** に設定
8. **「FTP 基本認証」** を **「オン」** に設定（オプション）
9. **「保存」** をクリック

#### 設定画面での確認項目:
```yaml
基本認証設定:
✅ SCM 基本認証: オン
✅ FTP 基本認証: オン（推奨）
```

### 2. 発行プロファイルの再ダウンロード

基本認証を有効化後：
1. **App Service** の **「概要」** ページに戻る
2. **「発行プロファイルを取得」** をクリック
3. `.PublishSettings` ファイルがダウンロードされる

### 3. GitHub Secrets の設定

1. **GitHub リポジトリ** → **Settings** → **Secrets and variables** → **Actions**
2. **「New repository secret」** をクリック
3. **Name:** `AZUREAPPSERVICE_PUBLISHPROFILE`
4. **Value:** `.PublishSettings` ファイルの全内容をコピー&ペースト
5. **「Add secret」** をクリック

## 📊 設定後の確認

### GitHub Actions ワークフロー再実行:
```bash
echo "基本認証有効化後のテスト: $(date)" >> backend/ShopifyTestApi/README.md
git add backend/ && git commit -m "fix: 基本認証有効化後の再デプロイテスト"
git push origin main
```

### 期待される結果:
- ✅ ビルド成功
- ✅ Azure App Service へのデプロイ成功  
- ✅ API エンドポイントがアクセス可能

## 🔒 セキュリティ考慮事項

### 基本認証有効化の影響:
- **GitHub Actions**: デプロイが可能になる
- **セキュリティ**: SCM エンドポイントへの基本認証アクセスが有効
- **推奨**: 本番環境では Microsoft Entra ID 認証への移行を検討

### 将来の改善案:
1. **Azure CLI** を使用したデプロイ
2. **Microsoft Entra ID** 認証の利用
3. **Managed Identity** の活用

---

**✅ 基本認証有効化により GitHub Actions の自動デプロイが正常に動作します。** 