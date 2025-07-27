# workflow_dispatch実行問題のトラブルシューティング

## 概要
GitHub Actionsのworkflow_dispatchトリガーが実行できない場合の対処法を説明します。

## よくある原因と解決策

### 1. 権限不足
**症状**: workflow_dispatchボタンが表示されない、または実行時にエラーが発生

**解決策**:
```yaml
permissions:
  contents: read
  actions: read
  workflows: write
  deployments: write
  id-token: write
```

### 2. リポジトリ設定の問題
**確認項目**:
- Settings → Actions → General
- "Allow all actions and reusable workflows"が有効
- "Allow GitHub Actions to create and approve pull requests"が有効

### 3. ブランチ保護ルール
**確認項目**:
- Settings → Branches → develop
- "Require status checks to pass before merging"を無効化
- "Restrict pushes that create files"を無効化

### 4. Organization設定
**確認項目**:
- Organization Settings → Actions → General
- "Allow all actions and reusable workflows"が有効

## デバッグ方法

### ワークフロー情報の確認
```yaml
- name: Debug - Workflow Information
  run: |
    echo "Event name: ${{ github.event_name }}"
    echo "Actor: ${{ github.actor }}"
    echo "Repository: ${{ github.repository }}"
    echo "Ref: ${{ github.ref }}"
    echo "SHA: ${{ github.sha }}"
    echo "Workflow: ${{ github.workflow }}"
    echo "Run ID: ${{ github.run_id }}"
```

### workflow_dispatch inputsの確認
```yaml
- name: Debug - Inputs
  run: |
    echo "Environment: ${{ github.event.inputs.environment }}"
    echo "Force deploy: ${{ github.event.inputs.force_deploy }}"
```

## 推奨設定

### 基本的なworkflow_dispatch設定
```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        default: 'develop'
        type: choice
        options:
          - develop
          - staging
      force_deploy:
        description: 'Force deployment even if no changes'
        required: false
        default: false
        type: boolean
```

### 適切な権限設定
```yaml
permissions:
  contents: read
  actions: read
  workflows: write
  deployments: write
  id-token: write
```

## 関連ファイル
- `.github/workflows/develop_shopifyapp-backend-develop.yml`
- `worklog/2025/07/2025-07-20-150000-workflow-dispatch-fix.md` 