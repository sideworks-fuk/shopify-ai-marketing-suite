# Azure Static Web Apps 環境変数設定ガイド

**作成日**: 2025-10-20  
**対象**: フロントエンド（Next.js）の環境変数設定

## 概要

Azure Static Web Appsにデプロイされたフロントエンドアプリケーションで環境変数を設定する方法を説明します。

## 重要な注意事項

### `NEXT_PUBLIC_*` 環境変数の特性

- **ビルド時に埋め込まれる**: `NEXT_PUBLIC_` で始まる環境変数はビルド時にコードに埋め込まれます
- **ランタイムでは変更不可**: デプロイ後に環境変数を変更しても、再ビルド・再デプロイしないと反映されません
- **ブラウザに公開される**: すべてのクライアント側コードで参照可能です

## Azure Portalでの設定手順

### Step 1: Azure Portalにアクセス

1. [Azure Portal](https://portal.azure.com) にログイン
2. 検索バーで「Static Web Apps」を検索
3. 該当のStatic Web Appを選択（例: `shopify-ai-marketing-frontend`）

### Step 2: 環境変数を追加

1. 左メニューから **「設定」** → **「環境変数」** を選択
   - または **「Configuration」** → **「Application settings」**

2. **「追加」** または **「+ Add」** をクリック

3. 以下の環境変数を追加：

| 名前 | 値 | 説明 |
|------|-----|------|
| `NEXT_PUBLIC_DISABLE_FEATURE_GATES` | `true` | 機能制限を無効化（開発環境用） |
| `NEXT_PUBLIC_API_URL` | `https://shopifytestapi...` | バックエンドAPI URL |
| `NEXT_PUBLIC_BACKEND_URL` | `https://shopifytestapi...` | バックエンドURL |
| `NEXT_PUBLIC_FRONTEND_URL` | `https://brave-sea-038f...` | フロントエンドURL |

4. **「保存」** をクリック

### Step 3: 再デプロイ

**重要**: 環境変数を追加しただけでは反映されません。以下のいずれかの方法で再デプロイが必要です。

#### Option A: GitHubからプッシュして自動デプロイ

```powershell
# 最新の変更をコミット（ドキュメント更新など）
git add .
git commit -m "環境変数設定のため再デプロイ"
git push origin develop
```

GitHub Actionsが自動的にビルド・デプロイを実行します。

#### Option B: Azure PortalからEMPTY Commitで再デプロイ

1. Static Web Appの **「デプロイ」** → **「デプロイ履歴」** を開く
2. 最新のデプロイを選択
3. **「再実行」** をクリック

#### Option C: GitHub Actionsから手動実行

1. GitHubリポジトリの **「Actions」** タブを開く
2. 該当のワークフローを選択
3. **「Run workflow」** をクリック

## Azure CLIでの設定方法

```bash
# Static Web Appの環境変数を設定
az staticwebapp appsettings set \
  --name shopify-ai-marketing-frontend \
  --setting-names \
    NEXT_PUBLIC_DISABLE_FEATURE_GATES=true \
    NEXT_PUBLIC_API_URL=https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net

# 設定確認
az staticwebapp appsettings list \
  --name shopify-ai-marketing-frontend
```

## 設定確認方法

### 1. ブラウザの開発者ツールで確認

1. デプロイされたアプリを開く: https://brave-sea-038f17a00.1.azurestaticapps.net
2. 開発者ツール（F12）を開く
3. Consoleで以下を実行：

```javascript
console.log(process.env.NEXT_PUBLIC_DISABLE_FEATURE_GATES)
// 期待値: "true"
```

### 2. ページソースで確認

1. ブラウザでページを開く
2. 右クリック → 「ページのソースを表示」
3. `NEXT_PUBLIC_DISABLE_FEATURE_GATES` で検索
4. 値が `"true"` になっていることを確認

### 3. Network タブで確認

1. 開発者ツールの Network タブを開く
2. `_next/static/chunks/` のファイルを確認
3. `NEXT_PUBLIC_DISABLE_FEATURE_GATES` が `"true"` で埋め込まれていることを確認

## トラブルシューティング

### 環境変数が反映されない

**原因**: 再デプロイしていない、またはビルドが完了していない

**解決策**:
1. GitHub Actionsのビルドログを確認
2. ビルドが成功していることを確認
3. デプロイが完了するまで待つ（通常5-10分）
4. ブラウザのキャッシュをクリア（Ctrl+Shift+Delete）

### 機能制限が解除されない

**確認事項**:
1. 環境変数名が正確か（`NEXT_PUBLIC_DISABLE_FEATURE_GATES`）
2. 値が `true`（小文字）になっているか
3. ビルドが成功しているか
4. デプロイが完了しているか

**デバッグ方法**:
```typescript
// frontend/src/hooks/useFeatureAccess.ts で確認
console.log('Environment:', process.env.NEXT_PUBLIC_DISABLE_FEATURE_GATES);
console.log('Gate Disabled:', gateDisabled);
```

### ビルドエラーが発生する

**一般的な原因**:
- TypeScriptエラー
- 環境変数の値が不正
- 依存関係の問題

**解決策**:
```powershell
# ローカルでビルドテスト
cd frontend
npm run build
```

## 環境別の設定

Azure Static Web Appsでは以下の環境を設定できます：

| 環境 | 説明 | URL例 |
|------|------|-------|
| Production | 本番環境 | https://brave-sea-038f17a00.1.azurestaticapps.net |
| Preview | プレビュー環境（PRごと） | https://brave-sea-038f17a00-{PR番号}.eastasia.1.azurestaticapps.net |

各環境で異なる環境変数を設定する場合：
1. Azure Portalで環境ごとに設定
2. または GitHub Secretsで管理

## セキュリティ上の注意

### 公開される環境変数

`NEXT_PUBLIC_*` で始まる環境変数は**すべてクライアント側に公開**されます：
- ブラウザのソースコードから閲覧可能
- APIキーなどの秘密情報は含めないこと

### 秘密情報の管理

秘密情報（APIキー、トークンなど）は：
- バックエンド側で管理
- Azure Key Vaultを使用
- `NEXT_PUBLIC_` プレフィックスを使用しない

## 更新履歴

- 2025-10-20: 初版作成（機能制限解除のトラブルシューティング対応）

---

**次のステップ**: 環境変数を設定後、再デプロイを実行してください。

