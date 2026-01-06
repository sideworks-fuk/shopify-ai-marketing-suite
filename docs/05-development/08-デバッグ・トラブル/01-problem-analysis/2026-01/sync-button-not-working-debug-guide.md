# 「同期を開始」ボタン機能が動作しない問題 - デバッグガイド

## 📋 概要

「同期を開始」ボタンをクリックしても動作しない問題の調査手順とデバッグログの確認方法を記載します。

## 🔍 調査手順

### Step 1: ブラウザの開発者ツールを開く

1. ブラウザで `F12` キーを押すか、右クリック → 「検証」を選択
2. **Console** タブを開く
3. **Network** タブも開いておく（リクエストの送信状況を確認）

### Step 2: ページをリロード

1. `Ctrl + Shift + R` でキャッシュをクリアしてリロード
2. Console に以下のログが表示されることを確認：
   ```
   📦 InitialPage マウント
   📌 初期 isApiClientReady: [true/false]
   🔄 isApiClientReady 状態変化: [true/false]
   ```

### Step 3: 「同期を開始」ボタンをクリック

1. ボタンをクリック
2. Console に以下のログが表示されることを確認：

#### 正常な場合のログ例

```
========================================
🚀 handleStartSync が呼ばれました
📌 タイムスタンプ: 2026-01-03T12:00:00.000Z
📌 isApiClientReady: true
📌 syncPeriod: 3months
📌 isLoading: false
📌 error: null
📌 環境情報:
  - window.location.href: https://...
  - localStorage.oauth_authenticated: true
  - localStorage.currentStoreId: 46
  - localStorage.demoToken: なし
  - sessionStorage.ec-ranger-syncId: null
========================================
📡 APIクライアントを取得中...
✅ APIクライアント取得成功
📌 APIクライアントの型: ApiClient
📤 POST /api/sync/initial 送信準備完了
📤 リクエストボディ: {"syncPeriod":"3months"}
📤 リクエストボディサイズ: 25 bytes
📤 リクエストメソッド: POST
📤 エンドポイント: /api/sync/initial
⏰ リクエスト送信開始時刻: 2026-01-03T12:00:00.100Z
📤 [APIClient.request] リクエスト送信
⏳ [APIClient.request] fetch呼び出し中...
📥 [APIClient.request] fetch完了
✅ リクエスト成功
📥 レスポンス受信:
🔑 取得したsyncId: 10
🔀 リダイレクト先: /setup/syncing?syncId=10
💾 sessionStorage に syncId を保存: 10
🔀 router.push() を実行します: /setup/syncing?syncId=10
✅ router.push() 実行完了
```

### Step 4: 問題の特定

#### パターン A: `isApiClientReady: false` の場合

**症状**: ボタンをクリックしても早期リターンする

**ログ例**:
```
🚀 handleStartSync が呼ばれました
📌 isApiClientReady: false
❌ isApiClientReady = false のため早期リターン
💡 AuthProvider の初期化が完了していません
```

**確認事項**:
1. Console で `🔧 [AuthProvider] APIクライアント初期化開始` が表示されているか
2. `✅ [AuthProvider] APIクライアントの初期化が完了しました` が表示されているか
3. `🔄 isApiClientReady 状態変化: true` が表示されているか

**考えられる原因**:
- AuthProvider の初期化が完了していない
- Shopify App Bridge のトークン取得に失敗している
- OAuth認証が完了していない

#### パターン B: ネットワークエラーの場合

**症状**: リクエストが送信されない、またはエラーが発生する

**ログ例**:
```
❌ [APIClient.request] fetch呼び出しエラー
🌐 TypeError が発生しました（ネットワークエラーの可能性）
💡 考えられる原因:
  1. CORSエラー: バックエンドのCORS設定を確認
  2. ネットワーク接続エラー: インターネット接続を確認
  3. タイムアウト: バックエンドサーバーが応答していない
  4. SSL証明書エラー: HTTPS設定を確認
```

**確認事項**:
1. Network タブで `POST /api/sync/initial` リクエストが表示されているか
2. リクエストのステータスコード（200, 401, 404, 500など）
3. リクエストのヘッダー（Authorization ヘッダーが含まれているか）
4. レスポンスの内容

#### パターン C: 認証エラーの場合

**症状**: 401 Unauthorized エラーが発生する

**ログ例**:
```
❌ [APIClient.request] API Error: 401
🔐 認証エラーの可能性が高いです
💡 確認事項:
  1. Shopify App Bridge のトークンが取得できているか
  2. OAuth認証が完了しているか
  3. 認証ヘッダーが正しく送信されているか
```

**確認事項**:
1. `🔐 [AuthProvider] Shopifyセッショントークンを取得中...` が表示されているか
2. `✅ [AuthProvider] Shopifyセッショントークン取得成功` が表示されているか
3. Network タブでリクエストヘッダーに `Authorization: Bearer ...` が含まれているか

#### パターン D: syncId が取得できない場合

**症状**: レスポンスは受信するが、syncId が含まれていない

**ログ例**:
```
📥 レスポンス受信:
📥 レスポンス全体: {"message":"Success"}
🔑 取得したsyncId: undefined
❌ syncId が取得できません
```

**確認事項**:
1. レスポンスの構造を確認（`data.syncId`, `data.SyncId`, `data.id`, `data.Id` など）
2. バックエンドのレスポンス形式を確認

## 📊 ログの収集方法

### 1. Console ログのコピー

1. Console タブで右クリック → 「すべてのログを保存」を選択
2. または、ログを選択してコピー（`Ctrl + C`）

### 2. Network タブの情報

1. Network タブで `POST /api/sync/initial` をクリック
2. **Headers** タブで以下を確認：
   - Request URL
   - Request Method
   - Request Headers（特に `Authorization` ヘッダー）
   - Request Payload
3. **Response** タブで以下を確認：
   - Status Code
   - Response Headers
   - Response Body

### 3. スクリーンショット

以下のスクリーンショットを取得：
- Console タブの全体
- Network タブのリクエスト詳細（Headers, Response）
- エラーメッセージが表示されている画面

## 🔧 トラブルシューティング

### 問題1: `isApiClientReady` が `false` のまま

**対処法**:
1. ページをリロードして AuthProvider の初期化を待つ
2. Console で `🔧 [AuthProvider] APIクライアント初期化開始` を確認
3. 初期化が完了するまで待機（通常は数秒以内）

### 問題2: ネットワークエラー

**対処法**:
1. バックエンドサーバーが起動しているか確認
2. CORS設定を確認（バックエンドの `Program.cs` または `Startup.cs`）
3. ネットワーク接続を確認
4. HTTPS設定を確認（開発環境では ngrok を使用）

### 問題3: 認証エラー（401）

**対処法**:
1. Shopify App Bridge のトークン取得を確認
2. OAuth認証が完了しているか確認（`localStorage.oauth_authenticated`）
3. 認証ヘッダーが正しく送信されているか確認（Network タブ）

### 問題4: syncId が取得できない

**対処法**:
1. バックエンドのレスポンス形式を確認
2. レスポンスのキー名を確認（`syncId`, `SyncId`, `id`, `Id` など）
3. バックエンドのログを確認（Application Insights）

## 📝 報告テンプレート

問題が発生した場合は、以下の情報を報告してください：

```markdown
## 問題報告

### 環境情報
- ブラウザ: [Chrome/Firefox/Safari など]
- バージョン: [バージョン番号]
- OS: [Windows/Mac/Linux]
- 環境: [development/staging/production]

### 症状
[何が起こったか、期待される動作と実際の動作の違い]

### Console ログ
[Console タブのログを貼り付け]

### Network タブの情報
- リクエストURL: [URL]
- ステータスコード: [200/401/404/500 など]
- リクエストヘッダー: [特に Authorization ヘッダー]
- レスポンス: [レスポンスの内容]

### スクリーンショット
[問題が発生している画面のスクリーンショット]

### 再現手順
1. [手順1]
2. [手順2]
3. [手順3]
```

## 🔗 関連ファイル

- `frontend/src/app/setup/initial/page.tsx` - 初期設定ページ
- `frontend/src/components/providers/AuthProvider.tsx` - 認証プロバイダー
- `frontend/src/lib/api-client.ts` - APIクライアント
- `backend/ShopifyAnalyticsApi/Controllers/SyncController.cs` - 同期コントローラー

## 📅 更新履歴

- 2026-01-03: 初版作成
