# デモストアデータインポートガイド
**更新日**: 2025年7月28日  
**作成者**: ケンジ

## 概要
Shopify AI Marketing Suiteのデモ環境として、4つのストアのサンプルデータをインポートする手順書です。

## デモストア一覧

### Store 1: 一般的なファッションECサイト
- **ID**: 1
- **特徴**: 標準的なアパレル商品、一般的な購買パターン
- **データ**: 既存のテストデータを使用

### Store 2: 汎用テストストア
- **ID**: 2
- **特徴**: 2020年〜2025年7月の長期間データ、テスト用
- **データ**: 
  - 顧客: 30件
  - 商品: 20種類
  - 注文: 500件（1500明細）

### Store 3: 北海道物産品ショップ
- **ID**: 3
- **特徴**: 地域特産品、季節性の強い商品、リピート顧客多数
- **データ**:
  - 顧客: 150件（VIP 13%、リピーター 27%、一般 60%）
  - 商品: 69種類（海産物、農産物、乳製品、スイーツ等）
  - 注文: 1000件

### Store 4: 早稲田メーヤウ（カレー専門店）
- **ID**: 4
- **特徴**: 激辛カレー、サブスクリプション、2017年閉店→2018年復活のストーリー
- **データ**:
  - 顧客: 200件（OGファン、復活支援者、サブスク会員）
  - 商品: 20種類（冷凍・レトルト、辛さレベル★1〜★5）
  - 注文: 800件（閉店前240件、復活後560件）

## インポート手順

### 1. 事前準備

```bash
# ShopifyDataAnonymizerディレクトリへ移動
cd backend/ShopifyDataAnonymizer

# ビルド確認
dotnet build
```

### 2. データベースへのストア登録

各ストアのSQLスクリプトを実行：

```bash
# Store 2（既に登録済みの場合はスキップ）
sqlcmd -S your-server -d your-database -i ../../scripts/import-store2-data.sql

# Store 3
sqlcmd -S your-server -d your-database -i ../../scripts/import-store3-data.sql

# Store 4
sqlcmd -S your-server -d your-database -i ../../scripts/import-store4-data.sql
```

### 3. CSVデータのインポート

#### Store 2のインポート
```bash
# 顧客データ
dotnet run -- import --input "../../data/staging/anonymized-customers_store2.csv" --store-id 2 --type customers

# 商品データ
dotnet run -- import --input "../../data/staging/anonymized-products_store2.csv" --store-id 2 --type products-variants

# 注文データ
dotnet run -- import --input "../../data/staging/anonymized-orders_store2_comprehensive.csv" --store-id 2 --type orders
```

#### Store 3のインポート
```bash
# 顧客データ
dotnet run -- import --input "../../data/staging/store3_hokkaido/customers_store3_hokkaido.csv" --store-id 3 --type customers

# 商品データ
dotnet run -- import --input "../../data/staging/store3_hokkaido/products_store3_hokkaido.csv" --store-id 3 --type products-variants

# 注文データ
dotnet run -- import --input "../../data/staging/store3_hokkaido/orders_store3_hokkaido.csv" --store-id 3 --type orders
```

#### Store 4のインポート
```bash
# 顧客データ
dotnet run -- import --input "../../data/staging/store4_maeyao/customers_store4_maeyao.csv" --store-id 4 --type customers

# 商品データ
dotnet run -- import --input "../../data/staging/store4_maeyao/products_store4_maeyao.csv" --store-id 4 --type products-variants

# 注文データ
dotnet run -- import --input "../../data/staging/store4_maeyao/orders_store4_maeyao.csv" --store-id 4 --type orders
```

### 4. インポート後の確認

```sql
-- 各ストアのデータ件数確認
SELECT 
    s.Id as StoreId,
    s.Name as StoreName,
    (SELECT COUNT(*) FROM Customers WHERE StoreId = s.Id) as Customers,
    (SELECT COUNT(*) FROM Products WHERE StoreId = s.Id) as Products,
    (SELECT COUNT(*) FROM Orders WHERE StoreId = s.Id) as Orders,
    (SELECT COUNT(*) FROM OrderItems oi INNER JOIN Orders o ON oi.OrderId = o.Id WHERE o.StoreId = s.Id) as OrderItems
FROM Stores s
WHERE s.IsActive = 1
ORDER BY s.Id;
```

### 5. Customer.TotalOrdersの更新

インポート後、必ず以下のAPIを実行してTotalOrdersを更新：

```bash
# APIエンドポイントを呼び出し
curl -X POST https://your-api-domain/api/database/update-customer-totals
```

## トラブルシューティング

### OrderItemsが登録されない場合
- CSVファイルのId列（51列目）を確認
- 各注文の最初の行のみIdが入力されているか確認
- 2行目以降の明細行はId列が空であることを確認

### 文字化けが発生する場合
- CSVファイルがUTF-8 with BOMで保存されているか確認
- Excelで開く場合は、UTF-8エンコーディングを指定

### インポートエラーが発生する場合
- データベースのスキーマが最新か確認
- 必要なカラムが存在するか確認
- 外部キー制約エラーの場合は、参照先のデータが存在するか確認

## デモシナリオ別推奨ストア

### 基本機能デモ
- **Store 2**: 汎用テストストア
- 全機能をバランスよくデモ可能

### 地域特産品・季節商材デモ
- **Store 3**: 北海道物産品ショップ
- 季節性分析、地域別分析に最適

### サブスクリプション・リピート分析デモ
- **Store 4**: 早稲田メーヤウ
- 顧客ロイヤリティ、商品特性分析に最適

### パフォーマンステストデモ
- **Store 3**: 1000件の注文データ
- 大量データでの動作確認に使用

## 次のステップ

1. **開発環境での動作確認**
   - ストア切り替え機能でデータ確認
   - 各分析画面での表示確認

2. **デモ準備**
   - 顧客向けデモシナリオの作成
   - ストア別の特徴を活かしたプレゼン準備

3. **本番環境への展開**
   - Shopify OAuth認証の実装完了後
   - 実際のShopifyストアとの連携テスト