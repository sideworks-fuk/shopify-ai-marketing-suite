# ShopifyAppsテーブルのRedirectUriカラムの使用状況

## 作成日
2025-12-26

## 調査結果

### 結論
**`ShopifyApps`テーブルの`RedirectUri`カラムは現在使用されていません。**

---

## 詳細な調査結果

### 1. データベーススキーマ

`ShopifyApps`テーブルには`RedirectUri`カラムが定義されています：

```csharp
// backend/ShopifyAnalyticsApi/Models/DatabaseModels.cs
public class ShopifyApp
{
    // ...
    [MaxLength(500)]
    public string? RedirectUri { get; set; }
    // ...
}
```

### 2. 実際の使用状況

#### 2.1 OAuth認証フローでの使用

**`BuildOAuthUrlAsync()`メソッド**（`ShopifyAuthController.cs`）:

```csharp
// redirect_uriの決定:
// Shopify公式ドキュメントに基づき、OAuthコールバックはバックエンドで直接処理するため、
// 常にバックエンドURLを使用する
// 修正前: フロントエンドURLを使用していたが、プロキシが複雑性を増すため削除
var redirectUri = GetRedirectUri();
```

**`GetRedirectUri()`メソッド**:

```csharp
private string GetRedirectUri()
{
    // バックエンドのコールバックURLを使用（OAuthコールバックはバックエンドで処理するため）
    // 優先順位: 環境変数 SHOPIFY_BACKEND_BASEURL → Backend:BaseUrl設定 → 現在のリクエストURLから取得
    var backendUrl = Environment.GetEnvironmentVariable("SHOPIFY_BACKEND_BASEURL") ?? 
                     _configuration["Backend:BaseUrl"];
    
    if (string.IsNullOrWhiteSpace(backendUrl))
    {
        // 設定がない場合は現在のリクエストからバックエンドURLを取得
        backendUrl = GetBaseUrl();
    }
    
    var redirectUri = $"{backendUrl.TrimEnd('/')}/api/shopify/callback";
    return redirectUri;
}
```

**確認結果**: `GetRedirectUri()`メソッドは常にバックエンドURLを返すため、`ShopifyApps`テーブルの`RedirectUri`を参照していません。

#### 2.2 ShopifyAppsテーブルからの取得

**`BuildOAuthUrlAsync()`メソッド**で`ShopifyApps`テーブルから取得しているのは`AppUrl`のみ：

```csharp
// マルチアプリ対応: AppUrlを取得（フロントエンドへのリダイレクト用）
if (string.IsNullOrWhiteSpace(shopifyAppUrl))
{
    shopifyAppUrl = await _context.ShopifyApps
        .Where(a => a.ApiKey == finalApiKey && a.IsActive)
        .Select(a => a.AppUrl)  // ← AppUrlのみ取得
        .FirstOrDefaultAsync();
}
```

**確認結果**: `RedirectUri`は取得されていません。

#### 2.3 デバッグエンドポイント

**`DebugShopifyApps()`メソッド**でも`RedirectUri`は返されていません：

```csharp
var apps = await _context.ShopifyApps
    .Select(a => new
    {
        a.Id,
        a.Name,
        a.DisplayName,
        a.AppType,
        ApiKey = a.ApiKey.Substring(0, Math.Min(8, a.ApiKey.Length)) + "...",
        AppUrl = a.AppUrl,  // ← AppUrlのみ
        IsActive = a.IsActive,
        a.CreatedAt
        // RedirectUriは含まれていない
    })
    .ToListAsync();
```

---

## なぜ使用されていないのか

### Phase 1の実装方針

Phase 1の実装で、以下の方針に基づいてリダイレクトURIを統一しました：

1. **Shopify公式ドキュメントに基づく実装**
   - OAuthコールバックはバックエンドで直接処理することを推奨
   - フロントエンドのプロキシは不要（複雑性を増すだけ）

2. **リダイレクトURIの統一**
   - すべてのOAuth認証フローで、バックエンドURL（`{backendUrl}/api/shopify/callback`）を使用
   - アプリごとに異なるリダイレクトURIを設定する必要がない

3. **シンプルな実装**
   - `GetRedirectUri()`メソッドで常に同じロジックを使用
   - データベースから取得する必要がない

---

## 推奨事項

### オプション1: カラムを残す（推奨）

**理由**:
- 将来の拡張性を考慮
- アプリごとに異なるリダイレクトURIが必要になる可能性がある
- データベーススキーマの変更は影響が大きい

**対応**:
- カラムは残すが、使用しない
- コメントで「現在未使用」と明記

### オプション2: カラムを削除

**理由**:
- 現在使用されていないため、不要なカラムを削除してスキーマをクリーンに保つ
- データベースの容量を節約

**対応**:
- EF Core Migrationでカラムを削除
- マイグレーション管理ドキュメントを更新

---

## 現在の実装でのリダイレクトURI取得方法

### 優先順位

1. **環境変数**: `SHOPIFY_BACKEND_BASEURL`
2. **設定ファイル**: `Backend:BaseUrl`
3. **現在のリクエストURL**: `GetBaseUrl()`メソッドから取得

### 生成されるリダイレクトURI

```
{backendUrl}/api/shopify/callback
```

**例**:
- 開発環境: `https://localhost:7088/api/shopify/callback`
- 本番環境: `https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net/api/shopify/callback`

---

## まとめ

- ✅ **`ShopifyApps`テーブルの`RedirectUri`カラムは現在使用されていません**
- ✅ **Phase 1の実装で、リダイレクトURIをバックエンドURLに統一したため、このカラムは不要になりました**
- ✅ **将来の拡張性を考慮して、カラムは残しておくことを推奨します**

---

## 関連ドキュメント

- [現状設計の問題点と修正方針.md](./現状設計の問題点と修正方針.md)
- [Phase1-テスト手順.md](./Phase1-テスト手順.md)

---

## 更新履歴

- 2025-12-26: 初版作成
