# Azure Production Deployment Guide

## デプロイ目標: 2025年9月10日

## 現在のAzure環境

### バックエンド (API)
- **App Service**: ShopifyTestApi20250720173320
- **URL**: https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net
- **リソースグループ**: ShopifyApp
- **リージョン**: Japan West

### フロントエンド (Static Web App)
- **Static Web App**: brave-sea-038f17a00
- **本番URL**: https://brave-sea-038f17a00.1.azurestaticapps.net
- **開発URL**: https://brave-sea-038f17a00-development.eastasia.1.azurestaticapps.net
- **ステージングURL**: https://brave-sea-038f17a00-staging.eastasia.1.azurestaticapps.net

### データベース
- **SQL Server**: shopify-test-server.database.windows.net
- **Database**: shopify-test-db
- **ユーザー**: sqladmin

## デプロイ手順

### 1. バックエンド (C# API) デプロイ

#### Visual Studio経由でのデプロイ（推奨）
```powershell
# 1. ソリューションを開く
cd backend\ShopifyAnalyticsApi
start ShopifyAnalyticsApi.sln

# 2. Visual Studioで:
#    - ソリューションエクスプローラーでプロジェクトを右クリック
#    - "発行" を選択
#    - 既存のプロファイル "ShopifyTestApi20250720173320 - Web Deploy" を選択
#    - "発行" ボタンをクリック
```

#### コマンドライン経由でのデプロイ
```powershell
# プロジェクトディレクトリに移動
cd backend\ShopifyAnalyticsApi

# Releaseビルド
dotnet build -c Release

# 発行
dotnet publish -c Release -o ./publish

# Azure CLIでデプロイ（要Azure CLI）
az webapp deploy --resource-group ShopifyApp `
  --name ShopifyTestApi20250720173320 `
  --src-path ./publish.zip `
  --type zip
```

### 2. フロントエンド (Next.js) デプロイ

#### 環境変数の設定
```bash
# .env.production ファイルを作成
cat > frontend/.env.production << EOF
NEXT_PUBLIC_API_URL=https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net
NEXT_PUBLIC_APP_URL=https://brave-sea-038f17a00.1.azurestaticapps.net
NEXT_PUBLIC_SHOPIFY_APP_KEY=3d9cba27a2b95f822caab6d907635538
EOF
```

#### ビルドとデプロイ
```bash
# フロントエンドディレクトリに移動
cd frontend

# 依存関係インストール
npm install

# 本番ビルド
npm run build

# Static Web Appへのデプロイは GitHub Actions経由で自動実行
# または Azure Static Web Apps CLIを使用:
npm install -g @azure/static-web-apps-cli
swa deploy ./out --deployment-token <your-deployment-token>
```

### 3. データベースマイグレーション

#### SQL Server Management Studio (SSMS) を使用
```sql
-- 1. SSMSで接続
-- Server: shopify-test-server.database.windows.net
-- Database: shopify-test-db
-- Authentication: SQL Server Authentication
-- User: sqladmin
-- Password: ShopifyTest2025!

-- 2. 最新のマイグレーションスクリプトを実行
-- 場所: /docs/04-development/03-データベース/マイグレーション/
```

#### Entity Framework マイグレーション
```powershell
cd backend\ShopifyAnalyticsApi

# マイグレーションの確認
dotnet ef migrations list

# 本番データベースへの適用
$env:ConnectionStrings__DefaultConnection = "Server=tcp:shopify-test-server.database.windows.net,1433;Initial Catalog=shopify-test-db;Persist Security Info=False;User ID=sqladmin;Password=ShopifyTest2025!;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"

dotnet ef database update
```

## 環境変数設定

### App Service設定（Azure Portal）
1. Azure Portalにログイン
2. App Service "ShopifyTestApi20250720173320" を選択
3. 構成 → アプリケーション設定
4. 以下の環境変数を設定:

```json
{
  "ASPNETCORE_ENVIRONMENT": "Production",
  "ConnectionStrings__DefaultConnection": "Server=tcp:shopify-test-server.database.windows.net,1433;...",
  "Shopify__ApiKey": "3d9cba27a2b95f822caab6d907635538",
  "Shopify__ApiSecret": "cf69d47d507cd38b2c81650bc193a508",
  "Shopify__WebhookSecret": "<webhook-secret>",
  "Jwt__Key": "<production-jwt-key>",
  "Frontend__BaseUrl": "https://brave-sea-038f17a00.1.azurestaticapps.net"
}
```

## デプロイ前チェックリスト

### コード準備
- [ ] すべてのTypeScriptエラーが解消されている
- [ ] `npm run build` が成功する
- [ ] `dotnet build -c Release` が成功する
- [ ] 単体テストがすべてパスする

### セキュリティ
- [ ] 本番用のJWTキーを設定
- [ ] WebhookSecretを設定
- [ ] APIキー・シークレットを環境変数に設定
- [ ] デバッグモードが無効化されている

### データベース
- [ ] 本番データベースのバックアップ
- [ ] マイグレーションスクリプトの準備
- [ ] インデックスの最適化

### 監視
- [ ] Application Insightsの設定
- [ ] ログレベルの調整
- [ ] アラートの設定

## デプロイ後の確認

### 1. ヘルスチェック
```bash
# API ヘルスチェック
curl https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net/health

# フロントエンド確認
curl https://brave-sea-038f17a00.1.azurestaticapps.net
```

### 2. 機能テスト
- [ ] OAuth認証フロー
- [ ] GDPR Webhooks
- [ ] 課金システム
- [ ] 主要な分析機能

### 3. パフォーマンス確認
- [ ] ページロード時間 < 3秒
- [ ] API応答時間 < 500ms
- [ ] エラー率 < 1%

## トラブルシューティング

### よくある問題と解決方法

#### 1. CORS エラー
```csharp
// appsettings.Production.json のCORS設定を確認
"Cors": {
  "AllowedOrigins": [
    "https://brave-sea-038f17a00.1.azurestaticapps.net"
  ]
}
```

#### 2. データベース接続エラー
- Azure Portal でSQL Serverのファイアウォール設定を確認
- App ServiceのIPアドレスを許可リストに追加

#### 3. 認証エラー
- Shopify Partner DashboardでリダイレクトURLを確認
- App ServiceのSSL証明書を確認

## ロールバック手順

### 即座のロールバック
1. Azure Portal → App Service → デプロイメントスロット
2. 前のバージョンを選択して「スワップ」

### 手動ロールバック
```powershell
# 前のバージョンのタグをチェックアウト
git checkout v1.0.0

# 再デプロイ
dotnet publish -c Release
az webapp deploy ...
```

## 連絡先

### 緊急時の連絡先
- **開発チーム**: Slack #ec-ranger-dev
- **インフラ担当**: 090-7451-6653
- **Azure サポート**: ポータルからチケット作成

## 次のステップ

1. **9/9（月）**: バックエンドデプロイ
2. **9/10（火）**: フロントエンドデプロイ
3. **9/10（火）**: 総合テスト実施
4. **9/11（水）**: 最終確認
5. **9/12（木）**: Shopifyアプリ申請

---
*最終更新: 2025-09-08*