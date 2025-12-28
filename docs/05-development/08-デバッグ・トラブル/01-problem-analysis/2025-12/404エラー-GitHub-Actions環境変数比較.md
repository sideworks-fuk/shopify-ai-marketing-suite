# 404エラー - GitHub Actions環境変数比較

## 作成日
2025-12-27

## 目的
環境変数名の確認・統一について、GitHub Actionsのワークフローファイルを比較し、違いを特定する。

---

## 比較対象

### develop_frontend.yml（NG環境）
- **対象環境**: Development / Staging / Production（develop環境）
- **フロントエンドURL**: `https://brave-sea-038f17a00-development.eastasia.1.azurestaticapps.net`

### production_frontend.yml（OK環境）
- **対象環境**: Production（本番環境）
- **フロントエンドURL**: 
  - Production1: `https://white-island-08e0a6300.2.azurestaticapps.net`
  - Production2: `https://black-flower-004e1de00.2.azurestaticapps.net`（OK環境）

---

## 環境変数設定方法の比較

### NEXT_PUBLIC_SHOPIFY_API_KEYの設定

#### develop_frontend.yml（NG環境）

```yaml
env:
  NEXT_PUBLIC_SHOPIFY_API_KEY: ${{ vars.NEXT_PUBLIC_SHOPIFY_API_KEY }}
```

**設定方法**:
- GitHub Environment Variablesの`vars.NEXT_PUBLIC_SHOPIFY_API_KEY`を直接参照
- 環境別（development/staging/production）のGitHub Environment Variablesから取得

**参照元**:
- `vars.NEXT_PUBLIC_SHOPIFY_API_KEY`（GitHub Environment Variables）

---

#### production_frontend.yml（OK環境）

```yaml
env:
  # トップレベルで定義
  PROD1_SHOPIFY_API_KEY: ${{ secrets.SHOPIFY_API_KEY_PRODUCTION || vars.SHOPIFY_API_KEY_PRODUCTION }}
  PROD2_SHOPIFY_API_KEY: ${{ secrets.SHOPIFY_API_KEY_PRODUCTION_2 || vars.SHOPIFY_API_KEY_PRODUCTION_2 }}

# デプロイステップ内
env:
  # Production1
  NEXT_PUBLIC_SHOPIFY_API_KEY: '${{ env.PROD1_SHOPIFY_API_KEY }}'
  
  # Production2（OK環境）
  NEXT_PUBLIC_SHOPIFY_API_KEY: '${{ env.PROD2_SHOPIFY_API_KEY }}'
```

**設定方法**:
- トップレベルの`env`で`PROD1_SHOPIFY_API_KEY`と`PROD2_SHOPIFY_API_KEY`を定義
- `secrets`を優先し、なければ`vars`を参照（フォールバック）
- デプロイステップ内で`NEXT_PUBLIC_SHOPIFY_API_KEY`に設定

**参照元**:
- Production1: `secrets.SHOPIFY_API_KEY_PRODUCTION`または`vars.SHOPIFY_API_KEY_PRODUCTION`
- Production2（OK環境）: `secrets.SHOPIFY_API_KEY_PRODUCTION_2`または`vars.SHOPIFY_API_KEY_PRODUCTION_2`

---

## 発見された違い

### 1. 環境変数名が異なる

#### develop_frontend.yml（NG環境）
- **参照する環境変数名**: `vars.NEXT_PUBLIC_SHOPIFY_API_KEY`
- **設定先**: `NEXT_PUBLIC_SHOPIFY_API_KEY`

#### production_frontend.yml（OK環境）
- **参照する環境変数名**: 
  - Production1: `secrets.SHOPIFY_API_KEY_PRODUCTION`または`vars.SHOPIFY_API_KEY_PRODUCTION`
  - Production2: `secrets.SHOPIFY_API_KEY_PRODUCTION_2`または`vars.SHOPIFY_API_KEY_PRODUCTION_2`
- **設定先**: `NEXT_PUBLIC_SHOPIFY_API_KEY`

**違い**: 
- NG環境は`NEXT_PUBLIC_SHOPIFY_API_KEY`という環境変数名を直接参照
- OK環境（Production2）は`SHOPIFY_API_KEY_PRODUCTION_2`という環境変数名を参照してから、`NEXT_PUBLIC_SHOPIFY_API_KEY`に設定

### 2. SecretsとVariablesの優先順位

#### develop_frontend.yml（NG環境）
- **参照方法**: `vars.NEXT_PUBLIC_SHOPIFY_API_KEY`のみ
- **Secretsの使用**: なし

#### production_frontend.yml（OK環境）
- **参照方法**: `secrets`を優先し、なければ`vars`を参照（フォールバック）
- **Secretsの使用**: あり（`secrets.SHOPIFY_API_KEY_PRODUCTION_2`）

**違い**: 
- NG環境は`vars`のみを参照
- OK環境は`secrets`を優先し、なければ`vars`を参照

### 3. 環境別の設定

#### develop_frontend.yml（NG環境）
- **環境別設定**: GitHub Environment Variablesの環境別（development/staging/production）から取得
- **設定方法**: `${{ vars.NEXT_PUBLIC_SHOPIFY_API_KEY }}`（環境別のGitHub Environment Variablesから自動取得）

#### production_frontend.yml（OK環境）
- **環境別設定**: Production1とProduction2で異なる環境変数名を使用
- **設定方法**: トップレベルの`env`で定義してから、デプロイステップ内で使用

**違い**: 
- NG環境は環境別のGitHub Environment Variablesから自動取得
- OK環境はトップレベルの`env`で明示的に定義

---

## 問題点

### 1. 環境変数名の不一致

**NG環境（develop_frontend.yml）**:
- GitHub Environment Variablesに`NEXT_PUBLIC_SHOPIFY_API_KEY`が設定されている必要がある
- フロントエンドのコードは`NEXT_PUBLIC_SHOPIFY_API_KEY`を参照している ✅

**OK環境（production_frontend.yml）**:
- GitHub Environment Variablesに`SHOPIFY_API_KEY_PRODUCTION_2`が設定されている必要がある
- フロントエンドのコードは`NEXT_PUBLIC_SHOPIFY_API_KEY`を参照している ✅
- ワークフロー内で`SHOPIFY_API_KEY_PRODUCTION_2`を`NEXT_PUBLIC_SHOPIFY_API_KEY`にマッピングしている ✅

**問題**: 
- OK環境では`SHOPIFY_API_KEY_PRODUCTION_2`という環境変数名を使用しているが、NG環境では`NEXT_PUBLIC_SHOPIFY_API_KEY`という環境変数名を使用している
- 環境変数名が異なるため、GitHub Environment Variablesの設定が異なる可能性がある

### 2. SecretsとVariablesの混在

**OK環境（production_frontend.yml）**:
- `secrets.SHOPIFY_API_KEY_PRODUCTION_2`を優先し、なければ`vars.SHOPIFY_API_KEY_PRODUCTION_2`を参照
- コメントに「現状、GitHub Environment に Secrets と Variables の両方が混在しているため、secrets を優先し、なければ vars を参照する（空注入を防ぐ）」と記載

**NG環境（develop_frontend.yml）**:
- `vars.NEXT_PUBLIC_SHOPIFY_API_KEY`のみを参照
- Secretsの使用なし

**問題**: 
- OK環境とNG環境で、SecretsとVariablesの参照方法が異なる
- 統一性がない

---

## 推奨される修正方法

### オプション1: NG環境をOK環境と同じ方式に統一（推奨）

**修正内容**:
- `develop_frontend.yml`を`production_frontend.yml`と同じ方式に変更
- トップレベルの`env`で環境変数を定義し、`secrets`を優先して`vars`をフォールバック

**メリット**:
- OK環境とNG環境で統一された方式
- SecretsとVariablesの両方に対応
- 空注入を防ぐ

**デメリット**:
- 環境変数名を変更する必要がある（`NEXT_PUBLIC_SHOPIFY_API_KEY` → `SHOPIFY_API_KEY_DEVELOPMENT`など）

### オプション2: OK環境をNG環境と同じ方式に統一

**修正内容**:
- `production_frontend.yml`を`develop_frontend.yml`と同じ方式に変更
- `vars.NEXT_PUBLIC_SHOPIFY_API_KEY`を直接参照

**メリット**:
- フロントエンドのコードが参照する環境変数名と一致
- シンプルな実装

**デメリット**:
- OK環境の既存の設定を変更する必要がある
- Secretsの使用ができなくなる

### オプション3: 両方の方式をサポート（現状維持）

**修正内容**:
- 現状のまま維持
- 各環境で適切な環境変数名を設定

**メリット**:
- 既存の設定を変更する必要がない

**デメリット**:
- 環境変数名が異なるため、管理が複雑
- 混乱の原因になる可能性

---

## 確認が必要な項目

### 1. GitHub Environment Variablesの設定

#### NG環境（development/staging/production）
- [ ] `vars.NEXT_PUBLIC_SHOPIFY_API_KEY`が設定されているか
- [ ] 各環境（development/staging/production）で正しい値が設定されているか

#### OK環境（ec-ranger-prod）
- [ ] `secrets.SHOPIFY_API_KEY_PRODUCTION_2`が設定されているか
- [ ] `vars.SHOPIFY_API_KEY_PRODUCTION_2`が設定されているか（フォールバック用）
- [ ] 正しい値（`706a7579...`）が設定されているか

### 2. フロントエンドコードの参照

**確認**: フロントエンドのコードが`NEXT_PUBLIC_SHOPIFY_API_KEY`を参照しているか

```typescript
// frontend/src/app/install/page.tsx
const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;
```

**確認結果**: ✅ フロントエンドのコードは`NEXT_PUBLIC_SHOPIFY_API_KEY`を参照している

---

## 推奨される対応

### 最優先: GitHub Environment Variablesの確認

1. **NG環境（development/staging/production）**:
   - `vars.NEXT_PUBLIC_SHOPIFY_API_KEY`が設定されているか確認
   - 値が`2d7e0e1f...`（NG環境のClient ID）であることを確認

2. **OK環境（ec-ranger-prod）**:
   - `secrets.SHOPIFY_API_KEY_PRODUCTION_2`または`vars.SHOPIFY_API_KEY_PRODUCTION_2`が設定されているか確認
   - 値が`706a7579...`（OK環境のClient ID）であることを確認

### 次に: ワークフローの統一（オプション）

- オプション1を推奨（NG環境をOK環境と同じ方式に統一）
- ただし、GitHub Environment Variablesの設定が正しければ、現状のままでも動作する可能性がある

---

## まとめ

### 現在の状況

- **NG環境**: `vars.NEXT_PUBLIC_SHOPIFY_API_KEY`を直接参照
- **OK環境**: `secrets.SHOPIFY_API_KEY_PRODUCTION_2`または`vars.SHOPIFY_API_KEY_PRODUCTION_2`を参照してから、`NEXT_PUBLIC_SHOPIFY_API_KEY`に設定

### 問題点

- 環境変数名が異なる（`NEXT_PUBLIC_SHOPIFY_API_KEY` vs `SHOPIFY_API_KEY_PRODUCTION_2`）
- SecretsとVariablesの参照方法が異なる

### 推奨対応

1. **まず**: GitHub Environment Variablesの設定を確認
2. **次に**: 必要に応じてワークフローを統一（オプション）

---

## 参考資料

- [OK環境とNG環境の比較](./404エラー-OK環境とNG環境の比較.md)
- [修正アクション項目](./404エラー-修正アクション項目.md)
- [追加確認項目](./404エラー-追加確認項目.md)

---

## 更新履歴

- 2025-12-27: 初版作成（GitHub Actionsワークフローの比較）
