# DDL在庫一覧（docs と backend の棚卸し）

作成日: 2025-08-24  
作成者: ERIS

## 1. docs 配下（正式運用）

| ファイル | 概要 | 備考 |
|---|---|---|
| 2025-08-02-EmergencyIndexes.sql | OrderItems系インデックス | docs/ に正式配置 |
| 2025-08-05-AddInitialSetupFeature.sql | SyncStatuses, Stores列追加 | docs/ に正式配置 |
| 2025-08-13-AddWebhookEventsTable.sql | WebhookEvents/InstallationHistory/GDPR | docs/ に正式配置 |

## 2. backend 配下（開発/検証）

| ファイル | 概要 | 備考 |
|---|---|---|
| 2025-07-27-AddStoreMetadataColumns.sql | Storesメタ列 | 開発フォルダに存在 |
| 2025-07-27-DormantCustomerPerformanceIndexes.sql | パフォーマンスIDX | 開発フォルダに存在 |
| 2025-08-01-AddMultiTenantSupport.sql | Tenants/Stores拡張 | 開発フォルダに存在 |
| 2025-08-01-FixTenantIdType.sql | Tenants型修正 | 開発フォルダに存在 |
| 2025-08-01-RenameCustomerAccountToTenant.sql | リネーム/IDX | 開発フォルダに存在 |
| 2025-08-02-EmergencyIndexes.sql | 同名（docsと重複） | 重複 → docsへ集約推奨 |
| 2025-08-05-AddInitialSetupFeature.sql | 同名（docsと重複） | 重複 → docsへ集約推奨 |
| 2025-08-13-AddWebhookEventsTable.sql | 同名（docsと重複） | 重複 → docsへ集約推奨 |
| AddShopifyAuthFields.sql | 認証フィールド追加 | 用途確認要 |
| UpdateCustomerTotalOrdersAndSpent.sql | 集計更新 | 用途確認要 |

## 3. 不足/差分（モデルとDDL）

- WebhookEvents.IdempotencyKey（モデル/DbContextには存在、DDL未追加）
- 課金: SubscriptionPlans/StoreSubscriptions（モデルあり、DDL未検出）
- Sync系の型揺れ: `SyncStatuses.StoreId` が nvarchar(255)、他のSync系は int

## 4. 推奨アクション

1) backend 側の重複3件（2025-08-02/08-05/08-13）を docs 側に統一（片側へ移送/削除）
2) 追加DDLを `docs/…/マイグレーション` に新規作成（IdempotencyKey, Billing）
3) `database-migration-tracking.md` に全件を追記（適用状況も更新）
4) 運用ポリシー（README）のフローに合わせて以後はdocs側を正本に

