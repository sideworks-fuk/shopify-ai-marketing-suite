# SQL Server vs SQL Database の違い

## 📋 概要
Azure SQL ServerとAzure SQL Databaseの違いについて、技術的詳細とコスト面での違いを説明します。

---

## 🏗️ 技術的な違い

### 1. **Azure SQL Server（論理サーバー）**

#### 特徴
- **論理的なコンテナ**: 複数のデータベースを格納する論理サーバー
- **無料**: サーバー自体は無料で作成可能
- **管理機能**: ファイアウォール規則、認証、監査ログの管理
- **接続エンドポイント**: サーバーレベルでの接続管理

#### 構成要素
```yaml
Azure SQL Server (論理サーバー) - 無料
├── ファイアウォール規則
├── Active Directory 統合
├── 監査ログ設定
├── 脅威検出設定
└── 複数のデータベース
    ├── Database 1 (有料)
    ├── Database 2 (有料)
    └── Database 3 (有料)
```

#### 実際の例
```
サーバー名: shopify-test-server.database.windows.net
- 作成費用: 無料
- 管理機能: ファイアウォール、認証、監査
- データベース: 複数作成可能
```

### 2. **Azure SQL Database**

#### 特徴
- **実際のデータベース**: データを格納する物理的なデータベース
- **有料サービス**: 使用量に応じて課金
- **サービスレベル**: Basic、Standard、Premium等
- **DTU/vCore**: コンピューティングリソースの単位

#### 構成要素
```yaml
Azure SQL Database (有料)
├── コンピューティング (DTU/vCore)
├── ストレージ (GB)
├── バックアップ
├── 高可用性設定
└── セキュリティ機能
```

#### 実際の例
```
データベース名: shopify-test-db
- サービスレベル: Basic (5 DTU)
- ストレージ: 2GB
- 月額費用: 約600円
```

---

## 💰 コスト面での違い

### 1. **Azure SQL Server（論理サーバー）**
```yaml
作成費用: 無料
月額費用: 0円
管理機能: 無料で利用可能
制限: サーバーあたり最大5,000データベース
```

### 2. **Azure SQL Database**
```yaml
作成費用: 無料（使用開始時に課金）
月額費用: サービスレベルによる
├── Basic (5 DTU): 約600円/月
├── S0 Standard (10 DTU): 約1,500円/月
├── S1 Standard (20 DTU): 約3,000円/月
└── S2 Standard (50 DTU): 約7,500円/月
```

---

## 🎯 実際の構成例

### 現在のプロジェクト構成
```yaml
Azure SQL Server: shopify-test-server (無料)
└── Azure SQL Database: shopify-test-db (Basic: 約600円/月)
    ├── サービスレベル: Basic
    ├── DTU: 5
    ├── ストレージ: 2GB
    └── 月額費用: 約600円
```

### 複数データベース構成例
```yaml
Azure SQL Server: shopify-dev-server (無料)
├── Database 1: shopify-dev-db (Basic: 約600円/月)
├── Database 2: shopify-sta-db (Basic: 約600円/月)
└── Database 3: shopify-pro-db (S0: 約1,500円/月)

合計月額: 約2,700円
```

---

## 📊 コスト計算の正しい理解

### 重要なポイント
1. **SQL Serverは無料**: 論理サーバーの作成・管理は無料
2. **SQL Databaseが有料**: 実際のデータベース使用量に応じて課金
3. **複数DBの管理**: 1つのサーバーで複数のデータベースを管理可能
4. **エラスティックプール**: 複数DBのコスト最適化が可能

### コスト計算例
```yaml
# 現在の構成
shopify-test-server (SQL Server): 0円
└── shopify-test-db (SQL Database): 600円/月

# 3環境構成の場合
shopify-dev-server (SQL Server): 0円
├── shopify-dev-db (SQL Database): 600円/月
├── shopify-sta-db (SQL Database): 600円/月
└── shopify-pro-db (SQL Database): 1,500円/月

合計: 2,700円/月
```

---

## 🔄 エラスティックプールとの関係

### 個別データベース方式
```yaml
SQL Server: 0円
├── Database 1: 600円/月
├── Database 2: 600円/月
├── Database 3: 600円/月
└── Database 4: 600円/月
合計: 2,400円/月
```

### エラスティックプール方式
```yaml
SQL Server: 0円
└── Elastic Pool (Basic 50 DTU): 5,000円/月
    ├── Database 1: 0円（プール内）
    ├── Database 2: 0円（プール内）
    ├── Database 3: 0円（プール内）
    └── Database 4: 0円（プール内）
合計: 5,000円/月（DB数無制限）
```

---

## 💡 ベストプラクティス

### 1. **開発初期（少数のDB）**
```yaml
推奨: 個別データベース方式
理由: コスト効率が良い
例: 2-3個のDB → 月額1,200-1,800円
```

### 2. **本格運用（多数のDB）**
```yaml
推奨: エラスティックプール方式
理由: 管理容易、コスト予測可能
例: 5個以上のDB → 月額5,000円（無制限）
```

### 3. **命名規則**
```yaml
SQL Server: {project}-{environment}-server
例: shopify-dev-server, shopify-pro-server

SQL Database: {project}-{purpose}-{environment}
例: shopify-store-dev, shopify-analytics-pro
```

---

## ⚠️ よくある誤解

### 誤解1: SQL Serverも有料
```yaml
❌ 誤解: SQL Server作成にも費用がかかる
✅ 正解: SQL Server（論理サーバー）は無料
```

### 誤解2: サーバーとDBは1対1
```yaml
❌ 誤解: 1つのサーバーに1つのDBのみ
✅ 正解: 1つのサーバーに複数のDB作成可能
```

### 誤解3: サーバー削除でDBも削除
```yaml
❌ 誤解: サーバー削除でDBも自動削除
✅ 正解: サーバー削除前にDBを移動または削除が必要
```

---

## 📋 まとめ

### SQL Server（論理サーバー）
- **費用**: 無料
- **役割**: 複数DBの管理コンテナ
- **機能**: ファイアウォール、認証、監査

### SQL Database（実際のDB）
- **費用**: サービスレベルに応じて課金
- **役割**: データの格納・処理
- **機能**: データベースエンジン、バックアップ、高可用性

### コスト計算のポイント
1. **SQL Server**: 無料（管理機能のみ）
2. **SQL Database**: 有料（データ格納・処理）
3. **複数DB**: 1つのサーバーで管理可能
4. **エラスティックプール**: 多数DBのコスト最適化

---

*最終更新: 2025年7月22日*
*作成者: AI Assistant*
*バージョン: 1.0* 