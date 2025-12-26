# AllAllowed モード仕様書（非推奨・削除済み）

> ⚠️ **重要**: このモードは2025-12-26に削除されました。セキュリティ上の理由により、デフォルトStoreId = 1の使用が禁止され、AllAllowedモードは廃止されました。
> 
> 代替手段として、`DemoAllowed`モードを使用してください。

## 概要（削除前の仕様）

`AllAllowed` は開発環境専用の認証モードで、すべての認証方式を許可し、認証なしでもアクセス可能にします。

---

## 基本仕様

### 目的

- **開発・テスト環境での開発効率向上**
  - OAuth認証の設定が不要
  - デモモードの設定が不要
  - 認証トークンなしでAPIにアクセス可能

- **デバッグの容易化**
  - 認証エラーによる開発の中断を防止
  - フロントエンドとバックエンドの独立した開発を可能にする

### 使用環境

- ✅ **開発環境（Development）**: 推奨
- ✅ **ローカル開発環境（LocalDevelopment）**: 推奨
- ❌ **ステージング環境（Staging）**: 禁止（`DemoAllowed` を使用）
- ❌ **本番環境（Production）**: **絶対禁止**（起動時にエラー）

---

## 動作仕様

### 1. 認証処理

#### 1.1 認証チェックのスキップ

`AllAllowed` モードでは、以下の認証チェックが**すべてスキップ**されます：

- ✅ OAuth認証チェック
- ✅ デモモード認証チェック
- ✅ 開発者認証チェック

#### 1.2 匿名ユーザーの自動設定

認証が失敗した場合（または認証トークンが提供されていない場合）、自動的に**匿名ユーザー**として `Context.User` が設定されます。

**設定されるクレーム**:

```csharp
{
    "auth_mode": "anonymous",
    "read_only": "false",
    ClaimTypes.Name: "anonymous-user",
    ClaimTypes.NameIdentifier: "anonymous-user",
    "store_id": "1",
    "tenant_id": "default-tenant",
    "shop_domain": "development-store.myshopify.com"
}
```

#### 1.3 `[Authorize]` 属性の動作

`AllAllowed` モードでは、`[Authorize]` 属性が付いているコントローラーでもアクセス可能になります。

**理由**: 匿名ユーザーとして `Context.User` が設定されるため、`User.Identity.IsAuthenticated` が `true` になります。

### 2. StoreContext の設定

#### 2.1 デフォルト値の設定

`AllAllowed` モードでは、以下のデフォルト値が設定されます：

- **StoreId**: `1`
- **TenantId**: `"default-tenant"`
- **ShopDomain**: `"development-store.myshopify.com"`

#### 2.2 StoreContextMiddleware との連携

`StoreContextMiddleware` は、匿名ユーザーの `store_id` クレームから `StoreId` を取得し、`HttpContext.Items` に設定します。

これにより、`StoreAwareControllerBase` を継承するコントローラーでも `StoreId` が利用可能になります。

### 3. セキュリティチェック

#### 3.1 本番環境での禁止

`Program.cs` で以下のチェックが行われます：

```csharp
if (environment == "Production" && authMode != "OAuthRequired")
{
    // 起動時にエラーを返す
    throw new InvalidOperationException("Production environment must use OAuthRequired mode");
}
```

**結果**: 本番環境で `AllAllowed` が設定されている場合、アプリケーションは起動しません。

#### 3.2 ログ出力

`AllAllowed` モードが有効な場合、すべてのリクエストに対して以下のログが出力されます：

```
[INF] AllAllowed mode enabled. Path: /api/...
```

---

## 設定方法

### 1. appsettings.{環境}.json での設定

```json
{
  "Authentication": {
    "Mode": "AllAllowed",
    "Secret": "development-secret-key-replace-in-production",
    "Issuer": "ec-ranger",
    "Audience": "shopify-stores"
  }
}
```

### 2. 環境変数での設定

```powershell
# PowerShell
$env:Authentication__Mode="AllAllowed"
```

```bash
# Bash
export Authentication__Mode=AllAllowed
```

### 3. Azure App Service での設定

**⚠️ 注意**: Azure App Service の本番環境では設定しないでください。

```
Authentication:Mode=AllAllowed
```

---

## 必要な設定

### 必須設定

- ✅ `Authentication:Mode`: `"AllAllowed"`
- ✅ `Jwt:Key`: JWT Secret（デモモードや開発者認証で使用される可能性があるため）

### オプション設定

- `Authentication:Secret`: JWT Secret（`Jwt:Key` と同等）
- `Authentication:Issuer`: JWT Issuer（デフォルト: `"ec-ranger"`）
- `Authentication:Audience`: JWT Audience（デフォルト: `"shopify-stores"`）

---

## 現在の使用状況

### 設定ファイルでの使用

| ファイル | 設定値 | 環境 | 状態 |
|---------|--------|------|------|
| `appsettings.Development.json` | `AllAllowed` | Development | ✅ 適切 |
| `appsettings.LocalDevelopment.json` | `AllAllowed` | LocalDevelopment | ✅ 適切 |
| `appsettings.Production.json` | `AllAllowed` | Production | ⚠️ **問題あり** |
| `appsettings.json` | `AllAllowed` | ベース設定 | ⚠️ 環境変数で上書きされる想定 |

### コード内での処理

#### AuthModeMiddleware.cs

```csharp
case "AllAllowed":
    // すべての認証方式を許可（開発環境のみ）
    _logger.LogInformation("AllAllowed mode enabled. Path: {Path}", context.Request.Path);
    
    // 認証が失敗しても匿名ユーザーとしてContext.Userを設定
    if (context.User?.Identity?.IsAuthenticated != true)
    {
        var anonymousClaims = new List<Claim>
        {
            new Claim("auth_mode", "anonymous"),
            new Claim("read_only", "false"),
            new Claim(ClaimTypes.Name, "anonymous-user"),
            new Claim(ClaimTypes.NameIdentifier, "anonymous-user"),
            new Claim("store_id", "1"),
            new Claim("tenant_id", "default-tenant"),
            new Claim("shop_domain", "development-store.myshopify.com")
        };
        context.User = new ClaimsPrincipal(new ClaimsIdentity(anonymousClaims, "Anonymous"));
    }
    break;
```

#### Program.cs

```csharp
// JwtSecretはDemoAllowed/AllAllowedモードでのみ必須
if (authMode == "DemoAllowed" || authMode == "AllAllowed")
{
    // Jwt:Key の存在チェック
}
```

---

## 問題点と改善提案

### 1. 本番環境での設定

**問題**: `appsettings.Production.json` に `AllAllowed` が設定されている

**影響**: 
- 本番環境で `AllAllowed` が設定されている場合、起動時にエラーが発生する
- ただし、環境変数で `OAuthRequired` を設定すれば上書きされる

**改善提案**:
- `appsettings.Production.json` を `OAuthRequired` に変更
- または、環境変数で確実に `OAuthRequired` を設定

### 2. デフォルト StoreId のハードコーディング

**問題**: `StoreId` が `1` にハードコーディングされている

**影響**:
- データベースに `StoreId = 1` のストアが存在しない場合、エラーが発生する可能性がある
- 複数の開発者が同時に開発する場合、同じ `StoreId` を使用することになる

**改善提案**:
- 環境変数でデフォルト `StoreId` を設定可能にする
- または、データベースから最初のアクティブなストアを取得する

### 3. ログ出力の冗長性

**問題**: すべてのリクエストに対して `AllAllowed mode enabled` ログが出力される

**影響**: ログが冗長になり、重要なログが見つけにくくなる

**改善提案**:
- ログレベルを `Debug` に変更
- または、初回のみログを出力する

---

## 使用例

### 1. ローカル開発環境での使用

```json
// appsettings.LocalDevelopment.json
{
  "Authentication": {
    "Mode": "AllAllowed",
    "Secret": "local-dev-secret-key",
    "Issuer": "ec-ranger",
    "Audience": "shopify-stores"
  },
  "Jwt": {
    "Key": "local-dev-secret-key",
    "Issuer": "ec-ranger",
    "Audience": "shopify-stores",
    "ExpiryMinutes": 60
  }
}
```

### 2. 開発環境（Azure）での使用

```json
// appsettings.Development.json
{
  "Authentication": {
    "Mode": "AllAllowed",
    "Secret": "#{JWT_SECRET}#",
    "Issuer": "ec-ranger",
    "Audience": "shopify-stores"
  }
}
```

**環境変数**:
```
Authentication:Mode=AllAllowed
Jwt:Key=<JWT_SECRET>
```

---

## トラブルシューティング

### エラー: "Production environment must use OAuthRequired mode"

**原因**: 本番環境で `AllAllowed` が設定されている

**解決方法**:
1. 環境変数で `Authentication:Mode=OAuthRequired` を設定
2. または、`appsettings.Production.json` を `OAuthRequired` に変更

### エラー: "Store context is not available"

**原因**: `StoreContextMiddleware` が `StoreId` を設定できていない

**解決方法**:
1. `AllAllowed` モードが有効になっていることを確認
2. 匿名ユーザーに `store_id` クレームが含まれていることを確認（ログで確認）

### エラー: "JwtSecret is required for AllAllowed mode"

**原因**: `Jwt:Key` が設定されていない

**解決方法**:
1. `appsettings.{環境}.json` に `Jwt:Key` を設定
2. または、環境変数で `Jwt:Key` を設定

---

## まとめ

### AllAllowed モードの役割

1. **開発効率の向上**: 認証設定なしで開発を開始できる
2. **デバッグの容易化**: 認証エラーによる開発の中断を防止
3. **テストの簡素化**: 認証トークンなしでAPIをテストできる

### 使用上の注意

1. **本番環境では絶対に使用しない**: セキュリティ上の重大な問題
2. **デフォルト StoreId の確認**: データベースに `StoreId = 1` のストアが存在することを確認
3. **ログの確認**: `AllAllowed mode enabled` ログが出力されていることを確認

---

## 関連ドキュメント

- [認証モード制御設定ガイド](./認証モード制御設定ガイド.md)
- [環境変数設定ガイド](./環境変数設定ガイド.md)
- [Shopify-認証モード制御-設計書](../../03-feature-development/アプリ認証モード制御機能/Shopify-認証モード制御-設計書.md)

---

**最終更新**: 2025-12-26
**作成者**: AI Assistant
