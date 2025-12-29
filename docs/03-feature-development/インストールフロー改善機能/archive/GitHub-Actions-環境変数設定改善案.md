# GitHub Actions 環境変数設定改善案

## 作成日
2025-12-26

## 問題の要約

1. **デフォルト値の修正は正しい**: `https://localhost:7088`（開発環境でのみ使用）
2. **`develop_frontend.yml`の問題**: `vars.NEXT_PUBLIC_API_URL`を参照しているが、GitHub Environment Variablesに`https://localhost:7088`が設定されている
3. **`production_frontend.yml`との不統一**: 環境変数の設定方法が異なる

---

## 🔍 現在の状況

### GitHub Environment Variables（画像から確認）

- `NEXT_PUBLIC_API_URL`: `https://localhost:7088`（開発環境用の値）

**問題**: この値はローカル開発用であり、デプロイ時には適切なバックエンドURLが必要

### ワークフローの設定

#### `develop_frontend.yml`
```yaml
environment: ${{ github.event.inputs.environment }}  # development/staging/production
env:
  NEXT_PUBLIC_API_URL: ${{ vars.NEXT_PUBLIC_API_URL }}
```

**問題点**:
- 環境別（development/staging/production）にデプロイできるが、すべて同じ`vars.NEXT_PUBLIC_API_URL`を参照
- GitHub Environment Variablesの`NEXT_PUBLIC_API_URL`が`https://localhost:7088`に設定されているため、デプロイ時に不適切な値が使用される可能性がある

#### `production_frontend.yml`
```yaml
environment: ec-ranger-prod
env:
  NEXT_PUBLIC_API_URL: 'https://ec-ranger-backend-prod-ghf3bbarghcwh4gn.japanwest-01.azurewebsites.net'
```

**問題点**:
- 直接ハードコードされているため、`develop_frontend.yml`と設定方法が異なる

---

## ✅ 修正案

### 案1: GitHub Environment Variablesを環境別に設定（推奨）

**メリット**:
- ワークフローのコードを変更する必要がない
- 環境別に適切な値を設定できる
- 管理が簡単

**設定内容**:

#### `development`環境
- `NEXT_PUBLIC_API_URL`: `https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net`（開発環境のバックエンドURL）

#### `staging`環境
- `NEXT_PUBLIC_API_URL`: ステージング環境のバックエンドURL

#### `production`環境（`ec-ranger-prod`）
- `NEXT_PUBLIC_API_URL`: `https://ec-ranger-backend-prod-ghf3bbarghcwh4gn.japanwest-01.azurewebsites.net`（本番環境のバックエンドURL）

**注意**: GitHub Environment Variablesは環境ごとに設定できるため、各環境で異なる値を設定できます。

### 案2: `develop_frontend.yml`で環境別に明示的に設定

**メリット**:
- ワークフロー内で設定が明確になる
- GitHub Environment Variablesに依存しない

**修正内容**:
```yaml
env:
  NEXT_PUBLIC_ENVIRONMENT: ${{ steps.env.outputs.next_public_environment }}
  # 環境別に明示的に設定
  NEXT_PUBLIC_API_URL: ${{ 
    github.event.inputs.environment == 'production' && 'https://ec-ranger-backend-prod-ghf3bbarghcwh4gn.japanwest-01.azurewebsites.net' ||
    github.event.inputs.environment == 'staging' && 'https://staging-backend-url.azurewebsites.net' ||
    'https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net'
  }}
  # または、環境変数から取得（環境別に設定されていることを前提）
  # NEXT_PUBLIC_API_URL: ${{ vars.NEXT_PUBLIC_API_URL }}
```

**注意**: GitHub Actionsの式では三項演算子が使えないため、条件分岐が必要です。

### 案3: `production_frontend.yml`を`develop_frontend.yml`と統一

**メリット**:
- 設定方法が統一される
- 環境変数の管理が一元化される

**修正内容**:
```yaml
env:
  NEXT_PUBLIC_ENVIRONMENT: 'production'
  NEXT_PUBLIC_API_URL: ${{ vars.NEXT_PUBLIC_API_URL_PRODUCTION || 'https://ec-ranger-backend-prod-ghf3bbarghcwh4gn.japanwest-01.azurewebsites.net' }}
```

---

## 🎯 推奨される修正

### 最優先: GitHub Environment Variablesを環境別に設定

1. **GitHub Repository Settings** → **Environments** に移動
2. 各環境（`development`、`staging`、`production`）で`NEXT_PUBLIC_API_URL`を設定：
   - `development`: 開発環境のバックエンドURL
   - `staging`: ステージング環境のバックエンドURL
   - `production`: 本番環境のバックエンドURL

3. **現在の`NEXT_PUBLIC_API_URL`（`https://localhost:7088`）は削除または開発環境専用に変更**

### 補足: `develop_frontend.yml`の改善

環境変数が設定されていない場合のフォールバックを追加：

```yaml
env:
  NEXT_PUBLIC_API_URL: ${{ vars.NEXT_PUBLIC_API_URL || 'https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net' }}
```

---

## 📋 確認チェックリスト

### GitHub Environment Variablesの設定確認

- [ ] `development`環境の`NEXT_PUBLIC_API_URL`が開発環境のバックエンドURLに設定されている
- [ ] `staging`環境の`NEXT_PUBLIC_API_URL`がステージング環境のバックエンドURLに設定されている
- [ ] `production`環境（`ec-ranger-prod`）の`NEXT_PUBLIC_API_URL`が本番環境のバックエンドURLに設定されている
- [ ] グローバルな`NEXT_PUBLIC_API_URL`（`https://localhost:7088`）が削除されている、または開発環境専用に変更されている

### ワークフローの確認

- [ ] `develop_frontend.yml`が環境別の`vars.NEXT_PUBLIC_API_URL`を正しく参照している
- [ ] `production_frontend.yml`の`NEXT_PUBLIC_API_URL`が正しい値に設定されている
- [ ] 両方のワークフローで環境変数の設定方法が一貫している

---

## 🔗 関連ドキュメント

- [GitHub-Actions-環境変数設定チェック.md](./GitHub-Actions-環境変数設定チェック.md)
- [Phase1-テスト手順.md](./Phase1-テスト手順.md)

---

## 📝 更新履歴

- 2025-12-26: 初版作成
