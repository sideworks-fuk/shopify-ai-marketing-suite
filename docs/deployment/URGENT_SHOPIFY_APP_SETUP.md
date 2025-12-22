# 🚨 緊急: Shopifyアプリ本番環境セットアップ手順

## 最終更新: 2025-12-22

## 📋 必要な作業リスト

### 1. Shopify Partnersダッシュボードでの作業

1. **Shopify Partners にログイン**
   - https://partners.shopify.com

2. **新しいアプリを作成**
   - アプリ名: EC Ranger
   - アプリタイプ: Public App

3. **アプリ設定**
   ```
   App URL: https://brave-sea-038f17a00.1.azurestaticapps.net
   
   Allowed redirection URL(s):
   - https://brave-sea-038f17a00.1.azurestaticapps.net/api/shopify/callback
   - https://brave-sea-038f17a00.1.azurestaticapps.net/auth/success
   - https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net/api/shopify/callback
   ```

4. **必要なスコープ（権限）**
   - ✅ read_orders
   - ✅ read_products  
   - ✅ read_customers
   - ✅ read_reports

5. **APIクレデンシャルをメモ**
   - Client ID (API Key): [取得した値]
   - Client Secret (API Secret Key): [取得した値]

### 2. Azure Portal での環境変数設定

#### Backend (App Service) の設定

1. **Azure Portal にログイン**
   - https://portal.azure.com

2. **App Service を選択**
   - リソース名: shopifytestapi20250720173320-aed5bhc0cferg2hm

3. **構成 > アプリケーション設定**に以下を追加:

```bash
# Shopify設定
Shopify__ApiKey=[Shopify Partnersで取得したClient ID]
Shopify__ApiSecret=[Shopify Partnersで取得したClient Secret]
Shopify__EncryptionKey=[32文字のランダムな文字列を生成]
Shopify__WebhookSecret=[Shopify Partnersで取得したWebhook Secret]
Shopify__Frontend__BaseUrl=https://brave-sea-038f17a00.1.azurestaticapps.net

# フロントエンドURL
Frontend__BaseUrl=https://brave-sea-038f17a00.1.azurestaticapps.net

# JWT設定
Jwt__Key=production-secret-key-at-least-256-bits-long-for-jwt-signing-2025
Jwt__Issuer=ec-ranger
Jwt__Audience=shopify-stores

# 認証設定
Authentication__Mode=AllAllowed
Authentication__Secret=production-secret-key-at-least-256-bits-long-for-jwt-signing-2025
```

#### Frontend (Static Web Apps) の設定

1. **Static Web Apps を選択**
   - リソース名: brave-sea-038f17a00

2. **構成 > アプリケーション設定**に以下を追加:

```bash
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_APP_NAME=EC Ranger
NEXT_PUBLIC_FRONTEND_URL=https://brave-sea-038f17a00.1.azurestaticapps.net
NEXT_PUBLIC_BACKEND_URL=https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net
NEXT_PUBLIC_SHOPIFY_API_KEY=[Shopify Partnersで取得したClient ID]
NEXT_PUBLIC_USE_HTTPS=true
```

### 3. デプロイの実行

1. **GitHubにコードをプッシュ**
```bash
git add .
git commit -m "本番環境用Shopifyアプリ設定更新"
git push origin develop
```

2. **GitHub Actions でデプロイ**
   - https://github.com/[your-repo]/actions
   - "Manual Deploy All" ワークフローを手動実行

### 4. インストールURLの生成

本番環境のインストールURL:
```
https://brave-sea-038f17a00.1.azurestaticapps.net/install?shop=[customer-store].myshopify.com
```

例:
```
https://brave-sea-038f17a00.1.azurestaticapps.net/install?shop=test-store-2025.myshopify.com
```

## 🔍 動作確認手順

1. **インストールページの確認**
   - https://brave-sea-038f17a00.1.azurestaticapps.net/install
   - ページが表示されることを確認

2. **バックエンドAPIの確認**
   - https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net/api/health
   - 200 OKが返ることを確認

3. **テストインストール**
   - 開発ストアでインストールURLにアクセス
   - Shopify認証画面が表示されることを確認
   - インストール完了後、成功ページにリダイレクトされることを確認

## ⚠️ 重要な注意事項

1. **APIシークレットは絶対に公開しない**
   - GitHubにコミットしない
   - フロントエンドのコードに含めない

2. **本番環境の設定は Azure Portal でのみ行う**
   - appsettings.Production.json にシークレットを書かない

3. **SSL証明書の確認**
   - すべてのURLがHTTPSであることを確認

## 📞 サポート情報

問題が発生した場合:
1. Azure Portal のログを確認
2. GitHub Actions のログを確認
3. ブラウザの開発者ツールでエラーを確認

## 🚀 お客様への提供情報

### インストール手順書

```markdown
# EC Ranger インストール手順

1. 以下のURLにアクセスしてください:
   https://brave-sea-038f17a00.1.azurestaticapps.net/install

2. ストアドメイン（例: your-store）を入力

3. 「アプリをインストール」をクリック

4. Shopifyの認証画面で「インストール」をクリック

5. セットアップウィザードに従って初期設定を完了

インストール完了後、ダッシュボードから各種分析機能をご利用いただけます。
```

## 📝 チェックリスト

- [ ] Shopify Partners でアプリを作成
- [ ] APIクレデンシャルを取得
- [ ] Azure Portal でBackend環境変数を設定
- [ ] Azure Portal でFrontend環境変数を設定
- [ ] GitHubにコードをプッシュ
- [ ] デプロイを実行
- [ ] インストールページの動作確認
- [ ] テストストアでインストール確認
- [ ] お客様にURLを提供
