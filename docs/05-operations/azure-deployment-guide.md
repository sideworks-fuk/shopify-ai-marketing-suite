# Azure デプロイガイド

## 概要
フロントエンド（Next.js）をAzureにデプロイする2つの選択肢について説明します。

## オプション1: Azure Static Web Apps（推奨）

### メリット
- ✅ **無料枠**: 月500GB転送量まで無料
- ✅ **自動SSL**: HTTPSが自動設定
- ✅ **CDN**: グローバル配信で高速
- ✅ **プレビュー環境**: PR毎に自動デプロイ
- ✅ **Next.js最適化**: 自動最適化機能

### 設定手順

#### 1. Azure Portal での設定
```bash
# 1. Azure Portal で Static Web Apps を作成
# 2. GitHub リポジトリを接続
# 3. ビルド設定:
#    - App location: /frontend
#    - Output location: .next
#    - Build command: npm run build
```

#### 2. GitHub シークレット設定
```bash
# リポジトリ Settings > Secrets and variables > Actions
AZURE_STATIC_WEB_APPS_API_TOKEN=<Azure Portal から取得>
```

#### 3. 自動デプロイ開始
- `main` ブランチにプッシュで自動デプロイ
- PRで自動プレビュー環境作成

---

## オプション2: Azure App Service

### メリット
- ✅ **統合管理**: バックエンドと同じApp Service
- ✅ **高度な設定**: カスタムドメイン、スケーリング
- ✅ **企業向け**: VNet統合、プライベートエンドポイント

### 設定手順

#### 1. App Service の作成
```bash
# Azure CLI での作成例
az webapp create \
  --resource-group myResourceGroup \
  --plan myAppServicePlan \
  --name myFrontendApp \
  --runtime "NODE|18-lts"
```

#### 2. デプロイ設定
```bash
# GitHub Actions 用の publish profile をダウンロード
# Azure Portal > App Service > Get publish profile
```

#### 3. GitHub シークレット設定
```bash
AZUREAPPSERVICE_PUBLISHPROFILE=<ダウンロードしたファイルの内容>
```

---

## 設定ファイル説明

### Static Web Apps 設定
- **ファイル**: `frontend/staticwebapp.config.json`
- **機能**: ルーティング、API プロキシ、ヘッダー設定

### GitHub Actions
- **Static Web Apps**: `.github/workflows/azure-static-web-apps.yml`
- **App Service**: `.github/workflows/azure-app-service.yml`

---

## API 接続設定

両方のオプションで、バックエンド API への接続は以下で設定済み：

```json
{
  "route": "/api/*",
  "rewrite": "https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net/api/{*}"
}
```

---

## 推奨設定

### 本番環境
**Azure Static Web Apps** を推奨
- コスト効率が良い
- パフォーマンスが高い
- 運用負荷が少ない

### 企業環境
**Azure App Service** を検討
- より高度なセキュリティ要件
- VNet 統合が必要
- 既存インフラとの統合

---

## 次のステップ

1. **どちらかを選択**
2. **Azure リソース作成**
3. **GitHub Secrets 設定**
4. **main ブランチにプッシュしてテスト**

メニューテキストの変更も含まれているので、デプロイ成功後に確認できます！ 