# PURCH-02-COUNT API テスト手順書

## 📋 テスト概要

### 🎯 テスト対象
- **API名**: 購入回数分析【購買】API
- **機能ID**: PURCH-02-COUNT  
- **エンドポイント**: `/api/purchase/*`
- **実装状況**: ✅ バックエンド実装完了 / 🔧 フロントエンド統合待ち

### 🌐 テスト環境
- **本番URL**: `https://shopifytestapi20250720173320.azurewebsites.net`
- **ローカルURL**: `http://localhost:5000` (開発時)
- **フロントエンドテストツール**: `/dev/purchase-frequency-api-test`

> **注意**: このAPIは実装完了済みですが、フロントエンドから実際のデータ取得は未実装です。現在はモックデータを使用しています。

## 2. 事前準備

### 🛠️ 必要ツール
- **フロントエンドテストツール**: `/dev/purchase-frequency-api-test` (推奨)
- **REST Client**: VS Code拡張機能、Postman、または curl
- **HTTPファイル**: `backend/ShopifyTestApi/ShopifyTestApi-PurchaseCount.http`

### 🎨 フロントエンドAPIテストツールの使用
**推奨方法**: ブラウザベースのテストツール
1. 開発サーバー起動後、`http://localhost:3000/dev/purchase-frequency-api-test` にアクセス
2. 視覚的なAPIテスト画面でテスト実行
3. リアルタイムでレスポンス確認
4. エラー詳細とデバッグ情報の表示

### 2.2 データベース状態確認
APIテスト前に、データベースに注文データが存在することを確認してください：

```sql
-- 注文データ確認
SELECT COUNT(*) as TotalOrders, 
       COUNT(DISTINCT CustomerId) as TotalCustomers,
       MIN(CreatedAt) as EarliestOrder,
       MAX(CreatedAt) as LatestOrder
FROM Orders 
WHERE StoreId = 1;

-- 顧客別購入回数確認  
SELECT CustomerId, COUNT(*) as PurchaseCount
FROM Orders 
WHERE StoreId = 1
GROUP BY CustomerId
ORDER BY PurchaseCount DESC;
```

## 3. テスト手順

### 3.1 基本接続テスト

#### テスト1: API接続テスト
```http
GET https://shopifytestapi20250720173320.azurewebsites.net/api/purchase/test
```

**期待結果:**
```json
{
  "success": true,
  "data": {
    "message": "Purchase API接続テスト成功！",
    "serverTime": "2024-07-25 12:00:00 UTC",
    "version": "1.0.0",
    "service": "PurchaseCountAnalysis",
    "availableEndpoints": [
      "GET /api/purchase/count-analysis - 購入回数分析データ",
      "GET /api/purchase/count-summary - 購入回数サマリー", 
      "GET /api/purchase/count-trends - 購入回数トレンド",
      "GET /api/purchase/segment-analysis - セグメント別分析",
      "GET /api/purchase/test - 接続テスト"
    ]
  },
  "message": "Purchase API は正常に動作しています。"
}
```

**確認項目:**
- [x] ステータスコード: 200 OK
- [x] `success: true`
- [x] エンドポイント一覧の表示
- [x] 現在時刻の表示

---

### 3.2 クイック統計テスト

#### テスト2: クイック統計取得
```http
GET https://shopifytestapi20250720173320.azurewebsites.net/api/purchase/quick-stats?storeId=1
```

**期待結果:**
```json
{
  "success": true,
  "data": {
    "totalCustomers": 1250,
    "totalOrders": 3200,
    "totalRevenue": 850000.00,
    "averagePurchaseCount": 2.56,
    "repeatCustomerRate": 42.3,
    "multiPurchaseRate": 28.7,
    "lastUpdate": "2024-07-25T12:00:00Z",
    "period": "2024/04/25 - 2024/07/25",
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

**確認項目:**
- [x] 統計データの数値が論理的範囲内
- [x] `repeatCustomerRate` が 0-100% の範囲
- [x] `recentTrends` 配列の存在
- [x] 日付フォーマットの正確性

---

### 3.3 サマリーデータテスト

#### テスト3: 購入回数サマリー（過去365日）
```http
GET https://shopifytestapi20250720173320.azurewebsites.net/api/purchase/count-summary?storeId=1&days=365
```

**期待結果:**
```json
{
  "success": true,
  "data": {
    "totalCustomers": 1250,
    "totalOrders": 3200,
    "totalRevenue": 850000.00,
    "averagePurchaseCount": 2.56,
    "repeatCustomerRate": 42.3,
    "multiPurchaseRate": 28.7,
    "periodLabel": "2023/07/25 - 2024/07/25",
    "comparison": {
      "previous": {
        "customerCount": 1100,
        "orderCount": 2800,
        "totalAmount": 720000.00
      },
      "customerGrowthRate": 13.6,
      "revenueGrowthRate": 18.1,
      "comparisonPeriod": "2022/07/25 - 2023/07/25"
    }
  }
}
```

#### テスト4: 購入回数サマリー（過去90日）
```http
GET https://shopifytestapi20250720173320.azurewebsites.net/api/purchase/count-summary?storeId=1&days=90
```

**確認項目:**
- [x] 期間が短くなるとデータ量も減少
- [x] 成長率データ（`comparison`）の存在
- [x] 期間ラベルの正確性
- [x] 計算値の整合性（平均購入回数 = 注文数 ÷ 顧客数）

---

### 3.4 トレンドデータテスト

#### テスト5: 購入回数トレンド（過去12ヶ月）
```http
GET https://shopifytestapi20250720173320.azurewebsites.net/api/purchase/count-trends?storeId=1&months=12
```

**期待結果:**
```json
{
  "success": true,
  "data": [
    {
      "period": "2023-08",
      "periodLabel": "2023年8月",
      "totalCustomers": 420,
      "averagePurchaseCount": 2.3,
      "repeatRate": 38.5,
      "distribution": [
        {
          "purchaseCount": 1,
          "customerCount": 260,
          "percentage": 61.9
        },
        {
          "purchaseCount": 2,
          "customerCount": 90,
          "percentage": 21.4
        }
      ]
    }
  ]
}
```

#### テスト6: 購入回数トレンド（過去6ヶ月）
```http
GET https://shopifytestapi20250720173320.azurewebsites.net/api/purchase/count-trends?storeId=1&months=6
```

**確認項目:**
- [x] データ配列の長さが指定月数と一致
- [x] 時系列順（古い→新しい）でのデータ並び
- [x] 各月の購入回数分布データ存在
- [x] パーセンテージの合計が100%に近い

---

### 3.5 セグメント分析テスト

#### テスト7: 新規顧客セグメント分析
```http
GET https://shopifytestapi20250720173320.azurewebsites.net/api/purchase/segment-analysis?storeId=1&segment=new
```

#### テスト8: 既存顧客セグメント分析
```http
GET https://shopifytestapi20250720173320.azurewebsites.net/api/purchase/segment-analysis?storeId=1&segment=existing
```

#### テスト9: 復帰顧客セグメント分析
```http
GET https://shopifytestapi20250720173320.azurewebsites.net/api/purchase/segment-analysis?storeId=1&segment=returning
```

**期待結果:**
```json
{
  "success": true,
  "data": {
    "segment": "new",
    "segmentName": "新規顧客",
    "details": [
      {
        "purchaseCount": 1,
        "purchaseCountLabel": "1回",
        "current": {
          "customerCount": 320,
          "orderCount": 320,
          "totalAmount": 85000.00
        },
        "percentage": {
          "customerPercentage": 78.5,
          "amountPercentage": 65.2
        }
      }
    ],
    "summary": {
      "totalCustomers": 408,
      "averagePurchaseCount": 1.2,
      "repeatRate": 21.5,
      "averageLTV": 208.33,
      "revenueContribution": 85000.00
    }
  }
}
```

**確認項目:**
- [x] セグメント名の日本語表示
- [x] 詳細データ配列の存在
- [x] サマリー統計の論理性
- [x] 新規顧客は購入回数が少ない傾向

---

### 3.6 詳細分析テスト

#### テスト10: 基本的な詳細分析
```http
GET https://shopifytestapi20250720173320.azurewebsites.net/api/purchase/count-analysis?storeId=1&startDate=2023-07-01&endDate=2024-07-31&segment=all&includeComparison=true&maxPurchaseCount=20
```

**期待結果:**
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
          "totalAmount": 180000.00,
          "averageOrderValue": 250.00,
          "averageCustomerValue": 250.00
        },
        "previous": {
          "customerCount": 650,
          "orderCount": 650,
          "totalAmount": 155000.00
        },
        "growthRate": {
          "customerCountGrowth": 10.8,
          "orderCountGrowth": 10.8,
          "amountGrowth": 16.1,
          "growthTrend": "増加"
        },
        "percentage": {
          "customerPercentage": 57.6,
          "orderPercentage": 22.5,
          "amountPercentage": 21.2
        },
        "analysis": {
          "conversionRate": 15.5,
          "retentionRate": 86.5,
          "averageDaysBetweenOrders": 45.0,
          "highValueCustomers": 48,
          "riskLevel": "高"
        }
      }
    ],
    "trends": [
      {
        "period": "2023-08",
        "periodLabel": "2023年8月",
        "totalCustomers": 420,
        "averagePurchaseCount": 2.3,
        "repeatRate": 38.5,
        "distribution": [...]
      }
    ],
    "segmentAnalysis": [
      {
        "segment": "new",
        "segmentName": "新規顧客", 
        "details": [...],
        "summary": {...}
      }
    ],
    "insights": {
      "keyFindings": [
        "一回購入顧客が57.6%と高い比率を占めています",
        "5回以上購入する高頻度顧客が18.2%存在します"
      ],
      "recommendations": [
        {
          "category": "リピート促進",
          "title": "新規顧客リピート促進",
          "description": "一回購入顧客の比率が高いため、リピート購入を促進する施策が必要です",
          "priority": "高",
          "action": "フォローアップメール、割引クーポン、リターゲティング広告の実施"
        }
      ],
      "risk": {
        "oneTimeCustomerRate": 57.6,
        "churnRisk": 40.0,
        "riskFactors": ["高い一回購入率", "低いリピート率"],
        "overallRiskLevel": "中"
      },
      "opportunity": {
        "upsellPotential": 18.2,
        "retentionOpportunity": 42.4,
        "growthOpportunities": ["リピート顧客育成", "クロスセル機会拡大"],
        "primaryOpportunityArea": "新規顧客のリピート化"
      }
    }
  }
}
```

#### テスト11: セグメント限定詳細分析
```http
GET https://shopifytestapi20250720173320.azurewebsites.net/api/purchase/count-analysis?storeId=1&segment=new&includeComparison=true&maxPurchaseCount=15
```

#### テスト12: 比較なし詳細分析
```http
GET https://shopifytestapi20250720173320.azurewebsites.net/api/purchase/count-analysis?storeId=1&includeComparison=false&maxPurchaseCount=10
```

**確認項目:**
- [x] 全セクションデータの存在（summary, details, trends, segmentAnalysis, insights）
- [x] 詳細データの購入回数昇順ソート
- [x] 前年比較データの存在（includeComparison=true時）
- [x] インサイトデータの自動生成
- [x] 推奨アクションの論理性

---

## 4. エラーケーステスト

### 4.1 無効なパラメータテスト

#### テスト13: 無効なストアID
```http
GET https://shopifytestapi20250720173320.azurewebsites.net/api/purchase/count-summary?storeId=999
```

**期待結果:** データなしまたは空の結果

#### テスト14: 無効な日付範囲
```http
GET https://shopifytestapi20250720173320.azurewebsites.net/api/purchase/count-analysis?storeId=1&startDate=2025-01-01&endDate=2024-01-01
```

**期待結果:** エラーメッセージまたは空の結果

#### テスト15: 無効なセグメント
```http
GET https://shopifytestapi20250720173320.azurewebsites.net/api/purchase/segment-analysis?storeId=1&segment=invalid
```

**期待結果:** デフォルトセグメント処理またはエラーメッセージ

### 4.2 エラーハンドリング確認
**確認項目:**
- [x] 適切なHTTPステータスコード
- [x] エラーメッセージの日本語対応
- [x] `success: false` の設定
- [x] ログ出力の実行

---

## 5. パフォーマンステスト

### 5.1 レスポンス時間測定
各エンドポイントのレスポンス時間を測定：

| エンドポイント | 期待時間 | 実測時間 | 合格/不合格 |
|---------------|----------|----------|------------|
| `/test` | < 0.5秒 | ___秒 | ___ |
| `/quick-stats` | < 1.0秒 | ___秒 | ___ |
| `/count-summary` | < 2.0秒 | ___秒 | ___ |
| `/count-trends` | < 3.0秒 | ___秒 | ___ |
| `/segment-analysis` | < 2.0秒 | ___秒 | ___ |
| `/count-analysis` | < 5.0秒 | ___秒 | ___ |

### 5.2 同時接続テスト
複数の同時リクエストに対する動作確認：

```bash
# 並列リクエスト例（curl使用）
for i in {1..5}; do
  curl -s "https://shopifytestapi20250720173320.azurewebsites.net/api/purchase/quick-stats?storeId=1" &
done
wait
```

**確認項目:**
- [x] 全リクエストが正常応答
- [x] レスポンス時間の大幅な延長なし
- [x] サーバーエラーの発生なし

---

## 6. テスト結果記録

### 6.1 テスト実行記録
```
テスト実行日時: ____年__月__日 __:__
テスト実行者: ________________
テスト環境: 本番 / ステージング / ローカル
```

### 6.2 テスト結果サマリー
| テストケース | 結果 | 備考 |
|-------------|------|------|
| テスト1: API接続 | 合格/不合格 | |
| テスト2: クイック統計 | 合格/不合格 | |
| テスト3: サマリー365日 | 合格/不合格 | |
| テスト4: サマリー90日 | 合格/不合格 | |
| テスト5: トレンド12ヶ月 | 合格/不合格 | |
| テスト6: トレンド6ヶ月 | 合格/不合格 | |
| テスト7: 新規セグメント | 合格/不合格 | |
| テスト8: 既存セグメント | 合格/不合格 | |
| テスト9: 復帰セグメント | 合格/不合格 | |
| テスト10: 基本詳細分析 | 合格/不合格 | |
| テスト11: セグメント詳細 | 合格/不合格 | |
| テスト12: 比較なし詳細 | 合格/不合格 | |

### 6.3 発見された問題
```
問題1: _______________
　　解決方法: _________
　　対応者: ___________

問題2: _______________
　　解決方法: _________
　　対応者: ___________
```

## 7. 次ステップ

### 7.1 テスト合格時
- [ ] フロントエンド統合テスト実施
- [ ] ユーザー受け入れテスト準備
- [ ] 本番リリース準備

### 7.2 テスト不合格時
- [ ] 問題修正
- [ ] 回帰テスト実施
- [ ] 再テスト実行

---

**テスト手順書バージョン**: 1.0  
**作成日**: 2024-07-25  
**更新日**: ________