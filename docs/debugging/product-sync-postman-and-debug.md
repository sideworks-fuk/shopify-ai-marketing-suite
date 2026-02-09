# 商品同期（Product Sync）の Postman 実行方法とデバッグ箇所

## 1. Postman での実行方法

### 前提
- バックエンド API は **http://localhost:5168** で起動していること（または環境に合わせて変更）。
- **開発者認証** でトークンを取得し、商品同期 API は **Bearer トークン + X-Store-Id** が必要なルートと、**Bearer トークン + URL の storeId** のルートがある。

---

### ステップ 1: 開発者ログインでトークン取得

| 項目 | 値 |
|------|-----|
| **Method** | POST |
| **URL** | `http://localhost:5168/api/developer/login` |
| **Headers** | `Content-Type: application/json` |
| **Body (raw JSON)** | `{ "password": "dev2026" }` |

レスポンス例:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2026-02-05T..."
}
```
→ この **token** の値をコピーし、以下で **Authorization: Bearer {token}** に設定する。

---

### ステップ 2: 商品同期をトリガーする（3パターン）

#### 方法 A: SyncController（推奨・DataSync-Test.http と同じ）

| 項目 | 値 |
|------|-----|
| **Method** | POST |
| **URL** | `http://localhost:5168/api/sync/trigger` |
| **Headers** | `Content-Type: application/json`<br>`Authorization: Bearer {上で取得したtoken}`<br>**`X-Store-Id: 22`**（対象ストアIDに変更） |
| **Body (raw JSON)** | `{ "type": "products" }` |

- ストアIDは **X-Store-Id** で指定。StoreAwareControllerBase がこのヘッダーから StoreId を読む。
- レスポンスで `jobIds` に `products:{HangFireのJobId}` が返る。実際の同期は **HangFire のバックグラウンド** で実行される。

---

#### 方法 B: ManualSyncController（storeId を URL に含める）

| 項目 | 値 |
|------|-----|
| **Method** | POST |
| **URL** | `http://localhost:5168/api/ManualSync/sync-products/22` |
| **Headers** | `Authorization: Bearer {token}` |
| **Body** | 空でOK。オプションで `{ "isFullScan": true }` など可。 |

- 22 の部分を対象の **storeId** に変更。
- 既に商品同期が実行中だと **409 Conflict** になる。

---

#### 方法 C: HangFireJobController（ジョブ専用・storeId を URL に含める）

| 項目 | 値 |
|------|-----|
| **Method** | POST |
| **URL** | `http://localhost:5168/api/HangFireJob/sync-products/22` |
| **Headers** | `Authorization: Bearer {token}` |

- 22 を対象の **storeId** に変更。
- 実行中チェックはなく、即ジョブがキューに投入される。

---

### 実行後の確認

- **同期ステータス**: `GET http://localhost:5168/api/sync/status/{storeId}`  
  Headers: `Authorization: Bearer {token}`, `X-Store-Id: {storeId}`
- **同期履歴**: `GET http://localhost:5168/api/sync/history?limit=10`  
  Headers: 同様

---

## 2. デバッグ箇所（ブレークポイントを置く場所）

商品同期は **API がジョブをキューに入れたあと、HangFire ワーカーがバックグラウンドで実行**する。  
そのため、**API の入口** と **ジョブ／サービス内** の両方にブレークポイントを置くとよい。

### 2.1 入口（Postman でリクエストした直後に止めたい場合）

| ファイル | 行付近 | 内容 |
|----------|--------|------|
| **SyncController.cs** | `TriggerSync` 内、約 414 行目 | `[HttpPost("trigger")]` のメソッド先頭。`request.Type == "products"` の分岐前後で `currentStore.Id` を確認可能。 |
| **SyncController.cs** | 約 462–463 行目 | `_backgroundJobClient.Enqueue<ShopifyProductSyncJob>(...)` の直前。ここで `jobId` が発行される。 |
| **ManualSyncController.cs** | 約 84–85 行目 | `_backgroundJobClient.Enqueue<ShopifyProductSyncJob>(...)` の直前。 |
| **HangFireJobController.cs** | 約 39–40 行目 | 同上。 |

→ Postman で「商品同期」を実行したタイミングで、上記のいずれかで止まる。

---

### 2.2 バックグラウンドで動く「商品同期ジョブ」の中（実際の同期処理）

HangFire がジョブを実行するので、**API レスポンスが返ったあと**にブレークポイントにヒットする。  
Visual Studio で **F5 デバッグ実行** したまま、Postman でトリガー → 少し待つとジョブ側で止まる。

| ファイル | 行付近 | 内容 |
|----------|--------|------|
| **ShopifyProductSyncJob.cs** | **46 行目** | `SyncProducts(int storeId, ...)` メソッド先頭。ジョブ開始直後。 |
| **ShopifyProductSyncJob.cs** | **139–140 行目** | `FetchProductsPageAsync` 呼び出し直前。**1 ページ目取得の直前に止めたいとき**に最適。 |
| **ShopifyProductSyncJob.cs** | **378–393 行目** | `ConvertToProductEntity` 内。**Shopify → DB の Product マッピング（Category 含む）** を確認したいとき。388 行目で Category 設定。 |
| **ShopifyProductSyncJob.cs** | **442–452 行目** | `SaveOrUpdateProductsBatch` 内の「既存データを更新」ブロック。**449 行目** で既存商品の Category 更新。 |
| **ShopifyApiService.cs** | **384 行目付近** | `FetchProductsPageAsync` メソッド先頭。**Shopify REST API を呼ぶ直前**。 |
| **ShopifyApiService.cs** | **419 行目付近** | `FetchProductsPageAsync` 内、`JsonSerializer.Deserialize<ShopifyProductsResponse>(json)` の直後。**API レスポンスの Product 一覧** を確認可能。 |

---

### 2.3 推奨ブレークポイント（Category マッピングの確認）

商品の **Category が ProductType から入る** ことを確認するなら、次の 2 つを優先するとよい。

1. **ShopifyProductSyncJob.cs** の **ConvertToProductEntity** 内  
   - **388 行目**: `Category = !string.IsNullOrWhiteSpace(shopifyProduct.ProductType) ? shopifyProduct.ProductType : null`  
   - ここで `shopifyProduct.ProductType` と `product.Category` をウォッチ。
2. **ShopifyProductSyncJob.cs** の **SaveOrUpdateProductsBatch** 内  
   - **449 行目**: `existingProduct.Category = product.Category`  
   - 既存商品更新で Category が DB に反映される瞬間を確認。

---

## 3. 呼び出しフロー（商品同期のみ）

```
Postman
  POST /api/sync/trigger  (Body: { "type": "products" }, X-Store-Id: 22)
    ↓
SyncController.TriggerSync
  → currentStore 取得
  → _backgroundJobClient.Enqueue<ShopifyProductSyncJob>(job => job.SyncProducts(currentStore.Id, null))
  → 即 200 OK + jobIds を返す
    ↓
[HangFire ワーカーがキューから取り出して実行]
    ↓
ShopifyProductSyncJob.SyncProducts(storeId, null)
  → ストア・トークン検証
  → 同期範囲・進捗開始
  → while (hasMorePages):
        (shopifyProducts, nextPageInfo) = _shopifyApi.FetchProductsPageAsync(...)  ← Shopify REST 呼び出し
        ConvertToProductEntity(...) で Product に変換（Category = ProductType）
        SaveOrUpdateProductsBatch(...) で DB に保存・更新
    ↓
ShopifyApiService.FetchProductsPageAsync
  → BuildProductsUrl → GET https://{shop}/admin/api/2024-01/products.json?limit=250...
  → レスポンスを ShopifyProductsResponse にデシリアライズ
  → return (productsData.Products, nextPageInfo)
```

---

## 4. 注意事項

- **開発者認証** が有効で、`appsettings` の `Developer:Enabled` が true、パスワードが設定されていること。
- **X-Store-Id** は SyncController 系で必須。ManualSync / HangFireJob は URL の storeId のみでよい。
- ジョブは非同期のため、**ブレークポイントは「ジョブ内」に置き、トリガー後に少し待ってからヒットすることを確認**するとよい。

## 関連ファイル

- 同期テスト用 HTTP: `backend/ShopifyAnalyticsApi/Tests/DataSync-Test.http`
- 商品同期ジョブ: `backend/ShopifyAnalyticsApi/Jobs/ShopifyProductSyncJob.cs`
- Shopify API 呼び出し: `backend/ShopifyAnalyticsApi/Services/ShopifyApiService.cs`
- 同期 API: `backend/ShopifyAnalyticsApi/Controllers/SyncController.cs`
