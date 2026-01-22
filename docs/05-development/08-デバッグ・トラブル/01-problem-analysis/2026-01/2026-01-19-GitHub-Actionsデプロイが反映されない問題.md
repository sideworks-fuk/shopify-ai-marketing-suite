# GitHub Actionsデプロイが反映されない問題

## 📋 問題概要

**発生日時**: 2026年1月19日  
**環境**: 本番環境（Production）  
**症状**: GitHub Actionsでデプロイが成功しているように見えるが、Azure App Serviceのファイル（DLL、appsettings.Production.jsonなど）が更新されない

### 確認方法

Kudu（高度なツール）でファイルを確認：
```
D:\home\site\wwwroot\
```

**問題**: 
- DLLファイルの更新日時が古い
- `appsettings.Production.json`の内容が最新でない
- デプロイが成功しているように見えるが、実際には反映されていない

---

## 🔍 考えられる原因

### 1. デプロイが実際には失敗している（最も可能性が高い）

**原因**:
- GitHub Actionsのログで「成功」と表示されていても、実際にはデプロイが失敗している可能性
- エラーメッセージが表示されていない、または見落としている

**確認方法**:
1. GitHub Actionsのデプロイログを詳細に確認
2. 「Deploy to Azure App Service」ステップのログを確認
3. エラーメッセージがないか確認

---

### 2. デプロイ先が間違っている

**原因**:
- `publish-profile`が別のApp Serviceを指している
- `app-name`が間違っている

**確認方法**:
1. GitHub Secretsで`AZURE_WEBAPP_PUBLISH_PROFILE_PRODUCTION`が正しいApp Serviceを指しているか確認
2. ワークフローファイルの`APP_NAME`が`ec-ranger-backend-prod`になっているか確認

---

### 3. publish-profileが古い・無効

**原因**:
- publish-profileが古く、別のApp Serviceを指している
- publish-profileが無効になっている

**確認方法**:
1. Azure Portal → App Service → 発行プロファイルのダウンロード
2. 最新のpublish-profileをダウンロード
3. GitHub Secretsを更新

---

### 4. デプロイ方法（Web Deploy）の問題

**原因**:
- Web Deployが正しく動作していない
- ネットワークの問題でデプロイが失敗している

**確認方法**:
1. GitHub Actionsのデプロイログで、Web Deployのエラーメッセージを確認
2. Azure Portal → App Service → デプロイ → デプロイセンターでデプロイ履歴を確認

---

### 5. デプロイスロットの問題

**原因**:
- デプロイスロットにデプロイされているが、本番スロットにスワップされていない
- 間違ったスロットにデプロイされている

**確認方法**:
1. Azure Portal → App Service → デプロイ スロット
2. どのスロットにデプロイされているか確認
3. 本番スロットにスワップされているか確認

---

## ✅ 確認手順

### ステップ1: GitHub Actionsのデプロイログを確認

1. **GitHubリポジトリを開く**
   ```
   https://github.com/[owner]/[repo]/actions
   ```

2. **最新のデプロイ実行を開く**
   - 「Production Backend Deploy」ワークフローを選択
   - 最新の実行を開く

3. **デプロイステップのログを確認**
   - 「🚀 Deploy to Azure App Service (Production - Japan West)」ステップを開く
   - エラーメッセージがないか確認
   - デプロイが実際に成功しているか確認

4. **確認すべきポイント**:
   - デプロイが開始されているか
   - ファイルがアップロードされているか
   - エラーメッセージがないか
   - デプロイが完了しているか

---

### ステップ2: Azure Portalでデプロイ履歴を確認

1. **Azure Portalを開く**
   ```
   https://portal.azure.com
   ```

2. **App Serviceを開く**
   - リソースグループ: `ec-ranger-prod`
   - App Service: `ec-ranger-backend-prod`

3. **デプロイ履歴を確認**
   - 左メニュー → 「デプロイ」→ 「デプロイセンター」
   - 最新のデプロイ日時を確認
   - デプロイが成功しているか確認

4. **確認すべきポイント**:
   - 最新のデプロイ日時がGitHub Actionsの実行日時と一致しているか
   - デプロイが成功しているか
   - エラーメッセージがないか

---

### ステップ3: publish-profileを確認・更新

1. **最新のpublish-profileをダウンロード**
   - Azure Portal → App Service → 概要 → 「発行プロファイルのダウンロード」
   - `.PublishSettings`ファイルをダウンロード

2. **GitHub Secretsを更新**
   - GitHub → Settings → Secrets and variables → Actions
   - `AZURE_WEBAPP_PUBLISH_PROFILE_PRODUCTION`を更新
   - ダウンロードした`.PublishSettings`ファイルの内容をコピー＆ペースト

3. **確認事項**:
   - publish-profileが正しいApp Service（`ec-ranger-backend-prod`）を指しているか
   - publish-profileが最新か

---

### ステップ4: Kuduでファイルを確認

1. **Kudu（高度なツール）を開く**
   - Azure Portal → App Service → 開発ツール → 高度なツール → 移動

2. **ファイルの更新日時を確認**
   - `D:\home\site\wwwroot\`に移動
   - DLLファイル（例: `ShopifyAnalyticsApi.dll`）の更新日時を確認
   - `appsettings.Production.json`の更新日時を確認

3. **確認事項**:
   - ファイルの更新日時が最新のデプロイ日時と一致しているか
   - ファイルの内容が最新か

---

## 🔧 解決方法

### 方法1: publish-profileを更新（推奨）

**手順**:
1. Azure Portal → App Service → 概要 → 「発行プロファイルのダウンロード」
2. `.PublishSettings`ファイルをダウンロード
3. GitHub → Settings → Secrets and variables → Actions
4. `AZURE_WEBAPP_PUBLISH_PROFILE_PRODUCTION`を更新
5. バックエンドを再デプロイ

---

### 方法2: デプロイログを詳細に確認

**手順**:
1. GitHub Actionsのデプロイログを開く
2. 「🚀 Deploy to Azure App Service」ステップのログを詳細に確認
3. エラーメッセージがないか確認
4. デプロイが実際に成功しているか確認

**確認すべきログメッセージ**:
- `Deploying to App Service...`
- `Deployment successful`
- `Files uploaded successfully`
- エラーメッセージがないか

---

### 方法3: デプロイ方法を変更（Web Deploy → ZIP Deploy）

**問題**: Web Deployが正しく動作しない場合、ZIP Deployに変更する方法もあります。

**修正内容**（`.github/workflows/production_backend.yml`）:
```yaml
- name: 📦 Create deployment package
  run: |
    cd backend/ShopifyAnalyticsApi
    Compress-Archive -Path ./published/* -DestinationPath ./deploy.zip -Force

- name: 🚀 Deploy to Azure App Service (Production - Japan West)
  uses: azure/webapps-deploy@v3
  with:
    app-name: ${{ env.APP_NAME }}
    package: backend/ShopifyAnalyticsApi/deploy.zip
    type: zip
```

**注意**: この方法では`publish-profile`は不要ですが、環境変数の設定が必要な場合があります。

---

### 方法4: デプロイスロットを確認

**手順**:
1. Azure Portal → App Service → デプロイ スロット
2. どのスロットにデプロイされているか確認
3. 本番スロットにスワップされているか確認
4. 必要に応じて、スワップを実行

---

## 🚀 推奨される確認手順（優先順位順）

### ステップ1: GitHub Actionsのデプロイログを確認（最重要）

1. GitHub Actionsの最新のデプロイ実行を開く
2. 「🚀 Deploy to Azure App Service」ステップのログを詳細に確認
3. エラーメッセージがないか確認
4. デプロイが実際に成功しているか確認

### ステップ2: Azure Portalでデプロイ履歴を確認

1. Azure Portal → App Service → デプロイ → デプロイセンター
2. 最新のデプロイ日時を確認
3. デプロイが成功しているか確認

### ステップ3: publish-profileを更新

1. 最新のpublish-profileをダウンロード
2. GitHub Secretsを更新
3. バックエンドを再デプロイ

### ステップ4: Kuduでファイルを確認

1. Kuduでファイルの更新日時を確認
2. デプロイが反映されているか確認

---

## 📝 チェックリスト

### デプロイ前の確認

- [ ] GitHub Secretsで`AZURE_WEBAPP_PUBLISH_PROFILE_PRODUCTION`が設定されている
- [ ] publish-profileが最新である
- [ ] ワークフローファイルの`APP_NAME`が正しい（`ec-ranger-backend-prod`）

### デプロイ後の確認

- [ ] GitHub Actionsのデプロイログで、デプロイが成功している
- [ ] Azure Portalのデプロイ履歴で、デプロイが成功している
- [ ] Kuduでファイルの更新日時が最新である
- [ ] DLLファイルの更新日時が最新である
- [ ] `appsettings.Production.json`の内容が最新である

---

## 🔧 トラブルシューティング

### デプロイログにエラーが表示されない場合

1. **ログを詳細に確認**
   - すべてのステップのログを確認
   - 警告メッセージも確認

2. **デプロイが実際に開始されているか確認**
   - 「Deploying to App Service...」というメッセージがあるか
   - ファイルがアップロードされているか

3. **ネットワークの問題を確認**
   - タイムアウトエラーがないか
   - 接続エラーがないか

### publish-profileが無効な場合

1. **最新のpublish-profileをダウンロード**
   - Azure Portal → App Service → 概要 → 「発行プロファイルのダウンロード」

2. **GitHub Secretsを更新**
   - ダウンロードした`.PublishSettings`ファイルの内容をコピー
   - GitHub Secretsに貼り付け

3. **再デプロイ**
   - バックエンドを再デプロイ
   - デプロイが成功するか確認

---

## 📚 参考情報

### 関連ドキュメント

- [Azure App Service デプロイ設定](https://learn.microsoft.com/ja-jp/azure/app-service/deploy-configure-options)
- [GitHub Actions Azure Web Apps デプロイ](https://github.com/marketplace/actions/azure-webapps-deploy)

### 関連ファイル

- `.github/workflows/production_backend.yml`
- `backend/ShopifyAnalyticsApi/ShopifyAnalyticsApi.csproj`

---

**最終更新**: 2026年1月19日  
**作成者**: 福田  
**修正者**: AI Assistant
