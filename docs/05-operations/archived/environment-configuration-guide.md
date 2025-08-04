# 環境設定ガイド

## 概要

フロントエンドアプリケーションから接続するバックエンドAPIの環境を切り替えるための設定ガイドです。

## 対応環境

### 1. 開発環境 (Development)
- **URL**: `https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net`
- **用途**: ローカル開発用
- **説明**: 開発者がローカルでバックエンドを起動して使用

### 2. ステージング環境 (Staging)
- **URL**: `https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net`
- **用途**: テスト・検証用
- **説明**: 本番リリース前の最終テスト環境

### 3. 本番環境 (Production)
- **URL**: `https://shopifyapp-backend-production.japanwest-01.azurewebsites.net`
- **用途**: 本番運用環境
- **説明**: 実際のユーザーが使用する環境

## GitHub Environmentsとの連携

### 環境名の統一
- **production**: 本番環境
- **staging**: ステージング環境  
- **development**: 開発環境

### ワークフローでの環境変数設定
```yaml
# production環境
NODE_ENV: production
NEXT_PUBLIC_BUILD_ENVIRONMENT: production
NEXT_PUBLIC_DEPLOY_ENVIRONMENT: production
NEXT_PUBLIC_APP_ENVIRONMENT: production

# staging環境
NODE_ENV: staging
NEXT_PUBLIC_BUILD_ENVIRONMENT: staging
NEXT_PUBLIC_DEPLOY_ENVIRONMENT: staging
NEXT_PUBLIC_APP_ENVIRONMENT: staging

# development環境
NODE_ENV: development
NEXT_PUBLIC_BUILD_ENVIRONMENT: development
NEXT_PUBLIC_DEPLOY_ENVIRONMENT: development
NEXT_PUBLIC_APP_ENVIRONMENT: development
```

## 環境切り替え方法

### 1. ビルド時の環境変数（推奨）

#### 開発環境
```bash
# .env.local ファイルを作成
NEXT_PUBLIC_BUILD_ENVIRONMENT=development
```

#### ステージング環境
```bash
# デプロイ時に設定
NEXT_PUBLIC_BUILD_ENVIRONMENT=staging
```

#### 本番環境
```bash
# デプロイ時に設定
NEXT_PUBLIC_BUILD_ENVIRONMENT=production
```

### 2. ブラウザでの切り替え

1. アプリケーションにアクセス
2. `/settings/environment` ページに移動
3. 「環境切り替え」セクションで目的の環境を選択
4. ページがリロードされ、選択した環境が適用される

### 3. 実行時の環境変数

#### 開発時
```bash
# .env.local ファイルを作成
NEXT_PUBLIC_ENVIRONMENT=development
```

#### ステージング環境
```bash
# .env.local ファイルを作成
NEXT_PUBLIC_ENVIRONMENT=staging
```

#### 本番環境
```bash
# .env.local ファイルを作成
NEXT_PUBLIC_ENVIRONMENT=production
```

### 4. 直接API URL指定

特定のAPI URLを直接指定したい場合：

```bash
# .env.local ファイルを作成
NEXT_PUBLIC_API_URL=https://your-custom-api-url.com
```

## 設定の優先順位

1. **NEXT_PUBLIC_API_URL** (最優先)
   - 直接API URLを指定
   - 環境設定を無視して指定したURLを使用

2. **NEXT_PUBLIC_BUILD_ENVIRONMENT** (ビルド時最優先)
   - ビルド時に設定され、デプロイ後に変更不可
   - デプロイ環境ごとに固定値

3. **NEXT_PUBLIC_DEPLOY_ENVIRONMENT** (ビルド時第2優先)
   - デプロイ時に設定
   - ビルド時環境変数が未設定の場合に使用

4. **NEXT_PUBLIC_APP_ENVIRONMENT** (ビルド時第3優先)
   - アプリケーション環境の指定
   - 上記2つが未設定の場合に使用

5. **ローカルストレージ** (ブラウザ設定)
   - ユーザーがブラウザで選択した環境
   - ページリロード後も保持

6. **NEXT_PUBLIC_ENVIRONMENT** (実行時環境変数)
   - ビルド時に設定される環境
   - デプロイ環境に応じて自動設定

7. **NODE_ENV** (自動判定)
   - `production` → 本番環境
   - `development` → 開発環境

8. **デフォルト** (フォールバック)
   - 開発環境

## 実装詳細

### 設定ファイル
- `frontend/src/lib/config/environments.ts` - 環境定義
- `frontend/src/lib/api-config.ts` - API設定

### コンポーネント
- `frontend/src/components/common/EnvironmentSelector.tsx` - 環境切り替えUI
- `frontend/src/hooks/useEnvironment.ts` - 環境管理フック

### ページ
- `frontend/src/app/settings/environment/page.tsx` - 環境設定ページ

## デバッグ情報

ブラウザの開発者ツールのコンソールで以下の情報を確認できます：

```
🔍 Environment Check:
  - Current Environment: development
  - NODE_ENV: development
  - NEXT_PUBLIC_ENVIRONMENT: undefined
  - Build Environment: development
  - Deploy Environment: undefined
  - App Environment: undefined
  - Is Build Time Set: true
  - API Base URL: https://localhost:7088
  - Environment Name: 開発環境
  - Is Production: false
```

## 注意事項

### セキュリティ
- 本番環境では環境切り替え機能は無効化されます
- 機密情報は環境変数で管理し、クライアントサイドに露出させないでください
- ビルド時の環境変数はクライアントサイドに露出するため、機密情報は含めないでください

### パフォーマンス
- 環境切り替え時はページがリロードされます
- API接続のタイムアウトは120秒に設定されています
- ビルド時の環境変数はビルド時に固定され、実行時に変更することはできません

### 開発時の推奨事項
- 開発時は適切な環境を選択してテストしてください
- ステージング環境でのテストを本番リリース前に必ず実施してください
- APIエンドポイントの構造は全環境で統一されています
- ビルド時の環境変数は、デプロイ時に設定する必要があります

## トラブルシューティング

### 環境が切り替わらない
1. ブラウザのキャッシュをクリア
2. ローカルストレージを確認
3. 環境変数の設定を確認
4. ビルド時の環境変数が正しく設定されているか確認

### API接続エラー
1. 選択した環境のAPI URLが正しいか確認
2. ネットワーク接続を確認
3. バックエンドサービスが起動しているか確認

### 本番環境での問題
1. 本番環境では環境切り替え機能は無効化されていることを確認
2. 適切な環境変数が設定されているか確認
3. `NEXT_PUBLIC_BUILD_ENVIRONMENT=production` が設定されているか確認

### ビルド時の環境変数が反映されない
1. ビルド時に環境変数が正しく設定されているか確認
2. デプロイ後にキャッシュをクリア
3. 環境変数の優先順位を確認

### Azure Static Web Apps デプロイ環境の問題

#### 問題: プレビュー環境にデプロイされてしまう
**症状**: `main`ブランチでデプロイしたのに、プレビュー環境にデプロイされる

**原因**: `deployment_environment`パラメータの設定ミス

**解決方法**:
```yaml
# ❌ 間違った設定（プレビュー環境が作成される）
deployment_environment: Production

# ✅ 正しい設定（本番環境にデプロイ）
deployment_environment: ""  # 空にする
```

#### 問題: "No matching Static Web App environment was found"
**症状**: デプロイ時に環境が見つからないエラー

**原因**: 環境名の大文字小文字の不一致

**解決方法**:
```yaml
# Azure Portalの環境名と一致させる
# Azure Portal: Production → ワークフロー: Production
# Azure Portal: development → ワークフロー: development
```

#### 問題: 複数のURLが作成される
**症状**: 
- `https://app-name.1.azurestaticapps.net/` (本番環境)
- `https://app-name-production.1.azurestaticapps.net/` (プレビュー環境)

**原因**: `deployment_environment`に値を設定している

**解決方法**:
```yaml
# mainブランチの場合
if [ "${{ github.ref }}" = "refs/heads/main" ]; then
  echo "deployment_environment=" >> $GITHUB_OUTPUT  # 空にする
else
  echo "deployment_environment=development" >> $GITHUB_OUTPUT
fi
```

#### 問題: Azure Portalでブランチ設定を変更できない
**症状**: Azure Portalで運用環境の分岐を変更できない

**解決方法**:
1. **GitHub Actionsワークフローで強制指定**:
```yaml
deployment_environment: ${{ github.ref == 'refs/heads/main' && '' || 'development' }}
```

2. **新しいStatic Web Appsリソースを作成**:
```bash
az staticwebapp create \
  --name new-app-name \
  --resource-group <resource-group> \
  --source https://github.com/user/repo \
  --branch main \
  --app-location /frontend \
  --output-location out
```

#### 問題: デプロイ内容が反映されない
**症状**: GitHub Actionsでデプロイ成功だが、実際のサイトに反映されない

**原因**: 
1. キャッシュの問題
2. 環境変数が正しく設定されていない
3. デプロイ先環境の間違い

**解決方法**:
1. **キャッシュクリア**:
   - ブラウザのハードリフレッシュ（Ctrl+F5）
   - CDNキャッシュのクリア

2. **環境変数の確認**:
```yaml
app_settings: |
  NODE_ENV=${{ steps.env.outputs.node_env }}
  NEXT_PUBLIC_BUILD_ENVIRONMENT=${{ steps.env.outputs.build_environment }}
  NEXT_PUBLIC_DEPLOY_ENVIRONMENT=${{ steps.env.outputs.deploy_environment }}
  NEXT_PUBLIC_APP_ENVIRONMENT=${{ steps.env.outputs.app_environment }}
```

3. **デプロイ先環境の確認**:
```yaml
# デバッグ情報を追加
- name: Deploy Status
  run: |
    echo "🔧 デプロイ先環境: ${{ steps.env.outputs.deployment_environment == '' && 'Production (本番環境)' || format('Preview ({0})', steps.env.outputs.deployment_environment) }}"
```

#### Azure Static Web Apps環境の仕組み

**本番環境（Operational）**:
- 1つだけ存在
- 100%のトラフィックを受け取る
- `deployment_environment`を空または未指定

**プレビュー環境（Preview）**:
- 複数作成可能
- トラフィックを受け取らない
- `deployment_environment`に任意の名前を指定

**正しい設定例**:
```yaml
# mainブランチ → 本番環境
if [ "${{ github.ref }}" = "refs/heads/main" ]; then
  echo "deployment_environment=" >> $GITHUB_OUTPUT  # 空
  echo "environment_name=Production" >> $GITHUB_OUTPUT
else
  echo "deployment_environment=development" >> $GITHUB_OUTPUT  # プレビュー環境
  echo "environment_name=development" >> $GITHUB_OUTPUT
fi
```

## 関連ドキュメント

- [GitHub Environments設定ガイド](./github-environments-setup.md) - GitHub Environmentsの設定について詳細
- [ビルド時環境変数設定ガイド](./build-time-environment-variables.md) - ビルド時の環境変数について詳細 