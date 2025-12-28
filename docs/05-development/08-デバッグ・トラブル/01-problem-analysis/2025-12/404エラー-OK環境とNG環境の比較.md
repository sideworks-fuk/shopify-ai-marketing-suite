# 404エラー - OK環境とNG環境の比較

## 作成日
2025-12-27

## 目的
インストール時にインストールボタンの画面に遷移せずに404が起きる問題について、OK環境（正常に動作している環境）とNG環境（問題が発生している環境）を比較し、違いを特定する。

---

## 比較対象

### OK環境
- **環境**: 本番環境（Production）
- **フロントエンドURL**: `https://black-flower-004e1de00.2.azurestaticapps.net`
- **バックエンドURL**: `ec-ranger-backend-prod-ghf3bbarghcwh4gn.japanwest-01.azurewebsites.net`
- **Shopifyアプリ**: `EC Ranger-xn-fbkq6e5da0fpb`
- **Client ID**: `706a7579...`（後半はマスク）

### NG環境
- **環境**: 開発環境（Development）
- **フロントエンドURL**: `https://brave-sea-038f17a00-development.eastasia.1.azurestaticapps.net`
- **バックエンドURL**: `shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net`
- **Shopifyアプリ**: `ECレンジャー(local)`
- **Client ID**: `2d7e0e1f...`（後半はマスク）

---

## 1. Shopifyアプリ設定（Shopify Partner Dashboard）の比較

### アプリ情報

#### アプリを提供する組織
- **OK環境**: アクセスネット
- **NG環境**: FUK

#### アプリ名
- **OK環境**: `EC Ranger-xn-fbkq6e5da0fpb`
- **NG環境**: `ECレンジャー(local)`
- **違い**: **異なるアプリ名** ⚠️

#### アプリタイプ（表示）
- **OK環境**: カスタムアプリ
- **NG環境**: カスタムアプリ
- **違い**: **同じタイプ** ✅

---

### 2. OAuth設定（OAuth Settings）

#### Redirect URLs
- **OK環境**: 
  - `https://black-flower-004e1de00.2.azurestaticapps.net/api/shopify/callback`
  - `https://black-flower-004e1de00.2.azurestaticapps.net/auth/success`
  - `https://ec-ranger-backend-prod-ghf3bbarghcwh4gn.japanwest-01.azurewebsites.net/api/shopify/callback`
- **NG環境**: 
  - `https://brave-sea-038f17a00-development.eastasia.1.azurestaticapps.net`（ルートURL、パスなし）
  - `https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net/api/shopify/callback`
- **違い**: 
  - **OK環境には`/auth/success`が含まれているが、NG環境には含まれていない** ⚠️
  - **OK環境の1つ目は`/api/shopify/callback`、NG環境の1つ目はルートURL（パスなし）** ⚠️
  - OK環境は3つのURL、NG環境は2つのURL

#### Use legacy install flow
- **OK環境**: `false`（新しいインストールフローを使用）
- **NG環境**: `true`（レガシーインストールフローを使用）
- **違い**: **異なるインストールフロー** ⚠️⚠️⚠️
- **影響**: レガシーインストールフローと新しいインストールフローでは、OAuthフローの動作が異なります

#### Scopes
- **OK環境**: `read_customers,read_orders,read_products`
- **NG環境**: `read_customers,read_orders,read_products`
- **違い**: **同じスコープ** ✅

---

### 3. データベース（ShopifyAppsテーブル）の比較

#### ClientId
- **OK環境**: `706a7579...`（後半はマスク）
- **NG環境**: `2d7e0e1f...`（後半はマスク）
- **違い**: **異なるClientId** ⚠️

#### SecretKey
- **OK環境**: `[REDACTED]`（シークレットのため非表示）
- **NG環境**: `be83457b1f63f4c9b20d3ea5e62b5ef0`
- **違い**: **異なるSecretKey** ⚠️

#### AppUrl
- **OK環境**: `https://black-flower-004e1de00.2.azurestaticapps.net`（本番環境）
- **NG環境**: `https://brave-sea-038f17a00-development.eastasia.1.azurestaticapps.net`（開発環境）
- **違い**: **異なる環境** ⚠️

#### RedirectUri
- **OK環境**: `https://black-flower-004e1de00.2.azurestaticapps.net/api/shopify/callback`
- **NG環境**: `(空)`
- **違い**: **NG環境のRedirectUriが空** ⚠️⚠️⚠️

#### AppType（ShopifyAppsテーブル）
- **OK環境**: `Custom`
- **NG環境**: `Public`（テーブル上の値）
- **違い**: **テーブル上の値が異なる** ⚠️
- **注意**: Shopify Partner Dashboardでは両方とも「カスタムアプリ」と表示されている

#### Scopes
- **OK環境**: `read_orders,read_products,read_customers`
- **NG環境**: `read_orders,read_products,read_customers`
- **違い**: **同じスコープ** ✅

---

### 4. 環境変数（GitHub Actions）の比較

#### フロントエンド環境変数

##### NEXT_PUBLIC_API_URL
- **OK環境**: `https://ec-ranger-backend-prod-ghf3bbargbc4hfgh.japanwest-01.azurewebsites.net/`
- **NG環境**: `https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net`
- **違い**: **異なるバックエンドURL** ⚠️

##### Shopify API Key
- **OK環境**: `SHOPIFY_API_KEY_PRODUCTION_2` = `706a757915dedce54806c0a179bee05d`
- **NG環境**: `NEXT_PUBLIC_SHOPIFY_API_KEY` = `2d7e0e1f5da14eb9d299aa746738e44b`
- **違い**: 
  - **環境変数名が異なる** ⚠️
  - **フロントエンドのコードは`NEXT_PUBLIC_SHOPIFY_API_KEY`を参照している**
  - OK環境では`SHOPIFY_API_KEY_PRODUCTION_2`という環境変数名が使用されている
  - 環境変数名が異なるため、フロントエンドが正しいAPI Keyを読み込めない可能性

---

### 5. バックエンド設定（appsettings.json）の比較

#### 使用しているappsettingsファイル
- **OK環境**: `appsettings.Production.json`
- **NG環境**: `appsettings.Development.json`
- **違い**: **異なるappsettingsファイルを使用** ⚠️

#### Authentication.Mode
- **OK環境（Production）**: `OAuthRequired`
- **NG環境（Development）**: `DemoAllowed`
- **違い**: **異なる認証モード** ⚠️⚠️⚠️
- **影響**: OK環境はOAuth認証が必須、NG環境はデモモードも許可

#### Shopify.ApiKey
- **OK環境（Production）**: `""`（空、環境変数で設定される想定）
- **NG環境（Development）**: `""`（空、環境変数で設定される想定）
- **違い**: **両方とも空** ✅
- **確認**: 各環境の実際の値（環境変数またはAzure App Serviceの設定）を確認する必要がある

#### Shopify.ApiSecret
- **OK環境（Production）**: `""`（空、環境変数で設定される想定）
- **NG環境（Development）**: `""`（空、環境変数で設定される想定）
- **違い**: **両方とも空** ✅
- **確認**: 各環境の実際の値（環境変数またはAzure App Serviceの設定）を確認する必要がある

#### Cors.AllowedOrigins
- **OK環境（Production）**: 
  - `https://white-island-08e0a6300.2.azurestaticapps.net`
  - `https://white-island-08e0a6300.1.azurestaticapps.net`
  - `https://black-flower-004e1de00.2.azurestaticapps.net`
  - `https://black-flower-004e1de00.1.azurestaticapps.net`
- **NG環境（Development）**: 
  - `https://localhost:3000`
  - `http://localhost:3000`
  - `https://fbcf2c79cfbf.ngrok-free.app`
  - `https://brave-sea-038f17a00-development.eastasia.1.azurestaticapps.net`
  - `https://brave-sea-038f17a00-staging.eastasia.1.azurestaticapps.net`
  - `https://brave-sea-038f17a00.1.azurestaticapps.net`
- **違い**: 
  - **異なるフロントエンドURLが設定されている** ⚠️
  - OK環境のフロントエンドURL（`https://black-flower-004e1de00.2.azurestaticapps.net`）が含まれている ✅
  - NG環境のフロントエンドURL（`https://brave-sea-038f17a00-development.eastasia.1.azurestaticapps.net`）が含まれている ✅

---

## 発見された違い

### 重要な違い

1. **Use legacy install flowが異なる** ⚠️⚠️⚠️
   - OK環境: `false`（新しいインストールフローを使用）
   - NG環境: `true`（レガシーインストールフローを使用）
   - **影響**: インストールフローの動作が異なる可能性が高い
   - **優先度**: 最優先

2. **ShopifyAppsテーブルのRedirectUriが空** ⚠️⚠️⚠️
   - OK環境: `https://black-flower-004e1de00.2.azurestaticapps.net/api/shopify/callback`
   - NG環境: `(空)`
   - **影響**: OAuthフローでリダイレクト先が設定されていない可能性
   - **注意**: コードレベルでは使用されていないが、データの整合性を保つために設定しておくことを推奨

3. **ShopifyAppsテーブルのAppTypeが異なる** ⚠️
   - OK環境: `Custom`（カスタムアプリ）
   - NG環境: `Public`（テーブル上の値）
   - **注意**: Shopify Partner Dashboardでは両方とも「カスタムアプリ」と表示されている
   - **影響**: テーブル上の値と実際の表示が異なる可能性
   - **注意**: コードレベルではデバッグエンドポイントでのみ使用

4. **異なるClient IDを使用している** ⚠️⚠️
   - OK環境: `706a7579...`（後半はマスク）
   - NG環境: `2d7e0e1f...`（後半はマスク）
   - **影響**: 異なるShopifyアプリを使用しているため、OAuthフローが異なる可能性

5. **Redirect URLsが異なる**
   - OK環境: 3つのURL（`/api/shopify/callback`、`/auth/success`、本番バックエンドの`/api/shopify/callback`）
   - NG環境: 2つのURL（開発環境のルートURL（パスなし）、開発バックエンドの`/api/shopify/callback`）
   - **違い**: 
     - **OK環境には`/auth/success`が含まれているが、NG環境には含まれていない** ⚠️
     - **OK環境の1つ目は`/api/shopify/callback`、NG環境の1つ目はルートURL（パスなし）** ⚠️
   - **影響**: OAuthフローでリダイレクト先が異なる可能性

6. **環境変数名が異なる** ⚠️
   - OK環境: `SHOPIFY_API_KEY_PRODUCTION_2`
   - NG環境: `NEXT_PUBLIC_SHOPIFY_API_KEY`
   - **影響**: フロントエンドが参照する環境変数名が異なる可能性
   - **確認**: GitHub Actionsのワークフローで`SHOPIFY_API_KEY_PRODUCTION_2`を`NEXT_PUBLIC_SHOPIFY_API_KEY`にマッピングしているか確認

7. **バックエンドのappsettingsファイルが異なる** ⚠️
   - OK環境: `appsettings.Production.json`を使用
   - NG環境: `appsettings.Development.json`を使用
   - **影響**: 異なる設定ファイルを使用しているため、設定値が異なる可能性

8. **Authentication.Modeが異なる** ⚠️⚠️
   - OK環境（Production）: `OAuthRequired`（OAuth認証が必須）
   - NG環境（Development）: `DemoAllowed`（デモモードも許可）
   - **影響**: OK環境はOAuth認証が必須、NG環境はデモモードも許可されるため、認証フローが異なる可能性

---

## 仮説

### 最も可能性が高い原因

1. **Use legacy install flowが`true`になっている**
   - レガシーインストールフローと新しいインストールフローでは、OAuthフローの動作が異なります
   - OK環境は`false`で正常に動作しているため、NG環境も同じ設定にする必要があります

2. **Redirect URLsに`/auth/success`が含まれていない**
   - OAuthフロー完了後のリダイレクト先が設定されていない可能性があります

3. **環境変数名の不一致**
   - フロントエンドが参照する環境変数名が異なるため、正しいAPI Keyを読み込めない可能性があります

---

## 次のステップ

1. **修正アクション項目の確認**: [404エラー-修正アクション項目.md](./404エラー-修正アクション項目.md)
2. **追加確認項目の確認**: [404エラー-追加確認項目.md](./404エラー-追加確認項目.md)
3. **コードレベルでの影響調査**: [404エラー-ShopifyAppsテーブル影響調査.md](./404エラー-ShopifyAppsテーブル影響調査.md)

---

## 更新履歴

- 2025-12-27: 初版作成（OK環境とNG環境の比較）
