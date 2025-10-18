# Azure SQL 複数データベース管理戦略

## 📋 ドキュメント情報
- **作成日**: 2025年7月5日
- **作成者**: AI Assistant
- **バージョン**: v1.0
- **目的**: Azure SQLで複数のデータベースを効率的に管理する方法

---

## 🏗️ Azure SQL の構造理解

### 1. **論理サーバー（無料）+ 複数データベース（有料）**

```
Azure SQL Server (論理サーバー) ← 無料
  ├── store-sample-dev (Basic: 600円/月)
  ├── store-sample-sta (Basic: 600円/月)
  ├── marketing-suite-dev (Basic: 600円/月)
  └── marketing-suite-sta (Basic: 600円/月)
  
合計: 2,400円/月（4DB）
```

### 2. **エラスティックプール（コスト効率的）**

```
Azure SQL Elastic Pool (DTU 50: 約5,000円/月)
  ├── store-sample-dev      ← プール内で共有
  ├── store-sample-sta      ← プール内で共有
  ├── marketing-suite-dev   ← プール内で共有
  └── marketing-suite-sta   ← プール内で共有
  
合計: 5,000円/月（無制限のDB数）
```

---

## 💰 コスト比較

| 方式 | DB数 | 月額費用 | DB追加コスト |
|------|------|----------|--------------|
| 個別Basic | 4 | ¥2,400 | +¥600/DB |
| 個別Basic | 6 | ¥3,600 | +¥600/DB |
| エラスティックプール | 4 | ¥5,000 | ¥0/DB |
| エラスティックプール | 10 | ¥5,000 | ¥0/DB |

**損益分岐点: 8-9個のデータベース**

---

## 🎯 推奨アプローチ

### Phase 1: 開発初期（DB数が少ない場合）

**個別データベース方式**

```powershell
# Azure CLI での作成例
# 1. 論理サーバー作成（無料）
az sql server create `
  --name shopify-dev-server `
  --resource-group shopify-rg `
  --location japaneast `
  --admin-user sqladmin `
  --admin-password YourPassword123!

# 2. 個別DB作成（各600円/月）
az sql db create `
  --resource-group shopify-rg `
  --server shopify-dev-server `
  --name store-sample-dev `
  --service-objective Basic

az sql db create `
  --resource-group shopify-rg `
  --server shopify-dev-server `
  --name marketing-suite-dev `
  --service-objective Basic
```

### Phase 2: 本格開発（DB数が増える場合）

**エラスティックプール方式**

```powershell
# 1. エラスティックプール作成
az sql elastic-pool create `
  --resource-group shopify-rg `
  --server shopify-dev-server `
  --name shopify-pool `
  --edition Basic `
  --dtu 50 `
  --db-dtu-min 0 `
  --db-dtu-max 5

# 2. プール内にDB作成（追加費用なし）
az sql db create `
  --resource-group shopify-rg `
  --server shopify-dev-server `
  --name store-sample-dev `
  --elastic-pool shopify-pool

# 3. 既存DBをプールに移動も可能
az sql db update `
  --resource-group shopify-rg `
  --server shopify-dev-server `
  --name marketing-suite-dev `
  --elastic-pool shopify-pool
```

---

## 🛠️ 実践的な環境構成

### 推奨構成パターン

```yaml
# 開発環境構成例
Azure SQL Server: shopify-dev-server.database.windows.net
  │
  ├─ エラスティックプール: dev-pool (Basic 50 DTU)
  │   ├── store-sample-dev
  │   ├── marketing-suite-dev
  │   └── test-data-dev
  │
  └─ 個別データベース
      └── production-backup (S0) ← 本番データのコピー
```

### 接続文字列の管理

```json
// appsettings.json
{
  "ConnectionStrings": {
    "StoreSampleDev": "Server=tcp:shopify-dev-server.database.windows.net,1433;Initial Catalog=store-sample-dev;...",
    "MarketingSuiteDev": "Server=tcp:shopify-dev-server.database.windows.net,1433;Initial Catalog=marketing-suite-dev;...",
    "StoreSampleSta": "Server=tcp:shopify-dev-server.database.windows.net,1433;Initial Catalog=store-sample-sta;..."
  }
}
```

---

## 📦 .bacpac を使った複数DB管理

### 1. ローカルから複数DBをエクスポート

```powershell
# PowerShell スクリプト
$databases = @("store-sample", "marketing-suite")
$environments = @("dev", "sta", "pro")

foreach ($db in $databases) {
    foreach ($env in $environments) {
        $dbName = "$db-$env"
        
        # SQLPackage.exe を使用
        SqlPackage.exe /a:Export `
          /ssn:localhost `
          /sdn:$dbName `
          /tf:".\backups\$dbName.bacpac"
    }
}
```

### 2. Azureへ一括インポート

```powershell
# Azure へのインポート
foreach ($bacpac in Get-ChildItem ".\backups\*.bacpac") {
    $dbName = [System.IO.Path]::GetFileNameWithoutExtension($bacpac)
    
    az sql db import `
      --resource-group shopify-rg `
      --server shopify-dev-server `
      --name $dbName `
      --storage-key $storageKey `
      --storage-key-type StorageAccessKey `
      --storage-uri "https://storage.blob.core.windows.net/backups/$($bacpac.Name)"
}
```

---

## 🔧 データベース命名規則

### 推奨命名パターン

```
{プロジェクト}-{用途}-{環境}

例:
- store-sample-dev      # 店舗サンプルデータ（開発）
- store-sample-sta      # 店舗サンプルデータ（ステージング）
- marketing-suite-dev   # マーケティングアプリ（開発）
- marketing-suite-sta   # マーケティングアプリ（ステージング）
```

### 環境サフィックス
- `dev`: 開発環境
- `sta`: ステージング環境
- `pro`: 本番環境
- `test`: テスト環境
- `demo`: デモ環境

---

## 💡 コスト最適化のヒント

### 1. 開発環境の自動停止

```powershell
# 夜間/週末の自動一時停止（Serverless のみ）
az sql db update `
  --resource-group shopify-rg `
  --server shopify-dev-server `
  --name store-sample-dev `
  --auto-pause-delay 60  # 60分アイドル後に自動停止
```

### 2. 不要なDBの定期削除

```powershell
# 30日以上更新されていないテストDBを削除
$cutoffDate = (Get-Date).AddDays(-30)

az sql db list `
  --resource-group shopify-rg `
  --server shopify-dev-server `
  --query "[?tags.Environment=='test' && lastModifiedDate < '$cutoffDate'].name" `
  -o tsv | ForEach-Object {
    az sql db delete --name $_ --yes
}
```

### 3. 環境別の価格レベル

```yaml
開発環境:    Basic (5 DTU)    # 600円/月
ステージング: S0 (10 DTU)     # 1,500円/月
本番環境:    S2 (50 DTU)     # 7,500円/月
```

---

## 🎯 段階的移行シナリオ

### Step 1: 最小構成で開始
```
論理サーバー (無料)
  └── marketing-suite-dev (Basic: 600円/月)
```

### Step 2: テスト環境追加
```
論理サーバー (無料)
  ├── marketing-suite-dev (Basic: 600円/月)
  └── store-sample-dev (Basic: 600円/月)
合計: 1,200円/月
```

### Step 3: エラスティックプールへ移行
```
論理サーバー (無料)
  └── dev-pool (Basic 50 DTU: 5,000円/月)
      ├── marketing-suite-dev
      ├── marketing-suite-sta
      ├── store-sample-dev
      ├── store-sample-sta
      └── test-data-dev
合計: 5,000円/月（DB数無制限）
```

---

## 📋 チェックリスト

### 複数DB環境構築時
- [ ] Azure SQL Server（論理サーバー）作成
- [ ] ファイアウォール規則設定（開発者IP許可）
- [ ] 命名規則の決定と文書化
- [ ] 個別DB vs エラスティックプールの選択
- [ ] 接続文字列の環境別管理設定
- [ ] バックアップ/リストア手順の確立
- [ ] コスト監視アラートの設定

---

## 🎉 まとめ

**少数のDBなら個別作成、5個以上ならエラスティックプール**が効率的！

1. **2-3個のDB**: 個別Basic（600円×個数）
2. **5個以上のDB**: エラスティックプール（5,000円で無制限）
3. **.bacpac**: 複数DBの移行に最適 