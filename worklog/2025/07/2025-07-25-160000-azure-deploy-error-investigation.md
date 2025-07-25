# 作業ログ: Azure App Serviceデプロイエラー調査

## 作業情報
- 開始日時: 2025-07-25 16:00:00
- 完了日時: 2025-07-25 16:45:00
- 所要時間: 45分
- 担当: 福田＋AI Assistant

## 作業概要
Azure App Serviceのデプロイエラー（Bad Request 400）の原因調査と対策の検討

## エラー詳細
```
Deployment Failed, Error: Failed to deploy web package using OneDeploy to App Service. Bad Request (CODE: 400)
```

## 調査結果

### 1. 考えられる原因
- **Azure App Serviceプラン変更の影響**
  - プラン変更によりデプロイスロット設定が不整合
  - Basicプランではデプロイスロットがサポートされていない可能性

- **デプロイ設定の問題**
  - `slot-name: 'Production'` が新しいプランで利用できない
  - Publish Profileの有効期限切れ

### 2. 確認した設定
- **GitHub Actions設定**: `.github/workflows/azure-app-service.yml`
- **プロジェクト設定**: `backend/ShopifyTestApi/ShopifyTestApi.csproj`
- **起動設定**: `backend/ShopifyTestApi/Properties/launchSettings.json`

### 3. 問題の特定
- デプロイスロット設定（`slot-name: 'Production'`）が原因の可能性が高い
- Azure App Serviceのスペック変更により、この設定がサポートされなくなった可能性

## 実施内容

### 1. 修正版ワークフローファイルの作成
- `.github/workflows/azure-app-service-fixed.yml` を作成
- デプロイスロット設定を削除
- 新しいプランに対応した設定に変更

### 2. トラブルシューティングガイドの作成
- `docs/05-operations/azure-app-service-deploy-error-troubleshooting.md` を作成
- エラーの原因と対策を詳細に記載
- 予防策と参考リンクを追加

### 3. 発行プロファイルの取得と設定
- 新しい発行プロファイルを取得
- Web Deployプロファイルの内容を確認
- GitHub Secretsの更新手順を提供

### 4. ワークフローファイルの修正
- `slot-name: 'Production'` をコメントアウト
- 新しいプランに対応した設定に変更

## 成果物
- 修正版ワークフローファイル: `.github/workflows/azure-app-service-fixed.yml`
- トラブルシューティングガイド: `docs/05-operations/azure-app-service-deploy-error-troubleshooting.md`
- 作業ログ: `worklog/2025/07/2025-07-25-160000-azure-deploy-error-investigation.md`
- 修正されたワークフローファイル: `.github/workflows/azure-app-service.yml`

## 推奨対策

### 即座に実施すべき対策
1. **デプロイスロット設定の削除** ✅ 完了
   ```yaml
   # slot-name: 'Production' を削除
   ```

2. **新しいPublish Profileの取得** ✅ 完了
   - Azure Portalから新しいPublish Profileをダウンロード
   - GitHub Secretsに更新（手順提供済み）

### 追加確認事項
1. **Azure App Serviceプランの確認**
   - 現在のプランとサポート機能の確認
   - 必要に応じてプラン変更の検討

2. **アプリケーション設定の確認**
   - 環境変数と接続文字列の確認
   - 新しいプランでの互換性確認

## 次のステップ
1. GitHub Secretsに新しいPublish Profileを設定
2. ワークフローを手動実行してデプロイテスト
3. デプロイ成功後の動作確認

## 課題・注意点
- Azure App Serviceのスペック変更が原因である可能性が高い
- プラン変更時の影響を事前に調査する必要性
- デプロイ設定の定期的な見直しが必要

## 関連ファイル
- `.github/workflows/azure-app-service.yml`
- `.github/workflows/azure-app-service-fixed.yml`
- `docs/05-operations/azure-app-service-deploy-error-troubleshooting.md` 