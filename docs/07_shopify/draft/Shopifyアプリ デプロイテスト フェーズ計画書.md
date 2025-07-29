# Shopifyアプリ デプロイテスト フェーズ計画書

## Phase 1: Azure Functions バックエンドの構築

### 対応内容

- Azure FunctionsプロジェクトをC#/.NET 8で作成
- Health CheckとサンプルAPIの実装
- ローカル開発環境でのテスト
- Azureへの手動デプロイ

### 目的

- Azure Functionsの基本的な動作確認
- C#でのHTTP APIの実装方法の習得
- Azureリソースの作成手順の理解

### 完了条件

- [ ]  ローカルでFunctions Core Toolsが正常に動作する
- [ ]  Health Check API (`/api/health`) がHTTP 200を返す
- [ ]  Products API (`/api/products`) がJSONデータを返す
- [ ]  Azure上でデプロイされたAPIにアクセスできる

---

## Phase 2: フロントエンド環境の並行テスト

### 対応内容

- Next.jsアプリケーションの作成
- Vercel版のデプロイ設定と実行
- Azure Static Web Apps版のデプロイ設定と実行
- 両環境でAzure Functions APIを呼び出すUIの実装

### 目的

- VercelとAzure Static Web Appsの比較
- フロントエンドからバックエンドAPIへの疎通確認
- CORS設定の理解と実装

### 完了条件

- [ ]  Vercel版がブラウザでアクセス可能
- [ ]  Azure Static Web Apps版がブラウザでアクセス可能
- [ ]  両環境からAzure Functions APIを正常に呼び出せる
- [ ]  デプロイ時間・設定の難易度を比較記録

---

## Phase 3: GitHub Actions設定

### 対応内容

- バックエンド用のGitHub Actions Workflow作成
- フロントエンド（Vercel）用のWorkflow作成
- フロントエンド（Azure SWA）用のWorkflow作成
- 必要なSecretsの設定

### 目的

- CI/CDパイプラインの自動化
- pushによる自動デプロイの実現
- 環境変数・シークレットの管理方法の習得

### 完了条件

- [ ]  mainブランチへのpushで自動デプロイが実行される
- [ ]  3つのWorkflow（Backend、Vercel、SWA）が全て成功する
- [ ]  デプロイ後、各環境が正常に動作する
- [ ]  GitHub ActionsのログでエラーがないことCookies

---

## Phase 4: データベース接続

### 対応内容

- Azure Database for PostgreSQL (Basic tier)の作成
- Entity Framework Coreの設定
- マイグレーション実行とテーブル作成
- データベースからデータを取得するAPIの実装

### 目的

- マネージドデータベースの利用方法の習得
- Entity Framework Coreでのデータアクセス実装
- 接続文字列の安全な管理方法の理解

### 完了条件

- [ ]  PostgreSQLインスタンスが作成され、接続可能
- [ ]  Productsテーブルが作成されている
- [ ]  APIでデータベースからデータを取得できる
- [ ]  接続文字列がAzure Key Vaultまたは環境変数で管理されている

---

## Phase 5: Shopify連携基礎

### 対応内容

- Shopifyパートナーアカウントと開発ストアの作成
- カスタムアプリの登録
- OAuth認証フローの実装（認証開始・コールバック）
- 基本的なShopify Admin API呼び出し

### 目的

- Shopifyアプリの基本的な仕組みの理解
- OAuth 2.0フローの実装経験
- Shopify APIの利用方法の習得

### 完了条件

- [ ]  開発ストアでアプリがインストールできる
- [ ]  OAuth認証が完了し、アクセストークンが取得できる
- [ ]  取得したトークンでShopify APIから商品情報を取得できる
- [ ]  アプリのアンインストール・再インストールが正常に動作する

---

## 全体スケジュール

| Phase | 作業内容 | 想定期間 |
| --- | --- | --- |
| Phase 1 | Azure Functionsバックエンド | 0.5日 |
| Phase 2 | フロントエンド環境テスト | 1日 |
| Phase 3 | GitHub Actions設定 | 0.5日 |
| Phase 4 | データベース接続 | 1日 |
| Phase 5 | Shopify連携基礎 | 1-2日 |
| **合計** |  | **4-5日** |

## 成功基準

全フェーズ完了時点で以下が達成されていること：

1. **インフラ構成が確立**: 本番に向けた基本構成が動作確認済み
2. **自動デプロイが機能**: GitHub pushで全環境が自動更新される
3. **Shopifyアプリとして動作**: 開発ストアでインストール・利用可能
4. **ドキュメント化**: 各種設定手順が記録されている