# Phase 1 実装後のテスト手順

## 作成日
2025-12-26

## 概要

Phase 1の実装完了後、開発環境からローカルのバックエンドに接続してテストする手順をまとめています。

---

## 📋 テスト前の確認事項

### 1. Shopify Partners Dashboardの設定確認

#### 1.1 スコープ設定
- ✅ **Required scopes**: `read_orders,read_products,read_customers`が設定されているか確認
- ✅ **Optional scopes**: 必要に応じて設定（現時点では不要）

#### 1.2 Redirect URLs設定
**重要**: Phase 1の実装で、リダイレクトURIをバックエンドURLに統一しました。

**設定すべきRedirect URLs**:
```
https://localhost:7088/api/shopify/callback
```

**注意事項**:
- フロントエンドURL（`https://brave-sea-038f17a00-development.eastasia.1.azurestaticapps.net/api/shopify/callback`）は削除してください
- フロントエンドのプロキシ（`/api/shopify/callback`）は削除済みのため、フロントエンドURLは不要です

#### 1.3 App URL設定
```
https://brave-sea-038f17a00-development.eastasia.1.azurestaticapps.net
```

#### 1.4 その他の設定
- ✅ **Embed app in Shopify admin**: チェックされているか確認
- ✅ **Webhooks API Version**: `2025-07`が設定されているか確認

---

## 🚀 ローカル開発環境のセットアップ

### Step 1: バックエンドの起動

#### 1.1 バックエンドの起動

```powershell
# バックエンドディレクトリに移動
cd backend/ShopifyAnalyticsApi

# バックエンドを起動（HTTPS）
dotnet run --urls "https://localhost:7088"
```

**確認事項**:
- ✅ バックエンドが`https://localhost:7088`で起動しているか確認
- ✅ SSL証明書の警告が出る場合は、開発環境では無視してOK

#### 1.2 バックエンドの動作確認

```powershell
# 別のターミナルで実行
curl -k https://localhost:7088/api/shopify/test-config
```

**期待される結果**:
- ✅ `200 OK`が返される
- ✅ JSONレスポンスが返される

### Step 2: フロントエンドの設定確認

#### 2.1 環境変数の確認

**`.env.local`ファイルを確認**:

```env
# バックエンドURL（ローカル開発環境）
NEXT_PUBLIC_BACKEND_URL=https://localhost:7088
# または
NEXT_PUBLIC_API_URL=https://localhost:7088

# Shopify API Key
NEXT_PUBLIC_SHOPIFY_API_KEY=your_api_key_here
```

**注意事項**:
- `NEXT_PUBLIC_BACKEND_URL`と`NEXT_PUBLIC_API_URL`の両方が設定されている場合、`NEXT_PUBLIC_BACKEND_URL`が優先されます
- 環境変数を変更した場合は、フロントエンドを再起動してください

#### 2.2 フロントエンドの起動

```powershell
# フロントエンドディレクトリに移動
cd frontend

# フロントエンドを起動
npm run dev
```

**確認事項**:
- ✅ フロントエンドが`http://localhost:3000`で起動しているか確認
- ✅ コンソールにエラーが表示されていないか確認

---

## 🧪 テスト手順

### Test 1: インストールページの表示確認

#### 1.1 インストールページにアクセス

```
http://localhost:3000/install
```

**確認事項**:
- ✅ インストールページが正しく表示される
- ✅ ショップドメイン入力フォームが表示される
- ✅ コンソールにエラーが表示されていない

#### 1.2 環境情報の確認

インストールページのデバッグ情報で以下を確認：

- ✅ **API URL**: `https://localhost:7088`が表示されている
- ✅ **コールバックURL**: `https://localhost:7088/api/shopify/callback`が表示されている
- ✅ **API Key**: 正しく設定されている

### Test 2: OAuth認証フローのテスト

#### 2.1 インストール開始

1. **ショップドメインを入力**:
   ```
   your-shop.myshopify.com
   ```

2. **「インストール」ボタンをクリック**

3. **ブラウザの開発者ツール（Networkタブ）を開く**

#### 2.2 リダイレクトの確認

**期待される動作**:

1. **埋め込みアプリ（embedded=1）の場合**:
   - ExitIframeページ（`/auth/exit-iframe`）にリダイレクト
   - App Bridgeの`Redirect.toApp()`でiframeから脱出
   - バックエンドの`/api/shopify/install`にリダイレクト
   - バックエンドがShopify OAuth URLにリダイレクト（HTTP 302）

2. **非埋め込みアプリ（embedded=0）の場合**:
   - 直接バックエンドの`/api/shopify/install`にリダイレクト
   - バックエンドがShopify OAuth URLにリダイレクト（HTTP 302）

**確認事項**:
- ✅ リダイレクトが正しく実行されている
- ✅ バックエンドの`/api/shopify/install`が呼ばれている
- ✅ Shopify OAuth認証画面が表示される

#### 2.3 OAuth認証の完了

1. **Shopify OAuth認証画面で「インストール」をクリック**

2. **バックエンドのログを確認**:
   ```
   [INFO] OAuthコールバック受信. Shop: {shop}, State: {state}
   [INFO] HMAC検証成功
   [INFO] アクセストークン取得成功
   [INFO] ストア情報を保存しました
   [INFO] Webhook登録完了
   [INFO] OAuth認証完了
   ```

3. **リダイレクト先の確認**:
   - **埋め込みアプリの場合**: `https://{decodedHost}/apps/{api_key}/`にリダイレクト
   - **非埋め込みアプリの場合**: `{appUrl}/auth/success?shop=...&storeId=...&success=true`にリダイレクト

#### 2.4 データベースの確認

**`Stores`テーブルにレコードが作成されているか確認**:

```sql
SELECT * FROM Stores WHERE Domain = 'your-shop.myshopify.com';
```

**確認事項**:
- ✅ `Stores`テーブルにレコードが作成されている
- ✅ `AccessToken`が正しく保存されている
- ✅ `ShopifyAppId`が正しく設定されている

### Test 3: 認証成功後の動作確認

#### 3.1 認証成功ページの表示

**期待される動作**:
- ✅ `/auth/success`ページが表示される
- ✅ 「認証が完了しました」メッセージが表示される
- ✅ ダッシュボードにリダイレクトされる

#### 3.2 ダッシュボードの表示

**期待される動作**:
- ✅ ダッシュボードが正しく表示される
- ✅ API呼び出しが成功している（401エラーが発生しない）
- ✅ 顧客データが正しく表示される

---

## 🔍 トラブルシューティング

### 問題1: リダイレクトが実行されない

**症状**: インストールボタンをクリックしてもリダイレクトされない

**確認事項**:
1. ブラウザのコンソールにエラーが表示されていないか確認
2. ネットワークタブでリクエストが送信されているか確認
3. バックエンドが起動しているか確認

**解決方法**:
- バックエンドのログを確認
- CORS設定を確認
- フロントエンドの環境変数を確認

### 問題2: HMAC検証エラー

**症状**: バックエンドのログに「HMAC検証失敗」が表示される

**確認事項**:
1. Shopify Partners DashboardのAPI Secretが正しく設定されているか
2. バックエンドの環境変数`Shopify:ApiSecret`が正しく設定されているか

**解決方法**:
- 開発環境では、HMAC検証失敗は警告として記録されますが、処理は続行されます
- 本番環境では、HMAC検証失敗はエラーとして返されます

### 問題3: アクセストークン取得失敗

**症状**: バックエンドのログに「アクセストークン取得失敗」が表示される

**確認事項**:
1. Shopify Partners DashboardのAPI Key/Secretが正しく設定されているか
2. Redirect URLsが正しく設定されているか
3. スコープが正しく設定されているか

**解決方法**:
- Shopify Partners Dashboardの設定を確認
- バックエンドの環境変数を確認
- バックエンドのログを詳細に確認

### 問題4: Storesテーブルにレコードが作成されない

**症状**: OAuth認証は成功したが、`Stores`テーブルにレコードが作成されない

**確認事項**:
1. データベース接続が正しく設定されているか
2. バックエンドのログにエラーが表示されていないか
3. トランザクションがロールバックされていないか

**解決方法**:
- データベース接続を確認
- バックエンドのログを詳細に確認
- データベースのトランザクションログを確認

### 問題5: 401エラーが発生する

**症状**: ダッシュボードでAPI呼び出しが401エラーになる

**確認事項**:
1. セッションCookieが正しく設定されているか
2. アクセストークンが正しく保存されているか
3. APIクライアントが正しく初期化されているか

**解決方法**:
- ブラウザの開発者ツールでCookieを確認
- フロントエンドの`AuthProvider`の状態を確認
- バックエンドの認証ミドルウェアを確認

---

## ✅ テストチェックリスト

### 事前準備
- [ ] Shopify Partners Dashboardでスコープを設定
- [ ] Shopify Partners DashboardでRedirect URLsを設定（バックエンドURLのみ）
- [ ] バックエンドを起動（`https://localhost:7088`）
- [ ] フロントエンドを起動（`http://localhost:3000`）
- [ ] フロントエンドの環境変数を確認

### インストールフローのテスト
- [ ] インストールページが正しく表示される
- [ ] インストールボタンをクリックしてリダイレクトが実行される
- [ ] ExitIframeページが正しく動作する（埋め込みアプリの場合）
- [ ] Shopify OAuth認証画面が表示される
- [ ] OAuth認証が正常に完了する
- [ ] バックエンドのログにエラーが表示されない
- [ ] `Stores`テーブルにレコードが作成される

### 認証成功後のテスト
- [ ] 認証成功ページが表示される
- [ ] ダッシュボードにリダイレクトされる
- [ ] ダッシュボードが正しく表示される
- [ ] API呼び出しが成功する（401エラーが発生しない）
- [ ] 顧客データが正しく表示される

---

## 📝 テスト結果の記録

テスト実施後、以下の情報を記録してください：

1. **テスト日時**: YYYY-MM-DD HH:MM:SS
2. **テスト環境**: ローカル開発環境
3. **テスト結果**: ✅ 成功 / ❌ 失敗
4. **発生した問題**: （該当する場合）
5. **解決方法**: （該当する場合）

---

## 🔗 関連ドキュメント

- [現状設計の問題点と修正方針.md](./現状設計の問題点と修正方針.md)
- [スコープ設定方法ガイド.md](./スコープ設定方法ガイド.md)
- [shopify.app.toml-デプロイ解説.md](./shopify.app.toml-デプロイ解説.md)
- [開発環境セットアップガイド.md](../../05-development/01-環境構築/開発環境セットアップガイド.md)

---

## 📝 更新履歴

- 2025-12-26: 初版作成
