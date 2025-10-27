# 3段階認証レベル統合版 実装指示書

## 概要

このドキュメントは、Shopify アプリ認証モード制御機能を「3段階認証レベル統合版」に更新するための実装指示書です。

**対象ドキュメント**:
- [要件定義書](../03-feature-development/アプリ認証モード制御機能/Shopify-認証モード制御-要件定義.md)
- [設計書](../03-feature-development/アプリ認証モード制御機能/Shopify-認証モード制御-設計書.md)
- [実装計画](../03-feature-development/アプリ認証モード制御機能/Shopify-認証モード制御-実装計画.md)
- [テスト計画](../03-feature-development/アプリ認証モード制御機能/Shopify-認証モード制御-テスト計画.md)

**関連PR**: https://github.com/sideworks-fuk/shopify-ai-marketing-suite/pull/61

---

## 🎯 実装目標

### 3段階認証レベルの実装

```
Level 3: OAuth認証モード（本番・ステージング・開発）
  ↓ 最もセキュア
  - Shopify OAuth必須
  - 全機能利用可能
  - データ変更可能
  - read_only: false

Level 2: デモモード（ステージング・開発）
  ↓ 中程度のセキュリティ
  - パスワード認証（bcrypt、サーバー側）
  - 全画面閲覧可能
  - 読み取り専用（データ変更不可）
  - read_only: true
  - セッション管理あり

Level 1: 開発者モード（開発環境のみ）
  ↓ 開発用（低セキュリティ）
  - パスワード認証（bcrypt、サーバー側）
  - 開発ツール（/dev-bookmarks）にアクセス可能
  - デバッグ機能有効
  - 全機能利用可能
  - read_only: false
  - can_access_dev_tools: true
```

### 成功基準

- [ ] デモモードでデータ変更操作が完全にブロックされる（read_only: true）
- [ ] 開発者モードでデータ変更操作が正常に動作する（read_only: false）
- [ ] 開発者モードで/dev-bookmarksにアクセス可能（can_access_dev_tools: true）
- [ ] NEXT_PUBLIC_DEV_PASSWORDが完全に削除される
- [ ] 本番・ステージング環境で開発者モードが100%ブロックされる
- [ ] DemoReadOnlyFilterがread_onlyクレームで判定する（auth_modeではない）

---

## 🔧 重要な設計原則

### 1. read_onlyクレームベースのアクセス制限

**重要**: `DemoReadOnlyFilter`は`auth_mode`クレームを見ずに、`read_only`クレームのみで判定する。

**理由**:
- 認証モード（OAuth/Demo/Developer）と権限（read_only）を分離
- 将来的にOAuthユーザーにも読み取り専用モードを提供可能
- 明確な責任分離

**実装**:
```csharp
// ❌ 間違った実装（auth_modeで判定）
var isDemoMode = context.HttpContext.User.HasClaim("auth_mode", "demo");
if (isDemoMode) { /* ブロック */ }

// ✅ 正しい実装（read_onlyで判定）
var readOnlyClaim = context.HttpContext.User.FindFirst("read_only");
var isReadOnly = readOnlyClaim?.Value == "true";
if (isReadOnly) { /* ブロック */ }
```

### 2. サーバー側認証の徹底

**重要**: すべての認証・認可判定はサーバー側で実施する。クライアント側の環境変数（`NEXT_PUBLIC_*`）はUI表示のヒントとしてのみ使用する。

**削除が必要な変数**:
- `NEXT_PUBLIC_DEV_PASSWORD`: クライアントにパスワードを露出しない

**追加が必要な変数**:
- `Developer__Enabled`: 開発者モード有効化フラグ（開発環境のみtrue）
- `Developer__PasswordHash`: 開発者モードパスワード（bcryptハッシュ、デモとは別のパスワード）
- `Developer__SessionTimeoutHours`: 開発者セッションタイムアウト時間
- `Developer__RateLimitPerIp`: 開発者モードレート制限

### 3. 環境分離の徹底

**開発者モード（Level 1）は開発環境でのみ有効**:
- 本番環境: `/api/developer/*` → 404
- ステージング環境: `/api/developer/*` → 404
- 開発環境: `/api/developer/*` → 有効

**実装**:
```csharp
// AuthModeMiddleware.cs
if (isDeveloperValid && environment == "Development")
{
    // Level 1: 開発者モード（開発環境のみ）
    context.Items["AuthMode"] = "Developer";
    var claims = new List<Claim>
    {
        new Claim("auth_mode", "developer"),
        new Claim("read_only", "false"),
        new Claim("can_access_dev_tools", "true")
    };
    context.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Developer"));
}
```

---

## 📋 実装タスク

### Phase 0: セキュリティ監査（必須・実装前）

#### タスク0.1: NEXT_PUBLIC_DEV_PASSWORD削除
- [ ] `NEXT_PUBLIC_DEV_PASSWORD`の使用箇所を特定
- [ ] `frontend/src/components/dev/DevPasswordPrompt.tsx`の削除または完全書き換え
- [ ] `.env`ファイルから`NEXT_PUBLIC_DEV_PASSWORD`を削除
- [ ] CI/CDワークフローから`NEXT_PUBLIC_DEV_PASSWORD`を削除
- [ ] ドキュメントから`NEXT_PUBLIC_DEV_PASSWORD`への言及を削除

#### タスク0.2: DemoReadOnlyFilter修正計画
現在の実装:
```csharp
// backend/ShopifyAnalyticsApi/Filters/DemoReadOnlyFilter.cs (lines 37-41)
var isDemoMode = authMode == "demo" || 
                 context.HttpContext.User.HasClaim("auth_mode", "demo");

if (isDemoMode && isReadOnly == true)
{
    var httpMethod = context.HttpContext.Request.Method;
    if (IsWriteOperation(httpMethod))
```

**問題点**: `auth_mode`で判定しているため、開発者モードも誤ってブロックされる可能性がある。

**修正内容**:
```csharp
// ✅ 修正後
var readOnlyClaim = context.HttpContext.User.FindFirst("read_only");
var isReadOnly = readOnlyClaim?.Value == "true";

if (isReadOnly)
{
    var httpMethod = context.HttpContext.Request.Method;
    if (IsWriteOperation(httpMethod))
```

#### タスク0.3: AuthModeMiddleware修正計画
現在の実装:
```csharp
// backend/ShopifyAnalyticsApi/Middleware/AuthModeMiddleware.cs (lines 217-229)
if (isDemoValid && !isOAuthValid)
{
    context.Items["IsDemoMode"] = true;
    
    var claims = new List<Claim>
    {
        new Claim("auth_mode", "demo"),
        new Claim("read_only", "true"),
        new Claim(ClaimTypes.Name, authResult.UserId ?? "demo-user"),
        new Claim(ClaimTypes.NameIdentifier, authResult.UserId ?? "demo-user")
    };

    context.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Demo"));
}
```

**問題点**: 開発者モードのクレーム設定パスが存在しない。

**修正内容**:
```csharp
// ✅ 修正後（3段階認証レベル対応）
if (isOAuthValid)
{
    // Level 3: OAuth認証
    context.Items["AuthMode"] = "OAuth";
    var claims = new List<Claim>
    {
        new Claim("auth_mode", "oauth"),
        new Claim("read_only", "false")
    };
    context.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "OAuth"));
}
else if (isDemoValid)
{
    // Level 2: デモモード
    context.Items["AuthMode"] = "Demo";
    var claims = new List<Claim>
    {
        new Claim("auth_mode", "demo"),
        new Claim("read_only", "true")
    };
    context.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Demo"));
}
else if (isDeveloperValid && environment == "Development")
{
    // Level 1: 開発者モード（開発環境のみ）
    context.Items["AuthMode"] = "Developer";
    var claims = new List<Claim>
    {
        new Claim("auth_mode", "developer"),
        new Claim("read_only", "false"),
        new Claim("can_access_dev_tools", "true")
    };
    context.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Developer"));
}
```

### Phase 1: バックエンド実装

#### タスク1.1: 開発者認証サービス実装
- [ ] `backend/ShopifyAnalyticsApi/Services/DeveloperAuthService.cs`を作成
- [ ] `DemoAuthService.cs`を参考にbcrypt認証を実装
- [ ] JWT発行機能を実装（auth_mode: 'developer', read_only: false, can_access_dev_tools: true）
- [ ] レート制限機能を実装

#### タスク1.2: 開発者認証APIエンドポイント実装
- [ ] `backend/ShopifyAnalyticsApi/Controllers/DeveloperAuthController.cs`を作成
- [ ] `POST /api/developer/login`を実装
- [ ] `POST /api/developer/logout`を実装
- [ ] `GET /api/developer/session`を実装
- [ ] 環境チェック（開発環境のみ有効）を実装

#### タスク1.3: DemoReadOnlyFilter修正
- [ ] `backend/ShopifyAnalyticsApi/Filters/DemoReadOnlyFilter.cs`を修正
- [ ] `auth_mode`判定を`read_only`判定に変更（lines 37-41）
- [ ] ログメッセージを更新（"Demo mode" → "Read-only mode"）
- [ ] 単体テストを更新

#### タスク1.4: AuthModeMiddleware修正
- [ ] `backend/ShopifyAnalyticsApi/Middleware/AuthModeMiddleware.cs`を修正
- [ ] 開発者モードクレーム設定パスを追加
- [ ] 3段階認証レベルのクレーム設定を実装
- [ ] 環境チェックを追加（開発者モードは開発環境のみ）
- [ ] 単体テストを更新

#### タスク1.5: 環境変数設定
- [ ] `backend/ShopifyAnalyticsApi/appsettings.Development.json`に開発者モード設定を追加
```json
{
  "Developer": {
    "Enabled": true,
    "PasswordHash": "$2a$10$...",
    "SessionTimeoutHours": 8,
    "RateLimitPerIp": 10
  }
}
```
- [ ] `backend/ShopifyAnalyticsApi/appsettings.Staging.json`で開発者モードを無効化
```json
{
  "Developer": {
    "Enabled": false
  }
}
```
- [ ] `backend/ShopifyAnalyticsApi/appsettings.Production.json`で開発者モードを無効化

### Phase 2: フロントエンド実装

#### タスク2.1: NEXT_PUBLIC_DEV_PASSWORD削除
- [ ] `frontend/src/components/dev/DevPasswordPrompt.tsx`を削除または完全書き換え
- [ ] クライアント側パスワード検証ロジックを削除
- [ ] サーバー側認証に切り替え

#### タスク2.2: 開発者モード認証UI実装
- [ ] `frontend/src/app/developer/login/page.tsx`を作成
- [ ] パスワード入力フォームを実装
- [ ] `/api/developer/login`へのPOSTリクエストを実装
- [ ] JWTトークンの保存を実装

#### タスク2.3: 開発者モードバナー実装
- [ ] `frontend/src/components/banners/DeveloperModeBanner.tsx`を作成
- [ ] 「開発者モード」表示を実装
- [ ] 「開発環境のみ」警告を実装
- [ ] セッション残り時間表示を実装
- [ ] ログアウトボタンを実装

#### タスク2.4: /dev-bookmarksアクセス制御
- [ ] `frontend/src/app/dev-bookmarks/page.tsx`を修正
- [ ] `can_access_dev_tools`クレームチェックを追加
- [ ] 本番ゲートを再有効化（line 341の`if (false && ...)`を修正）
- [ ] 開発者モードトークンがない場合は認証画面にリダイレクト

#### タスク2.5: 認証画面更新
- [ ] `frontend/src/components/providers/AuthProvider.tsx`を修正
- [ ] 開発環境で開発者モードリンクを表示
- [ ] `/demo/login`ページへの参照を修正（line 144）

### Phase 3: テスト実装

#### タスク3.1: バックエンド単体テスト
- [ ] `DemoReadOnlyFilter`のテスト更新（read_only判定）
- [ ] `AuthModeMiddleware`のテスト更新（3段階認証レベル）
- [ ] `DeveloperAuthService`のテスト作成

#### タスク3.2: バックエンド統合テスト
- [ ] 3段階認証レベルの統合テスト
- [ ] read_onlyクレームによる書き込み制限テスト
- [ ] 環境別アクセス制御テスト

#### タスク3.3: フロントエンドテスト
- [ ] 開発者モード認証フローのE2Eテスト
- [ ] /dev-bookmarksアクセス制御のテスト
- [ ] バナー表示のテスト

#### タスク3.4: セキュリティテスト
- [ ] NEXT_PUBLIC_DEV_PASSWORDが存在しないことを確認
- [ ] 本番・ステージング環境で開発者モードがブロックされることを確認
- [ ] read_onlyクレームによる書き込み制限が機能することを確認

---

## 🚨 重要な注意事項

### 1. 既存のデモモード機能は未完成

**現状**:
- `DemoAuthService.cs`: ✅ 実装済み（403行）
- `DemoReadOnlyFilter.cs`: ✅ 実装済み（116行）だが修正が必要
- `AuthModeMiddleware.cs`: ✅ 実装済み（292行）だが修正が必要
- `AuthProvider.tsx`: ⚠️ 部分実装（283行）、`/demo/login`ページへの参照あり
- `/demo/login`ページ: ❌ 未実装
- デモ認証APIエンドポイント: ❌ 未実装

**対応**:
- デモモード機能の完成を優先する
- 開発者モード実装はデモモード完成後に実施

### 2. 本番環境での安全性確保

**必須チェック**:
- [ ] 本番環境で`Developer__Enabled`が`false`であることを確認
- [ ] 本番環境で`/api/developer/*`が404を返すことを確認
- [ ] 本番環境で`/dev-bookmarks`が404を返すことを確認
- [ ] `NEXT_PUBLIC_DEV_PASSWORD`が完全に削除されていることを確認

### 3. 段階的な実装

**推奨実装順序**:
1. Phase 0: セキュリティ監査（NEXT_PUBLIC_DEV_PASSWORD削除、既存コード修正計画）
2. デモモード機能の完成（`/demo/login`ページ、APIエンドポイント）
3. DemoReadOnlyFilter修正（read_only判定）
4. AuthModeMiddleware修正（3段階認証レベル）
5. 開発者モード実装（認証サービス、APIエンドポイント、UI）
6. テスト実装
7. ドキュメント更新

---

## 📚 参考資料

### 既存実装ファイル

**バックエンド**:
- `backend/ShopifyAnalyticsApi/Services/DemoAuthService.cs` (403行)
- `backend/ShopifyAnalyticsApi/Filters/DemoReadOnlyFilter.cs` (116行)
- `backend/ShopifyAnalyticsApi/Middleware/AuthModeMiddleware.cs` (292行)

**フロントエンド**:
- `frontend/src/components/providers/AuthProvider.tsx` (283行)
- `frontend/src/components/dev/DevPasswordPrompt.tsx` (91行)
- `frontend/src/app/dev-bookmarks/page.tsx` (903行)

### ドキュメント

- [要件定義書](../03-feature-development/アプリ認証モード制御機能/Shopify-認証モード制御-要件定義.md) (656行)
- [設計書](../03-feature-development/アプリ認証モード制御機能/Shopify-認証モード制御-設計書.md) (1042行)
- [実装計画](../03-feature-development/アプリ認証モード制御機能/Shopify-認証モード制御-実装計画.md) (1278行)
- [テスト計画](../03-feature-development/アプリ認証モード制御機能/Shopify-認証モード制御-テスト計画.md) (1430行)

---

## ✅ 完了確認チェックリスト

### セキュリティ
- [ ] NEXT_PUBLIC_DEV_PASSWORDが完全に削除されている
- [ ] 本番・ステージング環境で開発者モードが100%ブロックされる
- [ ] すべての認証・認可判定がサーバー側で実施されている

### 機能
- [ ] デモモードでデータ変更操作が完全にブロックされる（read_only: true）
- [ ] 開発者モードでデータ変更操作が正常に動作する（read_only: false）
- [ ] 開発者モードで/dev-bookmarksにアクセス可能（can_access_dev_tools: true）
- [ ] 3段階認証レベルが正しく動作する

### コード品質
- [ ] DemoReadOnlyFilterがread_onlyクレームで判定する
- [ ] AuthModeMiddlewareが3段階認証レベルに対応している
- [ ] 単体テストが全て合格する
- [ ] 統合テストが全て合格する
- [ ] E2Eテストが全て合格する

### ドキュメント
- [ ] 実装ドキュメントが更新されている
- [ ] 運用マニュアルが作成されている
- [ ] トラブルシューティングガイドが作成されている

---

## 🔗 関連リンク

- **PR**: https://github.com/sideworks-fuk/shopify-ai-marketing-suite/pull/61
- **Devinセッション**: https://app.devin.ai/sessions/f2f3cd1426a1415c92e76fdb64fe18f5
- **リクエスト者**: h.fukdua (h.fukuda1207@gmail.com), GitHub: @hirofumi-fukuda
