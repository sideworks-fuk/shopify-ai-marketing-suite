# スナップショット vs 参照の設計判断

## 📋 概要
作成日: 2025-07-27  
作成者: AIアシスタントケンジ  

本文書では、Shopify AI Marketing Suiteにおけるデータ保持方針の設計判断について詳細に説明します。特に**スナップショット型**と**参照型**の使い分けが、システム全体の設計思想の中核となっています。

## 🎯 設計方針の概要

### 基本原則
1. **取引データの不変性**: 確定した取引情報は永続不変
2. **マスターデータの柔軟性**: 商品・顧客情報の変更・更新に対応
3. **分析の正確性**: 過去データと現在データの両方を活用
4. **法的コンプライアンス**: 監査・税務対応への完全準拠

## 📊 設計パターン分類

### 1. スナップショット採用箇所

#### 🎯 OrderItems テーブル（最重要）
**対象項目**: 商品情報の完全スナップショット

| 項目 | データ型 | 必須 | スナップショット理由 |
|------|----------|------|---------------------|
| **ProductTitle** | nvarchar(255) | ✅ | 商品名変更の影響回避 |
| **Price** | decimal(18,2) | ✅ | 価格変動の影響回避 |
| **ProductVendor** | nvarchar(100) | ❌ | ベンダー情報変更の影響回避 |
| **ProductType** | nvarchar(100) | ❌ | 商品分類変更の影響回避 |
| **VariantTitle** | nvarchar(100) | ❌ | バリアント名変更の影響回避 |
| **Option1-3Name/Value** | nvarchar(100) | ❌ | オプション情報変更の影響回避 |
| **RequiresShipping** | bit | ✅ | 配送設定変更の影響回避 |
| **Taxable** | bit | ✅ | 税設定変更の影響回避 |

**採用理由**:
1. **法的要件**: 取引記録の不変性保証（商法、税法対応）
2. **データ整合性**: 商品情報変更・削除の影響を受けない
3. **分析精度**: 取引時点の正確な情報で履歴分析
4. **システム安定性**: マスターデータ変更がトランザクションデータに影響しない

**実装例**:
```csharp
// ✅ スナップショット設計での正しい実装
var orderItem = new OrderItem
{
    OrderId = order.Id,
    ProductTitle = csvRecord.LineitemName,      // スナップショット（必須）
    Price = csvRecord.LineitemPrice,            // スナップショット（必須）
    ProductVendor = csvRecord.Vendor,           // スナップショット
    ProductType = csvRecord.ProductType,        // スナップショット
    ProductId = foundProduct?.Id,               // 参照（オプション）
    // ... その他のスナップショット項目
};
```

#### 🎯 Orders テーブル（一部スナップショット）
**対象項目**: 取引時点の確定情報

| 項目 | スナップショット理由 |
|------|---------------------|
| **TotalPrice** | 取引金額の不変性保証 |
| **SubtotalPrice** | 計算基準の不変性保証 |
| **TaxPrice** | 税額の不変性保証 |
| **Currency** | 通貨レートの変動影響回避 |

### 2. 参照採用箇所

#### 🎯 Orders テーブル
**対象項目**: 顧客情報への参照

| 項目 | データ型 | 参照先 | 参照理由 |
|------|----------|--------|----------|
| **CustomerId** | int | Customers.Id | 顧客の一元管理 |
| **StoreId** | int | Stores.Id | マルチストア対応 |

**採用理由**:
1. **顧客分析**: 購買履歴の統合分析
2. **データ正規化**: 顧客情報の重複回避
3. **GDPR対応**: 顧客削除時の関連データ削除
4. **マルチストア**: ストア別データ分離

#### 🎯 Products/ProductVariants テーブル
**対象項目**: 商品マスター情報

| 項目 | 参照理由 |
|------|----------|
| **StoreId** | マルチストア対応 |
| **各商品属性** | 現在情報の一元管理 |

**採用理由**:
1. **マスター管理**: 商品情報の一元管理
2. **在庫連携**: リアルタイム在庫管理
3. **カタログ更新**: 商品情報の柔軟な更新

### 3. ハイブリッド採用箇所

#### 🎯 OrderItems テーブル（スナップショット + 参照）
**設計**: 商品情報はスナップショット + ProductIdで現在情報への参照

| 項目 | 種類 | NULL許可 | 用途 |
|------|------|----------|------|
| **ProductTitle** | スナップショット | ❌ | 履歴分析の基本データ |
| **Price** | スナップショット | ❌ | 売上分析の正確なデータ |
| **ProductId** | 参照 | ✅ | 現在商品情報との結合 |

**採用理由**:
1. **履歴保証**: スナップショットで過去データ保持
2. **分析柔軟性**: 参照で現在データとの比較
3. **削除対応**: 商品削除時もスナップショットは保持
4. **パフォーマンス**: 必要時のみ結合クエリ

**実装パターン**:
```sql
-- パターン1: スナップショットデータのみ使用（基本分析）
SELECT 
    ProductTitle,
    SUM(TotalPrice) as Revenue
FROM OrderItems
WHERE CreatedAt >= @startDate
GROUP BY ProductTitle;

-- パターン2: 現在商品情報と結合（比較分析）
SELECT 
    oi.ProductTitle as HistoricalName,
    p.Title as CurrentName,
    oi.Price as HistoricalPrice,
    pv.Price as CurrentPrice
FROM OrderItems oi
LEFT JOIN Products p ON oi.ProductId = p.Id
LEFT JOIN ProductVariants pv ON p.Id = pv.ProductId AND oi.Sku = pv.Sku;
```

## 🔍 設計判断の具体例

### ケース1: 商品名変更への対応

#### 発生状況
```
2024年1月: 商品名 "オーガニックコットンTシャツ"
2024年6月: 商品名 "エコ・コットンTシャツ" に変更
```

#### スナップショット設計の効果
```sql
-- 1月の注文データ
INSERT INTO OrderItems (ProductTitle, Price, ...) 
VALUES ('オーガニックコットンTシャツ', 3500, ...);

-- 6月の注文データ  
INSERT INTO OrderItems (ProductTitle, Price, ...) 
VALUES ('エコ・コットンTシャツ', 3500, ...);

-- 年間売上分析（正確な履歴）
SELECT ProductTitle, SUM(TotalPrice) as Revenue
FROM OrderItems 
WHERE YEAR(CreatedAt) = 2024
GROUP BY ProductTitle;

-- 結果:
-- オーガニックコットンTシャツ: 500,000円（1-5月分）
-- エコ・コットンTシャツ: 700,000円（6-12月分）
```

#### 参照設計での問題（採用しなかった理由）
```sql
-- もし参照設計だった場合
SELECT p.Title, SUM(oi.TotalPrice) as Revenue
FROM OrderItems oi
INNER JOIN Products p ON oi.ProductId = p.Id
WHERE YEAR(oi.CreatedAt) = 2024
GROUP BY p.Title;

-- 問題のある結果:
-- エコ・コットンTシャツ: 1,200,000円（全期間が新名称で集計される）
-- → 1月の売上が6月の名称で表示され、履歴が不正確
```

### ケース2: 商品削除への対応

#### 発生状況
```
2024年1月-6月: "限定Tシャツ" を販売
2024年7月: 商品を完全削除（マスターから削除）
```

#### スナップショット設計の効果
```sql
-- 削除前の注文データ（保持される）
OrderItems: ProductTitle = "限定Tシャツ", ProductId = NULL

-- 削除後の分析（データ保持）
SELECT ProductTitle, SUM(TotalPrice) as Revenue
FROM OrderItems 
WHERE ProductTitle = '限定Tシャツ';

-- 結果: 正確な売上履歴が保持される
```

#### 参照設計での問題（採用しなかった理由）
```sql
-- もし参照設計だった場合
SELECT p.Title, SUM(oi.TotalPrice) as Revenue
FROM OrderItems oi
INNER JOIN Products p ON oi.ProductId = p.Id  -- 削除済み商品は結合失敗
WHERE p.Title = '限定Tシャツ';

-- 結果: 0件（売上履歴が消失）
```

### ケース3: 価格変動への対応

#### 発生状況
```
2024年1月: 価格 3,500円
2024年4月: 価格 4,000円 に変更
2024年8月: 価格 3,800円 に変更
```

#### スナップショット設計での正確な分析
```sql
-- 価格推移分析
SELECT 
    MONTH(CreatedAt) as Month,
    AVG(Price) as AveragePrice,
    COUNT(*) as OrderCount
FROM OrderItems 
WHERE ProductTitle = 'オーガニックコットンTシャツ'
  AND YEAR(CreatedAt) = 2024
GROUP BY MONTH(CreatedAt)
ORDER BY Month;

-- 結果:
-- 1月: 3,500円 (取引時点の正確な価格)
-- 4月: 4,000円 (取引時点の正確な価格)  
-- 8月: 3,800円 (取引時点の正確な価格)
```

## ⚠️ 設計トレードオフ

### スナップショット設計のメリット
1. ✅ **データ整合性**: 取引履歴の完全性保証
2. ✅ **法的コンプライアンス**: 監査要件への完全対応
3. ✅ **分析精度**: 取引時点の正確なデータ
4. ✅ **システム安定性**: マスター変更の影響遮断

### スナップショット設計のデメリット
1. ❌ **ストレージ使用量**: データ重複による容量増加
2. ❌ **管理複雑性**: スナップショット項目の保守
3. ❌ **更新困難性**: 確定後の修正が困難

### 参照設計のメリット
1. ✅ **データ正規化**: 重複データの削減
2. ✅ **更新容易性**: マスター更新の一元化
3. ✅ **整合性管理**: 外部キー制約による保証

### 参照設計のデメリット
1. ❌ **履歴喪失**: マスター変更時の過去データ不整合
2. ❌ **削除影響**: マスター削除時の履歴消失
3. ❌ **分析制約**: 現在時点の情報しか取得不可

## 🎯 設計決定の最終判断

### OrderItemsでスナップショット設計を採用した決定的理由

#### 1. **法的要件の厳格性**
```
商法第19条: 商業帳簿の作成・保存義務
法人税法第126条: 帳簿書類の保存義務（7年間）
→ 取引記録の改竄・変更は法的に禁止
```

#### 2. **Shopifyエコシステムとの整合性**
```
Shopifyの注文データ: 注文時点の商品情報を完全保持
CSVエクスポート: Lineitem nameとして商品名をスナップショット
→ Shopifyの設計思想との一致
```

#### 3. **実際のビジネス要件**
```
顧客問い合わせ: "1月に注文した商品名は？"
売上分析: "商品名変更前後の売上比較"
監査対応: "取引時点の正確な商品情報"
→ スナップショットデータが必須
```

#### 4. **技術的実現可能性**
```
Entity Framework: ナビゲーションプロパティの意図的削除
SQL Server: インデックス戦略での性能担保  
ストレージ: 現代的なストレージコストでの実現可能性
→ 技術的制約が少ない
```

## 📚 関連設計決定

### 1. ナビゲーションプロパティの削除
```csharp
// Product/ProductVariant側からOrderItemsへのナビゲーションプロパティを意図的に削除
// → スナップショット設計の明確化
public class Product
{
    // public virtual ICollection<OrderItem> OrderItems { get; set; }  // 削除
}
```

### 2. 外部キー制約の任意化
```sql
-- ProductIdは分析用参照のため、NULL許可
ALTER TABLE OrderItems 
ADD CONSTRAINT FK_OrderItems_Products 
FOREIGN KEY (ProductId) REFERENCES Products(Id) 
ON DELETE SET NULL;  -- 商品削除時はNULLに設定
```

### 3. インデックス戦略
```sql
-- スナップショット項目に対する検索インデックス
CREATE INDEX IX_OrderItems_ProductTitle ON OrderItems(ProductTitle);
CREATE INDEX IX_OrderItems_CreatedAt_ProductTitle ON OrderItems(CreatedAt, ProductTitle);
```

---

**🎯 設計思想の本質**

この設計は「**トランザクションデータの不変性**」と「**マスターデータの柔軟性**」を両立する現代的なアプローチです。

- **過去**: 正確な履歴保持（スナップショット）
- **現在**: 柔軟な情報管理（参照）  
- **分析**: 両方のデータを活用（ハイブリッド）

AIエージェント・開発者は、この設計思想を理解してコードを実装してください。