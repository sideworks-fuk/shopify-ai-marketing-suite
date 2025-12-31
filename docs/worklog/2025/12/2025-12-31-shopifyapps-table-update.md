# 作業ログ: ShopifyAppsテーブル 本番環境3環境登録

## 作業情報
- 開始日時: 2025-12-31 17:20:00
- 完了日時: 2025-12-31 17:25:00
- 所要時間: 5分
- 担当: 福田＋AI Assistant

## 作業概要
本番環境フロントエンド3環境のShopify Client IDをShopifyAppsテーブルに登録するためのSQLスクリプトを作成し、関連ドキュメントを更新しました。

## 実施内容

### 1. SQLスクリプトの作成
- `docs/05-development/03-データベース/マイグレーション/2025-12-31-UpdateShopifyAppsProductionEnvironments.sql`
  - 3環境のClient IDを登録・更新（UPSERT処理）
  - Production1: EC Ranger-xn-fbkq6e5da0fpb (Custom) - 706a757915dedce54806c0a179bee05d
  - Production2: EC Ranger-demo (Custom) - 23f81e22074df1b71fb0a5a495778f49
  - Production3: EC Ranger (Public) - b95377afd35e5c8f4b28d286d3ff3491
  - 既存レコードがあれば更新、なければ新規登録
  - ApiSecretは手動更新が必要（GitHub Secretsから取得）

### 2. マイグレーション管理ドキュメントの更新
- `docs/05-development/03-データベース/マイグレーション/database-migration-tracking.md`
  - 新しいスクリプトを一覧に追加
  - 詳細説明セクションに追加
  - 適用状況: 未適用（実行待ち）

### 3. 本番環境構成サマリーの更新
- `docs/05-development/04-Azure_DevOps/production-environment-summary.md`
  - 各環境のShopify API Keyを実際のClient IDに更新
  - GitHub Secrets設定に各環境のClient IDを記載
  - ShopifyAppsテーブル登録セクションを追加

## 成果物

### 新規作成ファイル
- `docs/05-development/03-データベース/マイグレーション/2025-12-31-UpdateShopifyAppsProductionEnvironments.sql`
  - 3環境のClient ID登録・更新スクリプト

### 更新ファイル
- `docs/05-development/03-データベース/マイグレーション/database-migration-tracking.md`
  - マイグレーション一覧に追加
  - 詳細説明セクションに追加

- `docs/05-development/04-Azure_DevOps/production-environment-summary.md`
  - Shopify API Key情報を更新
  - ShopifyAppsテーブル登録セクションを追加

## 登録内容

| 環境 | アプリ名 | Client ID | AppType | AppUrl |
|------|---------|-----------|---------|--------|
| Production1 | EC Ranger-xn-fbkq6e5da0fpb | 706a757915dedce54806c0a179bee05d | Custom | https://black-flower-004e1de00.2.azurestaticapps.net |
| Production2 | EC Ranger-demo | 23f81e22074df1b71fb0a5a495778f49 | Custom | https://ashy-plant-01b5c4100.1.azurestaticapps.net |
| Production3 | EC Ranger | b95377afd35e5c8f4b28d286d3ff3491 | Public | https://ec-ranger.access-net.co.jp |

## 次のステップ

### 1. SQLスクリプトの実行
1. **本番環境データベースに接続**
2. **スクリプトを実行**
   - `2025-12-31-UpdateShopifyAppsProductionEnvironments.sql`
3. **ApiSecretを手動更新**
   - Production1: GitHub Secrets の `SHOPIFY_API_SECRET_PRODUCTION`
   - Production2: GitHub Secrets の `SHOPIFY_API_SECRET_PRODUCTION_2`
   - Production3: GitHub Secrets の `SHOPIFY_API_SECRET_PRODUCTION_3`

### 2. 確認クエリ
```sql
SELECT 
    Id,
    Name,
    DisplayName,
    AppType,
    ApiKey,
    AppUrl,
    RedirectUri,
    IsActive,
    CreatedAt,
    UpdatedAt
FROM ShopifyApps
WHERE ApiKey IN (
    '706a757915dedce54806c0a179bee05d',
    '23f81e22074df1b71fb0a5a495778f49',
    'b95377afd35e5c8f4b28d286d3ff3491'
)
ORDER BY 
    CASE AppType
        WHEN 'Public' THEN 1
        WHEN 'Custom' THEN 2
        ELSE 3
    END,
    Name;
```

### 3. マイグレーション管理ドキュメントの更新
- SQLスクリプト実行後、`database-migration-tracking.md` の適用状況を更新

## 課題・注意点

### 重要事項
- **ApiSecretは手動で更新が必要**: SQLスクリプトではプレースホルダーを使用しているため、実行後にGitHub Secretsから取得した実際の値を設定する必要があります
- **セキュリティ**: ApiSecretは平文で保存されるため、データベースへのアクセス制御が重要です

### トラブルシューティング
- スクリプト実行時にエラーが発生する場合: ShopifyAppsテーブルが存在するか確認
- ApiSecretが設定されていない場合: 認証が失敗するため、必ず設定してください

## 関連ファイル
- `docs/05-development/03-データベース/マイグレーション/2025-12-31-UpdateShopifyAppsProductionEnvironments.sql`
- `docs/05-development/03-データベース/マイグレーション/database-migration-tracking.md`
- `docs/05-development/04-Azure_DevOps/production-environment-summary.md`

---

作成者: 福田＋AI Assistant
作成日: 2025-12-31
