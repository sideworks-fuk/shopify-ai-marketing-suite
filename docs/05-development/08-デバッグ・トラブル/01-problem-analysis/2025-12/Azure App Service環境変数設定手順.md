# Azure App Service環境変数設定手順

## 問題

バックエンドが起動時に以下のエラーで失敗：
```
System.InvalidOperationException: The ConnectionString property has not been initialized.
```

## 原因

Azure App Serviceの環境変数で `ConnectionStrings__DefaultConnection` が設定されていない。

## 解決方法

### ステップ1: Azure Portalで環境変数を設定

1. **Azure Portal**にログイン
2. **App Service**（バックエンド）を開く
3. 左メニューの「設定」→「構成」をクリック
4. 「アプリケーション設定」タブを選択
5. 「+ 新しいアプリケーション設定」をクリック

### ステップ2: 接続文字列を追加

**設定名**: `ConnectionStrings__DefaultConnection`

**設定値**: Azure SQL Databaseの接続文字列
```
Server=tcp:[サーバー名].database.windows.net,1433;Initial Catalog=[データベース名];Persist Security Info=False;User ID=[ユーザー名];Password=[パスワード];MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;
```

**例**:
```
Server=tcp:shopify-test-server.database.windows.net,1433;Initial Catalog=shopify-test-db;Persist Security Info=False;User ID=sqladmin;Password=ShopifyTest2025!;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;
```

### ステップ3: その他の必須環境変数（推奨）

以下の環境変数も設定することを推奨します：

| 設定名 | 説明 | 例 |
|--------|------|-----|
| `ConnectionStrings__DefaultConnection` | データベース接続文字列（必須） | `Server=tcp:...` |
| `ApplicationInsights__ConnectionString` | Application Insights接続文字列（推奨） | `InstrumentationKey=...` |
| `ConnectionStrings__Redis` | Redis接続文字列（オプション） | `[Redis接続文字列]` |

### ステップ4: 設定を保存

1. 「保存」ボタンをクリック
2. 「続行」をクリックして確認
3. App Serviceが自動的に再起動されます

### ステップ5: 動作確認

1. App Serviceの「監視」→「ログストリーム」を開く
2. 起動ログを確認
3. エラーが表示されなくなったことを確認

## 注意事項

### 環境変数の命名規則

Azure App Serviceでは、設定ファイルの階層構造を環境変数で表現する際、`:` の代わりに `__`（アンダースコア2つ）を使用します。

**設定ファイル**:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "..."
  }
}
```

**環境変数**:
```
ConnectionStrings__DefaultConnection=...
```

### 接続文字列のセキュリティ

- 接続文字列には機密情報（パスワードなど）が含まれます
- Azure Key Vaultを使用することを推奨します
- 環境変数は暗号化されて保存されますが、適切なアクセス制御を実施してください

## トラブルシューティング

### 問題1: 環境変数を設定してもエラーが続く

**確認事項**:
1. 環境変数名が正しいか（`ConnectionStrings__DefaultConnection`）
2. 接続文字列が正しいか
3. App Serviceが再起動されたか

**対処法**:
1. App Serviceを手動で再起動
2. ログストリームでエラーメッセージを確認
3. 接続文字列を再確認

### 問題2: 接続文字列が正しく読み込まれない

**確認事項**:
1. 環境変数の命名規則（`__` を使用）
2. 接続文字列の形式が正しいか
3. 特殊文字がエスケープされているか

**対処法**:
1. 接続文字列を再確認
2. Azure Portalの「構成」で設定値を確認
3. 必要に応じて接続文字列を再設定

## 参考リンク

- [Azure App Service のアプリケーション設定](https://learn.microsoft.com/ja-jp/azure/app-service/configure-common)
- [Azure SQL Database の接続文字列](https://learn.microsoft.com/ja-jp/azure/azure-sql/database/connect-query-dotnet-visual-studio)

