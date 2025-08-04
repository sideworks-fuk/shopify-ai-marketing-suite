# 休眠顧客API調査詳細レポート

## 調査目的
dormant-api-testページでAPIを実行し、各セグメントの実際の顧客データ、データ一貫性、およびページネーション機能を詳しく調査する。

## 調査実施日時
2025年7月25日

---

## 1. 各セグメントの実際の顧客データ確認

### 1.1 「90-180日」セグメントの顧客サンプル（5件）

```json
{
  "customerId": 3290,
  "name": "テスト典子 テスト藤嶋",
  "email": "test-user-23396@example.com",
  "lastPurchaseDate": "2025-03-22T12:03:35",
  "daysSinceLastPurchase": 124,
  "dormancySegment": "90-180日",
  "riskLevel": "medium",
  "churnProbability": 0.37,
  "totalSpent": 192036.00,
  "totalOrders": 24
}
```

他の4件のサンプル顧客も同様に：
- customerId: 23912 (124日経過)
- customerId: 1954 (124日経過)  
- customerId: 23682 (124日経過)
- customerId: 371 (124日経過)

**特徴：**
- 全顧客が124-125日経過
- 全員が「90-180日」セグメントに正しく分類
- `daysSinceLastPurchase`と`dormancySegment`が一貫している

### 1.2 「180-365日」セグメントの顧客サンプル（5件）

```json
{
  "customerId": 22558,
  "email": "test-user-113786@example.com",
  "lastPurchaseDate": "2024-12-30T02:28:09",
  "daysSinceLastPurchase": 207,
  "dormancySegment": "180-365日",
  "riskLevel": "high",
  "churnProbability": 0.57,
  "totalSpent": 10087.00,
  "totalOrders": 1
}
```

他の4件のサンプル顧客：
- customerId: 3966 (207日経過)
- customerId: 22547 (207日経過)
- customerId: 3864 (207日経過)
- customerId: 3983 (207日経過)

**特徴：**
- 全顧客が207日経過
- 全員が「180-365日」セグメントに正しく分類
- `daysSinceLastPurchase`と`dormancySegment`が一貫している

### 1.3 「365日以上」セグメントの顧客サンプル（5件）

```json
{
  "customerId": 19385,
  "email": "test-user-110414@example.com",
  "lastPurchaseDate": null,
  "daysSinceLastPurchase": 9999,
  "dormancySegment": "365日以上",
  "riskLevel": "critical",
  "churnProbability": 0.78,
  "totalSpent": 5731.00,
  "totalOrders": 1
}
```

他の4件のサンプル顧客：
- customerId: 19386 (9999日経過、lastPurchaseDate: null)
- customerId: 19387 (9999日経過、lastPurchaseDate: null)
- customerId: 19388 (9999日経過、lastPurchaseDate: null)
- customerId: 19389 (9999日経過)

**特徴：**
- 大部分が9999日（データなしまたは非常に古い）
- 全員が「365日以上」セグメントに正しく分類
- `lastPurchaseDate`がnullの顧客が多数存在
- リスクレベルが「critical」

---

## 2. データ一貫性の確認

### 2.1 `dormancySegment`と`daysSinceLastPurchase`の一貫性

✅ **全セグメントで一貫性が確認されました：**

| セグメント | 実際の日数範囲 | データ例 | 一貫性 |
|-----------|---------------|----------|--------|
| 90-180日 | 124-151日 | 124, 125, 151日 | ✅ 正常 |
| 180-365日 | 207日 | 207日 | ✅ 正常 |
| 365日以上 | 9999日 | 9999日（データなし） | ✅ 正常 |

### 2.2 各フィールドの値の妥当性

- **daysSinceLastPurchase**: 実際の経過日数と一致
- **dormancySegment**: 経過日数に基づく正しいセグメント分類
- **riskLevel**: セグメントに応じた適切なリスクレベル
- **churnProbability**: セグメント別に適切な確率値

---

## 3. API全体のページネーション確認

### 3.1 現在のページ設定

```json
"pagination": {
  "currentPage": 1,
  "pageSize": 5,
  "totalCount": 28062,
  "totalPages": 5613,
  "hasNextPage": true,
  "hasPreviousPage": false
}
```

### 3.2 全体のページ数

- **総顧客数**: 28,062人
- **ページサイズ5の場合**: 5,613ページ
- **ページサイズ10の場合**: 2,807ページ

### 3.3 各ページに異なるセグメントの顧客が含まれているか

**発見された問題：**

❌ **セグメントフィルタリングに問題があります**

1. **90-180日セグメント**: フィルターが正常に動作 ✅
2. **180-365日セグメント**: フィルターが機能しない（空の配列を返す） ❌
3. **365日以上セグメント**: フィルターが機能しない（空の配列を返す） ❌

**実際のテスト結果：**
- `segment=90-180日`: 正常に顧客データを返す
- `segment=180-365日`: 空の配列 `[]` を返す
- `segment=365日以上`: 空の配列 `[]` を返す

しかし、セグメントフィルターなしで全件取得すると、異なるページで異なるセグメントの顧客が確認できています。

---

## 4. セグメント分布の詳細

### 4.1 `segmentDistributions`の正確な内容

```json
"segmentDistributions": [
  {
    "segment": "180-365日",
    "count": 16060,
    "percentage": 57.23,
    "revenue": 629502448.00
  },
  {
    "segment": "365日以上", 
    "count": 9708,
    "percentage": 34.59,
    "revenue": 75231889.00
  },
  {
    "segment": "90-180日",
    "count": 2294,
    "percentage": 8.17,
    "revenue": 487098044.00
  }
]
```

### 4.2 各セグメントのラベル文字列

**確認されたラベル（スペースや特殊文字なし）：**
- `"90-180日"`
- `"180-365日"`  
- `"365日以上"`

---

## 5. 重要な発見事項

### 5.1 ✅ 正常に動作している機能

1. **データ一貫性**: 全セグメントで`dormancySegment`と`daysSinceLastPurchase`が一致
2. **90-180日セグメントフィルター**: 正常に動作
3. **ページネーション**: 基本的なページング機能は動作
4. **離脱確率API**: 個別顧客の離脱確率計算が正常動作
5. **サマリー統計**: 正確なセグメント分布データを提供

### 5.2 ❌ 問題が発見された機能

1. **180-365日セグメントフィルター**: 動作しない（空配列を返す）
2. **365日以上セグメントフィルター**: 動作しない（空配列を返す）
3. **フィルター時のページネーション**: セグメントフィルター適用時も総件数が変わらない

### 5.3 データの特徴

1. **365日以上セグメント**: 多くの顧客で`lastPurchaseDate`がnull
2. **データ分布**: 180-365日セグメントが最も多い（57.23%）
3. **リスクレベル**: セグメントに応じて適切に設定されている

---

## 6. 推奨される修正事項

### 6.1 高優先度

1. **セグメントフィルター修正**: 180-365日と365日以上のフィルターを修正
2. **フィルター時のページネーション修正**: フィルター適用時の正確な件数表示

### 6.2 中優先度

1. **データ品質向上**: 365日以上セグメントのnullデータの扱い改善
2. **エラーハンドリング**: セグメントフィルターエラー時の適切なメッセージ

---

## 7. テスト用APIエンドポイント

- **ベースURL**: `https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net`
- **休眠顧客リスト**: `GET /api/customer/dormant`
- **サマリー統計**: `GET /api/customer/dormant/summary`
- **離脱確率**: `GET /api/customer/{id}/churn-probability`

---

**調査完了**