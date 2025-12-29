# shopify.app.toml デプロイ解説

## 作成日
2025-12-26

## 概要

`shopify.app.toml` のデプロイについて、デプロイ先、デプロイ方法、デプロイされる内容を詳しく解説します。

---

## 📋 目次

1. [shopify.app.tomlとは](#shopifyapptomlとは)
2. [デプロイ先の理解](#デプロイ先の理解)
3. [デプロイ方法](#デプロイ方法)
4. [デプロイされる内容](#デプロイされる内容)
5. [2段階のデプロイプロセス](#2段階のデプロイプロセス)
6. [実際のデプロイフロー](#実際のデプロイフロー)
7. [本プロジェクトでの適用](#本プロジェクトでの適用)

---

## shopify.app.tomlとは

`shopify.app.toml` は、Shopify CLIが使用するアプリの設定ファイルです。このファイルには以下のような情報が含まれます：

- アプリ名、Client ID
- アプリURL（`application_url`）
- アクセススコープ（`scopes`）
- リダイレクトURL（`redirect_urls`）
- Webhook設定
- アプリ拡張機能の設定

**重要**: このファイルは**アプリのコード**ではなく、**アプリの設定情報**を定義します。

---

## デプロイ先の理解

### 重要なポイント：2つの異なるデプロイ先

`shopify.app.toml` のデプロイは、**アプリのコードのデプロイ**とは**別物**です。

#### 1. アプリのコードのデプロイ先

- **デプロイ先**: ホスティングサービス（Azure Static Web Apps、Azure App Service、Google Cloud Run、Fly.ioなど）
- **デプロイ内容**: アプリのソースコード、ビルド成果物
- **デプロイ方法**: GitHub Actions、Azure CLI、各ホスティングサービスのCLIなど
- **例**: 
  - フロントエンド: `https://brave-sea-038f17a00.1.azurestaticapps.net`
  - バックエンド: `https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net`

#### 2. shopify.app.tomlのデプロイ先

- **デプロイ先**: **Shopify Partners Dashboard（Shopify側）**
- **デプロイ内容**: アプリの設定情報（URL、スコープ、リダイレクトURLなど）
- **デプロイ方法**: `shopify app deploy` コマンド
- **結果**: Shopify側のアプリ設定が更新される

### なぜ2つに分かれているのか？

```
┌─────────────────────────────────────────────────────────────┐
│ アプリのコード（フロントエンド・バックエンド）                │
│ ↓                                                           │
│ ホスティングサービス（Azure Static Web Apps等）にデプロイ    │
│ ↓                                                           │
│ アプリが動作するURLが確定                                    │
│ 例: https://brave-sea-038f17a00.1.azurestaticapps.net      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ shopify.app.toml（アプリの設定ファイル）                    │
│ ↓                                                           │
│ Shopify CLIでShopify Partners Dashboardにデプロイ           │
│ ↓                                                           │
│ Shopify側のアプリ設定が更新される                            │
│ - application_url: 上記のURLが設定される                    │
│ - redirect_urls: コールバックURLが設定される                │
│ - scopes: アクセススコープが設定される                      │
└─────────────────────────────────────────────────────────────┘
```

**Shopify側は、アプリがどこで動作しているか（URL）を知る必要があります。**
そのため、アプリのコードをホスティングサービスにデプロイした後、そのURLをShopify側に通知する必要があります。これが `shopify.app.toml` のデプロイです。

---

## デプロイ方法

### 基本的なデプロイコマンド

```bash
shopify app deploy
```

このコマンドを実行すると：

1. ローカルの `shopify.app.toml` ファイルを読み込む
2. アプリの設定情報をShopify Partners Dashboardに送信
3. **アプリバージョン**が作成される（設定のスナップショット）
4. 新しいアプリバージョンがリリースされる（既存のバージョンが置き換えられる）

### デプロイ前の準備

#### Step 1: shopify.app.tomlの編集

デプロイ前に、`shopify.app.toml` の `application_url` を本番環境のURLに設定します：

```toml
# shopify.app.toml
name = "EC Ranger"
client_id = "your-client-id"
application_url = "https://brave-sea-038f17a00.1.azurestaticapps.net"  # 本番環境のURL
embedded = true

[access_scopes]
scopes = "read_orders,read_products,read_customers"

[auth]
redirect_urls = [
  "https://brave-sea-038f17a00.1.azurestaticapps.net/api/shopify/callback",
]
```

#### Step 2: デプロイの実行

```bash
shopify app deploy
```

### デプロイオプション

#### バージョン名とメッセージを指定

```bash
shopify app deploy --version="v1.0.0" --message="初回リリース"
```

#### リリースせずにバージョンを作成

```bash
shopify app deploy --no-release
```

後でリリースする場合：

```bash
shopify app release --version="v1.0.0"
```

#### 強制的にデプロイ（確認なし）

```bash
shopify app deploy --force
```

### 対象アプリの指定方法

**重要**: `shopify app deploy` コマンドでは、**コマンド引数でアプリIDを直接指定するのではなく**、**設定ファイル（`shopify.app.toml`）の `client_id` で対象アプリが決まります**。

#### 基本的な仕組み

1. **`shopify.app.toml` ファイルの `client_id` が対象アプリを決定**
   ```toml
   # shopify.app.toml
   client_id = "a61950a2cbd5f32876b0b55587ec7a27"  # この値で対象アプリが決まる
   ```

   **重要**: `client_id` は、**Shopify Partners Dashboard（またはDev Dashboard）で確認できる「Client ID」（または「API Key」）と同じ値**です。
   
   - **確認場所**: Shopify Partners Dashboard → アプリを選択 → Settings → Credentials → **Client ID**
   - **形式**: 32文字の16進数文字列（例: `706a757915dedce54806c0a179bee05d`）
   - **例**: 
     ```
     Client ID: 706a757915dedce54806c0a179bee05d
     ```
     この値を `shopify.app.toml` の `client_id` に設定します。

2. **`shopify app config link` でアプリをリンク**
   ```bash
   shopify app config link
   ```
   このコマンドを実行すると：
   - Shopify Partners Dashboardから既存アプリの設定を取得
   - `shopify.app.toml` ファイルが生成される（または更新される）
   - `client_id` が自動的に設定される

#### 複数のアプリを管理する場合

開発環境と本番環境で異なるアプリを使用する場合、複数の設定ファイルを作成できます：

1. **開発環境用の設定ファイルを作成**
   ```bash
   shopify app config link
   # → shopify.app.development.toml が生成される
   ```

2. **本番環境用の設定ファイルを作成**
   ```bash
   shopify app config link
   # → shopify.app.production.toml が生成される
   ```

3. **デフォルトの設定を切り替え**
   ```bash
   # 開発環境の設定をデフォルトに
   shopify app config use development
   
   # 本番環境の設定をデフォルトに
   shopify app config use production
   ```

4. **特定の設定ファイルを指定してデプロイ**
   ```bash
   # 開発環境のアプリにデプロイ
   shopify app deploy --config development
   
   # 本番環境のアプリにデプロイ
   shopify app deploy --config production
   ```

#### 設定ファイルの例

**開発環境用（`shopify.app.development.toml`）**:
```toml
name = "EC Ranger (Development)"
client_id = "dev-client-id-12345"  # 開発環境のアプリのClient ID
application_url = "https://dev-app.example.com"
embedded = true

[access_scopes]
scopes = "read_orders,read_products"
```

**本番環境用（`shopify.app.production.toml`）**:
```toml
name = "EC Ranger (Production)"
client_id = "prod-client-id-67890"  # 本番環境のアプリのClient ID
application_url = "https://brave-sea-038f17a00.1.azurestaticapps.net"
embedded = true

[access_scopes]
scopes = "read_orders,read_products,read_customers"
```

#### まとめ

- **対象アプリは `shopify.app.toml` の `client_id` で決まる**
- **コマンド引数でアプリIDを指定する必要はない**
- **複数のアプリを管理する場合は、複数の設定ファイルを作成し、`--config` フラグで指定**
- **`shopify app config link` でアプリをリンクすると、`client_id` が自動的に設定される**

---

## デプロイされる内容

### アプリバージョンとは

`shopify app deploy` を実行すると、**アプリバージョン**が作成されます。アプリバージョンは、以下の内容のスナップショットです：

1. **アプリの設定**（`shopify.app.toml` から）
   - `application_url`
   - `scopes`
   - `redirect_urls`
   - `webhooks` 設定
   - その他の設定項目

2. **アプリ拡張機能**（`extensions/` ディレクトリ内）
   - Admin UI Extensions
   - Checkout Extensions
   - Functions
   - その他の拡張機能

### デプロイされる設定項目の例

```toml
# shopify.app.toml
name = "EC Ranger"
client_id = "a61950a2cbd5f32876b0b55587ec7a27"
application_url = "https://brave-sea-038f17a00.1.azurestaticapps.net"
embedded = true

[access_scopes]
scopes = "read_orders,read_products,read_customers"

[auth]
redirect_urls = [
  "https://brave-sea-038f17a00.1.azurestaticapps.net/api/shopify/callback",
]

[webhooks]
api_version = "2024-01"

[[webhooks.subscriptions]]
topics = ["app/uninstalled"]
uri = "/webhooks/app/uninstalled"
```

これらの設定がShopify Partners Dashboardに反映されます。

### アプリバージョンの管理

- **作成**: `shopify app deploy` で新しいバージョンを作成
- **リリース**: 新しいバージョンをリリースすると、既存のバージョンが置き換えられる
- **ロールバック**: 過去のバージョンに戻すことが可能
- **確認**: Dev Dashboardでバージョン履歴を確認可能

---

## 2段階のデプロイプロセス

### 全体の流れ

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: アプリのコードをホスティングサービスにデプロイ      │
└─────────────────────────────────────────────────────────────┘
1. フロントエンドをビルド
   → npm run build

2. ビルド成果物をAzure Static Web Appsにデプロイ
   → GitHub Actions、Azure CLIなど

3. バックエンドをAzure App Serviceにデプロイ
   → GitHub Actions、Azure CLIなど

4. デプロイされたURLを確認
   → https://brave-sea-038f17a00.1.azurestaticapps.net

┌─────────────────────────────────────────────────────────────┐
│ Phase 2: shopify.app.tomlをShopifyにデプロイ                │
└─────────────────────────────────────────────────────────────┘
1. shopify.app.tomlを編集
   → application_urlをPhase 1でデプロイしたURLに設定

2. shopify app deployを実行
   → Shopify Partners Dashboardに設定を反映

3. Shopify側のアプリ設定が更新される
   → アプリが正しいURLを参照するようになる
```

### なぜ2段階なのか？

1. **アプリのコードのデプロイ**は、ホスティングサービスに依存します（Azure、Google Cloud、Fly.ioなど）
2. **shopify.app.tomlのデプロイ**は、Shopify側の設定を更新します
3. アプリのコードがデプロイされていない状態で、Shopify側にURLを設定しても意味がありません
4. そのため、**まずコードをデプロイし、その後でShopify側の設定を更新する**という順序が必要です

---

## 実際のデプロイフロー

### 初回デプロイの例

#### Step 1: アプリのコードをデプロイ

```bash
# フロントエンドのビルド
cd frontend
npm run build

# Azure Static Web Appsにデプロイ（GitHub Actions経由、または手動）
# → https://brave-sea-038f17a00.1.azurestaticapps.net が利用可能になる
```

#### Step 2: shopify.app.tomlを編集

```toml
# shopify.app.toml
application_url = "https://brave-sea-038f17a00.1.azurestaticapps.net"

[auth]
redirect_urls = [
  "https://brave-sea-038f17a00.1.azurestaticapps.net/api/shopify/callback",
]
```

#### Step 3: Shopify CLIでデプロイ

```bash
# 本番環境のアプリ設定を選択
shopify app config use production

# デプロイ
shopify app deploy
```

#### Step 4: 確認

- Dev Dashboardでアプリ設定を確認
- `application_url` が正しく設定されているか確認
- 開発ストアでアプリをインストールしてテスト

### 再デプロイの例

設定を変更した場合：

```bash
# 1. shopify.app.tomlを編集（例: スコープを追加）
[access_scopes]
scopes = "read_orders,read_products,read_customers,read_reports"  # read_reportsを追加

# 2. デプロイ
shopify app deploy

# 3. 既存のインストール済みストアでは、次回アプリを開いたときに
#    新しいスコープの承認を求められる
```

---

## 本プロジェクトでの適用

### 現状

本プロジェクトでは、**Shopify CLIを使用していない**ため、`shopify.app.toml` ファイルが存在しません。

### 現在の設定管理方法

現在は、以下の方法でアプリ設定を管理しています：

1. **Shopify Partners Dashboardで手動設定**
   - App URL
   - Allowed redirection URLs
   - Scopes

2. **データベース（ShopifyAppsテーブル）で管理**
   - API Key
   - API Secret
   - App URL
   - Redirect URI

3. **環境変数で管理**
   - `SHOPIFY_API_KEY`
   - `SHOPIFY_API_SECRET`
   - `SCOPES`

### Shopify CLIを導入する場合のメリット

#### メリット1: 設定のバージョン管理

- `shopify.app.toml` をGitで管理できる
- 設定の変更履歴を追跡できる
- チームで設定を共有できる

#### メリット2: Shopify Managed Installation

- `shopify.app.toml` でスコープを定義
- `shopify app deploy` でデプロイ
- Shopifyが自動的にインストールとスコープ更新を管理
- **リダイレクト不要**でインストール可能

#### メリット3: アプリ拡張機能の管理

- アプリ拡張機能（Admin UI Extensions、Checkout Extensionsなど）を統合管理
- 拡張機能もアプリバージョンとして管理される

### Shopify CLIを導入する場合の手順

#### Step 1: Shopify CLIのインストール

```bash
npm install -g @shopify/cli @shopify/app
```

#### Step 2: 既存アプリをShopify CLIにリンク

```bash
# アプリディレクトリで実行
shopify app config link
```

これにより、既存のShopify Partners Dashboardのアプリとリンクされ、`shopify.app.toml` が生成されます。

#### Step 3: shopify.app.tomlの編集

生成された `shopify.app.toml` を編集：

```toml
name = "EC Ranger"
client_id = "your-client-id"
application_url = "https://brave-sea-038f17a00.1.azurestaticapps.net"
embedded = true

[access_scopes]
scopes = "read_orders,read_products,read_customers"

[auth]
redirect_urls = [
  "https://brave-sea-038f17a00.1.azurestaticapps.net/api/shopify/callback",
]
```

#### Step 4: デプロイ

```bash
shopify app deploy
```

### 注意点

#### 開発環境と本番環境の分離

Shopify CLIでは、開発環境と本番環境で異なる設定ファイルを使用できます：

- `shopify.app.development.toml` - 開発環境用
- `shopify.app.production.toml` - 本番環境用

```bash
# 開発環境の設定を使用
shopify app config use development

# 本番環境の設定を使用
shopify app config use production
```

#### 既存の設定との整合性

Shopify CLIを導入する場合、既存のデータベース（ShopifyAppsテーブル）との整合性を保つ必要があります。

- `shopify.app.toml` の `client_id` とデータベースの `ApiKey` が一致しているか
- `application_url` とデータベースの `AppUrl` が一致しているか

---

## まとめ

### 重要なポイント

1. **`shopify.app.toml` のデプロイ先はShopify Partners Dashboard**
   - アプリのコードのデプロイ先（ホスティングサービス）とは別

2. **デプロイ方法は `shopify app deploy` コマンド**
   - ローカルの `shopify.app.toml` をShopify側に反映

3. **デプロイされる内容はアプリの設定情報**
   - URL、スコープ、リダイレクトURL、Webhook設定など
   - アプリのコード自体は含まれない

4. **2段階のデプロイプロセス**
   - Phase 1: アプリのコードをホスティングサービスにデプロイ
   - Phase 2: `shopify.app.toml` をShopifyにデプロイ

5. **アプリバージョンとして管理される**
   - 設定のスナップショット
   - 過去のバージョンにロールバック可能

### 本プロジェクトでの今後の検討事項

- Shopify CLIの導入を検討
- Shopify Managed Installationへの移行を検討
- 設定のバージョン管理の改善

---

## 参考ドキュメント

- [Shopify公式: Deploy to a hosting service](https://shopify.dev/docs/apps/launch/deployment/deploy-to-hosting-service)
- [Shopify公式: About app versions](https://shopify.dev/docs/apps/launch/deployment/app-versions)
- [Shopify公式: App configuration](https://shopify.dev/docs/apps/build/cli-for-apps/app-configuration)
- [Shopify公式: Enable Shopify-managed installations](https://shopify.dev/docs/apps/build/authentication-authorization/app-installation)
