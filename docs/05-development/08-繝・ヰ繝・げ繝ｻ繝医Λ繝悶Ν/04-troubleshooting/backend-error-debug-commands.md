# バックエンドエラー デバッグコマンド集

## 1. 環境変数の確認（Azure Portal）

現在設定されている環境変数：
- [ ] ASPNETCORE_ENVIRONMENT
- [ ] ConnectionStrings__DefaultConnection  
- [ ] Shopify__ApiSecret (またはShopifyApiSecret)
- [ ] Shopify__ApiKey
- [ ] Authentication__JwtKey
- [ ] Authentication__SessionSecret
- [ ] FrontendUrl

## 2. SQL Server接続テスト

### Azure Portal から：
1. SQL データベース → ec-ranger-db
2. 「クエリ エディター」
3. ログイン情報：
   - ログイン: ecrangeradmin
   - パスワード: [設定したパスワード]
4. 接続成功するか確認

### テストクエリ：
```sql
SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES;
```

## 3. Kudu Console でのデバッグ

### アクセス方法：
```
https://ec-ranger-backend-prod.scm.azurewebsites.net
```

### 確認手順：
1. **Debug console** → **CMD**
2. **LogFiles** フォルダを開く
3. 最新のログファイルを確認

### 詳細ログの場所：
```
D:\home\LogFiles\Application\
D:\home\LogFiles\DetailedErrors\
D:\home\LogFiles\http\RawLogs\
```

## 4. 環境変数の一時的な変更（詳細エラー表示）

デバッグ用に以下を設定：
```
ASPNETCORE_ENVIRONMENT = Development
ASPNETCORE_DETAILEDERRORS = true
```

これで詳細なエラーが表示される。

## 5. よくあるエラーパターンと解決法

### パターン1: SQL接続エラー
```
エラー: "Cannot open database"
原因: パスワードまたはサーバー名の誤り
解決: ConnectionStrings__DefaultConnectionを確認
```

### パターン2: 環境変数名の誤り
```
エラー: "Value cannot be null"
原因: 環境変数名のタイポ（__ vs _）
解決: アンダースコア2つ「__」を確認
```

### パターン3: Shopify API設定エラー
```
エラー: "Shopify configuration is missing"
原因: Shopify__ApiKeyまたはShopify__ApiSecretが未設定
解決: 両方の環境変数を追加
```

### パターン4: JWT設定エラー
```
エラー: "The JwtKey configuration is missing"
原因: Authentication__JwtKeyが未設定または短すぎる
解決: 32文字以上の文字列を設定
```

## 6. 最小構成での起動テスト

すべての環境変数を削除して、以下だけで起動確認：
```
ASPNETCORE_ENVIRONMENT = Development
ConnectionStrings__DefaultConnection = [接続文字列]
```

起動したら、一つずつ環境変数を追加していく。

## 7. ヘルスチェックエンドポイント

動作確認URL：
```
https://ec-ranger-backend-prod-ghf3bbarghcwh4gn.japanwest-01.azurewebsites.net/health
https://ec-ranger-backend-prod-ghf3bbarghcwh4gn.japanwest-01.azurewebsites.net/api/health
```

## 8. 開発環境との比較

開発環境（動作中）の設定を確認：
- Azure Portal → 開発環境のApp Service
- 環境変数をすべて確認
- 本番環境と比較
