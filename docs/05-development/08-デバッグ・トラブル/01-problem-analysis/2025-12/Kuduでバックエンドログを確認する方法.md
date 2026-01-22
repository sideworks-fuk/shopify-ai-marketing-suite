# Kuduでバックエンドログを確認する方法

## Kuduへのアクセス方法

### 方法1: Azure Portalからアクセス（推奨・リージョン付きURLの問題を回避）

1. **Azure Portal**にログイン
2. **App Service**（バックエンド）を開く
3. 左メニューの「開発ツール」→「高度なツール (Kudu)」をクリック
4. 「移動」ボタンをクリック

**メリット**:
- リージョン付きURL（`.japanwest-01.azurewebsites.net`）の問題を回避
- Trend Microなどのセキュリティソフトによるブロックを回避
- Azure Portal経由で安全にアクセス

---

### 方法2: カスタムドメイン経由でアクセス（試行可能）

**⚠️ 注意**: 標準のAzure App Service（マルチテナント型）では、SCM（Kudu）をカスタムドメイン経由で直接アクセスすることは**公式にはサポートされていません**。ただし、以下の方法を試すことができます：

#### 試行1: パス経由でアクセス

```
https://[カスタムドメイン]/.scm/
```

**例（本番環境）**:
```
https://ec-ranger-api.access-net.co.jp/.scm/
```

**結果**: 通常は動作しませんが、試す価値があります。

#### 試行2: サブドメイン経由（DNS設定が必要・非推奨）

カスタムドメインのサブドメイン（例: `scm.ec-ranger-api.access-net.co.jp`）を設定する方法もありますが、**標準のApp Serviceでは動作しません**。App Service Environment (ASE) を使用している場合のみ可能です。

---

### 方法3: 直接URLでアクセス（リージョン付きURL）

```
https://[アプリ名].scm.japanwest-01.azurewebsites.net
```

**例（本番環境）**:
```
https://ec-ranger-backend-prod-ghf3bbarghcwh4gn.scm.japanwest-01.azurewebsites.net
```

**⚠️ 問題点**:
- Trend Microなどのセキュリティソフトでブロックされる可能性
- SSL証明書エラーが発生する場合がある
- アクセスできない場合がある

**回避策**:
- 別のネットワーク（例: モバイルテザリング）からアクセス
- Trend Microの管理者にホワイトリスト追加を依頼
- **方法1（Azure Portal経由）を使用することを推奨**

---

### 方法4: Azure Portalの「ログストリーム」を使用（Kudu不要）

Kuduにアクセスできない場合、Azure Portalの「ログストリーム」機能を使用できます：

1. **Azure Portal**にログイン
2. **App Service**（バックエンド）を開く
3. 左メニューの「監視」→「ログストリーム」をクリック
4. リアルタイムでログを確認

**メリット**:
- Kuduへのアクセスが不要
- リアルタイムでログを確認可能
- リージョン付きURLの問題を回避

---

## 🔧 カスタムドメイン経由でKuduにアクセスできない場合の対処法

### 問題: リージョン付きURL（`.japanwest-01.azurewebsites.net`）でエラーになる

**原因**:
- Trend Microなどのセキュリティソフトによるブロック
- SSL証明書の不一致エラー

**解決策**:

1. **Azure Portal経由でアクセス（推奨）**
   - 方法1を使用
   - リージョン付きURLの問題を完全に回避

2. **別のネットワークからアクセス**
   - モバイルテザリングを使用
   - 別のネットワーク環境からアクセス

3. **Trend Microのホワイトリスト追加を依頼**
   - セキュリティ管理者に依頼
   - 以下のURLをホワイトリストに追加：
     ```
     *.scm.japanwest-01.azurewebsites.net
     *.japanwest-01.azurewebsites.net
     ```

4. **ログストリームを使用（Kudu不要）**
   - 方法4を使用
   - ログ確認のみの場合は十分

---

## 📝 まとめ

### 推奨アクセス方法（優先順位）

1. **Azure Portal経由（方法1）** ← **最も推奨**
   - リージョン付きURLの問題を回避
   - セキュリティソフトによるブロックを回避
   - 最も安全で確実

2. **ログストリーム（方法4）**
   - Kuduへのアクセスが不要
   - ログ確認のみの場合は十分

3. **直接URL（方法3）**
   - アクセスできる場合のみ使用
   - セキュリティソフトによるブロックに注意

4. **カスタムドメイン経由（方法2）**
   - 標準のApp Serviceでは動作しない可能性が高い
   - 試す価値はあるが、期待しないこと

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

## ⚠️ Kuduにアクセスできない場合

Kudu（高度なツール）にアクセスできない場合（SSLエラー、セキュリティソフトによるブロックなど）は、以下の代替手段を使用してください：

### 代替手段

1. **Azure Portalのログストリーム**（最も簡単・推奨）
   - Azure Portal → App Service → 監視 → ログストリーム
   - リアルタイムでログを確認可能

2. **Application Insights**（最も強力・推奨）
   - Azure Portal → Application Insights → ログ
   - 過去のログも確認可能、高度なクエリ機能

3. **Azure CLIでログをダウンロード**
   - ログファイルをローカルにダウンロード可能
   - テキストエディタやログ解析ツールで分析可能

詳細は以下のドキュメントを参照してください：
- [Kuduアクセス不可時のログ確認方法](../../02-tools/Kuduアクセス不可時のログ確認方法.md)

---

## 参考リンク

- [Azure App Service のログ](https://learn.microsoft.com/ja-jp/azure/app-service/troubleshoot-diagnostic-logs)
- [Kudu の使用](https://github.com/projectkudu/kudu/wiki)
- [Kuduアクセス不可時のログ確認方法](../../02-tools/Kuduアクセス不可時のログ確認方法.md)

