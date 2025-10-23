# データベース移行管理ドキュメント

## 概要
データベース変更スクリプトの管理と、環境別の適用状況を追跡するためのドキュメント。

## ディレクトリ構造
```
docs/04-development/03-データベース/マイグレーション/
├── database-migration-tracking.md (本ファイル)
├── 2025-08-02-EmergencyIndexes.sql
├── 2025-08-05-AddInitialSetupFeature.sql
├── 2025-08-13-AddWebhookEventsTable.sql
├── 2025-08-24-AddIdempotencyKeyToWebhookEvents.sql
├── 2025-08-24-CreateBillingTables.sql
├── 2025-08-24-AddFeatureSelectionTables.sql
├── 2025-08-24-AddGDPRTables.sql
├── 2025-08-25-FIX-AddIdempotencyKeyToWebhookEvents.sql
├── 2025-08-25-FIX-free-plan-feature-selection.sql
├── 2025-08-25-FIX-sp_GetCurrentFeatureSelection.sql
├── 2025-08-25-FIX2-free-plan-feature-selection.sql
├── 2025-08-26-free-plan-feature-selection.sql
├── 2025-09-04-MASTER-CreateDatabaseFromScratch.sql
├── 2025-10-20-FIX-FeatureLimits-IDs.sql
└── 2025-XX-XX-[変更内容].sql
```

## 移行スクリプト一覧と適用状況

| スクリプト名 | 作成日 | 作成者 | 内容 | Development | Staging | Production |
|------------|--------|--------|------|-------------|---------|------------|
| 2025-08-02-EmergencyIndexes.sql | 2025-08-02 | TAKASHI | OrderItemsインデックス追加 | ✅ 適用済 (2025-08-04) | ⏳ 未適用 | ⏳ 未適用 |
| 2025-08-05-AddInitialSetupFeature.sql | 2025-08-05 | TAKASHI | 初期設定機能（SyncStatusテーブル、Storesテーブル更新） | ✅ 適用済 (2025-08-05 10:00) | ⏳ 未適用 | ⏳ 未適用 |
| 2025-08-13-AddWebhookEventsTable.sql | 2025-08-13 | TAKASHI | Webhookイベント履歴・GDPR管理テーブル追加 | ✅ 適用済 (2025-08-13) | ⏳ 未適用 | ⏳ 未適用 |
| 2025-08-24-AddIdempotencyKeyToWebhookEvents.sql | 2025-08-24 | ERIS | 冪等キー追加＋ユニーク(Filtered) | ❌ エラー発生 | ⏳ 未適用 | ⏳ 未適用 |
| 2025-08-24-CreateBillingTables.sql | 2025-08-24 | ERIS | 課金テーブル新規（Plans/StoreSubscriptions） | ✅ 適用済 (2025-08-25) | ⏳ 未適用 | ⏳ 未適用 |
| 2025-08-24-AddFeatureSelectionTables.sql | 2025-08-24 | Kenji | 機能選択テーブル（FeatureLimits等） | ✅ 適用済 (2025-08-25) | ⏳ 未適用 | ⏳ 未適用 |
| 2025-08-24-AddGDPRTables.sql | 2025-08-24 | Takashi | GDPR管理テーブル（GDPRRequests等） | ✅ 適用済 (2025-08-25) | ⏳ 未適用 | ⏳ 未適用 |
| 2025-08-25-FIX-AddIdempotencyKeyToWebhookEvents.sql | 2025-08-25 | Kenji | IdempotencyKeyエラー修正版 | ✅ 適用済 (2025-08-25 13:10) | ⏳ 未適用 | ⏳ 未適用 |
| 2025-08-25-FIX-free-plan-feature-selection.sql | 2025-08-25 | Kenji | 無料プラン機能制限修正版 | ❌ エラー発生 | ⏳ 未適用 | ⏳ 未適用 |
| 2025-08-25-FIX-sp_GetCurrentFeatureSelection.sql | 2025-08-25 | Kenji | ストアドプロシージャ簡易版 | ✅ 適用済 (2025-08-25 13:10) | ⏳ 未適用 | ⏳ 未適用 |
| 2025-08-25-FIX2-free-plan-feature-selection.sql | 2025-08-25 | Kenji | Store→Stores修正、カラム追加 | ✅ 適用済 (2025-08-25 13:20) | ⏳ 未適用 | ⏳ 未適用 |
| 2025-08-26-free-plan-feature-selection.sql | 2025-08-26 | Takashi | 無料プラン機能制限（元版） | ❌ エラー発生 | ⏳ 未適用 | ⏳ 未適用 |
| **2025-09-04-MASTER-CreateDatabaseFromScratch.sql** | 2025-09-04 | Kenji | **完全なデータベース作成マスタースクリプト** | 🆕 新規作成 | ⏳ 未適用 | ⏳ 未適用 |
| **2025-10-20-FIX-FeatureLimits-IDs.sql** | 2025-10-20 | 福田+AI | **機能ID統一修正（year_over_year→yoy_comparison等）** | ✅ 適用済 (2025-10-20 16:23) | ⏳ 未適用 | ⏳ 未適用 |

## 適用済みマイグレーションまとめ（Development環境）

### 成功適用済み ✅
1. 2025-08-02-EmergencyIndexes.sql
2. 2025-08-05-AddInitialSetupFeature.sql
3. 2025-08-13-AddWebhookEventsTable.sql
4. 2025-08-24-CreateBillingTables.sql
5. 2025-08-24-AddFeatureSelectionTables.sql
6. 2025-08-24-AddGDPRTables.sql
7. 2025-08-25-FIX-AddIdempotencyKeyToWebhookEvents.sql
8. 2025-08-25-FIX-sp_GetCurrentFeatureSelection.sql
9. 2025-08-25-FIX2-free-plan-feature-selection.sql
10. **2025-10-20-FIX-FeatureLimits-IDs.sql**

### エラー発生（修正版で解決済み）❌→✅
- 2025-08-24-AddIdempotencyKeyToWebhookEvents.sql → 2025-08-25-FIX版で解決
- 2025-08-26-free-plan-feature-selection.sql → 2025-08-25-FIX2版で解決

### 🆕 マスタースクリプト
- **2025-09-04-MASTER-CreateDatabaseFromScratch.sql** - 新規環境用の完全なDDLスクリプト
  - Entity Frameworkで管理されていた基本テーブルのCREATE文を含む
  - すべての手動マイグレーションを統合
  - 実行順序を考慮した外部キー制約の設定
  - ベーステーブル: Stores, Tenants, Customers, Products, ProductVariants, Orders, OrderItems

### 🔧 機能ID統一修正（2025-10-20）
- **2025-10-20-FIX-FeatureLimits-IDs.sql** - 機能ID統一修正
  - `year_over_year` → `yoy_comparison`
  - `purchase_count` → `purchase_frequency`
  - `monthly_sales`, `analytics` を削除
  - コードとデータベースの整合性を確保

## 適用手順

### 1. 開発環境での確認
```bash
# スクリプト実行
sqlcmd -S [server] -d [database] -i [script.sql]

# 実行結果確認
# - エラーがないこと
# - 想定通りの変更が適用されたこと
```

### 2. ステージング環境への適用
- Azure Portal SQL Database クエリエディタを使用
- または sqlcmd コマンドを使用

### 3. 本番環境への適用
- 必ずバックアップを取得してから実行
- メンテナンス時間内に実施
- ロールバック手順を準備

## 記録ルール

### スクリプト作成時
1. `docs/04-development/03-データベース/マイグレーション/` に保存
2. ファイル名: `YYYY-MM-DD-[説明].sql`
3. スクリプト内にコメントで以下を記載：
   ```sql
   -- 作成日: 2025-08-25
   -- 作成者: Kenji
   -- 目的: エラー修正
   -- 影響: 影響範囲の説明
   -- EF Migration: [MigrationName]
   ```

### 適用時
1. 本ファイルの表を更新
2. 適用日時を記録
3. 問題があれば備考欄に記載

## チェックリスト

### 適用前
- [ ] スクリプトのレビュー完了
- [ ] 開発環境でのテスト完了
- [ ] バックアップ取得（本番のみ）
- [ ] ロールバック手順準備

### 適用後
- [ ] エラーがないことを確認
- [ ] アプリケーション動作確認
- [ ] パフォーマンス改善を確認
- [ ] 本ドキュメント更新

## 新規環境構築手順

### マスタースクリプトを使用した新規環境構築
新規環境でデータベースをゼロから構築する場合：

1. SQL Serverで新規データベースを作成
2. `2025-09-04-MASTER-CreateDatabaseFromScratch.sql` を実行
3. エラーがないことを確認
4. アプリケーションの接続テストを実施

### 注意事項
- Entity Frameworkのマイグレーションは不要（マスタースクリプトに含まれている）
- 既存環境には適用しないこと（データ損失の可能性）
- 新規環境専用のスクリプトです

---

## 提案: 更新案（Takashi提案の反映）
- WebhookEvents.IdempotencyKey のユニークインデックス（Filtered Unique）を明記し、該当DDLファイル名と適用状況を表に追記する
  - 対象行: `2025-08-25-FIX-AddIdempotencyKeyToWebhookEvents.sql`
  - 提案セル値: Development → ✅ 適用済 (2025-08-25 13:10) / Staging → ⏳ 未適用 / Production → ⏳ 未適用
- 課金DDL（CreateBillingTables ほか）の環境別適用状況を最新に更新する
  - 対象行: `2025-08-24-CreateBillingTables.sql`
  - 提案セル値: Development → ✅ 適用済 (2025-08-25) / Staging → ⏳ / Production → ⏳
- GDPR関連DDL（AddGDPRTables）の適用状況を最新化し、コントローラ実装との整合コメントを追加する
  - 対象行: `2025-08-24-AddGDPRTables.sql`
  - 提案セル値: Development → ✅ 適用済 (2025-08-25) / Staging → ⏳ / Production → ⏳

最終更新: 2025-10-20 17:30
管理者: 福田
更新者: 福田 + AI Assistant
