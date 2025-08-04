# ShopifyDataAnonymizer OrderItems登録修正指示

## 問題の概要
Store 1では正常にOrderItemsが登録されているが、Store 2では登録されていない。
ImportService.csの`ImportOrders`メソッドは正しく実装されているが、何らかの理由でStore 2のインポート時にOrderItemsが作成されなかった。

## 確認事項

### コードレビュー結果
ImportService.csの実装を確認したところ：
- 515行目: `Name = record.LineitemName` でCSVの商品名を正しく設定している ✅
- 522行目: `InsertOrderItem`メソッドを呼び出している ✅
- 664-668行目: CSVの"Lineitem name"を最優先で使用している ✅

### 推測される原因
1. Store 2のインポート時に`--type orders`の指定ミス
2. CSVファイルのカラム名の違い
3. エラーが発生したが継続処理されていた

## 修正案

### 1. デバッグログの追加
```csharp
// ImportService.cs の InsertOrderItem メソッドに追加
Console.WriteLine($"DEBUG: OrderItem挿入 - OrderId: {orderId}, ProductTitle: {productTitle}, SKU: {item.SKU}, Price: {item.Price}, Quantity: {item.Quantity}");
```

### 2. インポートコマンドの確認
```bash
# 正しいインポートコマンド
dotnet run -- import --input "data/staging/anonymized-orders_store2_comprehensive.csv" --store-id 2 --type orders

# typeパラメータが正しいか確認
```

### 3. CSVカラム名の確認
Store 2のCSVファイルのヘッダーが以下のカラムを含んでいるか確認：
- `Lineitem name`
- `Lineitem quantity`
- `Lineitem price`
- `Lineitem sku`

### 4. エラーハンドリングの改善
```csharp
// 523-530行目のcatchブロックを改善
catch (Exception ex)
{
    // エラーをログに記録
    Console.WriteLine($"❌ 注文明細の挿入に失敗: OrderId={currentOrderId}, ProductName={orderItem.Name}, Error={ex.Message}");
    Console.WriteLine($"   Stack Trace: {ex.StackTrace}");
    
    // エラーカウントを増やす
    errorCount++;
    
    // 致命的エラーの場合は中断
    if (errorCount > 10)
    {
        throw new Exception($"注文明細の挿入で多数のエラーが発生しました。処理を中断します。", ex);
    }
}
```

### 5. Store指定の確認
```csharp
// 681行目のStoreId指定を修正
productCmd.Parameters.AddWithValue("@StoreId", storeId); // 1ではなくstoreIdパラメータを使用
```

## 再インポート手順

1. **既存データの確認**
```sql
-- Store 2の注文数を確認
SELECT COUNT(*) FROM Orders WHERE StoreId = 2;

-- Store 2のOrderItems数を確認
SELECT COUNT(*) FROM OrderItems WHERE OrderId IN (SELECT Id FROM Orders WHERE StoreId = 2);
```

2. **デバッグモードで再実行**
```bash
# ShopifyDataAnonymizerディレクトリで実行
cd backend/ShopifyDataAnonymizer
dotnet run -- import --input "../../data/staging/anonymized-orders_store2_comprehensive.csv" --store-id 2 --type orders --debug
```

3. **ログ確認**
- OrderItemの挿入が実行されているか
- エラーメッセージが出力されていないか

## 今後の改善提案

1. **トランザクション単位の見直し**
   - 注文ごとにトランザクションを分ける
   - OrderItemsの挿入失敗時でもOrderは保持

2. **インポート結果のサマリー表示**
```csharp
Console.WriteLine($"=== インポート結果 ===");
Console.WriteLine($"注文数: {orderCount}");
Console.WriteLine($"注文明細数: {orderItemCount}");
Console.WriteLine($"エラー数: {errorCount}");
Console.WriteLine($"スキップ数: {skipCount}");
```

3. **バリデーション強化**
   - CSVの必須カラムチェック
   - データ型の検証
   - 外部キー制約の事前チェック