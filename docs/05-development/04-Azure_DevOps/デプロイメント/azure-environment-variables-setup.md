# Azure App Service 環境変数設定ガイド

## 概要
このドキュメントは、EC Ranger（旧GEMiNX）のAzure App Service環境変数設定手順を記載します。

## 緊急対応：リダイレクトエラーの修正

### 問題
- Shopifyアプリインストール後、localhostにリダイレクトされてエラーになる
- 原因：環境変数`SHOPIFY_FRONTEND_BASEURL`が未設定

### 解決手順

#### 1. Azure Portalでの設定方法

1. [Azure Portal](https://portal.azure.com/)にログイン
2. **App Services** → **gemx-backend** を選択
3. 左メニューから **構成** (Configuration) を選択
4. **アプリケーション設定** タブを選択
5. **新しいアプリケーション設定** をクリック
6. 以下の環境変数を追加：

| 名前 | 値 | 説明 |
|------|-----|------|
| SHOPIFY_FRONTEND_BASEURL | https://brave-sea-038f17a00.1.azurestaticapps.net | フロントエンドのベースURL |

7. **保存** をクリック
8. **続行** をクリックして再起動を確認

#### 2. Azure CLIでの設定方法

```bash
# 環境変数を設定
az webapp config appsettings set \
  --name gemx-backend \
  --resource-group gemx \
  --settings SHOPIFY_FRONTEND_BASEURL="https://brave-sea-038f17a00.1.azurestaticapps.net"

# 設定確認
az webapp config appsettings list \
  --name gemx-backend \
  --resource-group gemx \
  --query "[?name=='SHOPIFY_FRONTEND_BASEURL']"
```

## その他の重要な環境変数

### 必須環境変数

| 変数名 | 説明 | 本番環境の値 |
|--------|------|--------------|
| ASPNETCORE_ENVIRONMENT | 実行環境 | Production |
| SHOPIFY_FRONTEND_BASEURL | フロントエンドURL | https://brave-sea-038f17a00.1.azurestaticapps.net |
| SHOPIFY_API_KEY | Shopify APIキー | 852886f4184167574f8b9721d1c6c054 |
| SHOPIFY_API_SECRET | Shopify APIシークレット | （Azure Key Vaultで管理推奨） |

### オプション環境変数

| 変数名 | 説明 | デフォルト値 |
|--------|------|-------------|
| APPLICATIONINSIGHTS_CONNECTION_STRING | Application Insights接続文字列 | （未設定） |
| JWT_KEY | JWT署名キー | （appsettings.jsonの値） |

## 環境変数の優先順位

バックエンドコードでは以下の優先順位で設定値を取得します：

1. 環境変数（最優先）
2. appsettings.{Environment}.json
3. appsettings.json

例：`ShopifyAuthController.cs`の実装
```csharp
var frontendUrl = Environment.GetEnvironmentVariable("SHOPIFY_FRONTEND_BASEURL") ?? 
                 _configuration["Shopify:Frontend:BaseUrl"] ?? 
                 _configuration["Frontend:BaseUrl"];
```

## 設定確認方法

### 1. アプリケーションログで確認
```bash
# Application Insightsまたはログストリームで以下のログを確認
"リダイレクトURI生成: FrontendUrl={FrontendUrl}, RedirectUri={RedirectUri}"
```

### 2. ヘルスチェックエンドポイントで確認
```bash
curl https://gemx-backend.azurewebsites.net/health
```

## トラブルシューティング

### リダイレクトエラーが解決しない場合

1. **環境変数が反映されているか確認**
   - App Serviceの再起動が必要な場合があります
   - Kuduコンソールで環境変数を確認：`https://gemx-backend.scm.azurewebsites.net/`

2. **Shopifyアプリ設定を確認**
   - Shopify Partner Dashboardで、Allowed redirection URLsに以下が含まれているか確認：
   - `https://brave-sea-038f17a00.1.azurestaticapps.net/api/shopify/callback`

3. **CORSの設定確認**
   - App ServiceのCORS設定でフロントエンドURLが許可されているか確認

## 関連ドキュメント
- [Shopify OAuth実装詳細](/docs/02-architecture/shopify-oauth-architecture.md)
- [Azure環境構築ガイド](/docs/deployment/azure-setup-guide.md)
- [環境別設定管理](/docs/04-development/environment-configuration.md)

## 更新履歴
- 2025-08-11: 初版作成（リダイレクトエラー対応）