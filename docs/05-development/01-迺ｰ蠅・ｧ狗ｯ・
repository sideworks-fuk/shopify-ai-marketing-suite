# 本番環境 appsettings 設定ガイド

## ASP.NET Core の設定読み込み順序

ASP.NET Coreは以下の順序で設定を読み込み、後から読み込まれた値が前の値を上書きします：

1. `appsettings.json`（基本設定）
2. `appsettings.{Environment}.json`（環境固有設定）
3. 環境変数
4. コマンドライン引数

## 環境の決定方法

`ASPNETCORE_ENVIRONMENT`環境変数の値によって、どの`appsettings.{Environment}.json`を読むかが決まります：

- `ASPNETCORE_ENVIRONMENT=Development` → `appsettings.Development.json`
- `ASPNETCORE_ENVIRONMENT=Production` → `appsettings.Production.json`
- 未設定の場合 → デフォルトは`Production`

## 本番環境の設定方法

### 方法1: 環境変数で設定（推奨）✅

**メリット**:
- セキュアな値（パスワード、シークレット）をコードに含めない
- デプロイ後も変更可能
- 環境ごとに異なる値を簡単に設定可能

#### 1. GitHub Actions で設定
```yaml
app-settings: |
  ASPNETCORE_ENVIRONMENT=Production
```
✅ **修正済み**: `production_backend.yml`と`production_deploy_all.yml`に追加

#### 2. Azure App Service で設定
Azure Portal → App Service → 構成 → アプリケーション設定

**必須の環境変数**:
```
ASPNETCORE_ENVIRONMENT = Production
ConnectionStrings__DefaultConnection = Server=ec-ranger-sql-prod.database.windows.net;Database=ec-ranger-db-prod;User Id=xxx;Password=xxx
Shopify__ApiSecret = [メモから取得]
```

**オプション（appsettings.Production.jsonで設定済み）**:
```
Shopify__ApiKey = be1fc09e2135be7cee3b9186ef8bfe80
Shopify__Frontend__BaseUrl = https://white-island-08e0a6300-2.azurestaticapps.net
Frontend__BaseUrl = https://white-island-08e0a6300-2.azurestaticapps.net
```

### 方法2: appsettings.Production.json で設定

**現在の設定状況**:
- ✅ Shopify API Key: 本番用に更新済み
- ✅ Frontend URLs: 本番URLに更新済み
- ✅ CORS: 本番URLのみ許可
- ⚠️ ConnectionString: 環境変数で上書き必要
- ⚠️ Shopify API Secret: 環境変数で上書き必要

## 環境変数の命名規則

ASP.NET Coreでは、階層的な設定を環境変数で表現する際に`__`（ダブルアンダースコア）を使用します：

```json
// appsettings.json
{
  "Shopify": {
    "ApiKey": "value",
    "Frontend": {
      "BaseUrl": "value"
    }
  }
}
```

対応する環境変数：
```
Shopify__ApiKey = value
Shopify__Frontend__BaseUrl = value
```

## 設定の優先順位の例

1. **appsettings.json**: `"ApiKey": "開発用キー"`
2. **appsettings.Production.json**: `"ApiKey": "本番用キー"`
3. **環境変数**: `Shopify__ApiKey = "環境変数のキー"`

最終的に使用される値: **環境変数のキー**

## デバッグ方法

### 1. 現在の環境を確認
```csharp
// Program.cs や Controller で確認
var environment = app.Environment.EnvironmentName;
logger.LogInformation($"Current environment: {environment}");
```

### 2. 設定値を確認
```csharp
var apiKey = configuration["Shopify:ApiKey"];
logger.LogInformation($"Shopify API Key: {apiKey?.Substring(0, 4)}...");
```

### 3. Azure App Service のログで確認
Azure Portal → App Service → ログストリーム

## チェックリスト

### GitHub Actions
- [x] `ASPNETCORE_ENVIRONMENT=Production`を設定

### Azure App Service
- [ ] `ASPNETCORE_ENVIRONMENT = Production`を設定
- [ ] `ConnectionStrings__DefaultConnection`を設定
- [ ] `Shopify__ApiSecret`を設定

### appsettings.Production.json
- [x] Shopify API Keyを本番用に更新
- [x] Frontend URLsを本番用に更新
- [x] CORSを本番URLのみに制限

## トラブルシューティング

### 問題: appsettings.Production.jsonが読み込まれない
**原因**: `ASPNETCORE_ENVIRONMENT`が設定されていない
**解決**: Azure App Serviceの環境変数に`ASPNETCORE_ENVIRONMENT=Production`を追加

### 問題: 開発用の設定が使用される
**原因**: `appsettings.json`の値が使用されている
**解決**: 
1. `ASPNETCORE_ENVIRONMENT`を確認
2. `appsettings.Production.json`が正しくデプロイされているか確認
3. 環境変数で明示的に上書き

### 問題: 環境変数が反映されない
**原因**: App Serviceの再起動が必要
**解決**: Azure Portal → App Service → 再起動

---
作成日: 2025-12-22
作成者: 福田＋AI Assistant
