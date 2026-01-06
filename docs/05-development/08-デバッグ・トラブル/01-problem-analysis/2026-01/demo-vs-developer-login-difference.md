# デモログインと開発者ログインの違い

**作成日**: 2026-01-03  
**目的**: `/demo/login` と `/dev/login` の違いを明確化

## 📋 概要

このプロジェクトには2つの認証方式があります：

1. **デモモード** (`/demo/login`) - 既存の実装
2. **開発者モード** (`/dev/login`) - 新規実装（ローカルバックエンド開発用）

## 🔍 詳細比較

| 項目 | デモモード (`/demo/login`) | 開発者モード (`/dev/login`) |
|------|-------------------------|---------------------------|
| **ページURL** | `/demo/login` | `/dev/login` |
| **APIエンドポイント** | `POST /api/demo/login` | `POST /api/developer/login` |
| **コントローラー** | `DemoAuthController` | `DeveloperAuthController` |
| **認証レベル** | Level 2 | Level 1（最高権限） |
| **読み取り専用** | ✅ `read_only: true` | ❌ `read_only: false` |
| **開発ツールアクセス** | ❌ 不可 | ✅ `can_access_dev_tools: true` |
| **ストア選択** | ✅ **自動選択**（最初のアクティブなストア） | ✅ ストア一覧から選択可能 |
| **リダイレクト先** | `/` (ダッシュボード) | `/setup/initial` (初期設定) |
| **環境制限** | なし（DemoAllowedモードで利用可能） | 開発環境のみ |
| **パスワード** | `dev2025` または `dev2026`（環境による） | `dev2026` |
| **用途** | デモサイト・プレビュー用 | ローカル開発・デバッグ用 |

## 🎯 用途別の使い分け

### デモモード (`/demo/login`)

**用途**:
- デモサイト・プレビューサイトでの動作確認
- クライアントへの機能紹介
- 読み取り専用での動作確認

**特徴**:
- データの変更・削除ができない（読み取り専用）
- **ストアは自動選択**（データベースから最初のアクティブなストアを自動的に選択）
- JWTトークンに `store_id` が含まれている
- セッションは8時間で自動ログアウト
- すべての環境で利用可能（`DemoAllowed` モード時）

**実装場所**:
- フロントエンド: `frontend/src/app/demo/login/page.tsx`
- バックエンド: `backend/ShopifyAnalyticsApi/Controllers/DemoAuthController.cs`

### 開発者モード (`/dev/login`)

**用途**:
- ローカルバックエンドでの開発・デバッグ
- データ同期ボタンの動作確認
- 開発ツールへのアクセス

**特徴**:
- データの変更・削除が可能（読み書き可能）
- 開発ツールへのアクセス可能
- ストア一覧から選択可能
- 開発環境のみ利用可能

**実装場所**:
- フロントエンド: `frontend/src/app/dev/login/page.tsx`
- バックエンド: `backend/ShopifyAnalyticsApi/Controllers/DeveloperAuthController.cs`

## 🔐 認証レベルの階層

バックエンドの `AuthModeMiddleware` では、以下の順序で認証レベルが判定されます：

```
Level 3: OAuth認証（最高権限）
  ↓
Level 2: デモモード（読み取り専用）
  ↓
Level 1: 開発者モード（開発環境のみ、読み書き可能）
```

### Level 3: OAuth認証
- Shopify埋め込みアプリでの認証
- 完全な権限（読み書き可能）
- 本番環境で使用

### Level 2: デモモード
- デモサイト・プレビュー用
- 読み取り専用
- すべての環境で利用可能（`DemoAllowed` モード時）

### Level 1: 開発者モード
- ローカル開発・デバッグ用
- 読み書き可能
- 開発ツールへのアクセス可能
- **開発環境のみ**利用可能

## 📝 実装の詳細

### デモモード (`/demo/login`)

**フロントエンド実装**:
```typescript
// frontend/src/app/demo/login/page.tsx
const response = await fetch(`${apiBaseUrl}/api/demo/login`, {
  method: 'POST',
  body: JSON.stringify({ password }),
})

// JWTトークンからstore_idを取得
const decoded = jwtDecode<{ store_id?: string }>(data.token)
const storeId = parseInt(decoded.store_id, 10)

// デモトークンを保存
localStorage.setItem('demoToken', data.token)
localStorage.setItem('authMode', 'demo')
localStorage.setItem('readOnly', 'true')
localStorage.setItem('currentStoreId', storeId.toString())

// ダッシュボードへリダイレクト
router.push('/')
```

**バックエンド実装**:
- `DemoAuthController.cs` でパスワード検証
- `DemoAuthService.cs` でデータベースから最初のアクティブなストアを取得
  ```csharp
  var firstActiveStore = await _dbContext.Stores
      .Where(s => s.IsActive)
      .OrderBy(s => s.Id)
      .FirstOrDefaultAsync();
  ```
- JWTトークンを生成（`store_id` を含む）
- `read_only: true` クレームを設定

### 開発者モード (`/dev/login`)

**フロントエンド実装**:
```typescript
// frontend/src/app/dev/login/page.tsx
const response = await fetch(`${backendUrl}/api/developer/login`, {
  method: 'POST',
  body: JSON.stringify({ password }),
})

// 開発者トークンを保存
localStorage.setItem('developerToken', data.token)
localStorage.setItem('oauth_authenticated', 'true')

// ストア一覧を取得
await fetchStores(data.token)

// ストア選択後、currentStoreIdを設定
localStorage.setItem('currentStoreId', selectedStoreId)

// 初期設定画面へリダイレクト
router.push('/setup/initial')
```

**バックエンド実装**:
- `DeveloperAuthController.cs` でパスワード検証
- JWTトークンを生成
- `read_only: false` クレームを設定
- `can_access_dev_tools: true` クレームを設定
- **開発環境のみ**利用可能

## ⚙️ 設定ファイル

### appsettings.Development.json

```json
{
  "Demo": {
    "Enabled": true,
    "Password": "dev2025",
    "PasswordHash": "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
  },
  "Developer": {
    "Enabled": true,
    "PasswordHash": "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
  }
}
```

**注意**: 
- デモモードのパスワード: `dev2025`
- 開発者モードのパスワード: `dev2026`（`appsettings.LocalDevelopment.json` では `dev2026`）

## 🚀 使用例

### デモモードを使用する場合

1. ブラウザで `/demo/login` にアクセス
2. パスワード `dev2025` を入力
3. ダッシュボードにリダイレクト
4. 読み取り専用で動作確認

### 開発者モードを使用する場合

1. `frontend/.env.local` に以下を設定：
   ```env
   NEXT_PUBLIC_DEVELOPER_MODE=true
   NEXT_PUBLIC_BACKEND_URL=http://localhost:5168
   ```

2. ブラウザで `/dev/login` にアクセス
3. パスワード `dev2026` を入力
4. ストア一覧から選択
5. `/setup/initial` にリダイレクト
6. データ同期ボタンの動作確認など

## 🔍 ストア選択の違い

### デモモード (`/demo/login`)

**自動選択**:
- データベースから最初のアクティブなストア（`IsActive = true`）を自動的に選択
- ID順（`OrderBy(s => s.Id)`）で最初のストアが選ばれる
- JWTトークンに `store_id` が含まれて返される
- フロントエンドでJWTトークンをデコードして `currentStoreId` を設定

**実装**:
```csharp
// backend/ShopifyAnalyticsApi/Services/DemoAuthService.cs
var firstActiveStore = await _dbContext.Stores
    .Where(s => s.IsActive)
    .OrderBy(s => s.Id)
    .FirstOrDefaultAsync();

var token = GenerateDemoToken(session, firstActiveStore.Id, ...);
```

### 開発者モード (`/dev/login`)

**手動選択**:
- ログイン成功後、ストア一覧を取得（`GET /api/store`）
- ユーザーがドロップダウンからストアを選択
- 選択したストアIDを `currentStoreId` として設定

**実装**:
```typescript
// frontend/src/app/dev/login/page.tsx
const stores = await fetch(`${backendUrl}/api/store`, ...)
// ユーザーがストアを選択
localStorage.setItem('currentStoreId', selectedStoreId)
```

## ✅ まとめ

| 用途 | 推奨する認証方式 |
|------|----------------|
| デモサイト・プレビュー | デモモード (`/demo/login`) |
| ローカル開発・デバッグ | 開発者モード (`/dev/login`) |
| データ同期ボタンの動作確認 | 開発者モード (`/dev/login`) |
| 開発ツールへのアクセス | 開発者モード (`/dev/login`) |
| **特定のストアを選択したい場合** | 開発者モード (`/dev/login`) |
| **自動でストアを選択したい場合** | デモモード (`/demo/login`) |

---

**更新履歴**:
- 2026-01-03: 初版作成
