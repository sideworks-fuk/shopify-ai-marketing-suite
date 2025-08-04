# OrderItemsテーブルへのデータ登録指示

## 問題の概要
Store 2のOrdersデータはCSVインポートで登録されたが、OrderItemsテーブルにデータが登録されていないため、前年同月比分析【商品】で結果が0件になっている。

## 原因
ShopifyDataAnonymizerのインポート機能がOrderItemsの作成に対応していない可能性がある。

## 解決方法

### 方法1: SQLで直接OrderItemsを生成（推奨）

```sql
-- CSVデータから読み取った情報を基にOrderItemsを生成
-- anonymized-orders_store2_comprehensive.csvの構造に基づく

-- まず既存のOrderItemsを確認
SELECT COUNT(*) as ExistingItems FROM OrderItems WHERE OrderId IN (SELECT Id FROM Orders WHERE StoreId = 2);

-- OrderItemsを生成（CSVのLineitem情報を使用）
INSERT INTO OrderItems (
    OrderId,
    ProductId,
    ProductTitle,
    ProductHandle,
    ProductVendor,
    ProductType,
    Sku,
    VariantTitle,
    Price,
    CompareAtPrice,
    Quantity,
    TotalPrice,
    Option1Name,
    Option1Value,
    RequiresShipping,
    Taxable,
    CreatedAt,
    UpdatedAt
)
SELECT 
    o.Id as OrderId,
    NULL as ProductId, -- Shopify Product IDは不明
    'プレミアムギフトボックスセット S' as ProductTitle, -- 例: CSVから取得
    'premium-gift-box-s' as ProductHandle,
    'ギフト工房' as ProductVendor,
    'ギフトセット' as ProductType,
    'PRD-2001-S' as Sku,
    NULL as VariantTitle,
    8000 as Price,
    8000 as CompareAtPrice,
    1 as Quantity,
    8000 as TotalPrice,
    NULL as Option1Name,
    NULL as Option1Value,
    1 as RequiresShipping,
    1 as Taxable,
    o.CreatedAt,
    o.UpdatedAt
FROM Orders o
WHERE o.StoreId = 2
  AND o.OrderNumber = 'ORD-2021'; -- 各注文番号に対応
```

### 方法2: C#でCSVを再パースしてOrderItemsを生成

```csharp
// ShopifyDataAnonymizer/Services/OrderItemsGenerator.cs

public class OrderItemsGenerator
{
    private readonly string _connectionString;
    private readonly ILogger<OrderItemsGenerator> _logger;

    public async Task GenerateOrderItemsFromCsv(string csvFilePath, int storeId)
    {
        using var reader = new StreamReader(csvFilePath);
        using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);
        
        var records = csv.GetRecords<dynamic>();
        var orderItemsToInsert = new List<OrderItem>();

        foreach (var record in records)
        {
            // CSVから必要な情報を取得
            var orderNumber = $"ORD-{record.Id}";
            var lineitemName = record["Lineitem name"];
            var lineitemPrice = decimal.Parse(record["Lineitem price"]);
            var lineitemQuantity = int.Parse(record["Lineitem quantity"]);
            var lineitemSku = record["Lineitem sku"];
            var vendor = record["Vendor"];
            
            // OrdersテーブルからOrderIdを取得
            var order = await GetOrderByNumber(orderNumber, storeId);
            if (order == null) continue;
            
            var orderItem = new OrderItem
            {
                OrderId = order.Id,
                ProductTitle = lineitemName,
                ProductHandle = GenerateHandle(lineitemName),
                ProductVendor = vendor,
                ProductType = DetermineProductType(lineitemName),
                Sku = lineitemSku,
                Price = lineitemPrice,
                CompareAtPrice = lineitemPrice,
                Quantity = lineitemQuantity,
                TotalPrice = lineitemPrice * lineitemQuantity,
                RequiresShipping = true,
                Taxable = true,
                CreatedAt = order.CreatedAt,
                UpdatedAt = order.UpdatedAt
            };
            
            orderItemsToInsert.Add(orderItem);
        }
        
        // バルクインサート
        await BulkInsertOrderItems(orderItemsToInsert);
    }
}
```

### 方法3: 簡易的なSQL生成スクリプト

```sql
-- Store 2の各商品タイプに基づいてOrderItemsを生成
-- 商品マスタから情報を取得して使用

INSERT INTO OrderItems (
    OrderId,
    ProductId,
    ProductTitle,
    ProductHandle,
    ProductVendor,
    ProductType,
    Sku,
    Price,
    Quantity,
    TotalPrice,
    RequiresShipping,
    Taxable,
    CreatedAt,
    UpdatedAt
)
SELECT 
    o.Id as OrderId,
    p.Id as ProductId,
    p.Title as ProductTitle,
    p.Handle as ProductHandle,
    p.Vendor as ProductVendor,
    p.ProductType,
    pv.Sku,
    pv.Price,
    -- 数量は注文金額から逆算（簡易版）
    CASE 
        WHEN o.SubtotalPrice / pv.Price >= 1 THEN CAST(o.SubtotalPrice / pv.Price as INT)
        ELSE 1
    END as Quantity,
    o.SubtotalPrice as TotalPrice,
    1 as RequiresShipping,
    1 as Taxable,
    o.CreatedAt,
    o.UpdatedAt
FROM Orders o
CROSS JOIN (
    SELECT TOP 1 p.*, pv.* 
    FROM Products p
    INNER JOIN ProductVariants pv ON p.Id = pv.ProductId
    WHERE p.StoreId = 2
    ORDER BY NEWID() -- ランダムに商品を選択
) as p
WHERE o.StoreId = 2
  AND NOT EXISTS (
    SELECT 1 FROM OrderItems oi WHERE oi.OrderId = o.Id
  );
```

### 方法4: CSVデータに基づく正確なマッピング

```python
# Python スクリプトでSQL生成
import pandas as pd

# CSVを読み込み
df = pd.read_csv('anonymized-orders_store2_comprehensive.csv')

# SQL INSERT文を生成
sql_statements = []
for index, row in df.iterrows():
    order_number = f"ORD-{row['Id']}"
    sql = f"""
    INSERT INTO OrderItems (OrderId, ProductTitle, ProductVendor, Sku, Price, Quantity, TotalPrice, CreatedAt)
    SELECT 
        o.Id,
        '{row['Lineitem name']}',
        '{row['Vendor']}',
        '{row['Lineitem sku']}',
        {row['Lineitem price']},
        {row['Lineitem quantity']},
        {row['Lineitem price'] * row['Lineitem quantity']},
        o.CreatedAt
    FROM Orders o
    WHERE o.OrderNumber = '{order_number}' AND o.StoreId = 2;
    """
    sql_statements.append(sql)

# SQLファイルに出力
with open('insert_orderitems.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql_statements))
```

## 実装推奨事項

1. **CSVの商品情報を正確に反映**
   - Lineitem name: 商品名
   - Lineitem quantity: 数量
   - Lineitem price: 単価
   - Lineitem sku: SKU
   - Vendor: ベンダー名

2. **ProductsテーブルとのID連携**
   - 可能であればProductsテーブルのIDと紐付け
   - 紐付けできない場合はNULLでも動作可能

3. **検証SQL**
```sql
-- インポート後の確認
SELECT 
    o.OrderNumber,
    o.CreatedAt,
    oi.ProductTitle,
    oi.Quantity,
    oi.Price,
    oi.TotalPrice
FROM Orders o
INNER JOIN OrderItems oi ON o.Id = oi.OrderId
WHERE o.StoreId = 2
ORDER BY o.CreatedAt DESC;

-- 前年同月比分析が動作するか確認
SELECT 
    YEAR(o.CreatedAt) as Year,
    MONTH(o.CreatedAt) as Month,
    oi.ProductTitle,
    SUM(oi.TotalPrice) as TotalSales,
    COUNT(DISTINCT o.Id) as OrderCount,
    SUM(oi.Quantity) as TotalQuantity
FROM Orders o
INNER JOIN OrderItems oi ON o.Id = oi.OrderId
WHERE o.StoreId = 2
GROUP BY 
    YEAR(o.CreatedAt),
    MONTH(o.CreatedAt),
    oi.ProductTitle
ORDER BY Year, Month, ProductTitle;
```

## 緊急対応

TAKASHIさんがShopifyDataAnonymizerを修正中の場合は、以下の簡易SQLで対応：

```sql
-- 最小限のOrderItems生成（商品名は仮）
INSERT INTO OrderItems (OrderId, ProductTitle, Price, Quantity, TotalPrice, CreatedAt, UpdatedAt)
SELECT 
    Id as OrderId,
    'テスト商品' as ProductTitle,
    SubtotalPrice as Price,
    1 as Quantity,
    SubtotalPrice as TotalPrice,
    CreatedAt,
    UpdatedAt
FROM Orders
WHERE StoreId = 2
  AND NOT EXISTS (SELECT 1 FROM OrderItems WHERE OrderId = Orders.Id);
```

これでとりあえず前年同月比分析【商品】画面でデータが表示されるようになります。