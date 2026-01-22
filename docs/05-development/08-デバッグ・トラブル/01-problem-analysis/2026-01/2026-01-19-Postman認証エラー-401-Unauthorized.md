# Postman認証エラー - 401 Unauthorized 原因調査

## 📋 問題概要

**発生日時**: 2026年1月19日  
**エラー**: `401 Unauthorized`  
**エラーメッセージ**: `"OAuth, demo, or developer authentication required"`  
**エンドポイント**: `POST /api/sync/initial`

---

## 🔍 エラーの詳細

### エラーレスポンス

```json
{
  "error": "Unauthorized",
  "message": "OAuth, demo, or developer authentication required"
}
```

### リクエスト情報

- **Method**: `POST`
- **URL**: `http://localhost:5168/api/sync/initial`
- **Body**: `{ "syncPeriod": "3months" }`

---

## 🔎 原因調査

### 考えられる原因

1. **Authorizationヘッダーの形式が間違っている**
   - `Bearer`ヘッダーを直接使用している（誤り）
   - 正しくは`Authorization: Bearer {token}`の形式が必要

2. **トークンが設定されていない**
   - 開発者認証でトークンを取得していない
   - 環境変数にトークンが設定されていない

3. **トークンが無効**
   - トークンの有効期限が切れている
   - トークンが正しく取得できていない

4. **X-Store-Idヘッダーが設定されていない**
   - ストアIDが指定されていない

---

## ✅ 解決方法

### ステップ1: Authorizationヘッダーの形式を確認

**正しい形式**:
```
Authorization: Bearer {token}
```

**誤った形式の例**:
```
Bearer: {token}  ❌
Authorization: {token}  ❌（Bearerプレフィックスがない）
```

### ステップ2: Postmanでの設定方法

#### 方法1: Authorizationタブを使用（推奨）

1. **Authorizationタブを選択**
   - Postmanのリクエスト設定で「Authorization」タブをクリック

2. **認証タイプを選択**
   - Type: `Bearer Token` を選択

3. **トークンを入力**
   - Token: 開発者認証で取得したトークンを貼り付け
   - または、環境変数 `{{token}}` を使用

4. **自動的に設定される**
   - Postmanが自動的に `Authorization: Bearer {token}` の形式でヘッダーを設定します

#### 方法2: Headersタブで手動設定

1. **Headersタブを選択**
   - Postmanのリクエスト設定で「Headers」タブをクリック

2. **ヘッダーを追加**
   - Key: `Authorization`
   - Value: `Bearer {{token}}`（環境変数を使用する場合）
     - または `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`（直接トークンを指定する場合）

3. **重要**: 
   - Keyは必ず `Authorization` であること
   - Valueは `Bearer {token}` の形式であること（`Bearer`とトークンの間にスペースが必要）

### ステップ3: 開発者認証でトークンを取得

1. **開発者認証リクエストを作成**
   ```
   POST http://localhost:5168/api/developer/login
   Body: { "password": "dev2026" }
   ```

2. **レスポンスからトークンを取得**
   ```json
   {
     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "expiresIn": 3600
   }
   ```

3. **環境変数に保存**
   - Postman環境変数 `token` に保存
   - または、直接コピーして使用

### ステップ4: X-Store-Idヘッダーを設定

1. **Headersタブで追加**
   - Key: `X-Store-Id`
   - Value: `18`（テスト用のStoreId）
     - または環境変数 `{{storeId}}` を使用

---

## 🔍 デバッグ方法

### 1. リクエストヘッダーの確認

Postmanの「Headers」タブで、以下のヘッダーが設定されていることを確認：

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-Store-Id: 18
Content-Type: application/json
```

### 2. バックエンドログの確認

バックエンドのコンソールログで、以下のログを確認：

```
🔐 [AuthModeMiddleware] 同期リクエスト受信: Path=/api/sync/initial
🔐 [AuthModeMiddleware] Authorizationヘッダー: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
🔐 [AuthModeMiddleware] Developer token validation successful. StoreId: 18
```

### 3. トークンの検証

開発者認証で取得したトークンが正しいか確認：

1. **トークンをデコード**
   - https://jwt.io/ でトークンをデコード
   - `auth_mode` が `developer` であることを確認
   - `exp`（有効期限）が未来の日時であることを確認

2. **トークンの有効期限を確認**
   - 通常は60分（設定による）
   - 期限切れの場合は、再度開発者認証でトークンを取得

---

## 🚨 よくある間違い

### 間違い1: Bearerヘッダーを直接使用

**誤り**:
```
Bearer: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**正しい**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 間違い2: Bearerプレフィックスがない

**誤り**:
```
Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**正しい**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 間違い3: トークンにスペースが含まれている

**誤り**:
```
Authorization: Bearer  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  （余分なスペース）
```

**正しい**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  （Bearerとトークンの間に1つのスペースのみ）
```

---

## 📊 チェックリスト

### 認証設定の確認

- [ ] 開発者認証でトークンを取得済み
- [ ] トークンが有効期限内である
- [ ] Postmanの環境変数に`token`が設定されている
- [ ] `Authorization`ヘッダーが設定されている
- [ ] `Authorization`ヘッダーの値が`Bearer {token}`の形式である
- [ ] `X-Store-Id`ヘッダーが設定されている
- [ ] `X-Store-Id`の値がデータベースに存在するStoreIdである

### リクエスト設定の確認

- [ ] URLが正しい（`http://localhost:5168/api/sync/initial`）
- [ ] Methodが`POST`である
- [ ] Bodyが`application/json`形式である
- [ ] Bodyの内容が正しい（`{ "syncPeriod": "3months" }`）

---

## 🎯 正しいPostman設定例

### リクエスト設定

**URL**: `{{baseUrl}}/api/sync/initial`

**Authorizationタブ**:
- Type: `Bearer Token`
- Token: `{{token}}`

**Headersタブ**:
- `X-Store-Id`: `{{storeId}}`
- `Content-Type`: `application/json`

**Bodyタブ**:
- `raw` → `JSON`
```json
{
  "syncPeriod": "3months"
}
```

### 環境変数

- `baseUrl`: `http://localhost:5168`
- `token`: 開発者認証で取得したトークン
- `storeId`: `18`

---

## 📚 関連ドキュメント

- [ローカルAPIデバッグ手順-データ同期テスト](../02-tools/ローカルAPIデバッグ手順-データ同期テスト.md)
- [ローカルバックエンド開発者モード設定ガイド](./local-backend-dev-mode-setup.md)

---

**最終更新**: 2026年1月19日  
**作成者**: AI Assistant
