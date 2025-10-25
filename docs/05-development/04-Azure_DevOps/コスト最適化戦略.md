# Azure本番環境コスト最適化戦略

## 概要
福田様のご要望に基づき、初期コストを最小限に抑えながら、必要に応じてスケールアップする段階的アプローチを提案します。

## 1. 段階的スケールアップ戦略

### Phase 1: 最小構成スタート（月額約$60）

#### App Service構成
```yaml
サービスプラン: B1 Basic
月額費用: $55
スペック:
  - CPU: 1コア
  - RAM: 1.75GB
  - ストレージ: 10GB
  - カスタムドメイン: 対応
  - SSL: 対応
適合シナリオ:
  - 1日1,000-5,000リクエスト
  - 同時接続数: 100以下
  - 小規模～中規模のShopifyストア
```

#### SQL Database構成
```yaml
サービスティア: Basic
月額費用: $5
スペック:
  - DTU: 5
  - 最大データベースサイズ: 2GB
  - バックアップ保持期間: 7日
適合シナリオ:
  - 軽量な読み書き処理
  - 1秒あたり5-10クエリ
```

### Phase 2: 負荷監視期間（1-2週間）

#### 監視項目と閾値
```yaml
App Service監視:
  - CPU使用率: 
    警告: 70%
    クリティカル: 85%
  - メモリ使用率:
    警告: 70%
    クリティカル: 85%
  - レスポンスタイム:
    警告: 2秒
    クリティカル: 5秒
  - HTTP 5xxエラー:
    警告: 1%
    クリティカル: 5%

Database監視:
  - DTU使用率:
    警告: 80%
    クリティカル: 95%
  - 接続プール使用率:
    警告: 70%
    クリティカル: 85%
  - クエリ実行時間:
    警告: 2秒
    クリティカル: 5秒
```

### Phase 3: 最適化されたスケールアップ

#### スケールアップ判断基準
```yaml
App Serviceアップグレード:
  B1 → S1 ($75/月):
    条件: CPU使用率が継続的に80%以上
    改善: CPU 2コア、RAM 3.5GB
  
  S1 → S2 ($150/月):
    条件: メモリ不足によるエラー発生
    改善: CPU 4コア、RAM 7GB
  
  S2 → P1V2 ($200/月):
    条件: 大規模処理が必要
    改善: CPU 4コア、RAM 14GB、高性能

Databaseアップグレード:
  Basic → Standard S0 ($15/月):
    条件: DTU使用率が継続的に80%以上
    改善: 10 DTU、250GB
  
  S0 → S1 ($30/月):
    条件: クエリタイムアウト発生
    改善: 20 DTU、250GB
```

## 2. 追加のコスト削減施策

### 自動スケーリング設定
```json
{
  "scaleRules": {
    "営業時間": {
      "時間": "9:00-18:00 JST",
      "インスタンス": "B1 Basic"
    },
    "ピーク時": {
      "条件": "CPU > 80% for 5 minutes",
      "アクション": "Scale up to S1"
    },
    "深夜": {
      "時間": "0:00-6:00 JST",
      "インスタンス": "F1 Free (可能な場合)"
    }
  }
}
```

### Reserved Instance活用
```yaml
条件: 
  - 3ヶ月以上の安定稼働後
  - 負荷パターンが予測可能
割引率:
  - 1年契約: 最大40%削減
  - 3年契約: 最大60%削減
推奨時期: Phase 2完了後
```

### 無料枠の最大活用
```yaml
Application Insights:
  - 無料枠: 5GB/月
  - 推定使用量: 1-2GB/月
  - 節約額: $10/月

Azure DevOps:
  - 無料枠: 5ユーザーまで
  - パイプライン: 1,800分/月無料
  - 節約額: $30/月

Storage Account:
  - LRS冗長性を選択
  - ホットティアは最小限
  - アーカイブティア活用
  - 節約額: $5-10/月
```

## 3. 実装手順

### Step 1: 初期環境構築（本日実施）
```bash
# リソースグループ作成
az group create --name shopify-suite-prod --location japaneast

# App Service Plan作成（B1 Basic）
az appservice plan create \
  --name shopify-suite-plan \
  --resource-group shopify-suite-prod \
  --sku B1 \
  --is-linux false

# Web App作成
az webapp create \
  --name shopify-analytics-api \
  --resource-group shopify-suite-prod \
  --plan shopify-suite-plan

# SQL Server作成
az sql server create \
  --name shopify-suite-sql \
  --resource-group shopify-suite-prod \
  --location japaneast \
  --admin-user sqladmin \
  --admin-password [SECURE_PASSWORD]

# SQL Database作成（Basic tier）
az sql db create \
  --resource-group shopify-suite-prod \
  --server shopify-suite-sql \
  --name ShopifyAnalytics \
  --service-objective Basic
```

### Step 2: 監視設定
```bash
# Application Insights作成
az monitor app-insights component create \
  --app shopify-suite-insights \
  --location japaneast \
  --resource-group shopify-suite-prod

# アラート設定
az monitor metrics alert create \
  --name cpu-alert \
  --resource-group shopify-suite-prod \
  --scopes [APP_SERVICE_ID] \
  --condition "avg Percentage CPU > 80" \
  --window-size 5m \
  --evaluation-frequency 1m
```

### Step 3: 自動スケーリング設定
```bash
# 自動スケール設定
az monitor autoscale create \
  --resource-group shopify-suite-prod \
  --resource [APP_SERVICE_PLAN_ID] \
  --min-count 1 \
  --max-count 3 \
  --count 1

# CPU基準のスケールルール
az monitor autoscale rule create \
  --autoscale-name shopify-autoscale \
  --resource-group shopify-suite-prod \
  --condition "Percentage CPU > 80 avg 5m" \
  --scale out 1
```

## 4. 月額コスト予測

### 最小構成（Phase 1）
| リソース | 月額費用 |
|---------|---------|
| App Service B1 | $55 |
| SQL Database Basic | $5 |
| Application Insights | $0（無料枠） |
| **合計** | **$60** |

### 標準構成（Phase 3後）
| リソース | 月額費用 |
|---------|---------|
| App Service S1 | $75 |
| SQL Database S0 | $15 |
| Application Insights | $0（無料枠） |
| **合計** | **$90** |

### 高負荷構成
| リソース | 月額費用 |
|---------|---------|
| App Service S2 | $150 |
| SQL Database S1 | $30 |
| Application Insights | $10 |
| **合計** | **$190** |

## 5. 移行チェックリスト

### 本日実施
- [ ] B1 Basicプランでリソース作成
- [ ] Basic tierでSQL Database作成
- [ ] Application Insights設定
- [ ] 基本的な監視アラート設定

### 1週間後
- [ ] 負荷データ分析
- [ ] ボトルネック特定
- [ ] スケーリング判断

### 1ヶ月後
- [ ] Reserved Instance検討
- [ ] 長期コスト最適化計画

## 6. リスク管理

### 潜在的リスク
1. **初期構成での性能不足**
   - 対策: 24時間監視、即座のスケールアップ体制
   
2. **予期しないトラフィック増加**
   - 対策: 自動スケーリング設定、CDN活用

3. **データベース容量不足**
   - 対策: 定期的なクリーンアップジョブ実装

### 緊急時対応
```yaml
レベル1（軽微）:
  - レスポンス遅延 < 5秒
  - 対応: 監視継続

レベル2（警告）:
  - レスポンス遅延 5-10秒
  - 対応: スケールアップ検討

レベル3（緊急）:
  - サービス停止
  - 対応: 即座にS2へスケールアップ
```

---

**作成者**: Kenji（プロジェクトマネージャー）  
**作成日**: 2025年8月12日  
**対象**: 福田様への提案資料