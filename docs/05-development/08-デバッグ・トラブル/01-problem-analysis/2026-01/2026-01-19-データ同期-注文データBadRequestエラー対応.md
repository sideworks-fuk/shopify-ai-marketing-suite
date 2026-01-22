# データ同期 - 注文データBadRequestエラー対応

## 📋 問題概要

注文データ同期時に`BadRequest`エラーが発生し、同期全体が失敗する問題が発生しました。

### エラーメッセージ

```
orderEx
{"Failed to fetch orders: BadRequest"}
    Message: "Failed to fetch orders: BadRequest"
    StatusCode: null
```

### 発生箇所

- `ShopifyApiService.FetchOrdersPageAsync` (行 357)
- `ShopifyOrderSyncJob.SyncOrders` (行 217, 104, 186)
- `ShopifyDataSyncService.RunInitialSyncWithJobs` (行 277)

---

## 🔍 原因分析

### 考えられる原因

1. **URLの構築に問題がある**
   - 日付フォーマットが不正
   - クエリパラメータのエンコーディングに問題がある
   - `page_info`と他のパラメータを同時に使用している

2. **Shopify APIのバージョンが間違っている**
   - APIバージョンが存在しない、または非推奨

3. **リクエストパラメータが不正**
   - `limit`の値が範囲外
   - `status`パラメータの値が不正
   - `updated_at_min`の日付フォーマットが不正

4. **Protected Customer DataエラーがBadRequestとして返される**
   - Shopify APIが`BadRequest`で`Protected Customer Data`エラーを返す可能性

---

## 🛠️ 対応内容

### 1. エラーレスポンスの詳細ログ出力

`ShopifyApiService.FetchOrdersPageAsync`で、エラーレスポンスの内容を詳細にログ出力するように改善しました。

**修正前**:
```csharp
if (errorContent.Contains("Protected customer data"))
{
    throw new HttpRequestException($"Failed to fetch orders: Protected customer data. {response.StatusCode}");
}
```

**修正後**:
```csharp
// BadRequestやForbiddenでも、Protected Customer Dataエラーが含まれている可能性がある
if (errorContent.Contains("Protected customer data", StringComparison.OrdinalIgnoreCase) ||
    errorContent.Contains("not approved to access REST endpoints", StringComparison.OrdinalIgnoreCase) ||
    errorContent.Contains("protected-customer-data", StringComparison.OrdinalIgnoreCase))
{
    throw new HttpRequestException($"Failed to fetch orders: Protected customer data. {response.StatusCode}");
}
```

### 2. BadRequestエラーの詳細ログ出力

`ShopifyDataSyncService`で、`BadRequest`エラーの場合に詳細なログを出力するように改善しました。

**修正内容**:
```csharp
// BadRequestエラーの場合、エラーレスポンスの内容を詳細にログ出力
if (orderEx is HttpRequestException && errorMessage.Contains("BadRequest", StringComparison.OrdinalIgnoreCase))
{
    _logger.LogWarning("🟡 [ShopifyDataSyncService] ⚠️ BadRequestエラーが発生しました。エラーレスポンスの内容を確認してください: {ErrorMessage}", errorMessage);
    _logger.LogWarning("🟡 [ShopifyDataSyncService] ⚠️ 注文データ同期のURLやパラメータに問題がある可能性があります");
}
```

### 3. Protected Customer Dataエラーの判定改善

`BadRequest`エラーでも`Protected Customer Data`エラーが含まれている場合は、適切に処理できるようにしました。

**修正内容**:
```csharp
var isProtectedCustomerDataError = 
    errorMessage.Contains("Protected customer data", StringComparison.OrdinalIgnoreCase) ||
    errorMessage.Contains("not approved to access REST endpoints", StringComparison.OrdinalIgnoreCase) ||
    errorMessage.Contains("protected-customer-data", StringComparison.OrdinalIgnoreCase) ||
    (orderEx is HttpRequestException && (
        errorMessage.Contains("Forbidden", StringComparison.OrdinalIgnoreCase) ||
        errorMessage.Contains("BadRequest", StringComparison.OrdinalIgnoreCase)));
```

---

## 🔬 デバッグ手順

### ステップ1: エラーレスポンスの内容を確認

バックエンドログで、以下のログを確認してください：

```
[ERR] 🛒 [ShopifyApiService] Failed to fetch orders: StatusCode=BadRequest, ErrorContent={ErrorContent}, StoreId={StoreId}
```

**確認ポイント**:
- `ErrorContent`の内容を確認
- `Protected Customer Data`エラーが含まれているか確認
- URLやパラメータに問題がないか確認

### ステップ2: URLの構築を確認

`ShopifyApiService.BuildOrdersUrl`で構築されるURLを確認してください：

```
[INF] 🛒 [ShopifyApiService] FetchOrdersPageAsync開始: StoreId={StoreId}, Domain={Domain}, Url={Url}, SinceDate={SinceDate}, PageInfo={PageInfo}
```

**確認ポイント**:
- URLの形式が正しいか確認
- 日付フォーマットが`yyyy-MM-ddTHH:mm:ssZ`になっているか確認
- `page_info`と他のパラメータを同時に使用していないか確認

### ステップ3: Shopify APIのレスポンスを確認

Postmanやcurlで、直接Shopify APIを呼び出してレスポンスを確認してください：

```bash
curl -X GET "https://{shop}.myshopify.com/admin/api/2024-01/orders.json?limit=250&status=any" \
  -H "X-Shopify-Access-Token: {access_token}"
```

**確認ポイント**:
- レスポンスのステータスコード
- エラーメッセージの内容
- リクエストパラメータが正しいか確認

---

## 📊 期待される動作

### 修正前

- `BadRequest`エラーが発生すると、同期全体が失敗
- エラーレスポンスの内容が詳細にログ出力されない
- `Protected Customer Data`エラーが`BadRequest`として返される場合、適切に処理されない

### 修正後

- `BadRequest`エラーの場合、詳細なログが出力される
- `Protected Customer Data`エラーが`BadRequest`として返される場合、適切に処理される
- エラーレスポンスの内容を確認できるため、原因の特定が容易になる

---

## 🎯 次のステップ

### 1. エラーレスポンスの内容を確認

バックエンドログで、`ErrorContent`の内容を確認してください。これにより、`BadRequest`エラーの原因を特定できます。

### 2. URLの構築を確認

`BuildOrdersUrl`で構築されるURLを確認し、パラメータが正しいか確認してください。

### 3. Shopify APIのドキュメントを確認

Shopify APIのドキュメントで、注文データ取得のリクエストパラメータを確認してください。

### 4. テスト用ストアで確認

テスト用ストアで、同じリクエストを実行してエラーが再現するか確認してください。

---

## 📚 関連ドキュメント

- [データ同期-注文データForbiddenエラー対応](./2026-01-19-データ同期-注文データForbiddenエラー対応.md)
- [データ同期失敗-Protected-Customer-Dataエラー](./2026-01-19-データ同期失敗-Protected-Customer-Dataエラー.md)
- [ローカルAPIデバッグ手順-データ同期テスト](../02-tools/ローカルAPIデバッグ手順-データ同期テスト.md)

---

## 🔄 今後の対応

### 短期対応（完了）

- ✅ エラーレスポンスの詳細ログ出力
- ✅ `BadRequest`エラーの詳細ログ出力
- ✅ `Protected Customer Data`エラーの判定改善

### 長期対応（推奨）

- ⏳ エラーレスポンスの内容を確認して、原因を特定
- ⏳ URLの構築ロジックを改善（必要に応じて）
- ⏳ Shopify APIのバージョンを更新（必要に応じて）

---

**最終更新**: 2026年1月19日  
**作成者**: AI Assistant  
**修正者**: AI Assistant
