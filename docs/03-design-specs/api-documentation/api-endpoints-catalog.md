# APIエンドポイントカタログ

## エンドポイント詳細仕様

### 🎯 顧客分析 (CustomerController)

#### 1. 休眠顧客分析
```
GET /api/customer/dormant
```

**パラメータ:**
| 名前 | 型 | 必須 | デフォルト | 説明 |
|------|-----|------|-----------|------|
| storeId | number | No | 1 | 店舗ID |
| segment | string | No | - | セグメント（90-180日、180-365日、365日以上） |
| riskLevel | string | No | - | リスクレベル（low、medium、high、critical） |
| pageNumber | number | No | 1 | ページ番号 |
| pageSize | number | No | 100 | ページサイズ（最大500） |
| sortBy | string | No | DaysSinceLastPurchase | ソート項目 |
| descending | boolean | No | true | 降順フラグ |

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "customers": [
      {
        "customerId": 123,
        "name": "顧客名",
        "email": "customer@example.com",
        "lastPurchaseDate": "2024-01-15T00:00:00Z",
        "daysSinceLastPurchase": 90,
        "dormancySegment": "90-180日",
        "riskLevel": "medium",
        "churnProbability": 0.35,
        "totalSpent": 150000,
        "totalOrders": 5,
        "averageOrderValue": 30000
      }
    ],
    "pagination": {
      "currentPage": 1,
      "pageSize": 100,
      "totalCount": 1500,
      "hasNextPage": true
    }
  }
}
```

**実装ファイル:**
- Backend: `Controllers/CustomerController.cs`
- Service: `Services/DormantCustomerService.cs`
- Frontend: `src/components/dashboards/DormantCustomerAnalysis.tsx`

**利用画面:**
- 休眠顧客【顧客】 (`/customers/dormant`)

---

#### 2. 休眠顧客サマリー
```
GET /api/customer/dormant/summary
```

**パラメータ:**
| 名前 | 型 | 必須 | デフォルト | 説明 |
|------|-----|------|-----------|------|
| storeId | number | No | 1 | 店舗ID |

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "totalDormantCustomers": 1500,
    "dormantRate": 25.5,
    "averageDormancyDays": 180,
    "segmentCounts": {
      "90-180日": 600,
      "180-365日": 500,
      "365日以上": 400
    },
    "segmentRevenue": {
      "90-180日": 30000000,
      "180-365日": 25000000,
      "365日以上": 20000000
    }
  }
}
```

---

### 🛒 購買分析 (PurchaseController)

#### 1. 購入回数分析
```
GET /api/purchase/count-analysis
```

**パラメータ:**
| 名前 | 型 | 必須 | デフォルト | 説明 |
|------|-----|------|-----------|------|
| storeId | number | No | 1 | 店舗ID |
| startDate | string | No | 1年前 | 開始日（YYYY-MM-DD） |
| endDate | string | No | 今日 | 終了日（YYYY-MM-DD） |

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "details": [
      {
        "purchaseCount": 1,
        "customerCount": 800,
        "percentage": 40.0,
        "totalRevenue": 12000000,
        "averageOrderValue": 15000
      },
      {
        "purchaseCount": 2,
        "customerCount": 600,
        "percentage": 30.0,
        "totalRevenue": 18000000,
        "averageOrderValue": 15000
      }
    ],
    "trends": [
      {
        "period": "2024-01",
        "totalCustomers": 2000,
        "averagePurchaseCount": 2.1,
        "repeatRate": 60.0
      }
    ]
  }
}
```

**実装ファイル:**
- Backend: `Controllers/PurchaseController.cs`
- Service: `Services/PurchaseCountAnalysisService.cs`
- Frontend: `src/components/dashboards/PurchaseFrequencyDetailAnalysis.tsx`

---

#### 2. 購入回数サマリー
```
GET /api/purchase/count-summary
```

**パラメータ:**
| 名前 | 型 | 必須 | デフォルト | 説明 |
|------|-----|------|-----------|------|
| storeId | number | No | 1 | 店舗ID |
| days | number | No | 365 | 分析期間（日数） |

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "totalCustomers": 2000,
    "totalOrders": 4200,
    "totalRevenue": 63000000,
    "averagePurchaseCount": 2.1,
    "repeatCustomerRate": 60.0,
    "multiPurchaseRate": 45.0,
    "periodLabel": "過去365日"
  }
}
```

---

### 📈 分析系API (AnalyticsController)

#### 1. 前年同月比分析
```
GET /api/analytics/year-over-year
```

**パラメータ:**
| 名前 | 型 | 必須 | デフォルト | 説明 |
|------|-----|------|-----------|------|
| storeId | number | No | 1 | 店舗ID |
| year | number | Yes | - | 対象年 |
| startMonth | number | No | 1 | 開始月 |
| endMonth | number | No | 12 | 終了月 |
| viewMode | string | No | all | 表示モード（all、growing、declining） |
| productTypes | string[] | No | - | 商品タイプフィルター |
| vendors | string[] | No | - | ベンダーフィルター |
| maxProducts | number | No | 100 | 最大商品数 |

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalGrowthRate": 15.5,
      "growingProducts": 234,
      "decliningProducts": 56,
      "totalCurrentRevenue": 150000000,
      "totalPreviousRevenue": 130000000
    },
    "products": [
      {
        "productId": "123",
        "productName": "商品名",
        "currentSales": 1500000,
        "previousSales": 1200000,
        "growthRate": 25.0,
        "currentQuantity": 100,
        "previousQuantity": 80,
        "productType": "アパレル",
        "vendor": "ベンダー名"
      }
    ],
    "monthlyTrends": [
      {
        "month": 1,
        "currentSales": 12000000,
        "previousSales": 10000000,
        "growthRate": 20.0
      }
    ],
    "metadata": {
      "processingTimeMs": 1250,
      "dataRange": "2024-01-01 to 2024-12-31",
      "comparisonRange": "2023-01-01 to 2023-12-31"
    }
  }
}
```

**実装ファイル:**
- Backend: `Controllers/AnalyticsController.cs`
- Service: `Services/YearOverYearService.cs`
- Frontend: `src/components/dashboards/YearOverYearProductAnalysis.tsx`

**利用画面:**
- 前年同月比【商品】 (`/sales/year-over-year`)

---

#### 2. 月別売上統計
```
GET /api/analytics/monthly-sales
```

**パラメータ:**
| 名前 | 型 | 必須 | デフォルト | 説明 |
|------|-----|------|-----------|------|
| storeId | number | No | 1 | 店舗ID |
| startYear | number | No | 前年 | 開始年 |
| startMonth | number | No | 1 | 開始月 |
| endYear | number | No | 今年 | 終了年 |
| endMonth | number | No | 今月 | 終了月 |
| displayMode | string | No | summary | 表示モード |

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "monthlySales": [
      {
        "year": 2024,
        "month": 1,
        "monthName": "1月",
        "totalSales": 12000000,
        "totalOrders": 800,
        "averageOrderValue": 15000,
        "topProducts": [
          {
            "productId": "123",
            "productName": "商品名",
            "sales": 1200000,
            "quantity": 80
          }
        ]
      }
    ],
    "summary": {
      "totalSales": 144000000,
      "averageMonthlySales": 12000000,
      "bestMonth": { "year": 2024, "month": 12, "sales": 18000000 },
      "worstMonth": { "year": 2024, "month": 2, "sales": 8000000 }
    }
  }
}
```

---

### 🔧 システムAPI

#### 1. ヘルスチェック
```
GET /api/health
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "status": "Healthy",
    "timestamp": "2025-01-26T12:00:00Z",
    "message": "All systems operational",
    "environment": "Production"
  }
}
```

#### 2. 接続テスト
```
GET /api/customer/test
GET /api/purchase/test
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "message": "API接続テスト成功！",
    "serverTime": "2025-01-26 12:00:00 UTC",
    "version": "1.1.0",
    "availableEndpoints": [
      "GET /api/customer/dashboard - 全ダッシュボードデータ",
      "GET /api/customer/segments - 顧客セグメント"
    ]
  }
}
```

---

## 📚 エラーレスポンス

全APIで共通のエラーレスポンス形式：

```json
{
  "success": false,
  "data": null,
  "message": "エラーメッセージ"
}
```

## 🔒 認証・セキュリティ

- 現在は認証なし（開発環境）
- 本番環境では JWT または API Key による認証を予定
- CORS設定済み
- Rate Limiting 未実装（今後追加予定）

## 📊 パフォーマンス指標

| エンドポイント | 平均応答時間 | キャッシュ | 備考 |
|--------------|-------------|-----------|------|
| `/api/customer/dormant` | 800ms | 15分 | 重い処理 |
| `/api/purchase/count-analysis` | 400ms | 10分 | DB集計あり |
| `/api/analytics/year-over-year` | 1200ms | 30分 | 大量データ処理 |
| `/api/customer/dashboard` | 200ms | モック | モックデータ |

---

**最終更新**: 2025-07-26  
**更新者**: AIアシスタントケンジ