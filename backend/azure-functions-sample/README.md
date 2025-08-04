# Shopify Azure Functions Sample

このプロジェクトは、Shopify統合におけるAzure Functionsの技術検証用サンプルです。

## 概要

様々なトリガータイプのAzure Functionsサンプルを提供しています：

1. **Timer Trigger** - 定期実行バッチ処理
2. **HTTP Trigger** - REST API（データベース接続）
3. **Queue Trigger** - メッセージ駆動処理（開発中）
4. **Blob Trigger** - ファイル処理（開発中）

## プロジェクト構成

```
/backend/azure-functions-sample/
├── ShopifyAzureFunctionsSample/     # Timer Trigger サンプル
│   ├── HelloShopify.cs
│   ├── Program.cs
│   ├── host.json
│   └── local.settings.json.example
│
├── DatabaseFunction/                 # HTTP Trigger + Database サンプル
│   ├── GetOrderStatistics.cs
│   ├── GetTopProducts.cs
│   ├── TestDatabaseConnection.cs
│   ├── Services/
│   │   ├── IDatabaseService.cs
│   │   └── DatabaseService.cs
│   ├── Models/
│   │   └── OrderStatistics.cs
│   └── local.settings.json.example
│
├── WebhookFunction/                 # Queue Trigger サンプル（開発中）
├── BlobFunction/                    # Blob Trigger サンプル（開発中）
│
├── README.md
├── technical-evaluation-report.md
└── .gitignore
```

## ローカル開発環境のセットアップ

### 1. 必要なツールのインストール

#### Azure Functions Core Tools v4
```bash
# Windows (winget)
winget install Microsoft.Azure.FunctionsCoreTools

# Mac
brew tap azure/functions
brew install azure-functions-core-tools@4

# Linux
curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > microsoft.gpg
sudo mv microsoft.gpg /etc/apt/trusted.gpg.d/microsoft.gpg
sudo sh -c 'echo "deb [arch=amd64] https://packages.microsoft.com/repos/microsoft-ubuntu-$(lsb_release -cs)-prod $(lsb_release -cs) main" > /etc/apt/sources.list.d/dotnetdev.list'
sudo apt-get update
sudo apt-get install azure-functions-core-tools-4
```

#### .NET 8 SDK
```bash
# https://dotnet.microsoft.com/download/dotnet/8.0
```

#### Visual Studio Code 拡張機能
- Azure Functions
- C# Dev Kit

### 2. プロジェクトの初期設定

各プロジェクトフォルダで：
1. `local.settings.json.example` を `local.settings.json` にコピー
2. 必要に応じて設定値を更新

### 3. ローカル実行

```bash
# Timer Trigger サンプル
cd ShopifyAzureFunctionsSample
func start

# HTTP Trigger サンプル
cd DatabaseFunction
func start
```

## サンプルの詳細

### 1. Timer Trigger サンプル（HelloShopify）

**用途**: 定期的なバッチ処理、データ同期

**特徴**:
- 30分ごとに自動実行
- Application Insights統合
- エラーハンドリング実装

**実行例**:
```
[2025-08-02T10:00:00.123] Hello Shopify timer trigger executed at: 2025-08-02 10:00:00
```

### 2. HTTP Trigger + Database サンプル（DatabaseFunction）

**用途**: REST API、データベースクエリ

**エンドポイント**:
- `GET /api/orders/statistics` - 注文統計の取得
- `GET /api/products/top` - 上位商品の取得
- `GET /api/database/test` - 接続テスト

**特徴**:
- Azure SQL Database接続（Dapper使用）
- Managed Identity対応
- 包括的なエラーハンドリング

**実行例**:
```bash
# 注文統計の取得
curl http://localhost:7071/api/orders/statistics?storeId=1&period=30days

# レスポンス例
{
  "success": true,
  "data": {
    "orderCount": 150,
    "uniqueCustomers": 89,
    "totalRevenue": 25000.00,
    "averageOrderValue": 166.67
  },
  "metadata": {
    "storeId": 1,
    "period": "30days",
    "processingTimeMs": 45.2
  }
}
```

### 3. Queue Trigger サンプル（開発中）

**用途**: 非同期処理、Webhook処理

**特徴**（予定）:
- Shopify Webhookの処理
- リトライ処理（Polly使用）
- Dead Letter Queue

### 4. Blob Trigger サンプル（開発中）

**用途**: ファイル処理、CSVインポート

**特徴**（予定）:
- 大容量ファイルのストリーミング処理
- 進捗レポート
- エラーレポート生成

## 環境変数の設定

### Timer Trigger
```json
{
  "ShopifyDomain": "test-shop.myshopify.com",
  "ApplicationInsights:ConnectionString": "InstrumentationKey=xxx"
}
```

### Database Function
```json
{
  "SqlConnectionString": "Server=xxx.database.windows.net;Database=xxx;",
  "UseManagedIdentity": "false",
  "ApplicationInsights:ConnectionString": "InstrumentationKey=xxx"
}
```

## デプロイ

詳細なデプロイ手順は `/docs/03-design-specs/integration/azure-functions-deployment-guide.md` を参照してください。

## セキュリティのベストプラクティス

1. **接続文字列**: Key Vaultに保存
2. **認証**: Managed Identityを使用
3. **アクセス制御**: Function Keyによる保護
4. **ネットワーク**: Private Endpointの利用

## トラブルシューティング

### ローカル実行時のエラー

1. **ポート競合**: 既定のポート7071が使用中の場合
   ```bash
   func start --port 7072
   ```

2. **Storage Emulator**: Azuriteがインストールされていない場合
   ```bash
   npm install -g azurite
   azurite --silent --location c:\azurite --debug c:\azurite\debug.log
   ```

3. **データベース接続エラー**: 
   - 接続文字列を確認
   - ファイアウォール設定を確認
   - SQL認証が有効か確認

## パフォーマンス考慮事項

1. **コールドスタート**: 
   - Premium Planで回避可能
   - ウォームアップトリガーの実装

2. **接続プーリング**:
   - SqlConnectionは自動的にプーリング
   - HttpClientはシングルトンで使用

3. **タイムアウト**:
   - デフォルト5分（host.jsonで変更可能）
   - 長時間処理にはDurable Functions使用

## 参考リンク

- [Azure Functions documentation](https://docs.microsoft.com/azure/azure-functions/)
- [Timer trigger](https://docs.microsoft.com/azure/azure-functions/functions-bindings-timer)
- [HTTP trigger](https://docs.microsoft.com/azure/azure-functions/functions-bindings-http-webhook)
- [Queue trigger](https://docs.microsoft.com/azure/azure-functions/functions-bindings-storage-queue)
- [Blob trigger](https://docs.microsoft.com/azure/azure-functions/functions-bindings-storage-blob)
- [.NET isolated worker process](https://docs.microsoft.com/azure/azure-functions/dotnet-isolated-process-guide)