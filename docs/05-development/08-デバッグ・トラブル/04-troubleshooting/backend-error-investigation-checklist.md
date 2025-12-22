# バックエンドエラー500.30 詳細調査チェックリスト

## 1. 環境変数の完全リスト

Azure App Serviceに設定すべき環境変数：

### 必須項目
- [ ] `ASPNETCORE_ENVIRONMENT` = `Production`
- [ ] `ConnectionStrings__DefaultConnection` = SQL接続文字列
- [ ] `Shopify__ApiKey` = `be1fc09e2135be7cee3b9186ef8bfe80`
- [ ] `Shopify__ApiSecret` = shpss_で始まる値
- [ ] `Authentication__JwtKey` = 32文字以上のランダム文字列
- [ ] `Authentication__SessionSecret` = 32文字以上のランダム文字列
- [ ] `FrontendUrl` = `https://white-island-08e0a6300.2.azurestaticapps.net`

### 追加で必要な可能性がある項目
- [ ] `Shopify__WebhookSecret` = Webhook検証用シークレット
- [ ] `Shopify__Scopes` = `read_products,write_products,read_orders,read_customers`
- [ ] `Jwt__Key` = JWTキー（Authentication__JwtKeyと同じ値）
- [ ] `Jwt__Issuer` = `ec-ranger`
- [ ] `Jwt__Audience` = `shopify-stores`

## 2. ログで確認すべきエラーパターン

### パターンA: データベース接続エラー
```
Cannot open database "ec-ranger-db" requested by the login
Login failed for user 'ecrangeradmin'
A network-related or instance-specific error
```
**対処**: ConnectionStrings__DefaultConnectionのパスワードを確認

### パターンB: 設定値エラー
```
Value cannot be null. Parameter name: 
The JwtKey configuration is missing
Unable to resolve service for type
```
**対処**: 必須の環境変数を追加

### パターンC: アセンブリエラー
```
Could not load file or assembly
System.IO.FileNotFoundException
```
**対処**: デプロイを再実行

### パターンD: Startup例外
```
Application startup exception
Unhandled exception in Startup.Configure
```
**対処**: ASPNETCORE_ENVIRONMENT を Development に変更して詳細確認

## 3. SQL Server接続確認

### Azure Portal で確認
1. SQL Server (ecranger-db-server) を開く
2. 「ファイアウォールと仮想ネットワーク」
3. 以下を確認：
   - [ ] 「Azure サービスおよびリソースにこのサーバーへのアクセスを許可する」が「はい」
   - [ ] App ServiceのIPアドレスが許可されている

### 接続文字列の形式
```
Server=tcp:ecranger-db-server.database.windows.net,1433;
Initial Catalog=ec-ranger-db;
Persist Security Info=False;
User ID=ecrangeradmin;
Password=[実際のパスワード];
MultipleActiveResultSets=False;
Encrypt=True;
TrustServerCertificate=False;
Connection Timeout=30;
```

## 4. 一時的な回避策

### オプション1: 詳細ログを有効化
```
ASPNETCORE_ENVIRONMENT = Development
ASPNETCORE_DETAILEDERRORS = true
```

### オプション2: 最小構成で起動
すべての環境変数を削除し、以下だけ設定：
```
ASPNETCORE_ENVIRONMENT = Development
```

## 5. デバッグ用のテストURL

起動確認：
```
https://ec-ranger-backend-prod-ghf3bbarghcwh4gn.japanwest-01.azurewebsites.net/
```

ヘルスチェック：
```
https://ec-ranger-backend-prod-ghf3bbarghcwh4gn.japanwest-01.azurewebsites.net/health
```

Swagger（開発モードの場合）：
```
https://ec-ranger-backend-prod-ghf3bbarghcwh4gn.japanwest-01.azurewebsites.net/swagger
```
