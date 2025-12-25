# GitHub Actions 環境変数設定チェック

## 作成日
2025-12-26

## 概要

GitHub Actionsワークフローの環境変数設定を確認し、`develop_frontend.yml`と`production_frontend.yml`の一貫性をチェックします。

---

## 📋 調査結果

### 1. 現在の設定状況

#### `develop_frontend.yml`
```yaml
env:
  NEXT_PUBLIC_API_URL: ${{ vars.NEXT_PUBLIC_API_URL }}
```

**設定方法**: GitHub Environment Variables（`vars`）から取得

#### `production_frontend.yml`
```yaml
env:
  NEXT_PUBLIC_API_URL: 'https://ec-ranger-backend-prod-ghf3bbarghcwh4gn.japanwest-01.azurewebsites.net'
```

**設定方法**: 直接ハードコード

---

## ⚠️ 問題点

### 問題1: 環境変数の参照方法が不統一

- **`develop_frontend.yml`**: `vars.NEXT_PUBLIC_API_URL`を参照
- **`production_frontend.yml`**: 直接ハードコード

**影響**:
- 環境変数の管理方法が統一されていない
- バックエンドURLを変更する場合、複数箇所を修正する必要がある

### 問題2: GitHub Environment Variablesの値が開発環境用

画像のGitHub Environment Variables画面を見ると：
- `NEXT_PUBLIC_API_URL`: `https://localhost:7088`

**問題**:
- この値は開発環境用（ローカル開発）の値
- デプロイ時には適切なバックエンドURLが設定されている必要がある
- `develop_frontend.yml`が`vars.NEXT_PUBLIC_API_URL`を参照している場合、デプロイ時に開発環境用の値が使用される可能性がある

### 問題3: デフォルト値の修正

**修正前**: `https://localhost:7089`  
**修正後**: `https://localhost:7088`

**確認事項**:
- デフォルト値は開発環境でのみ使用される（`process.env.NODE_ENV === 'development'`の場合のみ）
- デプロイ時には環境変数が設定されているため、デフォルト値は使用されない
- ただし、デフォルト値の修正は正しい（バックエンドの実際のポート番号に合わせる）

---

## 🔍 詳細な確認

### `frontend/src/lib/config/environments.ts`の動作

```typescript
export const getApiBaseUrl = (): string => {
  // 環境変数の優先順位
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL; // legacy
  
  if (apiUrl) {
    return apiUrl;  // ← デプロイ時はここが使用される
  }
  
  if (backendUrl) {
    return backendUrl;  // ← フォールバック
  }
  
  // デフォルト値（開発環境でのみ使用）
  if (process.env.NODE_ENV === 'development') {
    return 'https://localhost:7088';  // ← ローカル開発時のみ
  }
  
  // 本番環境では必須
  throw new Error('NEXT_PUBLIC_API_URL must be set in production environment');
};
```

**動作確認**:
- ✅ デプロイ時: `NEXT_PUBLIC_API_URL`が設定されているため、デフォルト値は使用されない
- ✅ ローカル開発時: 環境変数が設定されていない場合、デフォルト値（`https://localhost:7088`）が使用される

---

## ✅ 推奨される修正

### オプション1: `develop_frontend.yml`を`production_frontend.yml`と統一（推奨）

**理由**:
- 環境ごとに適切なバックエンドURLを明示的に設定できる
- 環境変数の管理が明確になる

**修正内容**:
```yaml
env:
  NEXT_PUBLIC_API_URL: ${{ vars.NEXT_PUBLIC_API_URL_DEVELOPMENT }}  # 開発環境用
  # または
  NEXT_PUBLIC_API_URL: 'https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net'  # 開発環境のバックエンドURL
```

### オプション2: GitHub Environment Variablesを環境別に設定

**理由**:
- 環境ごとに異なる値を設定できる
- ワークフローのコードを変更する必要がない

**設定内容**:
- `development`環境: `NEXT_PUBLIC_API_URL` = 開発環境のバックエンドURL
- `staging`環境: `NEXT_PUBLIC_API_URL` = ステージング環境のバックエンドURL
- `production`環境: `NEXT_PUBLIC_API_URL` = 本番環境のバックエンドURL

---

## 📝 確認すべき項目

### GitHub Environment Variablesの設定確認

以下の環境ごとに`NEXT_PUBLIC_API_URL`が正しく設定されているか確認：

1. **`development`環境**:
   - 期待値: 開発環境のバックエンドURL（例: `https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net`）
   - 現在の値: `https://localhost:7088`（開発環境用の値）

2. **`staging`環境**:
   - 期待値: ステージング環境のバックエンドURL
   - 確認: 設定されているか

3. **`production`環境**:
   - 期待値: 本番環境のバックエンドURL（`production_frontend.yml`でハードコードされている値と一致）
   - 確認: 設定されているか

---

## 🔧 修正案

### `develop_frontend.yml`の修正

```yaml
env:
  NEXT_PUBLIC_ENVIRONMENT: ${{ steps.env.outputs.next_public_environment }}
  # 環境変数から取得（環境別に設定されていることを前提）
  NEXT_PUBLIC_API_URL: ${{ vars.NEXT_PUBLIC_API_URL }}
  # または、環境別に明示的に設定
  # NEXT_PUBLIC_API_URL: ${{ vars.NEXT_PUBLIC_API_URL_DEVELOPMENT }}
  NEXT_PUBLIC_SHOPIFY_API_KEY: ${{ vars.NEXT_PUBLIC_SHOPIFY_API_KEY }}
  NEXT_PUBLIC_SHOPIFY_APP_URL: ${{ vars.NEXT_PUBLIC_SHOPIFY_APP_URL }}
  NEXT_PUBLIC_USE_HTTPS: ${{ vars.NEXT_PUBLIC_USE_HTTPS }}
  NEXT_PUBLIC_DISABLE_FEATURE_GATES: ${{ vars.NEXT_PUBLIC_DISABLE_FEATURE_GATES }}
  NEXT_PUBLIC_DEV_PASSWORD: ${{ secrets.NEXT_PUBLIC_DEV_PASSWORD }}
  NODE_VERSION: 20
```

**注意**: `vars.NEXT_PUBLIC_API_URL`が環境別に正しく設定されていることを確認する必要があります。

### `production_frontend.yml`の修正（オプション）

環境変数から取得するように変更：

```yaml
env:
  NEXT_PUBLIC_ENVIRONMENT: 'production'
  NEXT_PUBLIC_API_URL: ${{ vars.NEXT_PUBLIC_API_URL_PRODUCTION || 'https://ec-ranger-backend-prod-ghf3bbarghcwh4gn.japanwest-01.azurewebsites.net' }}
  # または、直接ハードコードを維持（現状のまま）
```

---

## 📊 比較表

| 項目 | `develop_frontend.yml` | `production_frontend.yml` | 推奨 |
|------|------------------------|---------------------------|------|
| `NEXT_PUBLIC_API_URL`の設定方法 | `vars.NEXT_PUBLIC_API_URL` | 直接ハードコード | 統一する |
| `NEXT_PUBLIC_SHOPIFY_API_KEY` | `vars.NEXT_PUBLIC_SHOPIFY_API_KEY` | `env.PROD1_SHOPIFY_API_KEY` / `env.PROD2_SHOPIFY_API_KEY` | 統一する |
| `NEXT_PUBLIC_USE_HTTPS` | `vars.NEXT_PUBLIC_USE_HTTPS` | `'true'`（ハードコード） | 統一する |
| `NEXT_PUBLIC_DISABLE_FEATURE_GATES` | `vars.NEXT_PUBLIC_DISABLE_FEATURE_GATES` | `'false'`（ハードコード） | 統一する |

---

## ✅ 結論

### デフォルト値の修正について

**修正は正しい**:
- デフォルト値（`https://localhost:7088`）は開発環境でのみ使用される
- デプロイ時には環境変数が設定されているため、デフォルト値は使用されない
- バックエンドの実際のポート番号（7088）に合わせる必要がある

### ワークフローの改善点

1. **`develop_frontend.yml`の確認**:
   - GitHub Environment Variablesの`NEXT_PUBLIC_API_URL`が環境別に正しく設定されているか確認
   - 現在の値（`https://localhost:7088`）は開発環境用なので、デプロイ時には適切な値が設定されている必要がある

2. **一貫性の向上**:
   - `production_frontend.yml`と`develop_frontend.yml`で環境変数の設定方法を統一することを推奨
   - または、環境別に適切な値が設定されていることを確認

---

## 🔗 関連ドキュメント

- [Phase1-テスト手順.md](./Phase1-テスト手順.md)
- [現状設計の問題点と修正方針.md](./現状設計の問題点と修正方針.md)

---

## 📝 更新履歴

- 2025-12-26: 初版作成
