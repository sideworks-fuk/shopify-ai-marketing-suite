# バックエンドエラー 500.30 解決チェックリスト

## エラー内容
ASP.NET Core app failed to start - HTTP Error 500.30

## 確認項目

### 1. Azure App Service 環境変数の確認

以下の環境変数が設定されているか確認してください：

#### 必須項目 ✅
- [ ] `ASPNETCORE_ENVIRONMENT` = `Production`
- [ ] `ConnectionStrings__DefaultConnection` = `Server=tcp:ecranger-db-server.database.windows.net,1433;Initial Catalog=ec-ranger-db;Persist Security Info=False;User ID=ecrangeradmin;Password=[実際のパスワード];MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;`
- [ ] `Shopify__ApiKey` = `be1fc09e2135be7cee3b9186ef8bfe80`
- [ ] `Shopify__ApiSecret` = `[実際のシークレット]`
- [ ] `Shopify__Scopes` = `read_products,write_products,read_orders,read_customers,read_analytics,read_reports`
- [ ] `Shopify__WebhookSecret` = `[実際のWebhookシークレット]`
- [ ] `Authentication__SessionSecret` = `[32文字以上のランダム文字列]`
- [ ] `Authentication__JwtKey` = `[32文字以上のランダム文字列]`
- [ ] `FrontendUrl` = `https://white-island-08e0a6300.2.azurestaticapps.net`

### 2. 接続文字列の確認
- [ ] SQL Serverのパスワードが正しい
- [ ] データベース名が `ec-ranger-db` で正しい
- [ ] サーバー名が `ecranger-db-server.database.windows.net` で正しい

### 3. Azure Portal でログ確認
1. App Services → ec-ranger-backend-prod
2. 「ログ ストリーム」でリアルタイムログを確認
3. 「診断と問題解決」→「Application Logs」で詳細エラーを確認

### 4. よくある原因と対処法

#### 原因1: 環境変数の不足
**対処**: 上記リストの環境変数をすべて設定

#### 原因2: データベース接続失敗
**対処**: 
- SQL Serverのファイアウォール規則を確認
- Azure Servicesからのアクセスを許可
- パスワードをリセットして再設定

#### 原因3: Shopify APIシークレットの形式エラー
**対処**: 
- `shpss_` で始まることを確認
- 前後に余分なスペースがないか確認

#### 原因4: JwtKeyまたはSessionSecretが短すぎる
**対処**: 32文字以上のランダム文字列に変更

### 5. 環境変数の生成例

```bash
# SessionSecret生成例（PowerShellで実行）
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})

# JwtKey生成例（PowerShellで実行）
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

### 6. 再デプロイ手順
1. 環境変数を設定後、App Serviceを再起動
2. または GitHub Actions から再デプロイ実行

## 緊急対応

もし環境変数の設定が複雑な場合は、最小限の設定で動作確認：

1. `ASPNETCORE_ENVIRONMENT` = `Production`
2. `ConnectionStrings__DefaultConnection` （データベース接続文字列）
3. `Shopify__ApiKey` と `Shopify__ApiSecret`
4. `FrontendUrl`

これらだけ設定して再起動してみてください。
