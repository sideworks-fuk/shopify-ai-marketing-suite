# 休眠顧客 API デバッグガイド - StoreId 18

## 問題
StoreId 18で休眠顧客が0件になってしまう原因を調査

## 日本語文字化け対策

SQL Server Management Studio (SSMS)で日本語が正しく表示されない場合：

1. **SQLクエリ内の日本語文字列には`N'`プレフィックスを使用**
   - ✅ 正しい: `N'全顧客数'`
   - ❌ 間違い: `'全顧客数'`

2. **SSMSの設定確認**
   - ツール > オプション > 環境 > フォントと色
   - フォントを日本語対応のもの（例: MS Gothic, Meiryo）に設定

3. **結果グリッドのエンコーディング**
   - クエリ結果を右クリック > 「結果をファイルに保存」
   - エンコーディングを「Unicode (UTF-8 with signature)」または「Unicode」に設定

4. **データベースの照合順序確認**
   ```sql
   SELECT DATABASEPROPERTYEX(DB_NAME(), 'Collation') AS DatabaseCollation;
   ```
   - 日本語対応の照合順序（例: `Japanese_CI_AS`）が推奨

## API エンドポイント

### 1. 休眠顧客リスト取得
```
GET /api/customer/dormant
```

### 2. 休眠顧客サマリー取得
```
GET /api/customer/dormant/summary
```

## Postman リクエスト設定

### 方法1: デモモード/開発者モード（推奨）

**Headers:**
```
X-Store-Id: 18
Authorization: Bearer <demo_token または developer_token>
```

**Query Parameters:**
```
storeId: 18 (オプション - JWTから取得したStoreIdで上書きされる)
segment: (オプション) "90-180日", "180-365日", "365日以上"
pageNumber: 1 (オプション)
pageSize: 100 (オプション、最大500)
sortBy: DaysSinceLastPurchase (オプション)
descending: true (オプション)
```

**完全なURL例:**
```
GET https://<your-api-url>/api/customer/dormant?storeId=18&pageSize=100
```

### 方法2: OAuth認証（JWTトークン）

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**注意:** JWTトークンに`store_id`クレームが含まれている場合、そのStoreIdが使用されます。クエリパラメータの`storeId`は無視されます。

## クエリ条件の確認

`DormantCustomerQueryService.BuildBaseQuery`では以下の条件でフィルタリングされています：

```csharp
where customer.StoreId == storeId 
      && customer.TotalOrders > 0          // ← 注文履歴がない顧客は除外
      && customer.LastOrderDate.HasValue   // ← LastOrderDateがnullの顧客は除外
      && customer.LastOrderDate < cutoffDate // ← 90日以内に購入した顧客は除外
```

**cutoffDate = DateTime.UtcNow.AddDays(-90)**

## デバッグ手順

### Step 1: データベース確認

StoreId 18の顧客データが存在するか確認：

```sql
-- StoreId 18の全顧客数
SELECT COUNT(*) FROM Customers WHERE StoreId = 18;

-- 注文履歴がある顧客数
SELECT COUNT(*) FROM Customers 
WHERE StoreId = 18 AND TotalOrders > 0;

-- LastOrderDateが設定されている顧客数
SELECT COUNT(*) FROM Customers 
WHERE StoreId = 18 
  AND TotalOrders > 0 
  AND LastOrderDate IS NOT NULL;

-- 90日以上前に購入した顧客数（休眠顧客の条件）
SELECT COUNT(*) FROM Customers 
WHERE StoreId = 18 
  AND TotalOrders > 0 
  AND LastOrderDate IS NOT NULL
  AND LastOrderDate < DATEADD(day, -90, GETUTCDATE());
```

### Step 2: API リクエスト実行

Postmanで以下のリクエストを実行：

**リクエスト1: サマリー取得**
```
GET /api/customer/dormant/summary?storeId=18
Headers:
  X-Store-Id: 18
  Authorization: Bearer <your_token>
```

**リクエスト2: リスト取得（全セグメント）**
```
GET /api/customer/dormant?storeId=18&pageSize=500
Headers:
  X-Store-Id: 18
  Authorization: Bearer <your_token>
```

**リクエスト3: セグメント別取得**
```
GET /api/customer/dormant?storeId=18&segment=90-180日&pageSize=500
Headers:
  X-Store-Id: 18
  Authorization: Bearer <your_token>
```

### Step 3: ログ確認

Application Insightsまたはログで以下を確認：

1. **リクエスト開始ログ:**
   ```
   休眠顧客分析データ取得開始. StoreId: 18, Segment: ...
   ```

2. **クエリ実行ログ:**
   ```
   休眠顧客クエリ開始 {@QueryParameters}
   ```

3. **結果ログ:**
   ```
   休眠顧客クエリ完了 取得件数: {Count}, 総件数: {TotalCount}
   ```

4. **パフォーマンスログ:**
   ```
   📊 [パフォーマンス] 総件数クエリ実行時間: {ElapsedMs}ms, 件数: {Count}
   ```

## 考えられる原因

### 1. データが存在しない
- StoreId 18の顧客データが存在しない
- 顧客は存在するが、注文履歴がない（`TotalOrders = 0`）

### 2. LastOrderDateが設定されていない
- `Customer.LastOrderDate`がnull
- 注文データはあるが、`LastOrderDate`が更新されていない

### 3. 90日以内に購入している
- すべての顧客が90日以内に購入している
- 休眠顧客の条件（90日以上前）を満たしていない

### 4. セグメントフィルターの問題
- セグメントフィルターが正しく適用されていない
- セグメント文字列のマッチングに問題がある

## 追加デバッグクエリ

### LastOrderDateの更新状況確認

```sql
-- LastOrderDateがnullの顧客（注文履歴あり）
SELECT c.Id, c.DisplayName, c.TotalOrders, c.LastOrderDate,
       (SELECT MAX(o.ShopifyProcessedAt) 
        FROM Orders o 
        WHERE o.CustomerId = c.Id AND o.ShopifyProcessedAt IS NOT NULL) as MaxOrderDate
FROM Customers c
WHERE c.StoreId = 18 
  AND c.TotalOrders > 0
  AND c.LastOrderDate IS NULL;
```

### 注文データの確認

```sql
-- StoreId 18の顧客の注文データ
SELECT o.Id, o.CustomerId, o.ShopifyProcessedAt, o.TotalPrice
FROM Orders o
INNER JOIN Customers c ON o.CustomerId = c.Id
WHERE c.StoreId = 18
ORDER BY o.ShopifyProcessedAt DESC;
```

## 修正案

もし`LastOrderDate`が更新されていない場合、以下のクエリで更新できます：

```sql
-- LastOrderDateを更新（注文データから）
UPDATE c
SET c.LastOrderDate = (
    SELECT MAX(o.ShopifyProcessedAt)
    FROM Orders o
    WHERE o.CustomerId = c.Id 
      AND o.ShopifyProcessedAt IS NOT NULL
)
FROM Customers c
WHERE c.StoreId = 18
  AND c.TotalOrders > 0
  AND c.LastOrderDate IS NULL
  AND EXISTS (
      SELECT 1 
      FROM Orders o 
      WHERE o.CustomerId = c.Id 
        AND o.ShopifyProcessedAt IS NOT NULL
  );
```

## 参考

- 実装ファイル: `backend/ShopifyAnalyticsApi/Services/Dormant/DormantCustomerQueryService.cs`
- コントローラー: `backend/ShopifyAnalyticsApi/Controllers/CustomerController.cs`
- 休眠判定閾値: `DormancyThresholdDays` (デフォルト: 90日)
