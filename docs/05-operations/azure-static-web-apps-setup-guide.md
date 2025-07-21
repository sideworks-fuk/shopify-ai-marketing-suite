# Azure Static Web Apps セットアップガイド

## 概要
Shopify AI Marketing Suite フロントエンド（Next.js）を Azure Static Web Apps にデプロイするための詳細手順書です。

## 前提条件
- ✅ Azure サブスクリプション
- ✅ GitHub アカウント（sideworks-fuk）
- ✅ GitHub リポジトリ（shopify-ai-marketing-suite）
- ✅ モノレポ構成（frontend/ ディレクトリ）

---

## 手順1: Azure Portal でリソース作成

### 1.1 Azure Portal へのアクセス
```
URL: https://portal.azure.com/
```
- Azure アカウントでログイン

### 1.2 Static Web Apps リソースの作成開始
1. **Azure Portal ホーム** で **「リソースの作成」** をクリック
2. 検索ボックスに **「Static Web Apps」** と入力
3. **「Static Web Apps」** を選択
4. **「作成」** ボタンをクリック

### 1.3 基本設定タブの入力

#### プロジェクトの詳細
```yaml
サブスクリプション: [あなたのAzureサブスクリプション]
リソースグループ: 
  - 既存: shopify-ai-marketing-rg (既存の場合)
  - 新規: "新規作成" → shopify-ai-marketing-rg
```

#### Static Web App の詳細
```yaml
名前: shopify-ai-marketing-frontend
ホスティングプラン: Free (個人および開発用)
Azure Functions と ステージング の詳細:
  リージョン: East Asia
```

### 1.4 デプロイの詳細タブの設定

#### ソースの設定
```yaml
デプロイソース: GitHub
```

#### GitHub アカウント認証
1. **「GitHubでサインイン」** をクリック
2. GitHub認証を完了
3. 以下を選択：
```yaml
組織: sideworks-fuk
リポジトリ: shopify-ai-marketing-suite
ブランチ: main
```

#### ビルドの詳細（重要！）
```yaml
ビルドプリセット: Next.js
アプリの場所: /frontend
API の場所: (空白のまま)
出力場所: .next
```

### 1.5 デプロイ構成タブの設定

#### デプロイ認可ポリシー
```yaml
選択: デプロイトークン
理由: セキュリティと管理の観点から推奨
```

### 1.6 詳細設定タブの設定

#### Azure Functions とステージングの詳細
```yaml
リージョン: East Asia
エンタープライズレベルのエッジ: ☐ チェックなし (Free プランのため)
```

### 1.7 タグタブの設定

#### 設定されたタグ一覧
```yaml
Environment: Production
Project: ShopifyAIMarketing
Component: Frontend
CostCenter: Development
Application: shopify-ai-marketing-suite
Framework: NextJS
```

#### タグの用途
- **Environment**: 環境識別（Production/Development/Staging）
- **Project**: プロジェクト識別とコスト管理
- **Component**: システム構成要素の識別
- **CostCenter**: コストセンター別の費用管理
- **Application**: アプリケーション識別
- **Framework**: 技術スタックの記録

### 1.8 確認と作成
1. **「確認と作成」** タブをクリック
2. 設定内容を確認：
   - リソース名: shopify-ai-marketing-frontend
   - リージョン: East Asia
   - GitHubリポジトリ: sideworks-fuk/shopify-ai-marketing-suite
   - アプリの場所: /frontend
   - タグ: 6つのタグが設定済み
3. **「作成」** をクリック

---

## 手順2: 作成完了の確認

### 2.1 デプロイ進行状況の確認
作成開始後、以下が自動実行されます：
```
⏳ リソース作成中...
⏳ GitHub Actions ワークフロー生成中...
⏳ 初回ビルド実行中...
⏳ デプロイ実行中...
```

### 2.2 リソース作成完了
1. **「リソースに移動」** をクリック
2. Static Web Apps の概要ページが表示

### 2.3 生成された情報の確認

#### アプリケーションURL
```
本番URL: https://[自動生成名].azurestaticapps.net
例: https://kind-sky-0a1b2c3d4.azurestaticapps.net
```

#### GitHub Actions統合
- GitHub リポジトリに自動でワークフローファイルが追加
- 場所: `.github/workflows/azure-static-web-apps-[ランダム文字列].yml`

---

## 手順3: API トークンの取得

### 3.1 管理トークンの確認
1. Azure Portal の Static Web Apps リソースページ
2. 左メニューの **「設定」** → **「API キー」**
3. **「管理トークンをコピー」** をクリック
4. トークンを安全な場所に保存

```bash
# トークン例（実際は異なります）
AZURE_STATIC_WEB_APPS_API_TOKEN=1234567890abcdef...
```

---

## 手順4: GitHub Actions 設定

### 4.1 GitHub Secrets の設定
1. GitHub リポジトリ: `https://github.com/sideworks-fuk/shopify-ai-marketing-suite`
2. **Settings** → **Secrets and variables** → **Actions**
3. **「New repository secret」** をクリック
4. 設定値:
```yaml
Name: AZURE_STATIC_WEB_APPS_API_TOKEN
Secret: [手順3で取得したトークン]
```

### 4.2 ワークフローファイルの調整
Azureが自動生成したワークフローファイルと、事前に作成したファイルを統合：

```bash
# 自動生成されたファイル（例）
.github/workflows/azure-static-web-apps-kind-sky-123.yml

# 事前作成ファイル
.github/workflows/azure-static-web-apps.yml
```

---

## 手順5: 初回デプロイの確認

### 5.1 GitHub Actions の実行確認
1. GitHub リポジトリの **「Actions」** タブ
2. 最新のワークフロー実行を確認
3. ビルドとデプロイの成功を確認

### 5.2 アプリケーションの動作確認
1. Azure Portal で本番URLにアクセス
2. 以下を確認：
   - ✅ Shopify AI Marketing Suite のホーム画面表示
   - ✅ メニューのテキスト更新確認
   - ✅ 各ページへのナビゲーション
   - ✅ バックエンドAPI接続

---

## リソース管理情報

### 設定されたタグ
```yaml
Environment: Production
Project: ShopifyAIMarketing
Component: Frontend
CostCenter: Development
Application: shopify-ai-marketing-suite
Framework: NextJS
```

### タグによる管理効果
- **コスト管理**: プロジェクト別、環境別、コンポーネント別のコスト追跡
- **リソース検索**: タグによるフィルタリングでリソース特定
- **運用管理**: 環境やコンポーネント別の運用ポリシー適用
- **責任明確化**: プロジェクトとコストセンターの責任範囲明確化

---

## トラブルシューティング

### よくある問題と解決策

#### 1. ビルドエラー: autoprefixer not found
```bash
# 解決策: frontend/package.json の devDependencies に追加済み
"autoprefixer": "^10.4.14"
```

#### 2. パスエイリアス (@/) が解決されない
```javascript
// 解決策: frontend/next.config.js で設定済み
config.resolve.alias = {
  '@': require('path').resolve(__dirname, 'src')
}
```

#### 3. API 接続エラー
```json
// 解決策: frontend/staticwebapp.config.json で設定済み
{
  "route": "/api/*",
  "rewrite": "https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net/api/{*}"
}
```

---

## 設定完了チェックリスト

- [ ] Azure Static Web Apps リソース作成完了
- [ ] GitHub リポジトリ連携完了
- [ ] API トークン取得・設定完了
- [ ] GitHub Actions 実行成功
- [ ] アプリケーション URL でアクセス可能
- [ ] メニューテキスト更新確認
- [ ] バックエンド API 接続確認
- [ ] タグ設定完了（6つのタグ）

---

## 運用情報

### コスト
- **プラン**: Free
- **制限**: 
  - 帯域幅: 100GB/月
  - ストレージ: 0.5GB
  - カスタムドメイン: 2個

### 監視
- **Azure Portal**: Static Web Apps → 監視
- **GitHub Actions**: リポジトリ → Actions タブ
- **コスト管理**: タグベースのコスト分析

### メンテナンス
- **自動更新**: main ブランチへのプッシュで自動デプロイ
- **プレビュー**: PR作成で自動プレビュー環境作成

---

## 次のステップ

1. ✅ **カスタムドメイン設定**（必要に応じて）
2. ✅ **環境変数の設定**（必要に応じて）
3. ✅ **監視・アラート設定**
4. ✅ **パフォーマンス最適化**

## 記録情報

- **作成日**: 2025年7月20日
- **作成者**: AI Assistant
- **バージョン**: v1.1
- **最終更新**: 2025年7月20日
- **実際の設定タグ**: Environment, Project, Component, CostCenter, Application, Framework 