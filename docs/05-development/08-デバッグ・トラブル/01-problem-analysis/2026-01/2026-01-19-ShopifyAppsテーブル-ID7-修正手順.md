# ShopifyAppsテーブル ID 7 修正手順

## 📋 問題概要

**発生日時**: 2026年1月19日  
**環境**: 本番環境（Production）  
**対象**: `ShopifyApps`テーブル ID 7（EC Ranger - Publicアプリ）

### 問題点

1. **`ApiSecret`が設定されていない**
   - 現在の値: `[GitHub Secrets: SHOPIFY_API_SECRET_PRODUCTION ????]`
   - 実際のClient secretが設定されていない

2. **`RedirectUri`が間違っている**
   - 現在の値: `https://ec-ranger.access-net.co.jp/auth/callback`
   - 正しい値: `https://ec-ranger.access-net.co.jp/api/shopify/callback`

---

## ✅ 修正手順

### ステップ1: Shopify Partners管理画面でClient secretを確認

1. **Shopify Partners管理画面を開く**
   ```
   https://partners.shopify.com
   ```

2. **Apps → EC Ranger → App setup → Client credentials**
   - Client ID: `b95377afd35e5c8f4b28d286d3ff3491`（確認済み）
   - Client secret: 「表示」をクリックして確認
   - **重要**: Client secretをコピー（後で使用）

---

### ステップ2: データベースを更新

#### 2.1 現在の状態を確認

```sql
-- ID 7の現在の状態を確認
SELECT 
    Id,
    Name,
    ApiKey,
    ApiSecret,
    AppUrl,
    RedirectUri,
    IsActive,
    UpdatedAt
FROM ShopifyApps
WHERE Id = 7
```

#### 2.2 ApiSecretとRedirectUriを更新

```sql
-- ID 7のApiSecretとRedirectUriを更新
UPDATE ShopifyApps
SET 
    ApiSecret = '実際のClient secretをここに設定',  -- ステップ1で取得したClient secret
    RedirectUri = 'https://ec-ranger.access-net.co.jp/api/shopify/callback',
    UpdatedAt = SYSUTCDATETIME()
WHERE Id = 7
AND ApiKey = 'b95377afd35e5c8f4b28d286d3ff3491'
```

**注意**: 
- `ApiSecret`は実際のClient secretに置き換える
- `RedirectUri`は `/auth/callback` から `/api/shopify/callback` に変更

#### 2.3 更新結果を確認

```sql
-- 更新後の状態を確認
SELECT 
    Id,
    Name,
    ApiKey,
    ApiSecret,
    AppUrl,
    RedirectUri,
    IsActive,
    UpdatedAt
FROM ShopifyApps
WHERE Id = 7
```

**確認ポイント**:
- `ApiSecret`が正しく設定されているか（プレビューで確認）
- `RedirectUri`が `https://ec-ranger.access-net.co.jp/api/shopify/callback` になっているか
- `UpdatedAt`が更新されているか

---

### ステップ3: インストールを再試行

1. **ブラウザのキャッシュをクリア**
   - 開発者ツール → Application → Clear storage

2. **`/install` ページにアクセス**
   - ストアドメインを入力
   - 「接続を開始」ボタンをクリック

3. **OAuth認証を完了**
   - Shopify OAuth認証画面で承認

4. **結果を確認**
   - HMAC検証が成功するか確認
   - インストールが完了するか確認

---

## 🔍 トラブルシューティング

### ApiSecretが更新されても失敗する場合

1. **Client secretが正しいか確認**
   - Shopify Partners管理画面で再確認
   - コピー&ペースト時のエラーがないか確認

2. **データベースの更新が反映されているか確認**
   ```sql
   SELECT ApiSecret, RedirectUri
   FROM ShopifyApps
   WHERE Id = 7
   ```

3. **アプリケーションを再起動**
   - Azure Portal → App Service → 概要 → 「再起動」
   - キャッシュがクリアされる

---

### RedirectUriが更新されても失敗する場合

1. **Shopifyアプリ設定を確認**
   - Apps → EC Ranger → App setup → URLs
   - Allowed redirection URL(s) に `https://ec-ranger.access-net.co.jp/api/shopify/callback` が登録されているか確認

2. **データベースの更新が反映されているか確認**
   ```sql
   SELECT RedirectUri
   FROM ShopifyApps
   WHERE Id = 7
   ```

---

## 📝 更新前後の比較

### 更新前

| 項目 | 値 |
|------|-----|
| Id | 7 |
| Name | EC Ranger |
| ApiKey | b95377afd35e5c8f4b28d286d3ff3491 |
| ApiSecret | [GitHub Secrets: SHOPIFY_API_SECRET_PRODUCTION ????] |
| AppUrl | https://ec-ranger.access-net.co.jp |
| RedirectUri | https://ec-ranger.access-net.co.jp/auth/callback |
| IsActive | True |

### 更新後（期待値）

| 項目 | 値 |
|------|-----|
| Id | 7 |
| Name | EC Ranger |
| ApiKey | b95377afd35e5c8f4b28d286d3ff3491 |
| ApiSecret | [実際のClient secret] |
| AppUrl | https://ec-ranger.access-net.co.jp |
| RedirectUri | https://ec-ranger.access-net.co.jp/api/shopify/callback |
| IsActive | True |

---

## ⚠️ 注意事項

### セキュリティ

- **ApiSecretは機密情報**: データベースに保存する際は暗号化を検討
- **ログに出力しない**: ApiSecretがログに出力されないよう注意
- **GitHub Secretsとの整合性**: GitHub Secretsの`SHOPIFY_API_SECRET_PRODUCTION`と一致しているか確認

### データベース更新

- **トランザクション使用**: 本番環境ではトランザクションを使用して更新
- **バックアップ**: 更新前にバックアップを取得
- **確認**: 更新後は必ず確認クエリを実行

---

## 📚 関連ドキュメント

- [HMAC検証失敗-原因と対応](./2026-01-19-HMAC検証失敗-原因と対応.md)
- [インストール時認証エラー調査](./2026-01-19-インストール時認証エラー調査.md)

---

**最終更新**: 2026年1月19日  
**作成者**: 福田  
**修正者**: AI Assistant
