# Azure App Service 環境変数設定ガイド

## 対象: ec-ranger-backend-prod

## 設定場所
Azure Portal → ec-ranger-backend-prod → 設定 → 構成 → アプリケーション設定

## 必須環境変数（最小限3つ）

### 1. ASPNETCORE_ENVIRONMENT
```
名前: ASPNETCORE_ENVIRONMENT
値: Production
```
**重要**: これにより `appsettings.Production.json` が読み込まれます

### 2. ConnectionStrings__DefaultConnection
```
名前: ConnectionStrings__DefaultConnection
値: Server=ec-ranger-sql-prod.database.windows.net;Database=ec-ranger-db-prod;User Id=sqladmin;Password=[データベースのパスワード];MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;
```
**注意**: 
- `[データベースのパスワード]` を実際のパスワードに置き換える
- Azure SQL Database作成時に設定したパスワードを使用

### 3. Shopify__ApiSecret
```
名前: Shopify__ApiSecret  
値: [メモから取得したシークレット]
```
**注意**: `shpss_` で始まる値

## オプション環境変数（appsettings.Production.jsonで設定済み）

以下は既に `appsettings.Production.json` に設定されているため、環境変数での設定は任意：

### Shopify__ApiKey
```
名前: Shopify__ApiKey
値: be1fc09e2135be7cee3b9186ef8bfe80
```

### Shopify__Frontend__BaseUrl
```
名前: Shopify__Frontend__BaseUrl
値: https://white-island-08e0a6300-2.azurestaticapps.net
```

### Frontend__BaseUrl
```
名前: Frontend__BaseUrl
値: https://white-island-08e0a6300-2.azurestaticapps.net
```

## 設定手順

1. **「新しいアプリケーション設定」をクリック**
2. **名前と値を入力**
3. **「OK」をクリック**
4. **すべて入力後、上部の「保存」をクリック**
5. **「続行」で確認**（App Serviceが再起動される）

## 接続文字列の設定（別タブ）

「接続文字列」タブでも設定可能：
```
名前: DefaultConnection
値: [上記と同じ接続文字列]
種類: SQLAzure
```

## 設定の確認方法

### 1. Kudu Console で確認
- App Service → 高度なツール → 移動
- Debug console → PowerShell
- `env` コマンドで環境変数を確認

### 2. ログストリームで確認  
- App Service → 監視 → ログストリーム
- アプリケーション起動時のログを確認

## トラブルシューティング

### 接続文字列が正しくない場合
- Azure SQL Database → 接続文字列 で正しい文字列を取得
- ファイアウォール規則でApp ServiceのIPが許可されているか確認

### 環境変数が反映されない場合
- 「保存」後にApp Serviceを再起動
- スロット設定になっていないか確認

## セキュリティベストプラクティス

1. **パスワードは強固なものを使用**
2. **Azure Key Vault の使用を検討**（将来）
3. **Managed Identity の使用を検討**（将来）

---
作成日: 2025-12-22
作成者: 福田＋AI Assistant
