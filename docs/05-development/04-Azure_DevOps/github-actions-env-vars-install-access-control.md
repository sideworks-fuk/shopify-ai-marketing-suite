# GitHub Actions環境変数設定: /install ページ アクセス制御

**作成日**: 2026-01-02
**対象**: フロントエンドデプロイワークフロー

---

## 概要

`/install` ページのアクセス制御機能で使用する環境変数をGitHub Actionsワークフローに追加しました。

## 追加した環境変数

| 環境変数名 | 説明 | 設定場所 |
|-----------|------|----------|
| `NEXT_PUBLIC_SHOPIFY_APP_STORE_URL` | Shopify App Store URL | ワークフローファイル（直接記述） |
| `NEXT_PUBLIC_SHOPIFY_APP_TYPE` | アプリタイプ（Public/Custom） | ワークフローファイル（直接記述） |

---

## 環境別の設定値

### Production1: EC Ranger（公開アプリ）

| 環境変数名 | 値 |
|-----------|-----|
| `NEXT_PUBLIC_SHOPIFY_APP_STORE_URL` | `https://apps.shopify.com/ec-ranger`（実際のApp Store URL） |
| `NEXT_PUBLIC_SHOPIFY_APP_TYPE` | `Public` |

**設定場所**: `.github/workflows/production_frontend.yml` - Production1デプロイステップ

### Production2: EC Ranger-xn-fbkq6e5da0fpb（カスタムアプリ）

| 環境変数名 | 値 |
|-----------|-----|
| `NEXT_PUBLIC_SHOPIFY_APP_STORE_URL` | `''`（空文字） |
| `NEXT_PUBLIC_SHOPIFY_APP_TYPE` | `Custom` |

**設定場所**: `.github/workflows/production_frontend.yml` - Production2デプロイステップ

### Production3: EC Ranger-demo（カスタムアプリ）

| 環境変数名 | 値 |
|-----------|-----|
| `NEXT_PUBLIC_SHOPIFY_APP_STORE_URL` | `''`（空文字） |
| `NEXT_PUBLIC_SHOPIFY_APP_TYPE` | `Custom` |

**設定場所**: `.github/workflows/production_frontend.yml` - Production3デプロイステップ

### 開発環境（development/staging）

| 環境変数名 | 値 |
|-----------|-----|
| `NEXT_PUBLIC_SHOPIFY_APP_STORE_URL` | `''`（空文字、GitHub Environment Variablesから取得、未設定時は空文字） |
| `NEXT_PUBLIC_SHOPIFY_APP_TYPE` | `Public`（GitHub Environment Variablesから取得、未設定時は`Public`） |

**設定場所**: `.github/workflows/develop_frontend.yml` - デプロイステップ

---

## 実装方法

### ✅ 実装完了: ワークフローファイルに直接記述

環境ごとに値が異なるため、ワークフローファイルに直接記述する方法を採用しました。

#### production_frontend.yml の実装

**Production1（公開アプリ）**:
```yaml
env:
  # 既存の環境変数...
  # /install ページ アクセス制御用（Production1: 公開アプリ）
  NEXT_PUBLIC_SHOPIFY_APP_STORE_URL: 'https://apps.shopify.com/ec-ranger'
  NEXT_PUBLIC_SHOPIFY_APP_TYPE: 'Public'
```

**Production2（カスタムアプリ）**:
```yaml
env:
  # 既存の環境変数...
  # /install ページ アクセス制御用（Production2: カスタムアプリ）
  NEXT_PUBLIC_SHOPIFY_APP_STORE_URL: ''
  NEXT_PUBLIC_SHOPIFY_APP_TYPE: 'Custom'
```

**Production3（カスタムアプリ）**:
```yaml
env:
  # 既存の環境変数...
  # /install ページ アクセス制御用（Production3: カスタムアプリ）
  NEXT_PUBLIC_SHOPIFY_APP_STORE_URL: ''
  NEXT_PUBLIC_SHOPIFY_APP_TYPE: 'Custom'
```

#### develop_frontend.yml の実装

GitHub Environment Variablesから取得（未設定時はフォールバック値を使用）：

```yaml
env:
  # 既存の環境変数...
  # /install ページ アクセス制御用（開発環境: 空文字でOK、開発環境では直接アクセスが許可されるため）
  NEXT_PUBLIC_SHOPIFY_APP_STORE_URL: ${{ vars.NEXT_PUBLIC_SHOPIFY_APP_STORE_URL || '' }}
  NEXT_PUBLIC_SHOPIFY_APP_TYPE: ${{ vars.NEXT_PUBLIC_SHOPIFY_APP_TYPE || 'Public' }}
```

---

## GitHub Environment Variables への設定（オプション）

開発環境でカスタマイズしたい場合は、GitHub Environment Variables に設定することも可能です。

### 設定手順

1. **GitHub リポジトリにアクセス**
   - Settings → Environments → 各環境（`development`, `staging`）を選択

2. **Variables タブで以下を追加**（任意）:

| 環境 | Variable名 | 値 | 備考 |
|------|-----------|-----|------|
| development | `NEXT_PUBLIC_SHOPIFY_APP_STORE_URL` | （空文字） | 未設定時は空文字 |
| development | `NEXT_PUBLIC_SHOPIFY_APP_TYPE` | `Public` | 未設定時は`Public` |
| staging | `NEXT_PUBLIC_SHOPIFY_APP_STORE_URL` | （空文字） | 未設定時は空文字 |
| staging | `NEXT_PUBLIC_SHOPIFY_APP_TYPE` | `Public` | 未設定時は`Public` |

**注意**: ワークフローファイルに直接記述した値が最優先されるため、GitHub Environment Variables はフォールバックとして機能します。

---

## 注意事項

1. **App Store URLの設定**
   - Production1のみ実際のApp Store URLを設定（`https://apps.shopify.com/ec-ranger`）
   - Production2/3はカスタムアプリのため空文字でOK
   - 開発環境も空文字でOK（開発環境では直接アクセスが許可されるため）

2. **アプリタイプの設定**
   - Production1: `Public`（公開アプリ）
   - Production2/3: `Custom`（カスタムアプリ）
   - 開発環境: `Public`（デフォルト）

3. **環境変数の優先順位**
   - ワークフローファイルの `env` セクションで設定した値が最優先
   - GitHub Environment Variables はフォールバックとして使用可能（develop_frontend.ymlのみ）

4. **App Store URLの更新**
   - アプリがApp Storeに公開されたら、Production1の `NEXT_PUBLIC_SHOPIFY_APP_STORE_URL` を実際のURLに更新する必要があります
   - 現在は `https://apps.shopify.com/ec-ranger` を設定していますが、実際のURLに置き換えてください

---

## 実装状況

- ✅ `production_frontend.yml` - Production1/2/3の環境変数を追加済み
- ✅ `develop_frontend.yml` - 開発環境の環境変数を追加済み（GitHub Environment Variablesから取得）

---

## 参考資料

- 実装仕様書: `docs/08-shopify/01-申請関連/仕様書-直接アクセス制御-v2.0.md`
- 作業ログ: `docs/worklog/2026/01/2026-01-02-install-page-access-control-implementation.md`
- GitHub Secrets命名規則: `docs/05-development/04-Azure_DevOps/github-secrets-naming-convention.md`

---

**更新日**: 2026-01-02
**実装状況**: ✅ 完了
