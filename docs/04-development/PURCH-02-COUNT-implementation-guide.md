# PURCH-02-COUNT 購入回数分析【購買】実装ガイド

## 1. 実装概要

### 1.1 実装内容
- **機能ID**: PURCH-02-COUNT
- **機能名**: 購入回数分析【購買】
- **実装日**: 2024-07-25
- **実装者**: Azure Functions + .NET 8

### 1.2 主要機能
- 購入回数別詳細分析（1回～20回以上）
- 前年同期比較分析
- セグメント別分析（新規・既存・復帰顧客）
- 購入回数トレンド分析
- インサイト生成と推奨アクション

### 1.3 技術仕様
- **バックエンド**: .NET 8 + Entity Framework Core
- **データベース**: Azure SQL Database（既存ShopifyTestApiと共有）
- **API設計**: RESTful API
- **認証**: なし（内部API）

## 2. 実装ファイル一覧

### 2.1 バックエンドファイル
```
backend/ShopifyTestApi/
├── Models/
│   └── PurchaseCountModels.cs          # データモデル定義
├── Services/
│   ├── IPurchaseCountAnalysisService.cs # サービスインターフェース
│   └── PurchaseCountAnalysisService.cs  # サービス実装
├── Controllers/
│   └── PurchaseController.cs           # APIコントローラー
├── Program.cs                          # DI設定更新
└── ShopifyTestApi-PurchaseCount.http   # APIテストファイル
```

### 2.2 ドキュメントファイル
```
docs/04-development/
└── PURCH-02-COUNT-implementation-guide.md # 本ファイル
```

## 3. データモデル設計

### 3.1 主要データモデル

#### PurchaseCountAnalysisResponse
```csharp
public class PurchaseCountAnalysisResponse
{
    public PurchaseCountSummary Summary { get; set; }           // サマリー情報
    public List<PurchaseCountDetail> Details { get; set; }     // 詳細データ
    public List<PurchaseCountTrend> Trends { get; set; }       // トレンドデータ
    public List<SegmentAnalysisData> SegmentAnalysis { get; set; } // セグメント分析
    public PurchaseCountInsights Insights { get; set; }        // インサイト
}
```

#### PurchaseCountDetail
```csharp
public class PurchaseCountDetail
{
    public int PurchaseCount { get; set; }                     // 購入回数
    public string PurchaseCountLabel { get; set; }             // "1回", "2回", "20回以上"
    public BasicMetrics Current { get; set; }                  // 現在期間データ
    public BasicMetrics? Previous { get; set; }                // 前年同期データ
    public GrowthRateMetrics? GrowthRate { get; set; }         // 成長率指標
    public PercentageMetrics Percentage { get; set; }          // 構成比指標
    public DetailedAnalysisMetrics Analysis { get; set; }      // 詳細分析指標
}
```

#### BasicMetrics
```csharp
public class BasicMetrics
{
    public int CustomerCount { get; set; }                     // 顧客数
    public int OrderCount { get; set; }                        // 注文数
    public decimal TotalAmount { get; set; }                   // 総売上
    public decimal AverageOrderValue { get; set; }             // 平均注文単価
    public decimal AverageCustomerValue { get; set; }          // 平均顧客単価
}
```

### 3.2 セグメント定義
| セグメント | 説明 | 条件 |
|------------|------|------|
| `new` | 新規顧客 | 初回購入が分析期間内の顧客 |
| `existing` | 既存顧客 | 継続的な購入履歴がある顧客 |
| `returning` | 復帰顧客 | 過去1年以上購入がなく、分析期間内に購入した顧客 |

## 4. API エンドポイント設計

### 4.1 エンドポイント一覧

| エンドポイント | メソッド | 説明 | パラメータ |
|---------------|----------|------|-----------|
| `/api/purchase/test` | GET | 接続テスト | なし |
| `/api/purchase/quick-stats` | GET | クイック統計 | `storeId` |
| `/api/purchase/count-summary` | GET | サマリー取得 | `storeId`, `days` |
| `/api/purchase/count-trends` | GET | トレンド取得 | `storeId`, `months` |
| `/api/purchase/segment-analysis` | GET | セグメント分析 | `storeId`, `segment` |
| `/api/purchase/count-analysis` | GET | 詳細分析 | `PurchaseCountAnalysisRequest` |

### 4.2 主要エンドポイント詳細

#### 4.2.1 詳細分析データ取得
```
GET /api/purchase/count-analysis
Query Parameters:
- storeId: int (default: 1)
- startDate: DateTime (default: 1年前)
- endDate: DateTime (default: 現在)
- segment: string (default: "all") - "all"|"new"|"existing"|"returning"
- includeComparison: bool (default: true)
- maxPurchaseCount: int (default: 20)
```

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalCustomers": 1250,
      "totalOrders": 3200,
      "totalRevenue": 850000.00,
      "averagePurchaseCount": 2.56,
      "repeatCustomerRate": 42.3,
      "multiPurchaseRate": 28.7
    },
    "details": [
      {
        "purchaseCount": 1,
        "purchaseCountLabel": "1回",
        "current": {
          "customerCount": 720,
          "orderCount": 720,
          "totalAmount": 180000.00
        },
        "percentage": {
          "customerPercentage": 57.6,
          "amountPercentage": 21.2
        }
      }
    ]
  }
}
```

#### 4.2.2 クイック統計取得
```
GET /api/purchase/quick-stats?storeId=1
```

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "totalCustomers": 1250,
    "totalOrders": 3200,
    "averagePurchaseCount": 2.56,
    "repeatCustomerRate": 42.3,
    "recentTrends": [
      {
        "period": "2024年5月",
        "customers": 380,
        "avgPurchaseCount": 2.42,
        "repeatRate": 38.9
      }
    ]
  }
}
```

## 5. サービス実装詳細

### 5.1 主要メソッド

#### GetPurchaseCountAnalysisAsync
```csharp
public async Task<PurchaseCountAnalysisResponse> GetPurchaseCountAnalysisAsync(
    PurchaseCountAnalysisRequest request)
```
- 包括的な購入回数分析を実行
- サマリー、詳細、トレンド、セグメント、インサイトを統合

#### GetPurchaseCountSummaryAsync
```csharp
public async Task<PurchaseCountSummary> GetPurchaseCountSummaryAsync(
    int storeId, int days = 365)
```
- 指定期間の購入回数サマリー統計を計算
- リピート顧客率、複数回購入率を算出

#### GetPurchaseCountTrendsAsync
```csharp
public async Task<List<PurchaseCountTrend>> GetPurchaseCountTrendsAsync(
    int storeId, int months = 12)
```
- 月別の購入回数トレンドデータを生成
- 購入回数分布の時系列変化を追跡

### 5.2 計算ロジック

#### 5.2.1 購入回数集計
```csharp
// 顧客の購入回数を集計
var customerPurchaseCounts = await _context.Orders
    .Where(o => o.StoreId == storeId && 
               o.CreatedAt >= startDate && 
               o.CreatedAt <= endDate)
    .GroupBy(o => o.CustomerId)
    .Select(g => new { 
        CustomerId = g.Key, 
        PurchaseCount = g.Count(),
        TotalAmount = g.Sum(order => order.TotalPrice)
    })
    .ToListAsync();
```

#### 5.2.2 リピート率計算
```csharp
var repeatCustomers = customerPurchaseCounts.Count(c => c.PurchaseCount >= 2);
var repeatCustomerRate = totalCustomers > 0 ? 
    (decimal)repeatCustomers / totalCustomers * 100 : 0;
```

#### 5.2.3 成長率計算
```csharp
var growthRate = new GrowthRateMetrics
{
    CustomerCountGrowth = previous.CustomerCount > 0 ? 
        (decimal)(current.CustomerCount - previous.CustomerCount) / previous.CustomerCount * 100 : 0,
    AmountGrowth = previous.TotalAmount > 0 ? 
        (current.TotalAmount - previous.TotalAmount) / previous.TotalAmount * 100 : 0
};
```

## 6. インサイト生成ロジック

### 6.1 主要発見事項の自動生成
```csharp
// 一回購入顧客の比率チェック
if (oneTimeCustomers != null && oneTimeCustomers.Percentage.CustomerPercentage > 60)
{
    insights.KeyFindings.Add($"一回購入顧客が{oneTimeCustomers.Percentage.CustomerPercentage:F1}%と高い比率を占めています");
}

// 高頻度購入顧客の存在チェック
var highFreqCustomers = response.Details.Where(d => d.PurchaseCount >= 5).Sum(d => d.Percentage.CustomerPercentage);
if (highFreqCustomers > 15)
{
    insights.KeyFindings.Add($"5回以上購入する高頻度顧客が{highFreqCustomers:F1}%存在します");
}
```

### 6.2 推奨アクション生成
```csharp
// リピート促進施策の推奨
if (oneTimeCustomers?.Percentage.CustomerPercentage > 60)
{
    insights.Recommendations.Add(new RecommendationItem
    {
        Category = "リピート促進",
        Title = "新規顧客リピート促進",
        Description = "一回購入顧客の比率が高いため、リピート購入を促進する施策が必要です",
        Priority = "高",
        Action = "フォローアップメール、割引クーポン、リターゲティング広告の実施"
    });
}
```

### 6.3 リスク分析
```csharp
insights.Risk = new RiskAnalysis
{
    OneTimeCustomerRate = oneTimeCustomers?.Percentage.CustomerPercentage ?? 0,
    ChurnRisk = oneTimeCustomers?.Percentage.CustomerPercentage > 70 ? 80 : 40,
    RiskFactors = new List<string> { "高い一回購入率", "低いリピート率" },
    OverallRiskLevel = oneTimeCustomers?.Percentage.CustomerPercentage > 70 ? "高" : "中"
};
```

## 7. テスト方法

### 7.1 APIテストファイル使用
```bash
# HTTPファイルを使用してテスト
# VS Code REST Client拡張機能、または
# Postmanでインポートして実行

file: backend/ShopifyTestApi/ShopifyTestApi-PurchaseCount.http
```

### 7.2 主要テストケース

#### 7.2.1 基本動作テスト
```http
### 1. 接続テスト
GET {{baseUrl}}/api/purchase/test

### 2. クイック統計取得
GET {{baseUrl}}/api/purchase/quick-stats?storeId=1

### 3. サマリー取得
GET {{baseUrl}}/api/purchase/count-summary?storeId=1&days=365
```

#### 7.2.2 詳細分析テスト
```http
### 詳細分析（全セグメント）
GET {{baseUrl}}/api/purchase/count-analysis?storeId=1&startDate=2023-07-01&endDate=2024-07-31&segment=all&includeComparison=true&maxPurchaseCount=20

### セグメント別分析
GET {{baseUrl}}/api/purchase/segment-analysis?storeId=1&segment=new
```

### 7.3 期待される結果
- **レスポンス時間**: 2秒以内
- **データ精度**: 既存注文データに基づく正確な集計
- **エラーハンドリング**: 適切なエラーメッセージとHTTPステータス

## 8. パフォーマンス考慮事項

### 8.1 データベースクエリ最適化
- **インデックス**: `Orders.StoreId`, `Orders.CustomerId`, `Orders.CreatedAt`
- **集約クエリ**: GROUP BY を使用した効率的な集計
- **ページング**: 大量データ処理時の分割処理

### 8.2 キャッシュ戦略
- **メモリキャッシュ**: 頻繁にアクセスされるサマリーデータ
- **分散キャッシュ**: 複数インスタンス環境での整合性確保

### 8.3 スケーラビリティ
- **非同期処理**: `async/await` による非ブロッキング処理
- **並列処理**: 複数セグメントの並行分析
- **リソース管理**: 適切なメモリ管理とガベージコレクション

## 9. 運用・監視

### 9.1 ログ出力
```csharp
// 処理開始ログ
_logger.LogInformation("購入回数分析開始 - StoreId: {StoreId}, Period: {StartDate} - {EndDate}",
    request.StoreId, request.StartDate, request.EndDate);

// 処理完了ログ
_logger.LogInformation("購入回数分析完了 - DetailCount: {DetailCount}, TrendCount: {TrendCount}",
    response.Details.Count, response.Trends.Count);
```

### 9.2 エラーハンドリング
- **例外キャッチ**: 全APIエンドポイントでの統一的なエラー処理
- **ログ出力**: エラー詳細とスタックトレースの記録
- **ユーザー向けメッセージ**: 技術的詳細を隠した分かりやすいエラーメッセージ

### 9.3 パフォーマンス監視
- **LoggingHelper**: パフォーマンススコープによる処理時間計測
- **Application Insights**: メトリクスとテレメトリの自動収集

## 10. 今後の拡張計画

### 10.1 機能拡張
- **予測分析**: 機械学習による購入回数予測
- **個人化**: 顧客個別の購入回数パターン分析
- **A/Bテスト**: セグメント別施策効果測定

### 10.2 パフォーマンス改善
- **データウェアハウス**: 分析専用データストアの構築
- **リアルタイム集計**: ストリーミング処理による即座な更新
- **プリコンピューティング**: 事前計算による高速レスポンス

### 10.3 統合機能
- **マーケティングオートメーション**: 自動的な施策実行
- **外部システム連携**: CRM、メール配信システムとの統合
- **ダッシュボード**: 可視化とレポーティング機能の強化

## 11. 実装完了チェックリスト

- [x] データモデル定義完了
- [x] サービスインターフェース定義完了
- [x] サービス実装完了
- [x] APIコントローラー実装完了
- [x] DI設定更新完了
- [x] APIテストファイル作成完了
- [x] 実装ガイド作成完了
- [ ] 単体テスト実装
- [ ] 統合テスト実装
- [ ] パフォーマンステスト実行
- [ ] セキュリティ検証
- [ ] 本番デプロイ

---

**実装者**: Azure Functions + .NET 8  
**実装日**: 2024-07-25  
**バージョン**: 1.0.0  
**ステータス**: 実装完了（テスト待ち）