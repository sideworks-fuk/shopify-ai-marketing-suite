# コスト監視・試算 実施計画（詳細版）

> **Note**: この文書は将来的な規模拡大（日次10,000リクエスト以上）を想定した詳細版です。
> 小規模運用（日次1,000リクエスト程度）の場合は、`cost-monitoring-plan.md`の簡略版を参照してください。

## Phase別コスト測定計画

### Phase 1: Azure Functions（基礎測定）
**測定項目**
- 関数の実行回数
- 実行時間（ミリ秒単位）
- メモリ使用量
- コールドスタート頻度

**測定方法**
```csharp
// 実行時間を測定するコード例
[FunctionName("MeasuredFunction")]
public static async Task<IActionResult> Run(
    [HttpTrigger(AuthorizationLevel.Function, "get")] HttpRequest req,
    ILogger log)
{
    var stopwatch = Stopwatch.StartNew();
    
    // 処理実行
    await Task.Delay(100); // 実際の処理
    
    stopwatch.Stop();
    log.LogInformation($"Execution time: {stopwatch.ElapsedMilliseconds}ms");
    
    return new OkObjectResult(new { 
        executionTime = stopwatch.ElapsedMilliseconds 
    });
}
```

---

### Phase 2: トラフィックシミュレーション
**負荷テストツール**
1. **Azure Load Testing**（推奨）
   - JMeterスクリプトで実行
   - Azure統合で詳細メトリクス取得

2. **k6**（オープンソース）
   ```javascript
   import http from 'k6/http';
   import { check } from 'k6';
   
   export let options = {
     stages: [
       { duration: '2m', target: 100 }, // 100ユーザーまで増加
       { duration: '5m', target: 100 }, // 100ユーザーで維持
       { duration: '2m', target: 0 },   // 0まで減少
     ],
   };
   
   export default function() {
     let response = http.get('https://your-api.azurewebsites.net/api/health');
     check(response, {
       'status is 200': (r) => r.status === 200,
       'response time < 500ms': (r) => r.timings.duration < 500,
     });
   }
   ```

---

### Phase 3: 実測値記録シート

#### 日次記録テンプレート
| 日付 | Functions実行回数 | GB秒 | DB接続数 | Storage (GB) | 転送量 (GB) | 日額 |
|------|------------------|------|----------|--------------|-------------|------|
| 1/1  | 10,000          | 500  | 20       | 1.2          | 0.5         | ¥XX  |
| 1/2  | 15,000          | 750  | 30       | 1.3          | 0.8         | ¥XX  |

#### 週次サマリー
```yaml
week_1_summary:
  total_executions: 100,000
  average_execution_time: 150ms
  peak_concurrent_users: 50
  total_cost: ¥XXX
  cost_per_order: ¥X.XX
```

---

### Phase 4: コスト予測モデル

#### Excelテンプレート構成
```
コスト試算シート.xlsx
├── 基本情報タブ
│   ├── 月間注文数
│   ├── 平均API呼び出し/注文
│   └── データ増加率
├── 従量課金計算タブ
│   ├── Functions計算
│   ├── Storage計算
│   └── 転送量計算
├── 固定費タブ
│   ├── PostgreSQL
│   ├── Redis Cache
│   └── その他
└── シナリオ分析タブ
    ├── 最小構成
    ├── 標準構成
    └── 最大構成
```

---

## 実施スケジュール

### Week 1: 環境構築と基礎測定
- [ ] Azure Cost Managementの設定
- [ ] 予算アラート（¥10,000）の設定
- [ ] Application Insightsの詳細ログ有効化
- [ ] 基本的なメトリクス収集開始

### Week 2: 負荷テストと測定
- [ ] k6スクリプト作成
- [ ] 段階的負荷テスト実施
  - 100リクエスト/分
  - 1,000リクエスト/分
  - 10,000リクエスト/分
- [ ] コスト影響の記録

### Week 3: データ分析と予測
- [ ] 収集データの分析
- [ ] コスト予測モデルの作成
- [ ] 最適化ポイントの特定

---

## 必要な準備

### 1. Azureポータル設定
```bash
# Azure CLIでコスト管理を有効化
az consumption budget create \
  --amount 10000 \
  --budget-name "prod-monthly-budget" \
  --category cost \
  --time-grain Monthly \
  --start-date 2024-01-01 \
  --end-date 2024-12-31
```

### 2. メトリクス収集設定
```csharp
// Startup.csでApplication Insights設定
public class Startup : FunctionsStartup
{
    public override void Configure(IFunctionsHostBuilder builder)
    {
        builder.Services.AddApplicationInsightsTelemetry(
            Environment.GetEnvironmentVariable("APPINSIGHTS_INSTRUMENTATIONKEY"));
        
        // カスタムメトリクスの設定
        builder.Services.Configure<TelemetryConfiguration>((config) =>
        {
            config.TelemetryProcessorChainBuilder
                .Use((next) => new CustomTelemetryProcessor(next))
                .Build();
        });
    }
}
```

### 3. コストタグの詳細設定
```json
{
  "Environment": "Production",
  "Project": "ShopifyApp",
  "Component": "API",
  "Owner": "YourName",
  "CostCenter": "Marketing",
  "Version": "1.0"
}
```

---

## 高度な監視設定

### 1. カスタムメトリクス
```csharp
public class MetricsCollector
{
    private readonly TelemetryClient _telemetryClient;
    
    public void TrackCustomMetrics(string operationName, double duration)
    {
        _telemetryClient.TrackMetric($"{operationName}.Duration", duration);
        _telemetryClient.TrackMetric($"{operationName}.Count", 1);
        
        // コスト関連メトリクス
        var estimatedCost = CalculateEstimatedCost(duration);
        _telemetryClient.TrackMetric($"{operationName}.EstimatedCost", estimatedCost);
    }
}
```

### 2. アラート設定
```json
{
  "alerts": [
    {
      "name": "HighFunctionExecutions",
      "condition": "Functions執行回数 > 1,000,000/日",
      "action": "Email + Teams通知"
    },
    {
      "name": "DatabaseCPUHigh",
      "condition": "DB CPU > 80% for 5 minutes",
      "action": "自動スケールアップ"
    }
  ]
}
```

---

## 成果物

### 1. 詳細コスト分析レポート
- 実測値に基づく月額コスト内訳
- 時間帯別・曜日別の使用パターン
- コスト削減機会の特定

### 2. 自動化された監視システム
- リアルタイムダッシュボード
- 異常検知アラート
- 自動スケーリングルール

### 3. コスト最適化ガイド
- ベストプラクティス集
- トラブルシューティングガイド
- 定期レビュープロセス

---

## 長期的な最適化戦略

### 1. 予約インスタンスの活用
- 使用パターンの分析（3ヶ月以上）
- 予約購入のROI計算
- 段階的な移行計画

### 2. アーキテクチャの最適化
- サーバーレスvs常時起動の比較
- キャッシュ戦略の見直し
- データアーカイブポリシー

### 3. マルチクラウド検討
- Azure vs AWS vs GCPの比較
- ハイブリッドクラウドの可能性
- ベンダーロックイン対策 