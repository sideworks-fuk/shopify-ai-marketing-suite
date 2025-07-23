# Application Insights ログクエリテンプレート

## エラー分析

### エラー発生率の時系列グラフ
```kusto
traces
| where timestamp > ago(24h)
| where severityLevel == 3
| summarize count() by bin(timestamp, 1h)
| render timechart
```

### エラー別発生頻度TOP10
```kusto
traces
| where timestamp > ago(24h)
| where severityLevel == 3
| summarize count() by message
| top 10 by count_
| order by count_ desc
```

### エンドポイント別エラー率
```kusto
traces
| where timestamp > ago(24h)
| where customDimensions.RequestPath != ""
| summarize 
    total = count(),
    errors = countif(severityLevel == 3)
    by customDimensions.RequestPath
| extend errorRate = errors * 100.0 / total
| order by errorRate desc
```

## パフォーマンス分析

### 遅いAPIエンドポイントTOP10
```kusto
traces
| where timestamp > ago(24h)
| where customDimensions.OperationName != ""
| where customDimensions.DurationMs > 1000
| summarize 
    avgDuration = avg(todouble(customDimensions.DurationMs)),
    maxDuration = max(todouble(customDimensions.DurationMs)),
    count = count()
    by customDimensions.OperationName
| order by avgDuration desc
| top 10
```

### レスポンスタイムの時系列グラフ
```kusto
traces
| where timestamp > ago(24h)
| where customDimensions.DurationMs != ""
| extend duration = todouble(customDimensions.DurationMs)
| summarize 
    avgDuration = avg(duration),
    p95Duration = percentile(duration, 95)
    by bin(timestamp, 1h)
| render timechart
```

### データベース操作の実行時間
```kusto
traces
| where timestamp > ago(24h)
| where customDimensions.OperationName contains "Database"
| extend duration = todouble(customDimensions.DurationMs)
| summarize 
    avgDuration = avg(duration),
    maxDuration = max(duration),
    count = count()
    by customDimensions.OperationName
| order by avgDuration desc
```

## ユーザー分析

### ユーザー別エラー頻度
```kusto
traces
| where timestamp > ago(24h)
| where severityLevel == 3
| where customDimensions.UserId != ""
| summarize count() by customDimensions.UserId
| order by count_ desc
| top 20
```

### リクエストパス別アクセス数
```kusto
traces
| where timestamp > ago(24h)
| where customDimensions.RequestPath != ""
| summarize count() by customDimensions.RequestPath
| order by count_ desc
| top 20
```

## 外部API分析

### 外部API呼び出しの成功率
```kusto
traces
| where timestamp > ago(24h)
| where customDimensions.OperationName contains "External"
| summarize 
    total = count(),
    success = countif(severityLevel < 3)
    by customDimensions.OperationName
| extend successRate = success * 100.0 / total
| order by successRate desc
```

### 外部API呼び出しの実行時間
```kusto
traces
| where timestamp > ago(24h)
| where customDimensions.OperationName contains "External"
| extend duration = todouble(customDimensions.DurationMs)
| summarize 
    avgDuration = avg(duration),
    maxDuration = max(duration)
    by customDimensions.OperationName
| order by avgDuration desc
```

## システム監視

### インスタンス別パフォーマンス
```kusto
traces
| where timestamp > ago(24h)
| where customDimensions.InstanceId != ""
| extend duration = todouble(customDimensions.DurationMs)
| summarize 
    avgDuration = avg(duration),
    requestCount = count()
    by customDimensions.InstanceId
| order by avgDuration desc
```

### 環境別エラー率
```kusto
traces
| where timestamp > ago(24h)
| summarize 
    total = count(),
    errors = countif(severityLevel == 3)
    by customDimensions.Environment
| extend errorRate = errors * 100.0 / total
| order by errorRate desc
```

## アラート用クエリ

### 高エラー率検出
```kusto
traces
| where timestamp > ago(5m)
| summarize 
    total = count(),
    errors = countif(severityLevel == 3)
| extend errorRate = errors * 100.0 / total
| where errorRate > 5
```

### 遅いレスポンス検出
```kusto
traces
| where timestamp > ago(5m)
| where customDimensions.DurationMs != ""
| extend duration = todouble(customDimensions.DurationMs)
| summarize avgDuration = avg(duration)
| where avgDuration > 2000
```

### データベース接続エラー検出
```kusto
traces
| where timestamp > ago(5m)
| where message contains "Database" and severityLevel == 3
| summarize count() by message
| where count_ > 3
``` 