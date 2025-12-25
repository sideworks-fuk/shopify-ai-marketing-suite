# Kuduでバックエンドログを確認する方法

## Kuduへのアクセス方法

### 方法1: Azure Portalからアクセス

1. **Azure Portal**にログイン
2. **App Service**（バックエンド）を開く
3. 左メニューの「開発ツール」→「高度なツール (Kudu)」をクリック
4. 「移動」ボタンをクリック

### 方法2: 直接URLでアクセス

```
https://[アプリ名].scm.azurewebsites.net
```

例：
```
https://shopifytestapi20250720173320-aed5bhc0cferg2hm.scm.japanwest-01.azurewebsites.net
```

## ログの確認方法

### 1. ログストリーム（リアルタイムログ）

**Kuduのメニューから**:
- 「Debug console」→「CMD」または「PowerShell」を選択
- 以下のコマンドを実行：

```powershell
# ログファイルの場所を確認
Get-ChildItem D:\home\LogFiles\ -Recurse | Select-Object FullName, LastWriteTime | Sort-Object LastWriteTime -Descending | Select-Object -First 20
```

**または、Azure Portalから**:
- App Service → 「監視」→「ログストリーム」
- リアルタイムでログを確認できます

### 2. アプリケーションログファイル

**Kuduのメニューから**:
- 「Debug console」→「CMD」を選択
- 以下のパスに移動：

```
D:\home\LogFiles\Application\
```

**主要なログファイル**:
- `Logging-errors.txt` - エラーログ
- `Logging-warnings.txt` - 警告ログ
- `Logging-information.txt` - 情報ログ

### 3. 起動エラーの確認

**Kuduのメニューから**:
- 「Debug console」→「CMD」を選択
- 以下のパスを確認：

```
D:\home\LogFiles\
```

**確認すべきファイル**:
- `eventlog.xml` - イベントログ
- `DetailedErrors\` - 詳細エラーログ（500エラー時）

### 4. Application Insights（推奨）

**Azure Portalから**:
- App Service → 「監視」→「Application Insights」
- 「ログ」をクリック
- クエリを実行：

```kusto
traces
| where timestamp > ago(1h)
| where severityLevel >= 3  // Error以上
| order by timestamp desc
| take 100
```

## 起動エラーの確認手順

### ステップ1: ログストリームで確認

1. Azure Portal → App Service → 「監視」→「ログストリーム」
2. アプリを再起動
3. エラーメッセージを確認

### ステップ2: Kuduでログファイルを確認

1. Kuduにアクセス
2. 「Debug console」→「CMD」を選択
3. 以下のコマンドを実行：

```cmd
cd D:\home\LogFiles
dir /s /b *.txt | findstr /i "error"
```

### ステップ3: 最新のエラーログを確認

```cmd
cd D:\home\LogFiles\Application
type Logging-errors.txt | more
```

### ステップ4: 詳細エラーログを確認（500エラー時）

```cmd
cd D:\home\LogFiles\DetailedErrors
dir
type [最新のファイル名]
```

## よくあるエラーパターン

### 1. 依存関係の注入エラー

**エラーメッセージ例**:
```
System.InvalidOperationException: Unable to resolve service for type 'X' while attempting to activate 'Y'.
```

**確認方法**:
- エラーメッセージから不足しているサービスを特定
- `Program.cs` のサービス登録を確認

### 2. データベース接続エラー

**エラーメッセージ例**:
```
System.Data.SqlClient.SqlException: Cannot open database "X" requested by the login.
```

**確認方法**:
- 接続文字列を確認
- Azure SQL Databaseのファイアウォール設定を確認

### 3. マイグレーションエラー

**エラーメッセージ例**:
```
System.Data.SqlClient.SqlException: Invalid object name 'X'.
```

**確認方法**:
- データベースにテーブルが存在するか確認
- マイグレーションを実行

### 4. HangFireの設定エラー

**エラーメッセージ例**:
```
Hangfire.SqlServer.SqlServerStorageException: ...
```

**確認方法**:
- HangFireのデータベース接続を確認
- HangFireのテーブルが作成されているか確認

## ログのダウンロード方法

### Kuduからダウンロード

1. Kudu → 「Debug console」→「CMD」
2. ログファイルの場所に移動
3. ファイルを右クリック → 「Download」

### Azure Portalからダウンロード

1. App Service → 「監視」→「ログストリーム」
2. 「ログのダウンロード」をクリック

## トラブルシューティング

### ログが表示されない場合

1. **Application Insightsが有効か確認**
   - App Service → 「設定」→ 「Application Insights」
   - 接続されているか確認

2. **ログレベルを確認**
   - `appsettings.json` の `Logging:LogLevel` を確認
   - 本番環境では `Information` 以上を推奨

3. **ログファイルの場所を確認**
   - Kuduで `D:\home\LogFiles\` を確認
   - ファイルが存在するか確認

## 次のステップ

1. Kuduでログを確認
2. エラーメッセージを特定
3. エラーメッセージに基づいて原因を調査
4. 必要に応じて修正を実施

## 参考リンク

- [Azure App Service のログ](https://learn.microsoft.com/ja-jp/azure/app-service/troubleshoot-diagnostic-logs)
- [Kudu の使用](https://github.com/projectkudu/kudu/wiki)

