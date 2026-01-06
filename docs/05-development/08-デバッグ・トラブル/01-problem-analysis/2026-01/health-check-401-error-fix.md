# ヘルスチェックエンドポイント 401エラーの修正

**作成日**: 2026-01-03  
**問題**: `/api/health` エンドポイントが 401 Unauthorized を返す

---

## 📋 問題の概要

### 症状
- バックエンドヘルスチェックページで `/api/health` にアクセスすると 401 Unauthorized エラーが発生
- URLは正しく `https://localhost:44394` に設定されている
- 環境変数も正しく読み込まれている

### 根本原因
`AuthModeMiddleware.cs` の認証スキップリストに `/api/health` が含まれていなかった。

**問題のコード**:
```csharp
var skipAuthPaths = new[]
{
    // ...
    "/health",  // ✅ スキップされている
    // "/api/health",  // ❌ スキップされていない
    // ...
};
```

`Program.cs` では `/api/health` もマッピングされているが、`AuthModeMiddleware` が先に実行されるため、認証チェックでブロックされていた。

---

## 🔧 修正内容

### 修正前
```csharp
var skipAuthPaths = new[]
{
    // ...
    "/health",
    "/swagger",
    "/hangfire"
};
```

### 修正後
```csharp
var skipAuthPaths = new[]
{
    // ...
    // ヘルスチェックエンドポイント（認証不要）
    "/health",
    "/api/health",      // ✅ 追加
    "/health/ready",    // ✅ 追加（念のため）
    "/swagger",
    "/hangfire"
};
```

---

## 📊 ヘルスチェックエンドポイント一覧

`Program.cs` でマッピングされているヘルスチェックエンドポイント：

1. `/health` - 基本ヘルスチェック
2. `/api/health` - API用ヘルスチェック（フロントエンドの互換性のため）
3. `/health/ready` - 詳細ヘルスチェック（ready タグ付き）

すべて認証不要であるべきです。

---

## ✅ 修正後の動作

### 期待される動作
1. `/api/health` にアクセスすると認証チェックがスキップされる
2. 200 OK が返される
3. ヘルスチェックページで正常に動作する

---

## 🧪 確認手順

### Step 1: バックエンドを再起動
```bash
# バックエンドを再起動
cd backend/ShopifyAnalyticsApi
dotnet run
```

### Step 2: 直接アクセスで確認
ブラウザで直接アクセス：
- `https://localhost:44394/api/health`

**期待される結果**: JSONレスポンスが返される（200 OK）

### Step 3: ヘルスチェックページで確認
1. フロントエンドのヘルスチェックページを開く: `http://localhost:3000/dev/backend-health-check`
2. 「ヘルスチェック実行」ボタンをクリック
3. 「Health Check (HTTPS)」が成功することを確認（200 OK）

---

## 🔍 関連ファイル

- `backend/ShopifyAnalyticsApi/Middleware/AuthModeMiddleware.cs` - 認証ミドルウェア
- `backend/ShopifyAnalyticsApi/Program.cs` - ヘルスチェックエンドポイントのマッピング
- `frontend/src/app/dev/backend-health-check/page.tsx` - ヘルスチェックページ

---

## 📝 注意事項

### ミドルウェアの実行順序
`Program.cs` でのミドルウェアの実行順序：

1. `UseShopifyEmbeddedApp()` - Shopify埋め込みアプリ処理
2. `UseDemoMode()` - デモモード処理
3. **`UseAuthModeMiddleware()`** - 認証チェック（ここでスキップ判定）
4. `UseAuthentication()` - ASP.NET Core認証
5. `UseRateLimiter()` - レート制限
6. `UseStoreContext()` - ストアコンテキスト
7. `UseFeatureAccess()` - 機能アクセス制御
8. `UseAuthorization()` - 承認
9. `MapControllers()` - コントローラーマッピング
10. `MapHealthChecks()` - ヘルスチェックマッピング

`AuthModeMiddleware` が先に実行されるため、スキップリストに含まれていないパスは認証チェックでブロックされます。

---

## 🚀 修正後の確認チェックリスト

- [ ] `AuthModeMiddleware.cs` に `/api/health` と `/health/ready` が追加されている
- [ ] バックエンドを再起動した
- [ ] ブラウザで直接 `https://localhost:44394/api/health` にアクセスして 200 OK が返ることを確認
- [ ] ヘルスチェックページで「Health Check (HTTPS)」が成功することを確認
- [ ] 401 Unauthorized エラーが発生しない

---

**更新履歴**:
- 2026-01-03: 初版作成、問題の特定と修正内容を記載
