# バックエンド エラー500.30 緊急対応手順

## 最小限必要な環境変数（Azure App Service）

これらを**Azure Portal**で設定してください：

### 1. データベース接続（最重要）
```
名前: ConnectionStrings__DefaultConnection
値: Server=tcp:ecranger-db-server.database.windows.net,1433;Initial Catalog=ec-ranger-db;Persist Security Info=False;User ID=ecrangeradmin;Password=[実際のパスワード];MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;
```

### 2. 環境設定
```
名前: ASPNETCORE_ENVIRONMENT
値: Production
```

### 3. Shopify API（必須）
```
名前: Shopify__ApiKey
値: be1fc09e2135be7cee3b9186ef8bfe80
```

```
名前: Shopify__ApiSecret
値: [実際のシークレット - shpss_で始まる値]
```

### 4. 認証キー（必須）
```
名前: Authentication__JwtKey
値: ThisIsAVeryLongSecretKeyForJWT12345678901234567890
```

```
名前: Authentication__SessionSecret
値: ThisIsAnotherVeryLongSecretForSession1234567890
```

### 5. フロントエンドURL
```
名前: FrontendUrl
値: https://white-island-08e0a6300.2.azurestaticapps.net
```

## 設定手順

1. **Azure Portal** にログイン
2. **App Services** → **ec-ranger-backend-prod**
3. 左メニュー **構成** → **アプリケーション設定**
4. **新しいアプリケーション設定** で上記を追加
5. **保存** をクリック
6. **App Service を再起動**

## 確認方法

### ログストリームで確認
1. 左メニュー **ログ ストリーム**
2. リアルタイムログを確認
3. エラーメッセージを探す

### よくあるエラーメッセージと対処

#### "Cannot open database"
→ ConnectionStrings__DefaultConnection のパスワードを確認

#### "The JwtKey configuration is missing"
→ Authentication__JwtKey を設定

#### "Value cannot be null"
→ 必須の環境変数が不足

## 最小構成での動作確認

もし上記でも動作しない場合、最小限の設定で試す：

1. `ASPNETCORE_ENVIRONMENT` = `Development` に変更
2. App Service を再起動
3. エラーメッセージを確認

## SQL Server パスワードのリセット

パスワードが不明な場合：
1. Azure Portal → SQL Server
2. **SQL 管理者パスワードのリセット**
3. 新しいパスワードを設定
4. ConnectionStrings__DefaultConnection を更新
