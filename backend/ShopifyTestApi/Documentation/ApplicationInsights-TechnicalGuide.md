# Application Insights 技術説明書

## 概要

Application Insightsは、Azure Monitorの一部として提供されるアプリケーションパフォーマンス管理（APM）サービスです。本プロジェクトでは、.NET Web APIの監視とログ収集にApplication Insightsを統合しています。

## 実装内容

### 1. NuGetパッケージ構成

```xml
<PackageReference Include="Microsoft.ApplicationInsights.AspNetCore" Version="2.24.0" />
<PackageReference Include="Serilog.Sinks.ApplicationInsights" Version="4.0.0" />
```

### 2. 設定ファイル構成

#### appsettings.json（本番環境）
```json
{
  "ApplicationInsights": {
    "ConnectionString": "#{APPLICATIONINSIGHTS_CONNECTION_STRING}#"
  },
  "Serilog": {
    "WriteTo": [
      {
        "Name": "ApplicationInsights",
        "Args": {
          "connectionString": "#{APPLICATIONINSIGHTS_CONNECTION_STRING}#",
          "telemetryConverter": "Serilog.Sinks.ApplicationInsights.TelemetryConverters.TraceTelemetryConverter, Serilog.Sinks.ApplicationInsights"
        }
      }
    ]
  }
}
```

#### appsettings.Development.json（開発環境）
```json
{
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

### 3. Program.csでの設定

```csharp
// Application Insights接続文字列の環境変数対応
var aiConnectionString = builder.Configuration["ApplicationInsights:ConnectionString"];
if (aiConnectionString?.Contains("#") == true)
{
    aiConnectionString = Environment.GetEnvironmentVariable("APPLICATIONINSIGHTS_CONNECTION_STRING");
}
if (!string.IsNullOrEmpty(aiConnectionString))
{
    builder.Services.AddApplicationInsightsTelemetry(options =>
    {
        options.ConnectionString = aiConnectionString;
    });
    Log.Information("Application Insights configured with connection string");
}
else
{
    Log.Warning("Application Insights connection string not configured");
}
```

## 機能詳細

### 1. 自動収集されるテレメトリ

#### 依存関係（Dependencies）
- HTTP要求
- データベース呼び出し
- 外部サービス呼び出し
- Azure Storage呼び出し

#### 要求（Requests）
- HTTP要求の処理時間
- 要求パス
- HTTPメソッド
- ステータスコード

#### 例外（Exceptions）
- 未処理例外
- 例外のスタックトレース
- 例外の発生場所

#### パフォーマンス（Performance）
- CPU使用率
- メモリ使用量
- ディスクI/O

### 2. カスタムテレメトリ

#### カスタムメトリクス
```csharp
// LoggingHelper.csでの実装例
_telemetryClient?.TrackMetric("OperationDuration", durationMs, new Dictionary<string, string>
{
    ["OperationName"] = _properties["OperationName"].ToString() ?? "Unknown"
});
```

#### カスタムイベント
```csharp
_telemetryClient?.TrackEvent("SlowOperationDetected", new Dictionary<string, string>
{
    ["OperationName"] = operationName,
    ["DurationMs"] = durationMs.ToString()
});
```

#### カスタムトレース
```csharp
_telemetryClient?.TrackTrace($"Performance measurement completed. {operationName} took {durationMs}ms");
```

### 3. 構造化ログの統合

#### Serilogとの統合
- 構造化ログのApplication Insightsへの送信
- カスタムプロパティの自動付与
- ログレベルの適切な変換

#### ログエンリッチャー
```csharp
// LogEnricher.csでの実装
logEvent.AddPropertyIfAbsent(propertyFactory.CreateProperty("Environment", environment));
logEvent.AddPropertyIfAbsent(propertyFactory.CreateProperty("Application", "ShopifyTestApi"));
logEvent.AddPropertyIfAbsent(propertyFactory.CreateProperty("Version", version));
```

## 設定手順

### 1. Azure PortalでのApplication Insightsリソース作成

1. **Azure Portalにアクセス**
   - https://portal.azure.com

2. **Application Insightsリソースを作成**
   - 「リソースの作成」→「Application Insights」
   - リソースグループを選択
   - 名前: `shopify-test-api-insights`
   - リージョン: 東日本（Japan East）
   - リソースモード: ワークスペースベース

3. **接続文字列をコピー**
   - 作成後、「概要」ページで「接続文字列」をコピー

### 2. Azure App Serviceでの環境変数設定

1. **App Serviceに移動**
   - Azure PortalでApp Serviceリソースを選択

2. **アプリケーション設定を追加**
   - 「設定」→「構成」→「アプリケーション設定」
   - 新しい設定を追加：
     - 名前: `APPLICATIONINSIGHTS_CONNECTION_STRING`
     - 値: コピーした接続文字列

3. **App Serviceを再起動**
   - 設定変更後、App Serviceを再起動

### 3. 開発環境での設定

#### ローカル開発時
```bash
# 環境変数を設定
set APPLICATIONINSIGHTS_CONNECTION_STRING=your_connection_string
```

#### Visual Studio Code
```json
// .vscode/launch.json
{
    "env": {
        "APPLICATIONINSIGHTS_CONNECTION_STRING": "your_connection_string"
    }
}
```

## 運用監視

### 1. 主要な監視項目

#### パフォーマンス監視
- **レスポンス時間**: 平均、95パーセンタイル、99パーセンタイル
- **スループット**: 1分あたりの要求数
- **エラー率**: 失敗した要求の割合

#### 可用性監視
- **アップタイム**: アプリケーションの稼働率
- **ヘルスチェック**: `/health`エンドポイントの監視
- **依存関係**: データベース、外部APIの可用性

#### カスタムメトリクス
- **OperationDuration**: 各操作の実行時間
- **SlowOperationDuration**: 遅い処理の検出
- **CriticalOperationDuration**: クリティカル処理の検出

### 2. アラート設定

#### エラー率アラート
```kusto
// 5分間でエラー率が5%を超えた場合
traces
| where timestamp > ago(5m)
| summarize 
    total = count(),
    errors = countif(severityLevel == 3)
| extend errorRate = errors * 100.0 / total
| where errorRate > 5
```

#### レスポンス時間アラート
```kusto
// 平均レスポンス時間が2秒を超えた場合
traces
| where timestamp > ago(5m)
| where customDimensions.DurationMs != ""
| extend duration = todouble(customDimensions.DurationMs)
| summarize avgDuration = avg(duration)
| where avgDuration > 2000
```

### 3. ダッシュボード設定

#### 推奨ダッシュボード構成
1. **概要ダッシュボード**
   - レスポンス時間グラフ
   - エラー率グラフ
   - スループットグラフ
   - 可用性指標

2. **パフォーマンスダッシュボード**
   - エンドポイント別レスポンス時間
   - データベース操作時間
   - 外部API呼び出し時間

3. **エラー分析ダッシュボード**
   - エラー発生率の時系列
   - エラー別発生頻度
   - エンドポイント別エラー率

## トラブルシューティング

### 1. よくある問題と解決方法

#### 問題: Application Insightsにデータが送信されない
**原因**: 接続文字列が正しく設定されていない
**解決方法**:
1. 環境変数`APPLICATIONINSIGHTS_CONNECTION_STRING`を確認
2. App Serviceの再起動
3. ログで「Application Insights configured」メッセージを確認

#### 問題: カスタムメトリクスが表示されない
**原因**: TelemetryClientが正しく初期化されていない
**解決方法**:
1. DIコンテナからTelemetryClientを取得
2. カスタムメトリクスの送信確認
3. ログレベルをDebugに設定して詳細確認

#### 問題: 構造化ログが正しく表示されない
**原因**: Serilog設定が正しくない
**解決方法**:
1. `appsettings.json`のSerilog設定を確認
2. テレメトリコンバーターの設定確認
3. ログエンリッチャーの設定確認

### 2. デバッグ方法

#### ログレベルの調整
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Debug",
      "Microsoft.ApplicationInsights": "Information"
    }
  }
}
```

#### カスタムログの確認
```csharp
// Program.csでログ出力を確認
Log.Information("Application Insights configured with connection string");
Log.Warning("Application Insights connection string not configured");
```

### 3. パフォーマンス最適化

#### サンプリング設定
```csharp
builder.Services.AddApplicationInsightsTelemetry(options =>
{
    options.ConnectionString = aiConnectionString;
    options.EnableAdaptiveSampling = true;
    options.EnableQuickPulseMetricStream = true;
});
```

#### 不要なテレメトリの無効化
```csharp
builder.Services.AddApplicationInsightsTelemetry(options =>
{
    options.EnableDependencyTrackingTelemetryModule = false;
    options.EnablePerformanceCounterCollectionModule = false;
});
```

## セキュリティ考慮事項

### 1. 接続文字列の管理
- **環境変数使用**: 接続文字列を環境変数で管理
- **シークレット管理**: Azure Key Vaultの使用を検討
- **最小権限**: Application Insightsの読み取り専用権限を検討

### 2. データプライバシー
- **個人情報**: ログに個人情報を含めない
- **機密情報**: APIキー、パスワード等の機密情報をマスク
- **データ保持**: 必要に応じてデータ保持期間を設定

### 3. 監査ログ
- **アクセスログ**: Application Insightsへのアクセスを監査
- **設定変更**: 設定変更の履歴を保持
- **アラート**: 異常なアクセスパターンの検出

## コスト管理

### 1. 料金体系
- **基本料金**: 月額約$2.30（100万テレメトリポイント）
- **追加料金**: 100万ポイントを超える分の従量課金
- **データ保持**: 90日間無料、それ以降は追加料金

### 2. コスト最適化
- **サンプリング**: 適応的サンプリングの有効化
- **不要なテレメトリ**: 不要なテレメトリの無効化
- **データ保持期間**: 必要最小限の保持期間設定

### 3. 予算アラート
- **月額予算**: 月額$10の予算アラート設定
- **使用量監視**: 日次での使用量確認
- **コスト分析**: 定期的なコスト分析レポート

## 参考資料

### 1. 公式ドキュメント
- [Application Insights for ASP.NET Core](https://docs.microsoft.com/en-us/azure/azure-monitor/app/asp-net-core)
- [Serilog Sinks for Application Insights](https://github.com/serilog/serilog-sinks-applicationinsights)
- [Azure Monitor Query Language](https://docs.microsoft.com/en-us/azure/azure-monitor/logs/query-language)

### 2. サンプルコード
- [GitHub: Application Insights Samples](https://github.com/microsoft/ApplicationInsights-dotnet)
- [GitHub: Serilog Samples](https://github.com/serilog/serilog)

### 3. ベストプラクティス
- [Application Insights Best Practices](https://docs.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview#best-practices)
- [Logging Best Practices](https://docs.microsoft.com/en-us/aspnet/core/fundamentals/logging/)

---

*最終更新: 2025年7月20日*
*作成者: AI Assistant*
*バージョン: 1.0* 