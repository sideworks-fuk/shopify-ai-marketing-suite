# Application Insights - 監視KQLとアラート手順

## 目的
- Webhookの403/5xx、GDPR処理失敗、Billing失敗を早期検知
- 冪等性/監査ログの重複がないことを継続監視

## KQLクエリ例

### 1) Webhook 403（署名不正/欠落）
```
traces
| where timestamp > ago(1h)
| where message has "Webhook" and message has "403"
| summarize count() by bin(timestamp, 5m)
```

### 2) Webhook 5xx/例外
```
exceptions
| where timestamp > ago(1h)
| summarize count() by bin(timestamp, 5m), type
```

### 3) GDPR 処理失敗
```
traces
| where timestamp > ago(24h)
| where message has "GDPR" and (message has "Failed" or message has "エラー")
| project timestamp, message
```

### 4) 監査ログ重複（IdempotencyKey）
```
traces
| where timestamp > ago(24h)
| where message has "WebhookEvent 記録" and message has "IdempotencyKey"
| summarize dcount(split(message, "IdempotencyKey=")[1]) by bin(timestamp, 1d)
```

### 5) Billing 失敗
```
traces
| where timestamp > ago(24h)
| where message has "Subscription" and (message has "Failed" or message has "エラー")
| project timestamp, message
```

## アラート設定（例）
- Webhook 403 回数 >= 3 （5分窓）で通知
- 例外（exceptions）発生 >= 3 （5分窓）で通知
- GDPR Failed > 0 （15分窓）で通知

## ダッシュボード
- 上記KQLをタイル化し、`EC Ranger - Operational` ダッシュボードに配置








