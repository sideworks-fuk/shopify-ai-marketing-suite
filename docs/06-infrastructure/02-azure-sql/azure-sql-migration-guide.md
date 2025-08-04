# Azure SQL データ移行・復元ガイド

## 📋 ドキュメント情報
- **作成日**: 2025年7月3日
- **作成者**: AI Assistant
- **バージョン**: v1.0
- **目的**: Azure SQL環境間のデータ移行・復元方法の解説

---

## 🎯 移行パターン別の手間比較

### 難易度レベル
- ⭐ 簡単（5分以内）
- ⭐⭐ 普通（30分程度）
- ⭐⭐⭐ やや複雑（1時間以上）

| 移行元 | 移行先 | 難易度 | 推奨方法 |
|--------|--------|--------|----------|
| ローカル | ローカル | ⭐ | バックアップ/リストア |
| ローカル | Azure個別DB | ⭐⭐ | .bacpac |
| ローカル | エラスティックプール | ⭐⭐ | .bacpac |
| Azure個別DB | Azure個別DB | ⭐ | コピー機能 |
| Azure個別DB | エラスティックプール | ⭐ | 移動機能 |
| エラスティックプール | Azure個別DB | ⭐ | 移動機能 |
| Azure | ローカル | ⭐⭐ | .bacpac |

---

## 🛠️ 各パターンの具体的手順

### 1. ローカル → ローカル（最も簡単）⭐

```sql
-- バックアップ作成
BACKUP DATABASE [ShopifyDB] 
TO DISK = 'C:\Backup\ShopifyDB.bak'
WITH FORMAT, INIT;

-- リストア
RESTORE DATABASE [ShopifyDB_Copy] 
FROM DISK = 'C:\Backup\ShopifyDB.bak'
WITH MOVE 'ShopifyDB' TO 'C:\Data\ShopifyDB_Copy.mdf',
MOVE 'ShopifyDB_log' TO 'C:\Data\ShopifyDB_Copy_log.ldf';
```

**所要時間**: 1GB当たり約1分

---

### 2. ローカル → Azure（.bacpac方式）⭐⭐

#### 方法A: SSMS を使用（推奨）

```
1. SSMS でローカルDBに接続
2. データベースを右クリック
3. タスク → データ層アプリケーションのエクスポート
4. .bacpac ファイルを保存
5. Azure Portal または SSMS から インポート
```

#### 方法B: SqlPackage コマンドライン

```powershell
# エクスポート
SqlPackage.exe /Action:Export `
  /SourceServerName:localhost `
  /SourceDatabaseName:ShopifyDB `
  /TargetFile:"C:\Backup\ShopifyDB.bacpac"

# Azure へインポート
SqlPackage.exe /Action:Import `
  /TargetServerName:"shopify-server.database.windows.net" `
  /TargetDatabaseName:ShopifyDB `
  /TargetUser:sqladmin `
  /TargetPassword:YourPassword `
  /SourceFile:"C:\Backup\ShopifyDB.bacpac"
```

**注意点**:
- インターネット速度に依存
- 大きなDBは時間がかかる（1GB = 約30分）

---

### 3. Azure個別DB → Azure個別DB（同一サーバー）⭐

#### 最速：データベースコピー

```powershell
# Azure Portal から
# 1. ソースDBを選択
# 2. 「コピー」をクリック
# 3. 新しい名前を入力

# または Azure CLI
az sql db copy `
  --resource-group shopify-rg `
  --server shopify-server `
  --name source-db `
  --dest-name target-db
```

**所要時間**: 数分（サイズによらず高速）

---

### 4. Azure個別DB ↔ エラスティックプール ⭐

#### DBをプールに移動

```powershell
# 個別DB → プール
az sql db update `
  --resource-group shopify-rg `
  --server shopify-server `
  --name mydb `
  --elastic-pool mypool

# プール → 個別DB
az sql db update `
  --resource-group shopify-rg `
  --server shopify-server `
  --name mydb `
  --service-objective S0 `
  --elastic-pool ""
```

**所要時間**: 即座（ダウンタイムなし）

---

### 5. Azure → ローカル ⭐⭐

```powershell
# 1. Azure からエクスポート
az sql db export `
  --resource-group shopify-rg `
  --server shopify-server `
  --name ShopifyDB `
  --admin-user sqladmin `
  --admin-password YourPassword `
  --storage-key "YOUR_STORAGE_KEY" `
  --storage-key-type StorageAccessKey `
  --storage-uri "https://mystorageaccount.blob.core.windows.net/backups/ShopifyDB.bacpac"

# 2. ダウンロードしてローカルにインポート
SqlPackage.exe /Action:Import `
  /TargetServerName:localhost `
  /TargetDatabaseName:ShopifyDB_FromAzure `
  /SourceFile:"C:\Downloads\ShopifyDB.bacpac"
```

---

## 🔄 自動バックアップと復元

### Azure の自動バックアップ

```yaml
Basic/S0-S2:
- 自動バックアップ: 7日間保持
- ポイントインタイムリストア: 可能
- 地理冗長: オプション

復元方法:
1. Azure Portal → SQL Database
2. 「復元」をクリック
3. 復元ポイントを選択（分単位で指定可能）
4. 新しいDB名を入力
```

### ローカルの自動バックアップ設定

```sql
-- メンテナンスプラン作成
EXEC sp_add_maintenance_plan @plan_name = 'Daily Backup'

-- またはSQL Agent ジョブ
EXEC sp_add_job @job_name = 'Nightly Backup'
```

---

## 💡 実践的なシナリオ別ガイド

### シナリオ1: 開発環境の日次リフレッシュ

```powershell
# 本番DBを開発環境にコピー（Azure内）
# 1. 本番DBをコピー
az sql db copy `
  --resource-group prod-rg `
  --server prod-server `
  --name production-db `
  --dest-server dev-server `
  --dest-resource-group dev-rg `
  --dest-name dev-db-$(Get-Date -Format "yyyyMMdd")

# 2. データをマスク（機密情報を隠す）
Invoke-Sqlcmd -Query @"
UPDATE Customers SET 
  Email = CONCAT('user', CustomerId, '@example.com'),
  Phone = '000-0000-0000'
"@ -ServerInstance "dev-server.database.windows.net" -Database "dev-db"
```

### シナリオ2: 災害復旧テスト

```yaml
定期的な復旧訓練:
1. 本番バックアップから別リージョンに復元
2. アプリケーション接続テスト
3. データ整合性確認
4. テスト環境削除

自動化スクリプト例:
```

```powershell
# disaster-recovery-test.ps1
$sourceDb = "production-db"
$testDb = "dr-test-$(Get-Date -Format 'yyyyMMdd')"

# 別リージョンに復元
az sql db restore `
  --resource-group shopify-rg `
  --server shopify-server `
  --name $sourceDb `
  --dest-name $testDb `
  --time (Get-Date).AddHours(-1).ToString("yyyy-MM-ddTHH:mm:ss")

# 接続テスト
Test-SqlConnection -Server "shopify-server" -Database $testDb
```

---

## 📊 移行時間の目安

### データサイズ別の所要時間

| データサイズ | ローカル→ローカル | ローカル→Azure | Azure内コピー |
|------------|------------------|----------------|--------------|
| 100MB | 10秒 | 5分 | 1分 |
| 1GB | 1分 | 30分 | 2分 |
| 10GB | 10分 | 3時間 | 5分 |
| 100GB | 60分 | 12時間+ | 15分 |

**ポイント**: Azure内のコピーは圧倒的に高速！

---

## ⚠️ よくあるトラブルと対処法

### 1. .bacpac インポートエラー

```
エラー: "Could not import package. 
Error SQL72014: .Net SqlClient Data Provider"

原因: 非対応の機能やオブジェクト

対処法:
1. エクスポート前にチェック
   - システムオブジェクトを除外
   - カスタムCLRを削除
   - Service Brokerを無効化

2. 互換性レベルを調整
   ALTER DATABASE [MyDB] 
   SET COMPATIBILITY_LEVEL = 150; -- SQL Server 2019
```

### 2. タイムアウトエラー

```powershell
# SqlPackage でタイムアウト延長
SqlPackage.exe /Action:Import `
  /TargetServerName:"server.database.windows.net" `
  /Properties:CommandTimeout=0 `  # 無制限
  /Properties:DatabaseLockTimeout=60
```

### 3. ストレージ容量不足

```yaml
対策:
1. 一時的にDBサイズを拡張
2. 不要なデータを削除してからエクスポート
3. テーブル単位で分割移行
```

---

## 🎯 ベストプラクティス

### 1. 移行前チェックリスト

```markdown
□ 移行元のDBサイズ確認
□ 移行先の容量確保
□ アプリケーション停止計画
□ 接続文字列の準備
□ ロールバック手順の確認
□ 移行後の動作確認項目リスト
```

### 2. 大規模DB移行のコツ

```powershell
# テーブル単位での段階的移行
$tables = @("Orders", "OrderItems", "Customers", "Products")

foreach ($table in $tables) {
    bcp "ShopifyDB.dbo.$table" out "$table.dat" -S localhost -T -n
    bcp "ShopifyDB.dbo.$table" in "$table.dat" -S "server.database.windows.net" -U admin -P pass -n
}
```

### 3. 移行自動化スクリプト

```powershell
# migrate-to-azure.ps1
param(
    [string]$SourceServer = "localhost",
    [string]$SourceDB,
    [string]$TargetServer,
    [string]$TargetDB
)

# 1. サイズチェック
$size = Get-DatabaseSize -Server $SourceServer -Database $SourceDB
Write-Host "Database size: $size MB"

# 2. エクスポート
$bacpacFile = "$SourceDB_$(Get-Date -Format 'yyyyMMdd').bacpac"
Export-Database -Source $SourceServer -Database $SourceDB -Output $bacpacFile

# 3. アップロード＆インポート
Import-ToAzure -File $bacpacFile -Target $TargetServer -Database $TargetDB

# 4. 検証
Test-DatabaseIntegrity -Server $TargetServer -Database $TargetDB
```

---

## 🚀 クイックスタート

### 今すぐ試せる最も簡単な方法

```powershell
# 1. ローカルDBをAzureにコピー（SSMS使用）
# - SSMSでローカルDB右クリック
# - 「Deploy Database to Microsoft Azure SQL Database」選択
# - ウィザードに従うだけ！

# 2. Azure内でのDB複製
# - Azure Portalでコピー元DB選択
# - 「コピー」ボタンクリック
# - 名前を入力して実行
```

---

## 🎉 まとめ

### 移行方法の選択基準

1. **速度重視** → Azure内コピー
2. **柔軟性重視** → .bacpac
3. **簡単さ重視** → SSMS GUI
4. **自動化重視** → PowerShell/CLI

### 初心者へのアドバイス

- 最初はSSMSのGUIを使用
- 小さなテストDBで練習
- 本番移行前に必ずリハーサル
- Azure内作業は圧倒的に速い！ 