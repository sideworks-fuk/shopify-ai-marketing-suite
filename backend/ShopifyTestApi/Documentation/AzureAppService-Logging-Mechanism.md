# Azure App Service ログ出力メカニズム

## 概要

Azure App Serviceでは、物理ディスクではなく、**Azure Storage Blob**と**Azure Log Analytics**を使用したクラウドベースのログ出力システムを採用しています。これにより、スケーラビリティ、可用性、管理性が大幅に向上しています。

## ログ出力の仕組み

### 1. 物理ディスク vs Azure App Service

#### 物理ディスク（従来の方式）
```
アプリケーション → 物理ディスク（ローカルファイルシステム）
├── /var/log/application.log
├── /var/log/error.log
└── /var/log/access.log
```

#### Azure App Service（クラウド方式）
```
アプリケーション → Azure Storage Blob + Azure Log Analytics
├── Azure Storage Blob（構造化ログ）
├── Azure Log Analytics（リアルタイム分析）
└── Application Insights（APM統合）
```

### 2. Azure App Serviceのログ出力フロー

```
└── アプリケーション（.NET Web API）
    ├── ILogger → Azure Storage Blob
    ├── Serilog → Application Insights
    ├── Azure Web App Diagnostics → Azure Storage
    └── Azure Monitor → Log Analytics
```

## 詳細メカニズム

### 1. Azure Storage Blob ログ出力

#### ログファイルの保存場所
- **ストレージアカウント**: 自動的に作成される専用ストレージアカウント
- **コンテナ名**: `$logs`（システムログ）、`app-logs`（アプリケーションログ）
- **パス構造**: `{year}/{month}/{day}/{hour}/{minute}/`

#### 実際のファイルパス例
```
https://{storage-account}.blob.core.windows.net/app-logs/
├── 2025/
│   ├── 07/
│   │   ├── 20/
│   │   │   ├── 16/
│   │   │   │   ├── 00/
│   │   │   │   │   ├── shopify-api-20250720-160000.log
│   │   │   │   │   ├── shopify-api-20250720-160100.log
│   │   │   │   │   └── shopify-api-20250720-160200.log
```

#### ログファイルの特徴
- **自動ローテーション**: 時間単位でファイル分割
- **圧縮**: 自動的にgzip圧縮
- **保持期間**: 設定可能（デフォルト30日）
- **アクセス制御**: SASトークンによるセキュアアクセス

### 2. Azure Log Analytics 統合

#### リアルタイムログ収集
```json
{
  "timestamp": "2025-07-20T16:15:00.123Z",
  "level": "Information",
  "message": "Application Insights configured with connection string",
  "properties": {
    "RequestId": "req-12345",
    "Environment": "Production",
    "Application": "ShopifyTestApi"
  }
}
```

#### Kustoクエリでの分析
```kusto
// リアルタイムログ分析
traces
| where timestamp > ago(1h)
| where customDimensions.Environment == "Production"
| summarize count() by bin(timestamp, 5m)
| render timechart
```

### 3. Application Insights 統合

#### 構造化テレメトリ
```json
{
  "name": "Microsoft.ApplicationInsights.Dev.Request",
  "time": "2025-07-20T16:15:00.123Z",
  "data": {
    "baseType": "RequestData",
    "baseData": {
      "ver": 2,
      "id": "req-12345",
      "name": "GET /api/customers",
      "duration": "00:00:01.234",
      "success": true,
      "responseCode": 200
    }
  }
}
```

## 設定と確認方法

### 1. Azure App Service ログ設定

#### Azure Portalでの設定
1. **App Service** → **監視** → **ログストリーム**
2. **App Service ログ** → **ファイルシステム**を有効化
3. **詳細エラー** → **有効化**
4. **失敗した要求トレース** → **有効化**

#### 設定ファイルでの制御
```json
// appsettings.Production.json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AzureWebAppDiagnostics": {
    "FileSystem": {
      "Level": "Information",
      "Retention": "30"
    }
  }
}
```

### 2. ログアクセス方法

#### Azure Portal での確認
1. **App Service** → **監視** → **ログストリーム**
2. **App Service ログ** → **ダウンロード**
3. **Application Insights** → **ログ**

#### Azure CLI での確認
```bash
# ログストリームの確認
az webapp log tail --name shopify-test-api --resource-group shopify-test-rg

# ログファイルのダウンロード
az webapp log download --name shopify-test-api --resource-group shopify-test-rg
```

#### PowerShell での確認
```powershell
# ログストリームの開始
Get-AzWebAppLog -ResourceGroupName "shopify-test-rg" -Name "shopify-test-api" -Follow

# ログファイルの一覧取得
Get-AzWebAppLog -ResourceGroupName "shopify-test-rg" -Name "shopify-test-api"
```

### 3. ログファイルの構造

#### アプリケーションログ
```
[2025-07-20 16:15:00.123] [Information] [ShopifyTestApi.Controllers.CustomerController] 
Customer dashboard data requested. RequestId: req-12345, DataCount: 150
```

#### システムログ
```
[2025-07-20 16:15:00.456] [Information] [Microsoft.AspNetCore.Hosting.Diagnostics] 
Request finished in 1234.567ms - 200 - GET /api/customers/dashboard
```

#### エラーログ
```
[2025-07-20 16:15:00.789] [Error] [ShopifyTestApi.Middleware.GlobalExceptionMiddleware] 
Unhandled exception occurred. RequestId: req-12345, Exception: System.NullReferenceException
```

## 物理ディスクとの違い

### 1. ストレージ方式

| 項目 | 物理ディスク | Azure App Service |
|------|-------------|-------------------|
| **ストレージ場所** | ローカルファイルシステム | Azure Storage Blob |
| **スケーラビリティ** | ディスク容量に制限 | 無制限（課金ベース） |
| **可用性** | 単一サーバー依存 | 99.9%可用性保証 |
| **バックアップ** | 手動設定必要 | 自動バックアップ |

### 2. パフォーマンス特性

#### 物理ディスク
- **書き込み速度**: ディスクI/O性能に依存
- **同時アクセス**: ファイルロックによる制限
- **容量制限**: ディスク容量に制限
- **障害影響**: ディスク障害でログ消失リスク

#### Azure App Service
- **書き込み速度**: ネットワーク帯域に依存
- **同時アクセス**: 無制限の並行書き込み
- **容量制限**: 実質無制限
- **障害影響**: 冗長化により高可用性

### 3. 管理と運用

#### 物理ディスク
```bash
# ログローテーション（手動設定）
logrotate /etc/logrotate.d/application

# ディスク容量監視
df -h /var/log

# ログファイル削除
find /var/log -name "*.log" -mtime +30 -delete
```

#### Azure App Service
```json
// 自動ローテーション（設定のみ）
{
  "AzureWebAppDiagnostics": {
    "FileSystem": {
      "Retention": "30"  // 30日で自動削除
    }
  }
}
```

## 実際の運用での影響

### 1. 開発環境での違い

#### ローカル開発
```json
// appsettings.Development.json
{
  "Serilog": {
    "WriteTo": [
      {
        "Name": "File",
        "Args": {
          "path": "logs/shopify-api-.log",  // 物理ディスク
          "rollingInterval": "Day"
        }
      }
    ]
  }
}
```

#### Azure App Service
```json
// appsettings.Production.json
{
  "Serilog": {
    "WriteTo": [
      {
        "Name": "ApplicationInsights",  // クラウド
        "Args": {
          "connectionString": "#{APPLICATIONINSIGHTS_CONNECTION_STRING}#"
        }
      }
    ]
  }
}
```

### 2. ログ確認方法の違い

#### 物理ディスク
```bash
# リアルタイムログ確認
tail -f /var/log/application.log

# ログ検索
grep "ERROR" /var/log/application.log

# ログ統計
wc -l /var/log/application.log
```

#### Azure App Service
```kusto
// リアルタイムログ確認
traces
| where timestamp > ago(1h)
| order by timestamp desc

// エラーログ検索
traces
| where severityLevel == 3
| where timestamp > ago(24h)

// ログ統計
traces
| where timestamp > ago(24h)
| summarize count() by bin(timestamp, 1h)
```

### 3. 監視とアラート

#### 物理ディスク
```bash
# ディスク容量監視
if [ $(df /var/log | awk 'NR==2 {print $5}' | sed 's/%//') -gt 80 ]; then
    echo "Disk usage high"
fi

# ログファイルサイズ監視
if [ $(stat -c%s /var/log/application.log) -gt 1000000000 ]; then
    echo "Log file too large"
fi
```

#### Azure App Service
```kusto
// ログ量監視
traces
| where timestamp > ago(5m)
| summarize count()
| where count_ > 10000

// エラー率監視
traces
| where timestamp > ago(5m)
| summarize 
    total = count(),
    errors = countif(severityLevel == 3)
| extend errorRate = errors * 100.0 / total
| where errorRate > 5
```

## ベストプラクティス

### 1. ログ設定の最適化

#### 本番環境での設定
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning",
      "Microsoft.EntityFrameworkCore": "Warning"
    }
  },
  "AzureWebAppDiagnostics": {
    "FileSystem": {
      "Level": "Information",
      "Retention": "30"
    }
  }
}
```

#### 開発環境での設定
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Debug",
      "Microsoft.AspNetCore": "Information"
    }
  },
  "Serilog": {
    "WriteTo": [
      {
        "Name": "File",
        "Args": {
          "path": "logs/shopify-api-.log",
          "rollingInterval": "Day",
          "retainedFileCountLimit": 7
        }
      }
    ]
  }
}
```

### 2. ログ分析の効率化

#### 構造化ログの活用
```csharp
// 良い例
_logger.LogInformation("Customer data retrieved. {RequestId}, {DataCount}, {DurationMs}", 
    requestId, dataCount, durationMs);

// 避けるべき例
_logger.LogInformation($"Customer data retrieved. RequestId: {requestId}, Count: {dataCount}");
```

#### カスタムプロパティの活用
```csharp
using (LogContext.PushProperty("RequestId", requestId))
using (LogContext.PushProperty("UserId", userId))
{
    _logger.LogInformation("Processing customer request");
}
```

### 3. コスト最適化

#### ログ量の制御
```json
{
  "Serilog": {
    "MinimumLevel": {
      "Default": "Information",
      "Override": {
        "Microsoft": "Warning",
        "System": "Warning"
      }
    }
  }
}
```

#### サンプリングの活用
```csharp
builder.Services.AddApplicationInsightsTelemetry(options =>
{
    options.EnableAdaptiveSampling = true;
    options.EnableQuickPulseMetricStream = true;
});
```

## トラブルシューティング

### 1. よくある問題

#### 問題: ログが出力されない
**原因**: Azure Storage Blobへの書き込み権限不足
**解決方法**:
1. App ServiceのマネージドIDを有効化
2. Storage Blob Data Contributor権限を付与
3. 接続文字列の確認

#### 問題: ログの遅延
**原因**: ネットワーク帯域の制限
**解決方法**:
1. ログレベルを調整（Debug → Information）
2. サンプリングを有効化
3. バッチサイズの調整

#### 問題: ログファイルが見つからない
**原因**: ログ設定が正しくない
**解決方法**:
1. Azure Portalでログ設定を確認
2. アプリケーション設定の確認
3. ログストリームでのリアルタイム確認

### 2. デバッグ方法

#### ログ設定の確認
```bash
# Azure CLIでログ設定確認
az webapp log show --name shopify-test-api --resource-group shopify-test-rg
```

#### リアルタイムログ確認
```bash
# ログストリーム開始
az webapp log tail --name shopify-test-api --resource-group shopify-test-rg
```

#### Application Insightsでの確認
```kusto
// 最新のログを確認
traces
| where timestamp > ago(10m)
| order by timestamp desc
| take 100
```

## まとめ

Azure App Serviceでは、物理ディスクではなく**Azure Storage Blob**と**Azure Log Analytics**を使用したクラウドベースのログ出力システムを採用しています。これにより、以下のメリットが得られます：

### 主なメリット
1. **スケーラビリティ**: 無制限のログ容量
2. **可用性**: 99.9%の可用性保証
3. **管理性**: 自動ローテーションと保持期間管理
4. **分析性**: リアルタイムログ分析とKustoクエリ
5. **統合性**: Application Insightsとの完全統合

### 運用上の注意点
1. **ネットワーク依存**: ネットワーク帯域に依存
2. **コスト考慮**: ログ量に応じた課金
3. **設定管理**: 適切なログレベルとサンプリング設定
4. **セキュリティ**: アクセス制御とデータ暗号化

この仕組みにより、従来の物理ディスクベースのログ管理から、クラウドネイティブなログ管理システムへの移行が実現されています。

---

*最終更新: 2025年7月20日*
*作成者: AI Assistant*
*バージョン: 1.0* 