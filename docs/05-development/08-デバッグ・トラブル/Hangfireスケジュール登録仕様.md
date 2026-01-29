# Hangfire スケジュール登録仕様（現状）

**最終確認**: 2026-01-29  
**目的**: データ同期まわりの Recurring ジョブがいつ・どのスケジュールで登録されているかを整理する。

---

## 1. 登録タイミング

| タイミング | 処理 | 参照 |
|------------|------|------|
| **アプリ起動時** | `Program.cs` で `RegisterRecurringJobs` を呼び出し | Program.cs L506–512 |
| **初期同期完了時** | `ShopifyDataSyncService` 内でストア別ジョブのみ追加登録 | ShopifyDataSyncService.cs L118–144 |
| **手動** | `POST /api/ManualSync/reschedule-recurring-jobs` で再登録 | ManualSyncController |
| **手動（別API）** | `POST /api/HangFireJob/register-recurring-jobs` で **商品のみ** 別スキーム登録 | HangFireJobController（後述） |

---

## 2. 通常の自動登録（Program.cs ＋ 各ジョブ）

起動時に各 `RegisterRecurringJobs` が実行される。

### 2.1 ストア別ジョブ（`InitialSetupCompleted == true` のストアのみ）

対象: `IsActive == true` かつ `InitialSetupCompleted == true` かつ `AccessToken` が空でないストア。

| ジョブID | 種別 | Cron | 意味 |
|----------|------|------|------|
| `sync-products-store-{id}` | 商品 | `Cron.Hourly` | 毎時 0 分 (UTC) |
| `sync-customers-store-{id}` | 顧客 | `0 */2 * * *` | 2 時間ごと |
| `sync-orders-store-{id}` | 注文 | `0 */3 * * *` | 3 時間ごと |

※ 上記はすべて **UTC**。日本時間ではない。

### 2.2 全ストア一括ジョブ（常に登録）

| ジョブID | 種別 | Cron | 意味 |
|----------|------|------|------|
| `sync-all-stores-products-daily` | 商品 | `Cron.Daily` | 毎日 **00:00 UTC** |
| `sync-all-stores-customers-daily` | 顧客 | `Cron.Daily` | 毎日 **00:00 UTC** |
| `sync-all-stores-orders-daily` | 注文 | `Cron.Daily` | 毎日 **00:00 UTC** |

- Hangfire の `Cron.Daily` は **00:00 UTC**（ JST では 9:00 or 8:00、サマータイム次第）。
- **「毎日午前 2 時」ではない。**

### 2.3 その他

| ジョブID | 種別 | Cron | 意味 |
|----------|------|------|------|
| `gdpr-process-pending` | GDPR | `*/5 * * * *` | 5 分ごと |

---

## 3. 初期同期完了時（ShopifyDataSyncService）

初期同期が完了したストアに対して、**ストア別**の 3 ジョブのみ追加登録する。

- 商品: `Cron.Hourly`
- 顧客: `0 */2 * * *`
- 注文: `0 */3 * * *`

全ストア一括（`sync-all-stores-*-daily`）はここでは登録しない。それらは起動時の `RegisterRecurringJobs` で登録される。

---

## 4. HangFireJobController の `register-recurring-jobs`（手動用・商品のみ）

`POST /api/HangFireJob/register-recurring-jobs` を呼ぶと、**商品**の全ストア同期用に、次の 2 本だけが登録される。

| ジョブID | Cron | 意味 |
|----------|------|------|
| `hourly-product-sync-all-stores` | `Cron.Hourly` | 毎時 0 分 (UTC) |
| `daily-product-sync-all-stores` | `0 2 * * *` | 毎日 **02:00 UTC** |

- **「毎日 2:00 AM」** と明示されているのは、この **手動登録用 API** の `daily-product-sync-all-stores` のみ。
- Program.cs や各 `RegisterRecurringJobs` の通常フローでは **2 時指定は使っていない**。

---

## 5. まとめ

| 質問 | 回答 |
|------|------|
| 実際に「毎日午前 2 時」で動いている？ | **いいえ。** 通常の自動登録では全ストア一括は `Cron.Daily` = **00:00 UTC**。2 時は `HangFireJobController` の手動登録用ジョブのみ。 |
| ストア別の同期は何時？ | 商品 1 時間ごと、顧客 2 時間ごと、注文 3 時間ごと。特定の「○時」ではなく **間隔**。 |
| タイムゾーン | いずれも **UTC**。JST 換算は運用環境のサーバー設定に依存。 |

---

## 6. 関連コード

- `Program.cs` … 起動時の Recurring 登録
- `ShopifyProductSyncJob.RegisterRecurringJobs` … 商品
- `ShopifyCustomerSyncJob.RegisterRecurringJobs` … 顧客
- `ShopifyOrderSyncJob.RegisterRecurringJobs` … 注文
- `ShopifyDataSyncService` … 初期同期完了時のストア別登録
- `HangFireJobController.RegisterRecurringJobs` … 手動用（商品のみ・2 時含む）

---

**関連**: `Hangfireジョブ登録条件調査.md`（登録条件の詳細）、`chunkloaderror-app-layout.md` など。
