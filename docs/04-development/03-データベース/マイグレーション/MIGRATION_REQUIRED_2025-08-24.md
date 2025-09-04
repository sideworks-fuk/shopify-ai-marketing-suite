# 必須データベースマイグレーション - 2025年8月24日以降
作成日: 2025-08-24
作成者: Kenji (AI PM)

## 🚨 重要：月曜朝一番で実行が必要なマイグレーション

以下のSQLファイルを順番に実行してください。

## 1. 実行が必要なマイグレーションファイル（実行順）

### Phase 1: 基盤テーブル（実行済みか要確認）
1. **2025-08-13-AddWebhookEventsTable.sql**
   - パス: `/docs/04-development/03-データベース/マイグレーション/`
   - 内容: WebhookEventsテーブル作成
   - 状態: 要確認

2. **2025-08-24-AddIdempotencyKeyToWebhookEvents.sql**
   - パス: `/docs/04-development/03-データベース/マイグレーション/`
   - 内容: WebhookEventsテーブルに冪等性キー追加
   - 状態: 未実行

### Phase 2: 課金システム
3. **2025-08-24-CreateBillingTables.sql**
   - パス: `/docs/04-development/03-データベース/マイグレーション/`
   - 内容: StoreSubscriptions, SubscriptionPlans, BillingHistory テーブル作成
   - 状態: 未実行

### Phase 3: 無料プラン機能制限
4. **2025-08-26-free-plan-feature-selection.sql**
   - パス: `/docs/04-development/03-データベース/マイグレーション/`
   - 内容: FeatureLimits, UserFeatureSelections, FeatureUsageLogs, FeatureSelectionChangeHistory テーブル作成
   - 状態: 未実行

### Phase 4: GDPR対応
5. **2025-08-24-AddGDPRTables.sql**
   - パス: `/docs/04-development/03-データベース/マイグレーション/`
   - 内容: GDPRRequests, GDPRDataExports, GDPRDeletionLogs テーブル作成
   - 状態: 未実行

## 2. 実行コマンド例

```sql
-- SQL Server Management Studio または Azure Portal から実行

-- 1. WebhookEventsテーブル（確認後、未実行なら実行）
-- ファイル: 2025-08-13-AddWebhookEventsTable.sql

-- 2. 冪等性キー追加
-- ファイル: 2025-08-24-AddIdempotencyKeyToWebhookEvents.sql

-- 3. 課金テーブル
-- ファイル: 2025-08-24-CreateBillingTables.sql

-- 4. 無料プラン機能制限テーブル
-- ファイル: 2025-08-26-free-plan-feature-selection.sql

-- 5. GDPRテーブル
-- ファイル: 2025-08-24-AddGDPRTables.sql
```

## 3. 実行後の確認事項

### テーブル存在確認
```sql
-- 以下のテーブルが存在することを確認
SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_NAME IN (
    'WebhookEvents',
    'StoreSubscriptions',
    'SubscriptionPlans',
    'BillingHistory',
    'FeatureLimits',
    'UserFeatureSelections',
    'FeatureUsageLogs',
    'FeatureSelectionChangeHistory',
    'GDPRRequests',
    'GDPRDataExports',
    'GDPRDeletionLogs'
)
ORDER BY TABLE_NAME;
```

## 4. トラブルシューティング

### エラーが発生した場合
1. **テーブルが既に存在する場合**
   - そのSQLファイルはスキップして次へ進む

2. **外部キー制約エラー**
   - 親テーブルが先に作成されているか確認
   - 実行順序を守っているか確認

3. **権限エラー**
   - データベースへの CREATE TABLE 権限があるか確認

## 5. 実行後の報告

実行完了後、以下のファイルを更新してください：
- `/docs/04-development/03-データベース/マイグレーション/database-migration-tracking.md`

各マイグレーションの実行日時と実行者を記録してください。

## 6. 注意事項

- **バックアップ**: 実行前にデータベースのバックアップを取得
- **環境**: まずDevelopment環境で実行し、問題ないことを確認
- **順序**: 上記の順番を必ず守ること（依存関係があるため）

## 7. 緊急連絡先

問題が発生した場合：
- Takashi（バックエンド担当）に連絡
- `to_takashi.md`にエラー内容を記載

---
以上のマイグレーションが完了すれば、無料プラン機能制限とGDPR対応の統合テストが可能になります。