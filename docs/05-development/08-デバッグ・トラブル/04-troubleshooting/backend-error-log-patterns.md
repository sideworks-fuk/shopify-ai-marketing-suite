# バックエンドエラー ログパターン集

## よくあるエラーメッセージと解決策

### 1. データベース接続エラー
```
Error: "A network-related or instance-specific error occurred while establishing a connection to SQL Server"
または
"Login failed for user 'ecrangeradmin'"
```
**原因**: 接続文字列のサーバー名またはパスワードが誤っている
**解決**: 
- ConnectionStrings__DefaultConnection を確認
- パスワードに特殊文字がある場合はエスケープ

### 2. アセンブリロードエラー
```
Error: "Could not load file or assembly 'Microsoft.AspNetCore.App'"
または
"The specified framework 'Microsoft.NETCore.App', version '8.0.0' was not found"
```
**原因**: ランタイムの不一致
**解決**: App Service の設定で .NET 8 を確認

### 3. 設定値エラー
```
Error: "Value cannot be null. (Parameter 'connectionString')"
または
"The ConnectionString property has not been initialized"
```
**原因**: 環境変数名のタイポ
**解決**: ConnectionStrings__DefaultConnection（__は2つ）

### 4. Shopify設定エラー
```
Error: "Shopify configuration section is missing"
または
"Unable to resolve service for type 'IShopifyService'"
```
**原因**: Shopify関連の環境変数不足
**解決**: Shopify__ApiKey, Shopify__ApiSecret を確認

### 5. JWT設定エラー
```
Error: "IDX10603: Decryption failed"
または
"The key length must be at least 256 bits"
```
**原因**: JWTキーが短すぎる
**解決**: Authentication__JwtKey を32文字以上に

### 6. CORS エラー
```
Error: "The CORS protocol does not allow specifying a wildcard"
```
**原因**: CORS設定の不整合
**解決**: appsettings.Production.json の Cors セクション確認

### 7. Hangfire エラー
```
Error: "Hangfire.SqlServer.SqlServerStorageException"
```
**原因**: Hangfire用のテーブルがない
**解決**: データベースにHangfireスキーマを作成

## デバッグコマンド（Kudu Console）

### アプリケーションの起動テスト
```cmd
cd D:\home\site\wwwroot
dotnet ShopifyAnalyticsApi.dll
```

### 環境変数の確認
```cmd
set | findstr ASPNETCORE
set | findstr Connection
set | findstr Shopify
```

### ログファイルの確認
```cmd
type D:\home\LogFiles\Application\*.txt
```
