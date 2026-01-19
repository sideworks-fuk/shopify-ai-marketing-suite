# app_offline.htm を使用したデプロイ対策

## 📋 概要

デプロイスロットが使えない環境（Basicプラン以下）で、ファイルロック問題を解決するための`app_offline.htm`を使用したデプロイ方法です。

---

## 🎯 app_offline.htmとは

`app_offline.htm`は、ASP.NET Coreアプリケーションで使用される仕組みで、このファイルが`wwwroot`ディレクトリに配置されると、アプリケーションが自動的にシャットダウンされます。

**動作**:
1. `app_offline.htm`が配置されると、ASP.NET Coreがアプリをシャットダウン
2. ファイルロックが解除される
3. デプロイが可能になる
4. `app_offline.htm`を削除すると、アプリが自動的に再起動

**メリット**:
- ✅ ファイルロック問題を解決
- ✅ App Serviceを手動で停止する必要がない
- ✅ デプロイスロットが不要（Basicプラン以下でも使用可能）

**デメリット**:
- ⚠️ デプロイ中は短時間のダウンタイムが発生（通常10-30秒）
- ⚠️ デプロイ中はユーザーに「更新中」メッセージが表示される

---

## 🔧 実装方法

### GitHub Actionsワークフローでの実装

```yaml
# 直接デプロイする場合（app_offline.htmを使用）
- name: 📄 Create app_offline.htm
  if: github.event.inputs.use_deployment_slot == 'NO - 直接デプロイ（停止が必要）'
  run: |
    echo "<html><head><title>Updating...</title></head><body><h1>Application is being updated. Please wait...</h1><p>This page will automatically refresh when the update is complete.</p></body></html>" > app_offline.htm
  shell: bash

- name: 🚀 Deploy app_offline.htm (Shutdown App)
  if: github.event.inputs.use_deployment_slot == 'NO - 直接デプロイ（停止が必要）'
  uses: azure/webapps-deploy@v3
  with:
    app-name: ${{ env.APP_NAME }}
    publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE_PRODUCTION }}
    package: app_offline.htm
  continue-on-error: false

- name: ⏳ Wait for app shutdown
  if: github.event.inputs.use_deployment_slot == 'NO - 直接デプロイ（停止が必要）'
  run: |
    echo "Waiting 15 seconds for application to shut down..."
    sleep 15
    echo "✅ Application shutdown complete"
  shell: bash

- name: 🚀 Deploy application
  if: github.event.inputs.use_deployment_slot == 'NO - 直接デプロイ（停止が必要）'
  uses: azure/webapps-deploy@v3
  with:
    app-name: ${{ env.APP_NAME }}
    publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE_PRODUCTION }}
    package: backend/ShopifyAnalyticsApi/published
  continue-on-error: false

- name: 🗑️ Remove app_offline.htm (Restart App)
  if: github.event.inputs.use_deployment_slot == 'NO - 直接デプロイ（停止が必要）'
  uses: azure/webapps-deploy@v3
  with:
    app-name: ${{ env.APP_NAME }}
    publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE_PRODUCTION }}
    package: .
  continue-on-error: false
```

**注意**: 最後のステップ（`app_offline.htm`の削除）は、空のディレクトリをデプロイするか、Azure CLIを使用して削除する必要があります。

---

## 🔄 より確実な実装（Azure CLIを使用）

```yaml
- name: 🗑️ Remove app_offline.htm (Restart App)
  if: github.event.inputs.use_deployment_slot == 'NO - 直接デプロイ（停止が必要）'
  uses: azure/CLI@v2
  with:
    inlineScript: |
      echo "Removing app_offline.htm to restart the application..."
      az webapp deployment source config-zip \
        --resource-group ec-ranger-prod \
        --name ${{ env.APP_NAME }} \
        --src empty.zip
      # または、Kudu APIを使用して削除
      # az rest --method DELETE \
      #   --uri "https://${{ env.APP_NAME }}.scm.azurewebsites.net/api/vfs/site/wwwroot/app_offline.htm"
  env:
    AZURE_CREDENTIALS: ${{ secrets.AZURE_CREDENTIALS }}
```

---

## 📝 実装の詳細

### ステップ1: app_offline.htmの作成

```bash
echo "<html><head><title>Updating...</title></head><body><h1>Application is being updated. Please wait...</h1><p>This page will automatically refresh when the update is complete.</p></body></html>" > app_offline.htm
```

**内容**:
- ユーザーに「更新中」であることを通知
- 自動リフレッシュの説明（オプション）

---

### ステップ2: app_offline.htmのデプロイ

```yaml
- name: 🚀 Deploy app_offline.htm (Shutdown App)
  uses: azure/webapps-deploy@v3
  with:
    app-name: ${{ env.APP_NAME }}
    publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE_PRODUCTION }}
    package: app_offline.htm
```

**動作**:
- `app_offline.htm`が`wwwroot`ディレクトリに配置される
- ASP.NET Coreがアプリをシャットダウン
- ファイルロックが解除される

---

### ステップ3: 待機

```yaml
- name: ⏳ Wait for app shutdown
  run: |
    echo "Waiting 15 seconds for application to shut down..."
    sleep 15
    echo "✅ Application shutdown complete"
  shell: bash
```

**待機時間**:
- **推奨**: 15-30秒
- アプリのサイズやプロセス数によって調整が必要な場合がある

---

### ステップ4: 本体アプリケーションのデプロイ

```yaml
- name: 🚀 Deploy application
  uses: azure/webapps-deploy@v3
  with:
    app-name: ${{ env.APP_NAME }}
    publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE_PRODUCTION }}
    package: backend/ShopifyAnalyticsApi/published
```

**動作**:
- ファイルロックが解除されているため、正常にデプロイできる
- DLLファイルが更新される

---

### ステップ5: app_offline.htmの削除

```yaml
- name: 🗑️ Remove app_offline.htm (Restart App)
  uses: azure/CLI@v2
  with:
    inlineScript: |
      az rest --method DELETE \
        --uri "https://${{ env.APP_NAME }}.scm.azurewebsites.net/api/vfs/site/wwwroot/app_offline.htm" \
        --headers "Authorization=Bearer $(az account get-access-token --query accessToken -o tsv)"
```

**動作**:
- `app_offline.htm`が削除される
- ASP.NET Coreがアプリを自動的に再起動
- ユーザーがアクセス可能になる

---

## ⚠️ 注意事項

### 1. ダウンタイム

- **発生時間**: 通常10-30秒
- **影響**: デプロイ中はユーザーに「更新中」メッセージが表示される
- **推奨**: メンテナンス時間帯（深夜など）にデプロイ

---

### 2. app_offline.htmの削除

- **自動削除**: デプロイが成功すると、`app_offline.htm`は自動的に削除される場合がある
- **手動削除**: 削除されない場合は、Azure CLIまたはKudu APIで削除する必要がある

---

### 3. エラーハンドリング

- **デプロイ失敗時**: `app_offline.htm`が残る可能性がある
- **対策**: エラー時にも`app_offline.htm`を削除する処理を追加

```yaml
- name: 🗑️ Remove app_offline.htm (Error Recovery)
  if: failure()
  uses: azure/CLI@v2
  with:
    inlineScript: |
      az rest --method DELETE \
        --uri "https://${{ env.APP_NAME }}.scm.azurewebsites.net/api/vfs/site/wwwroot/app_offline.htm" \
        --headers "Authorization=Bearer $(az account get-access-token --query accessToken -o tsv)"
```

---

## 🔄 デプロイスロットとの比較

| 項目 | app_offline.htm | デプロイスロット |
|------|----------------|-----------------|
| **プラン要件** | Basic以下でも使用可能 | Standard以上が必要 |
| **ダウンタイム** | 10-30秒発生 | ゼロダウンタイム |
| **コスト** | 追加コストなし | Standardプランが必要（約$73/月） |
| **実装の複雑さ** | 比較的簡単 | やや複雑 |
| **ロールバック** | 手動で前バージョンに戻す | スワップで即座にロールバック |

---

## 📚 参考資料

- [ASP.NET Core app_offline.htm](https://docs.microsoft.com/ja-jp/aspnet/core/host-and-deploy/aspnet-core-module?view=aspnetcore-8.0#app_offlinehtm)
- [Azure App Service デプロイ](https://docs.microsoft.com/ja-jp/azure/app-service/deploy-best-practices)

---

**最終更新**: 2026年1月19日  
**作成者**: 福田  
**修正者**: AI Assistant
