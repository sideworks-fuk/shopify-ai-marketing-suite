# 404エラー - ShopifyAppsテーブル影響調査

## 作成日
2025-12-27

## 目的
修正対応前に、ShopifyAppsテーブルの`RedirectUri`と`AppType`フィールドがコードレベルでどのように使用されているか、影響を調査する。

---

## 調査結果サマリー

### RedirectUri
- **使用状況**: **現在使用されていない** ✅
- **影響**: データベースの値を更新しても、コードの動作には影響しない
- **推奨**: データの整合性を保つために設定しておくことを推奨（将来の拡張性を考慮）

### AppType
- **使用状況**: **デバッグエンドポイントでのみ使用** ⚠️
- **影響**: データベースの値を更新しても、OAuthフローや認証処理には影響しない
- **推奨**: データの整合性を保つために設定しておくことを推奨

---

## 詳細な調査結果

### 1. RedirectUriフィールドの使用状況

#### 1.1 データベースモデル定義

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

**確認**: モデルには定義されているが、nullable型（`string?`）で必須ではない。

#### 1.2 OAuth認証フローでの使用

**`GetRedirectUri()`メソッド**（`ShopifyAuthController.cs`）:

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

**確認結果**: 
- `GetRedirectUri()`メソッドは常にバックエンドURLを返す
- `ShopifyApps`テーブルの`RedirectUri`を参照していない
- 環境変数または設定ファイルから取得したバックエンドURLを使用

#### 1.3 ShopifyAppsテーブルからの取得

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

**確認結果**: `RedirectUri`は取得されていない。

#### 1.4 デバッグエンドポイント

**`DebugShopifyApps()`メソッド**でも`RedirectUri`は返されていない：

```csharp
var apps = await _context.ShopifyApps
    .Select(a => new
    {
        a.Id,
        a.Name,
        a.DisplayName,
        a.AppType,
        ApiKey = a.ApiKey.Substring(0, Math.Min(8, a.ApiKey.Length)) + "...",
        AppUrl = a.AppUrl,
        IsActive = a.IsActive,
        a.CreatedAt
    })
    .ToListAsync();
```

**確認結果**: `RedirectUri`は含まれていない。

#### 1.5 結論

**`ShopifyApps`テーブルの`RedirectUri`カラムは現在使用されていません。**

**理由**:
- Phase 1の実装で、リダイレクトURIをバックエンドURLに統一したため
- アプリごとに異なるリダイレクトURIを設定する必要がない
- `GetRedirectUri()`メソッドで常に同じロジックを使用

**影響**:
- データベースの値を更新しても、コードの動作には影響しない
- OAuthフローには影響しない
- データの整合性を保つために設定しておくことを推奨（将来の拡張性を考慮）

---

### 2. AppTypeフィールドの使用状況

#### 2.1 データベースモデル定義

```csharp
// backend/ShopifyAnalyticsApi/Models/DatabaseModels.cs
public string AppType { get; set; } = string.Empty; // 'Public' or 'Custom'
```

**確認**: モデルには定義されており、必須フィールド（`Required`属性）。

#### 2.2 インデックス

```csharp
// backend/ShopifyAnalyticsApi/Data/ShopifyDbContext.cs
entity.HasIndex(e => e.AppType)
    .HasDatabaseName("IX_ShopifyApps_AppType");
```

**確認**: `AppType`フィールドにインデックスが作成されている。

#### 2.3 デバッグエンドポイントでの使用

**`DebugShopifyApps()`メソッド**で使用されている：

```csharp
var apps = await _context.ShopifyApps
    .Select(a => new
    {
        a.Id,
        a.Name,
        a.DisplayName,
        a.AppType,
        ApiKey = a.ApiKey.Substring(0, Math.Min(8, a.ApiKey.Length)) + "...",
        AppUrl = a.AppUrl,
        IsActive = a.IsActive,
        a.CreatedAt
    })
    .ToListAsync();
```

**確認結果**: デバッグエンドポイントで`AppType`が返されている。

#### 2.4 OAuth認証フローでの使用

**`BuildOAuthUrlAsync()`メソッド**を確認：

```csharp
// ShopifyAppsテーブルから取得しているのはAppUrlのみ
// AppTypeは取得していない
```

**確認結果**: OAuth認証フローでは`AppType`は使用されていない。

#### 2.5 認証処理での使用

**`AuthModeMiddleware`**や**`DemoModeMiddleware`**を確認：

```csharp
// AppTypeによる認証処理の分岐は見つからない
```

**確認結果**: 認証処理でも`AppType`は使用されていない。

#### 2.6 結論

**`ShopifyApps`テーブルの`AppType`カラムは、デバッグエンドポイントでのみ使用されています。**

**使用箇所**:
- `DebugShopifyApps()`エンドポイントで返される情報に含まれる

**未使用箇所**:
- OAuth認証フロー
- 認証処理
- その他のビジネスロジック

**影響**:
- データベースの値を更新しても、OAuthフローや認証処理には影響しない
- デバッグエンドポイントで表示される情報が変わるだけ
- データの整合性を保つために設定しておくことを推奨

---

## 修正対応への影響

### RedirectUriの更新

**影響**: **なし** ✅

- コードの動作には影響しない
- OAuthフローには影響しない
- データの整合性を保つために設定しておくことを推奨

**推奨対応**:
- OK環境と同じ形式で設定する
- 将来の拡張性を考慮して、カラムは残しておく

### AppTypeの更新

**影響**: **なし** ✅

- OAuthフローや認証処理には影響しない
- デバッグエンドポイントで表示される情報が変わるだけ
- データの整合性を保つために設定しておくことを推奨

**推奨対応**:
- OK環境と同じ値（`Custom`）に設定する
- Shopify Partner Dashboardの表示と一致させる

---

## まとめ

### RedirectUri
- ✅ **現在使用されていない**
- ✅ **更新してもコードの動作には影響しない**
- ✅ **データの整合性を保つために設定しておくことを推奨**

### AppType
- ⚠️ **デバッグエンドポイントでのみ使用**
- ✅ **更新してもOAuthフローや認証処理には影響しない**
- ✅ **データの整合性を保つために設定しておくことを推奨**

### 修正対応の優先度

1. **Use legacy install flow**: 最優先（コードの動作に直接影響）
2. **Redirect URLs**: 高優先度（Shopify Partner Dashboardの設定）
3. **RedirectUri**: 低優先度（データの整合性のため）
4. **AppType**: 低優先度（データの整合性のため）

---

## 参考資料

- [OK環境とNG環境の比較](./404エラー-OK環境とNG環境の比較.md)
- [修正アクション項目](./404エラー-修正アクション項目.md)
- [追加確認項目](./404エラー-追加確認項目.md)

---

## 更新履歴

- 2025-12-27: 初版作成（コードレベルでの影響調査）
