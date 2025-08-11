# GitHub Workflow最適化計画

## 概要
EC RangerプロジェクトのGitHub Actions Workflowを整理・最適化するための計画書

## 現状分析

### 現在のワークフロー構成
```
.github/workflows/
├── develop_backend.yml      # バックエンド開発環境デプロイ
├── develop_backend2.yml     # バックエンド開発環境デプロイ（重複？）
├── develop_frontend.yml     # フロントエンド開発環境デプロイ
├── backup/                  # 旧バージョンのワークフロー
└── draft/                   # ドラフト版ワークフロー
```

### 問題点
1. **重複ファイル**: `develop_backend.yml`と`develop_backend2.yml`が存在
2. **環境分離不足**: staging/production用のワークフローが未整備
3. **命名規則不統一**: ファイル名が環境と用途を明確に示していない
4. **バックアップ混在**: 本番用フォルダに旧ファイルが混在

## 最適化計画

### フェーズ1: ワークフロー整理（即座に実施可能）

#### 1.1 新しいディレクトリ構造
```
.github/workflows/
├── deploy-backend-dev.yml       # 開発環境バックエンド
├── deploy-backend-staging.yml   # ステージング環境バックエンド
├── deploy-backend-prod.yml      # 本番環境バックエンド
├── deploy-frontend-dev.yml      # 開発環境フロントエンド
├── deploy-frontend-staging.yml  # ステージング環境フロントエンド
├── deploy-frontend-prod.yml     # 本番環境フロントエンド
├── ci-backend.yml               # バックエンドCI（ビルド・テスト）
├── ci-frontend.yml              # フロントエンドCI（ビルド・テスト）
└── archive/                     # アーカイブ（旧ファイル移動先）
```

#### 1.2 ワークフロー統合計画
- `develop_backend.yml`と`develop_backend2.yml`を統合
- 環境別にワークフローを分離
- CI（テスト）とCD（デプロイ）を分離

### フェーズ2: 共通化とテンプレート化

#### 2.1 再利用可能ワークフロー
```yaml
# .github/workflows/templates/build-backend.yml
name: Build Backend Template
on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string
      dotnet_version:
        required: false
        type: string
        default: '8.x'
```

#### 2.2 環境変数の一元管理
```yaml
# 環境ごとのシークレット管理
environments:
  development:
    - AZURE_WEBAPP_NAME: gemx-backend-dev
    - AZURE_RESOURCE_GROUP: gemx-dev
  staging:
    - AZURE_WEBAPP_NAME: ec-ranger-backend-staging
    - AZURE_RESOURCE_GROUP: ec-ranger-staging
  production:
    - AZURE_WEBAPP_NAME: ec-ranger-backend-prod
    - AZURE_RESOURCE_GROUP: ec-ranger-prod
```

### フェーズ3: CI/CDパイプライン最適化

#### 3.1 バックエンドCIワークフロー
```yaml
name: Backend CI
on:
  pull_request:
    paths:
      - 'backend/**'
      - '.github/workflows/ci-backend.yml'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.x'
      
      - name: Restore
        run: dotnet restore backend/ShopifyAnalyticsApi
      
      - name: Build
        run: dotnet build backend/ShopifyAnalyticsApi --no-restore
      
      - name: Test
        run: dotnet test backend/ShopifyAnalyticsApi --no-build --verbosity normal
      
      - name: Code Coverage
        run: dotnet test backend/ShopifyAnalyticsApi --collect:"XPlat Code Coverage"
```

#### 3.2 フロントエンドCIワークフロー
```yaml
name: Frontend CI
on:
  pull_request:
    paths:
      - 'frontend/**'
      - '.github/workflows/ci-frontend.yml'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      
      - name: Install dependencies
        run: npm ci
        working-directory: frontend
      
      - name: Lint
        run: npm run lint
        working-directory: frontend
      
      - name: Type check
        run: npm run type-check
        working-directory: frontend
      
      - name: Test
        run: npm test
        working-directory: frontend
      
      - name: Build
        run: npm run build
        working-directory: frontend
```

### フェーズ4: デプロイメント戦略

#### 4.1 ブランチ戦略とデプロイ
| ブランチ | 環境 | 自動デプロイ | 承認要否 |
|---------|------|-------------|----------|
| develop | Development | ✅ | ❌ |
| staging | Staging | ✅ | ❌ |
| main | Production | ❌ | ✅ |

#### 4.2 本番デプロイワークフロー
```yaml
name: Deploy to Production
on:
  workflow_dispatch:
    inputs:
      release_version:
        description: 'Release version (e.g., v1.0.0)'
        required: true

jobs:
  deploy:
    environment: production
    runs-on: ubuntu-latest
    steps:
      - name: Manual Approval Check
        uses: trstringer/manual-approval@v1
        with:
          approvers: user1,user2
          minimum-approvals: 1
      
      - name: Deploy to Production
        # デプロイ処理
```

### フェーズ5: 監視とロールバック

#### 5.1 デプロイ後の自動検証
```yaml
- name: Health Check
  run: |
    response=$(curl -s -o /dev/null -w "%{http_code}" https://${{ env.APP_URL }}/health)
    if [ $response -ne 200 ]; then
      echo "Health check failed"
      exit 1
    fi

- name: Smoke Test
  run: |
    npm run test:e2e -- --smoke
```

#### 5.2 自動ロールバック
```yaml
- name: Rollback on Failure
  if: failure()
  run: |
    az webapp deployment slot swap \
      --resource-group ${{ env.RESOURCE_GROUP }} \
      --name ${{ env.APP_NAME }} \
      --slot staging \
      --target-slot production
```

## 実装スケジュール

### Week 1（2025年8月11日〜17日）
- [ ] 既存ワークフローのバックアップ
- [ ] 重複ファイルの統合
- [ ] 開発環境用ワークフローの最適化

### Week 2（2025年8月18日〜24日）
- [ ] ステージング環境用ワークフロー作成
- [ ] 本番環境用ワークフロー作成
- [ ] CI/CDの分離

### Week 3（2025年8月25日〜31日）
- [ ] テスト自動化の強化
- [ ] デプロイ後検証の実装
- [ ] ドキュメント更新

## 期待される効果

### 効率化
- **ビルド時間**: 約30%削減（キャッシュ活用）
- **デプロイ時間**: 約20%削減（並列処理）
- **メンテナンス工数**: 約50%削減（テンプレート化）

### 品質向上
- **デプロイ失敗率**: 現在の約10%から2%以下へ
- **ロールバック時間**: 5分以内で完了
- **テストカバレッジ**: 80%以上を維持

### コスト削減
- **GitHub Actions使用時間**: 約25%削減
- **無駄なデプロイ**: ゼロへ（適切なpath filteringによ）

## リスクと対策

### リスク1: 移行中の障害
**対策**: 段階的移行、旧ワークフローを一定期間保持

### リスク2: 権限設定ミス
**対策**: 最小権限の原則、環境ごとの権限分離

### リスク3: シークレット漏洩
**対策**: GitHub Secretsの活用、定期的なローテーション

## チェックリスト

### 移行前
- [ ] 全ワークフローのバックアップ
- [ ] シークレットの確認と移行
- [ ] 環境変数の整理

### 移行後
- [ ] 全環境でのデプロイテスト
- [ ] ロールバック手順の確認
- [ ] モニタリング設定の確認
- [ ] ドキュメントの更新

## 関連ドキュメント
- [Azure本番環境構築計画](./azure-production-deployment-plan.md)
- [環境変数設定ガイド](./azure-environment-variables-setup.md)
- [CI/CDベストプラクティス](../best-practices/cicd-guidelines.md)

## 更新履歴
- 2025-08-11: 初版作成（GitHub Workflow最適化計画）