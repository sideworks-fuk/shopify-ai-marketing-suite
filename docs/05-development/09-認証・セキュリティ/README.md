# 🔐 認証・セキュリティ

## 概要

このフォルダには、Shopify AI Marketing Suiteの認証フロー、セキュリティ設定、環境変数管理に関するドキュメントが含まれています。

---

## 📁 ドキュメント一覧

### 🔑 認証関連

| ドキュメント | 説明 | 重要度 |
|------------|------|--------|
| [認証モード一覧.md](./認証モード一覧.md) | 3つの認証モード（本番・検証・開発者ツール）の詳細 | ⭐⭐⭐ |
| [認証画面表示仕様.md](./認証画面表示仕様.md) | 環境別の認証画面表示制御ロジック | ⭐⭐⭐ |
| [Shopify-shopパラメータ仕様.md](./Shopify-shopパラメータ仕様.md) | マルチテナント対応のshopパラメータ取り扱い | ⭐⭐⭐ |
| [Shopify-アプリ認証・認可設計.md](./Shopify-アプリ認証・認可設計.md) | Shopify公式ドキュメントの調査結果と実装要件 | ⭐⭐⭐ |

### ⚙️ 環境設定

| ドキュメント | 説明 | 重要度 |
|------------|------|--------|
| [環境変数チェックリスト.md](./環境変数チェックリスト.md) | 環境別の環境変数設定ガイド | ⭐⭐⭐ |

---

## 🎯 認証モード概要

### 1. 本番環境（Shopify OAuth認証）
- **対象**: 本番ユーザー
- **認証方法**: Shopify OAuth 2.0
- **用途**: 本番運用
- **セキュリティ**: 最高レベル

### 2. 検証環境（Shopify OAuth認証）
- **対象**: 検証担当者
- **認証方法**: Shopify OAuth 2.0
- **用途**: OAuth認証フローのテスト
- **セキュリティ**: 本番と同等

### 3. 開発者ツール（パスワード認証）
- **対象**: 開発者
- **認証方法**: パスワード（フロントエンド）
- **用途**: データ確認・デバッグ
- **セキュリティ**: 開発環境のみ有効

---

## 🔧 環境変数の重要性

### フロントエンド（Next.js）

```bash
# 環境判定
NEXT_PUBLIC_ENVIRONMENT=development|staging|production

# API接続
NEXT_PUBLIC_API_URL=https://...

# 開発者ツール
NEXT_PUBLIC_DEV_PASSWORD=dev2025
```

### バックエンド（.NET）

```bash
# 実行環境
ASPNETCORE_ENVIRONMENT=Development|Staging|Production

# Shopify認証
Shopify__ApiKey=...
Shopify__ApiSecret=...

# JWT認証
Jwt__SecretKey=...
```

---

## 🚀 クイックスタート

### 認証フローを理解する
1. [認証モード一覧.md](./認証モード一覧.md) を読む
2. [認証画面表示仕様.md](./認証画面表示仕様.md) で環境別の動作を確認
3. [Shopify-shopパラメータ仕様.md](./Shopify-shopパラメータ仕様.md) でマルチテナント対応を理解

### 環境変数を設定する
1. [環境変数チェックリスト.md](./環境変数チェックリスト.md) を確認
2. GitHub Actionsのシークレットを設定
3. Azure Static Web Appsの環境変数を設定
4. ビルド・デプロイを実行

---

## 🔒 セキュリティベストプラクティス

### 本番環境
- ✅ Shopify OAuth認証のみ有効化
- ✅ 開発者ツールを無効化（`NEXT_PUBLIC_ENVIRONMENT=production`）
- ✅ HTTPS必須
- ✅ JWT署名キーを強固に設定
- ✅ CORS設定を厳格化

### 開発環境
- ⚠️ 開発者ツールのパスワードを環境変数で管理
- ⚠️ 開発環境のURLを外部に公開しない
- ⚠️ テストデータのみを使用
- ⚠️ 本番データへのアクセスを制限

---

## 📊 環境別の認証フロー

### 本番環境
```
ユーザー → Shopify管理画面 → OAuth認証 → JWT発行 → ダッシュボード
```

### 検証環境
```
開発者 → 認証画面 → Shopify OAuth認証 → JWT発行 → ダッシュボード
         ↓
         デモサイトを開く → パスワード入力 → 開発者ツール
```

### ローカル開発
```
開発者 → 認証画面 → Shopify OAuth認証 → JWT発行 → ダッシュボード
         ↓
         /dev-bookmarks → パスワード入力 → 開発者ツール
```

---

## 🐛 トラブルシューティング

### 問題1: 認証画面が表示されない
**確認項目:**
- [ ] `NEXT_PUBLIC_ENVIRONMENT` が正しく設定されているか
- [ ] ブラウザのキャッシュをクリアしたか
- [ ] JWT トークンが有効か

### 問題2: デモサイトリンクが表示されない
**確認項目:**
- [ ] `NEXT_PUBLIC_ENVIRONMENT` が `staging` または `development` か
- [ ] ビルド時に環境変数が渡されているか
- [ ] GitHub Actionsのログを確認

### 問題3: shopパラメータエラー
**確認項目:**
- [ ] URLに `?shop=xxx.myshopify.com` が含まれているか
- [ ] shopドメインが `.myshopify.com` で終わっているか
- [ ] データベースにストア情報が登録されているか

---

## 📚 関連ドキュメント

### 設計仕様
- [Shopify アプリ認証・認可設計](../../06-shopify/06-技術ガイド/Shopify のアプリ認証・認可設計.md)
- [グローバル認証ガード](../../03-design-specs/01-frontend/global-authentication-guard.md)
- [開発者ツール仕様](../../03-design-specs/01-frontend/dev-tools-authentication.md)
- [OAuth・マルチテナント](../../03-design-specs/05-integration/oauth-multitenancy.md)

### 実装ファイル
- **フロントエンド**:
  - `frontend/src/components/auth/AuthGuard.tsx`
  - `frontend/src/components/errors/AuthenticationRequired.tsx`
  - `frontend/src/app/dev-bookmarks/page.tsx`
- **バックエンド**:
  - `backend/ShopifyAnalyticsApi/Middleware/DemoModeMiddleware.cs`
  - `backend/ShopifyAnalyticsApi/Controllers/ShopifyController.cs`

---

## 📝 更新履歴

| 日付 | 内容 | 担当者 |
|------|------|--------|
| 2025-10-25 | 初版作成（認証・セキュリティフォルダ新設） | Kenji |
| 2025-10-25 | 4つのドキュメントを日本語ファイル名で整理 | Kenji |

---

**最終更新**: 2025年10月25日 19:00
**次回レビュー**: 2025年11月1日（週次）


