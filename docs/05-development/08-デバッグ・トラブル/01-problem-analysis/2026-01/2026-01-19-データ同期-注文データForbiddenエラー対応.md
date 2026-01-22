# データ同期 - 注文データForbiddenエラー対応

## 📋 問題概要

**発生日時**: 2026年1月19日  
**StoreId**: 18 (acs-goods-3)  
**エラー**: 注文データ同期時に`Forbidden`エラーが発生し、同期全体が失敗

---

## 🔍 問題の詳細

### エラーログ

```
[2026-01-19 10:39:41.416 +00:00] [ERR] Failed to fetch orders: Forbidden
System.Net.Http.HttpRequestException: Failed to fetch orders: Forbidden
   at ShopifyAnalyticsApi.Services.ShopifyApiService.FetchOrdersPageAsync(...)
   at ShopifyAnalyticsApi.Jobs.ShopifyOrderSyncJob.FetchOrdersFromShopify(...)
```

### 発生状況

1. **顧客データ同期**: `Forbidden`エラー（Protected Customer Data未承認）→ 警告を出して続行 ✅
2. **商品データ同期**: 成功（150商品）✅
3. **注文データ同期**: `Forbidden`エラー → **同期全体が失敗** ❌

### 問題点

- 注文データ同期のエラーハンドリングが不足していた
- `Protected Customer Data`エラーの判定が行われていなかった
- 注文データ同期が失敗すると、同期全体が失敗していた
- 商品データ同期は成功しているにもかかわらず、同期全体が失敗として扱われていた

---

## 🔧 対応内容

### 1. `ShopifyApiService.FetchOrdersPageAsync`の改善

**変更内容**:
- エラーレスポンスの内容を確認し、`Protected Customer Data`エラーの場合は特別な例外メッセージを付与

**変更前**:
```csharp
else
{
    var errorContent = await response.Content.ReadAsStringAsync();
    _logger.LogError("🛒 [ShopifyApiService] Failed to fetch orders: StatusCode={StatusCode}, ErrorContent={ErrorContent}, StoreId={StoreId}", 
        response.StatusCode, errorContent, storeId);
    throw new HttpRequestException($"Failed to fetch orders: {response.StatusCode}");
}
```

**変更後**:
```csharp
else
{
    var errorContent = await response.Content.ReadAsStringAsync();
    _logger.LogError("🛒 [ShopifyApiService] Failed to fetch orders: StatusCode={StatusCode}, ErrorContent={ErrorContent}, StoreId={StoreId}", 
        response.StatusCode, errorContent, storeId);
    
    if (errorContent.Contains("Protected customer data"))
    {
        throw new HttpRequestException($"Failed to fetch orders: Protected customer data. {response.StatusCode}");
    }
    else
    {
        throw new HttpRequestException($"Failed to fetch orders: {response.StatusCode}");
    }
}
```

---

### 2. `ShopifyDataSyncService`の注文データ同期エラーハンドリング追加

**変更内容**:
- 注文データ同期のエラーハンドリングを追加
- `Protected Customer Data`エラーの場合は警告を出して続行（顧客データと同様に）
- 部分的な成功として処理（商品データ同期は成功している）

**変更前**:
```csharp
// 3. 注文データ同期
_logger.LogInformation("🟡 [ShopifyDataSyncService] 注文データ同期開始");
syncStatus.CurrentTask = "注文データ取得中";
await _context.SaveChangesAsync();

await _orderSyncJob.SyncOrders(store.Id, syncOptions);

var orderCount = await _context.Orders.CountAsync(o => o.StoreId == store.Id);
syncStatus.ProcessedRecords = customerCount + productCount + orderCount;
syncStatus.TotalRecords = customerCount + productCount + orderCount;
syncStatus.CurrentTask = "全データ同期完了";
await _context.SaveChangesAsync();
```

**変更後**:
```csharp
// 3. 注文データ同期
_logger.LogInformation("🟡 [ShopifyDataSyncService] 注文データ同期開始");
syncStatus.CurrentTask = "注文データ取得中";
await _context.SaveChangesAsync();

try
{
    await _orderSyncJob.SyncOrders(store.Id, syncOptions);
    var orderCount = await _context.Orders.CountAsync(o => o.StoreId == store.Id);
    syncStatus.ProcessedRecords = customerCount + productCount + orderCount;
    syncStatus.TotalRecords = customerCount + productCount + orderCount;
    syncStatus.CurrentTask = "全データ同期完了";
    await _context.SaveChangesAsync();
    
    _logger.LogInformation("🟡 [ShopifyDataSyncService] ✅ 注文データ同期完了: Count={OrderCount}, StoreId={StoreId}", 
        orderCount, store.Id);
    _logger.LogInformation("🟡 [ShopifyDataSyncService] ✅ 全データ同期完了: Total={TotalRecords} (Customers={CustomerCount}, Products={ProductCount}, Orders={OrderCount}), StoreId={StoreId}", 
        customerCount + productCount + orderCount, customerCount, productCount, orderCount, store.Id);
}
catch (Exception orderEx)
{
    // Protected Customer Dataエラーの場合、警告を出して続行
    var errorMessage = orderEx.Message + (orderEx.InnerException != null ? " " + orderEx.InnerException.Message : "");
    var isProtectedCustomerDataError = 
        errorMessage.Contains("Protected customer data", StringComparison.OrdinalIgnoreCase) ||
        errorMessage.Contains("not approved to access REST endpoints", StringComparison.OrdinalIgnoreCase) ||
        errorMessage.Contains("protected-customer-data", StringComparison.OrdinalIgnoreCase) ||
        (orderEx is HttpRequestException && errorMessage.Contains("Forbidden", StringComparison.OrdinalIgnoreCase));
    
    if (isProtectedCustomerDataError)
    {
        _logger.LogWarning(orderEx, "🟡 [ShopifyDataSyncService] ⚠️ 注文データ同期が失敗しました（Protected Customer Data未承認）");
        _logger.LogWarning("🟡 [ShopifyDataSyncService] ⚠️ エラー詳細: {ErrorMessage}", errorMessage);
        _logger.LogWarning("🟡 [ShopifyDataSyncService] ⚠️ 商品データの同期は完了しています");
        _logger.LogWarning("🟡 [ShopifyDataSyncService] ⚠️ Shopify Partners管理画面でProtected Customer Dataへのアクセスを申請してください:");
        _logger.LogWarning("🟡 [ShopifyDataSyncService] ⚠️ https://partners.shopify.com → Apps → EC Ranger → App setup → Protected customer data");
        var orderCount = await _context.Orders.CountAsync(o => o.StoreId == store.Id);
        syncStatus.ProcessedRecords = customerCount + productCount + orderCount;
        syncStatus.TotalRecords = customerCount + productCount + orderCount;
        syncStatus.CurrentTask = "注文データ同期スキップ（Protected Customer Data未承認）";
        var existingErrorMessage = syncStatus.ErrorMessage ?? "";
        syncStatus.ErrorMessage = string.IsNullOrEmpty(existingErrorMessage) 
            ? $"注文データ同期がスキップされました: Protected Customer Data未承認。詳細: {errorMessage}"
            : $"{existingErrorMessage} | 注文データ同期がスキップされました: Protected Customer Data未承認。詳細: {errorMessage}";
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("🟡 [ShopifyDataSyncService] ✅ 部分的な同期完了: Total={TotalRecords} (Customers={CustomerCount}, Products={ProductCount}, Orders={OrderCount}), StoreId={StoreId}", 
            customerCount + productCount + orderCount, customerCount, productCount, orderCount, store.Id);
    }
    else
    {
        // その他のエラーは再スロー
        _logger.LogError(orderEx, "🟡 [ShopifyDataSyncService] ❌ 注文データ同期で予期しないエラーが発生しました");
        throw;
    }
}
```

---

## ✅ 対応後の動作

### 正常な同期（すべて成功）

1. 顧客データ同期: 成功
2. 商品データ同期: 成功
3. 注文データ同期: 成功
4. **結果**: 全データ同期完了 ✅

---

### 部分的な同期（Protected Customer Data未承認）

1. 顧客データ同期: `Forbidden`エラー → 警告を出して続行
2. 商品データ同期: 成功 ✅
3. 注文データ同期: `Forbidden`エラー → 警告を出して続行
4. **結果**: 部分的な同期完了（商品データのみ）✅

**ログ出力例**:
```
[WRN] ⚠️ 注文データ同期が失敗しました（Protected Customer Data未承認）
[WRN] ⚠️ エラー詳細: Failed to fetch orders: Protected customer data. Forbidden
[WRN] ⚠️ 商品データの同期は完了しています
[WRN] ⚠️ Shopify Partners管理画面でProtected Customer Dataへのアクセスを申請してください
[INF] ✅ 部分的な同期完了: Total=150 (Customers=0, Products=150, Orders=0)
```

---

### 予期しないエラー

1. 顧客データ同期: 成功
2. 商品データ同期: 成功
3. 注文データ同期: 予期しないエラー（ネットワークエラーなど）
4. **結果**: 同期全体が失敗 ❌

---

## 🎯 改善効果

### Before（修正前）

- 注文データ同期が失敗すると、同期全体が失敗
- 商品データ同期は成功しているにもかかわらず、同期全体が失敗として扱われる
- ユーザーは商品データが同期できていることを確認できない

### After（修正後）

- 注文データ同期が`Protected Customer Data`エラーの場合、警告を出して続行
- 商品データ同期は成功している場合、部分的な成功として処理
- ユーザーは商品データが同期できていることを確認できる
- 顧客データと注文データの両方が`Protected Customer Data`エラーの場合でも、商品データは同期できる

---

## 📚 関連ドキュメント

- [データ同期失敗-Protected-Customer-Dataエラー](./2026-01-19-データ同期失敗-Protected-Customer-Dataエラー.md)
- [データ同期-429エラー-レート制限問題](./2026-01-19-データ同期-429エラー-レート制限問題.md)

---

## 🔄 今後の対応

### 短期対応（完了）

- ✅ 注文データ同期のエラーハンドリング追加
- ✅ `Protected Customer Data`エラーの判定と処理

### 長期対応（推奨）

- ⏳ Shopify Partners管理画面で`Protected Customer Data`へのアクセスを申請
- ⏳ 申請が承認された後、顧客データと注文データの同期を再試行

---

**最終更新**: 2026年1月19日  
**作成者**: AI Assistant  
**修正者**: AI Assistant
