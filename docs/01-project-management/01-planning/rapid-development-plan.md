# 迅速開発計画：80点実装ガイド

## 📋 ドキュメント情報
- **作成日**: 2025年7月20日
- **作成者**: AI Assistant
- **バージョン**: v1.0
- **目的**: 前年同月比分析と休眠顧客分析の迅速な実装

---

## 🎯 開発方針：80点実装戦略

### 基本原則
1. **完璧を求めない** - 動作する最小限の実装を優先
2. **既存コード最大活用** - モックコンポーネントを流用
3. **シンプルなAPI設計** - 複雑な最適化は後回し
4. **ハードコーディング許容** - 設定値は直書きOK

---

## 📅 開発スケジュール（2週間）

### Week 1: バックエンド実装（7月21日〜7月27日）
```
月曜: Shopify環境構築 + Azure環境準備
火曜: .NET プロジェクト作成 + DB設計
水曜: 前年同月比API実装
木曜: 休眠顧客API実装  
金曜: Shopifyデータ同期処理
土日: バッファ/テスト
```

### Week 2: 統合・デプロイ（7月28日〜8月3日）
```
月曜: フロントエンド統合
火曜: エラーハンドリング追加
水曜: 基本的なテスト実施
木曜: Azure デプロイ
金曜: 動作確認・調整
```

---

## 🔧 前年同月比分析【商品】実装詳細

### 1. 必要なShopifyデータ
```graphql
# Shopify GraphQL クエリ
query GetProductSales($productId: ID!, $startDate: DateTime!, $endDate: DateTime!) {
  orders(query: "created_at:>=$startDate AND created_at:<=$endDate") {
    edges {
      node {
        lineItems(first: 100) {
          edges {
            node {
              product {
                id
              }
              quantity
              originalTotalSet {
                shopMoney {
                  amount
                }
              }
            }
          }
        }
      }
    }
  }
}
```

### 2. シンプルなAPIレスポンス
```json
{
  "productId": "gid://shopify/Product/123",
  "productName": "商品A",
  "currentYear": {
    "year": 2025,
    "monthlySales": [
      { "month": 1, "revenue": 150000, "quantity": 45 },
      { "month": 2, "revenue": 180000, "quantity": 52 }
    ]
  },
  "previousYear": {
    "year": 2024,
    "monthlySales": [
      { "month": 1, "revenue": 120000, "quantity": 38 },
      { "month": 2, "revenue": 160000, "quantity": 48 }
    ]
  },
  "growthRate": 15.5
}
```

### 3. 80点実装のポイント
- **キャッシュ**: 単純なメモリキャッシュ（5分）
- **ページング**: 上位50商品のみ表示
- **集計**: リアルタイム計算（バッチ処理なし）
- **エラー処理**: try-catchで包んで500エラー回避

---

## 🔧 休眠顧客分析【顧客】実装詳細

### 1. 必要なShopifyデータ
```graphql
# Shopify GraphQL クエリ
query GetCustomerLastPurchase {
  customers(first: 250) {
    edges {
      node {
        id
        displayName
        email
        orders(first: 1, sortKey: CREATED_AT, reverse: true) {
          edges {
            node {
              createdAt
              totalPriceSet {
                shopMoney {
                  amount
                }
              }
            }
          }
        }
      }
    }
  }
}
```

### 2. シンプルなAPIレスポンス
```json
{
  "totalDormantCustomers": 125,
  "segments": [
    {
      "label": "90-180日",
      "count": 45,
      "customers": [
        {
          "id": "gid://shopify/Customer/123",
          "name": "山田太郎",
          "lastPurchaseDate": "2025-03-15",
          "daysSincePurchase": 127,
          "totalSpent": 45000
        }
      ]
    }
  ]
}
```

### 3. 80点実装のポイント
- **セグメント**: 固定の3セグメント（90-180日、180-365日、365日以上）
- **リスク判定**: 単純な日数ベース
- **復帰施策**: テンプレート文言を返すだけ
- **CSV出力**: シンプルな形式で十分

---

## ⚡ 開発を加速するテクニック

### 1. データベース設計の簡略化
```sql
-- 最小限のテーブル構成
CREATE TABLE Products (
    Id NVARCHAR(100) PRIMARY KEY,
    Name NVARCHAR(255),
    ShopifyId NVARCHAR(100),
    LastSync DATETIME
);

CREATE TABLE MonthlySales (
    ProductId NVARCHAR(100),
    Year INT,
    Month INT,
    Revenue DECIMAL(10,2),
    Quantity INT,
    PRIMARY KEY (ProductId, Year, Month)
);

CREATE TABLE Customers (
    Id NVARCHAR(100) PRIMARY KEY,
    Name NVARCHAR(255),
    Email NVARCHAR(255),
    LastPurchaseDate DATETIME,
    TotalSpent DECIMAL(10,2),
    ShopifyId NVARCHAR(100)
);
```

### 2. Shopify API呼び出しの最適化
```csharp
// シンプルなリトライ機構
public async Task<T> CallShopifyApi<T>(Func<Task<T>> apiCall)
{
    int retries = 3;
    while (retries > 0)
    {
        try
        {
            return await apiCall();
        }
        catch (Exception ex)
        {
            retries--;
            if (retries == 0) throw;
            await Task.Delay(1000); // 1秒待機
        }
    }
}
```

### 3. フロントエンド統合の簡略化
```typescript
// 既存のモックデータを実APIに置き換えるだけ
const fetchYearOverYearData = async () => {
  try {
    // モックデータの代わりに実APIを呼ぶ
    const response = await fetch('/api/sales/year-over-year');
    return await response.json();
  } catch (error) {
    // エラー時はモックデータを返す（フォールバック）
    return mockYearOverYearData;
  }
}
```

---

## 📋 必須タスクチェックリスト

### バックエンド
- [ ] Shopify Partner アカウント作成
- [ ] Development Store 作成  
- [ ] Custom App 作成（必要な権限設定）
- [ ] .NET 8 Web API プロジェクト作成
- [ ] 最小限のDB設計・作成
- [ ] Shopify API クライアント実装
- [ ] 2つのAPIエンドポイント実装
- [ ] 基本的なエラーハンドリング

### フロントエンド
- [ ] API呼び出し処理の実装
- [ ] モックデータからの切り替え
- [ ] ローディング状態の追加
- [ ] エラー表示の実装

### インフラ・デプロイ
- [ ] Azure App Service 作成
- [ ] Azure SQL Database 作成  
- [ ] 接続文字列の設定
- [ ] CI/CDパイプライン（最小限）
- [ ] 本番デプロイ

---

## ⚠️ 80点実装で妥協する点

1. **パフォーマンス最適化なし**
   - インデックス最適化は後回し
   - N+1問題は許容
   - キャッシュは単純実装

2. **エラーハンドリング最小限**
   - 詳細なエラーメッセージなし
   - リトライ機構は単純
   - ログは基本的なもののみ

3. **セキュリティは基本レベル**
   - APIキー認証のみ
   - 詳細な権限管理なし
   - Rate Limiting なし

4. **テストは手動中心**
   - 単体テストは最小限
   - E2Eテストはなし
   - 手動での動作確認メイン

---

## 🎯 成功の定義（80点）

✅ Shopifyから実データが取得できる
✅ 2つの画面が実データで動作する
✅ 基本的なエラーが発生しない
✅ Azureにデプロイされている
✅ URLでアクセスして使える

**これで十分！完璧を求めない！** 