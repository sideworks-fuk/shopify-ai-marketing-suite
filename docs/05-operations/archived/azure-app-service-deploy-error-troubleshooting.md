# Azure App Service デプロイエラー トラブルシューティング

## エラー概要
```
Deployment Failed, Error: Failed to deploy web package using OneDeploy to App Service. Bad Request (CODE: 400)
```

## 考えられる原因と対策

### 1. Azure App Serviceプラン変更の影響

#### 問題
- Azure App Serviceのプラン（Basic、Standard、Premium等）を変更した場合
- 新しいプランでサポートされていない機能や設定が含まれている

#### 対策
1. **デプロイスロットの確認**
   ```yaml
   # 修正前
   slot-name: 'Production'
   
   # 修正後（削除）
   # slot-name: 'Production'
   ```

2. **プラン機能の確認**
   - Basicプラン: デプロイスロット非対応
   - Standard以上: デプロイスロット対応

### 2. アプリケーション設定の問題

#### 確認項目
1. **Azure Portalでの設定確認**
   - App Service > 設定 > アプリケーション設定
   - 必要な環境変数が正しく設定されているか

2. **接続文字列の確認**
   - データベース接続文字列
   - その他の外部サービス接続

### 3. パッケージサイズの問題

#### 対策
1. **不要なファイルの除外**
   ```xml
   <!-- .csprojに追加 -->
   <ItemGroup>
     <Content Include="**/*.md" Exclude="bin/**/*;obj/**/*" />
   </ItemGroup>
   ```

2. **ビルド設定の最適化**
   ```yaml
   - name: Publish with dotnet
     run: |
       cd backend/ShopifyTestApi
       dotnet publish -c Release -o ${{env.DOTNET_ROOT}}/myapp --self-contained false
   ```

### 4. 認証・認可の問題

#### 確認項目
1. **Publish Profileの有効性**
   - GitHub Secretsの `AZUREAPPSERVICE_PUBLISHPROFILE` が正しいか
   - Publish Profileが期限切れでないか

2. **Azure AD認証**
   - サービスプリンシパルの権限確認
   - アプリケーションのアクセス権限確認

## 修正手順

### Step 1: デプロイスロット設定の削除
```yaml
# .github/workflows/azure-app-service.yml
- name: 'Deploy to Azure Web App (Development)'
  id: deploy-to-webapp
  uses: azure/webapps-deploy@v3
  with:
    app-name: 'ShopifyTestApi20250720173320'
    # slot-name: 'Production'  # この行を削除またはコメントアウト
    publish-profile: ${{ secrets.AZUREAPPSERVICE_PUBLISHPROFILE }}
    package: .
```

### Step 2: 新しいPublish Profileの取得
1. Azure Portal > App Service > 概要
2. 「発行プロファイルのダウンロード」をクリック
3. ダウンロードしたファイルの内容をGitHub Secretsに設定

### Step 3: アプリケーション設定の確認
```bash
# Azure CLIで確認
az webapp config appsettings list --name ShopifyTestApi20250720173320 --resource-group <resource-group-name>
```

## 予防策

### 1. プラン変更時の注意点
- プラン変更前にデプロイ設定を確認
- 新しいプランの機能制限を事前に調査
- 段階的な移行を検討

### 2. 定期的な設定確認
- Publish Profileの有効期限管理
- アプリケーション設定の定期見直し
- 依存関係の更新確認

## 参考リンク
- [Azure App Service プラン](https://docs.microsoft.com/ja-jp/azure/app-service/overview-hosting-plans)
- [デプロイスロット](https://docs.microsoft.com/ja-jp/azure/app-service/deploy-staging-slots)
- [GitHub Actions for Azure](https://docs.microsoft.com/ja-jp/azure/developer/github/actions-deploy) 