# Customer テーブル FirstName / LastName が NULL の原因調査ガイド

## 概要

ストアによっては `Customer` テーブルの `FirstName`、`LastName`（および `Email`、`Phone`）に値が入っていない事象の調査手順とデバッグ箇所をまとめる。

## 想定される原因

### 1. ストア側の制限・設定（Shopify API が空を返す）

- **Protected Customer Data（PCD）**: **名前・メール・電話は Level 2 の保護データ**。アプリが PCD アクセス権を持っていない場合、**API レスポンスに `first_name` / `last_name` / `email` / `phone` が含まれない**（キーごと省略される）。これが多くのストアで NULL になる主因。
- **チェックアウト設定**: 名前が必須でないストアでは、ゲスト checkout 等で名前が入力されていない場合がある（PCD 取得済みでも値が空になり得る）。
- **Shopify API 仕様**: `first_name`、`last_name` はオプショナルであり、ストアにデータがなければ `null` または空文字が返る（PCD 取得時）。

### 2. データ同期処理の問題（アプリ側）

- Shopify API レスポンスのデシリアライズ時のマッピングミス
- `UpsertCustomerAsync`（古い同期パス）で null をそのまま保存している
- 別経路（注文同期、Webhook など）で顧客が作成される際のマッピング漏れ

---

## 取得JSONに first_name / last_name / email が含まれない場合（確認済み事象）

**事象**: Shopify の `customers.json` レスポンスに、`first_name`・`last_name`・`email`・`phone` のキーが**一切含まれていない**（各顧客オブジェクトに `id`、`orders_count`、`default_address`、`addresses` 等はあるが、個人情報フィールドだけ欠けている）。

**原因**: **Protected Customer Data（PCD）** による制限。

- 名前・メール・電話・住所は **Level 2 の保護対象**。
- **パブリックアプリ**: Partner Dashboard で「Protected customer data」の Level 2 アクセスを申請し、データ保護レビューに通過する必要がある。未申請・未承認の場合は API がこれらのフィールドを**返さない**。
- **カスタムアプリ**: 通常はフルアクセス可能（ストアオーナーが自ストア用に作成したアプリ）。Admin 作成のカスタムアプリで Level 2 PII にアクセスする場合はプランにより異なる（Grow 以上が必要な場合あり）。

**公式ドキュメント**:
- [Work with protected customer data](https://shopify.dev/docs/apps/launch/protected-customer-data) — Level 0/1/2 の定義、パブリック／カスタム／Admin 作成カスタムアプリ別のアクセス可否、申請手順（Partner Dashboard → API access requests → Protected customer data）、承認後の API 挙動（未承認フィールドは redacted または errors）、Level 1/2 の要件一覧、Data protection review。
- [Custom apps - Custom Level 2 PII apps](https://help.shopify.com/en/manual/apps/app-types/custom-apps#custom-level2-pii-app) — カスタムアプリで Level 2 PII にアクセスする場合のストアプラン要件（Grow 以上など）。

**対応**:
1. **パブリックアプリの場合**: [Shopify Protected Customer Data](https://shopify.dev/docs/apps/launch/protected-customer-data) に従い、Partner Dashboard で PCD Level 2 を申請・承認を得る。
2. **カスタムアプリでテストする場合**: 該当ストア用のカスタムアプリを作成し、そのアプリのアクセストークンで `customers.json` を呼ぶと、同じストアでも名前・メール等が返るか確認できる。
3. **アプリ側の堅牢化**: PCD 未取得のまま運用する場合は、`first_name`/`last_name`/`email` が無い前提で表示を設計する（例: 「お客様」、ShopifyCustomerId の一部表示、`default_address.company` の利用など）。

**結論**: 取得できている JSON の「構造」に問題はない。**Shopify が PII を返さない設定（PCD）のため、キーごと省略されている**。同期処理のバグではなく、ストア／アプリの権限に起因する。

---

## デバッグ方針

**段階1**: Shopify API が実際に何を返しているかを確認  
**段階2**: アプリ側のマッピング・保存処理が正しいか確認  
**段階3**: 該当ストアの Shopify 管理画面の顧客データと照合

---

## Postman / HTTP による顧客同期の実行手順

### 前提

- バックエンド API が起動している（例: `http://localhost:5168`）
- 開発者認証が有効（パスワード: `dev2026`）
- 対象ストアの StoreId を把握している（例: 画像の StoreId=22）

### 手順

#### 1. トークン取得

```http
POST http://localhost:5168/api/developer/login
Content-Type: application/json

{
  "password": "dev2026"
}
```

レスポンスの `token` をコピーする。

#### 2. 顧客データのみ同期をトリガー

```http
POST http://localhost:5168/api/sync/trigger
Content-Type: application/json
Authorization: Bearer {{取得したトークン}}
X-Store-Id: 22

{
  "type": "customers"
}
```

#### 3. 使用する HTTP ファイル

既存の `backend/ShopifyAnalyticsApi/Tests/DataSync-Test.http` を利用可能。

- `@storeId = 22` に変更
- `@token` に取得したトークンを設定
- 「6. 顧客データのみ同期（手動トリガー）」のリクエストを実行

---

## デバッグすべきコード箇所

### 1. Shopify API 呼び出し（ShopifyApiService.cs）

| 箇所 | 内容 |
|------|------|
| `BuildCustomersUrl` | `customers.json` の URL 構築。`limit=250`、`updated_at_min`、`page_info` |
| `FetchCustomersPageAsync` | 実際の HTTP 呼び出しと JSON デシリアライズ。ログでレスポンスの最初の数件の `first_name`/`last_name` を確認可能 |
| `ShopifyCustomer` モデル | `[JsonPropertyName("first_name")]`、`[JsonPropertyName("last_name")]` でマッピング |

### 2. 顧客同期ジョブ（ShopifyCustomerSyncJob.cs）

| 箇所 | 内容 |
|------|------|
| `FetchCustomersFromShopify` | `FetchCustomersPageAsync` の戻り値を取得 |
| `ConvertToCustomerEntity` | `shopifyCustomer.FirstName ?? string.Empty` で null を空文字に変換 |
| `SaveOrUpdateCustomersBatch` | DB への保存。`existingCustomer.FirstName = customer.FirstName` で上書き |

### 3. 古い同期パス（ShopifyApiService.UpsertCustomerAsync）

| 箇所 | 内容 |
|------|------|
| `UpsertCustomerAsync` | `SyncCustomersAsync` から呼ばれる。`customer.FirstName` をそのまま代入しており、**null の場合は null が DB に保存される**。本番では `ShopifyCustomerSyncJob` が主経路のため通常は使用されないが、統合テスト等で使用される |

---

## ログで確認する内容

顧客同期実行時、以下のログが出力される：

```
🛒 [ShopifyApiService] FetchCustomersPageAsync開始: StoreId=22, ...
🛒 [ShopifyApiService] Shopify APIレスポンス受信: StatusCode=200, ...
🛒 [ShopifyApiService] Shopify APIレスポンスJSON受信: Length=..., ...
🛒 [ShopifyApiService] Shopify APIレスポンス解析完了: CustomerCount=..., ...
```

**追加したデバッグログ**（Shopify API からの取得値のサンプル）:

```
🛒 [ShopifyApiService] 顧客サンプル(API応答): ShopifyCustomerId=xxx, FirstName="...", LastName="...", Email="..."
```

このログで、Shopify が `first_name`/`last_name` を返しているかどうかを確認する。  
- ログで `FirstName=""` や `LastName=""` であれば → **ストア側にデータがない**  
- ログで値があるのに DB が NULL/空 → **マッピング・保存処理の不具合**

---

## Shopify 管理画面での確認

1. Shopify 管理画面 → 顧客
2. 該当顧客（例: ShopifyCustomerId 8967186808999）を開く
3. 名前、メールアドレスが表示されているか確認

- 管理画面でも空 → ストア側にデータがそもそもない
- 管理画面にはあるが DB は空 → API スコープや Protected Customer Data の可能性、またはアプリ側のバグ

---

## 推奨対応

1. **調査**: 上記 Postman で顧客同期を実行し、ログの「顧客サンプル(API応答)」を確認
2. **ストア側原因の場合**: チェックアウト設定で名前入力を必須にする、またはフロント表示で `FirstName`/`LastName` が空のときは「お客様」「ゲスト」等のフォールバック表示にする
3. **アプリ側の堅牢化**: `UpsertCustomerAsync` に `?? string.Empty` を追加して、万が一その経路が使われた場合でも null を保存しないようにする（既に実施済み）

---

## 関連ファイル

- `backend/ShopifyAnalyticsApi/Services/ShopifyApiService.cs` - FetchCustomersPageAsync, UpsertCustomerAsync
- `backend/ShopifyAnalyticsApi/Jobs/ShopifyCustomerSyncJob.cs` - ConvertToCustomerEntity, SaveOrUpdateCustomersBatch
- `backend/ShopifyAnalyticsApi/Tests/DataSync-Test.http` - 顧客同期の HTTP テスト
- `docs/worklog/2026/02/2026-02-04-dormant-customer-no-purchase-history-cause.md` - 休眠顧客関連の調査ログ
