# 404エラー - ShopifyAppsテーブルScopes影響調査

## 作成日
2025-12-28

## 目的
ShopifyAppsテーブルの`Scopes`フィールドがコードレベルでどのように使用されているか、影響を調査する。

---

## 調査結果サマリー

### Scopes
- **使用状況**: **現在使用されていない** ✅
- **影響**: データベースの値を更新しても、コードの動作には影響しない
- **推奨**: データの整合性を保つために設定しておくことを推奨（将来の拡張性を考慮）

---

## 詳細な調査結果

### 1. Scopesフィールドの使用状況

#### 1.1 データベースモデル定義

```csharp
// backend/ShopifyAnalyticsApi/Models/DatabaseModels.cs
public class ShopifyApp
{
    // ...
    [MaxLength(500)]
    public string? Scopes { get; set; }
    // ...
}
```

**確認**: モデルには定義されているが、nullable型（`string?`）で必須ではない。

#### 1.2 OAuth認証フローでの使用

**`BuildOAuthUrlAsync()`メソッド**（`ShopifyAuthController.cs`）:

```csharp
// backend/ShopifyAnalyticsApi/Controllers/ShopifyAuthController.cs (188行目)
var scopes = GetShopifySetting("Scopes", "read_orders,read_products,read_customers");
_logger.LogInformation("OAuth scopes: {Scopes}", scopes);

var authUrl = $"https://{shop}/admin/oauth/authorize" +
    $"?client_id={finalApiKey}" +
    $"&scope={scopes}" +
    $"&redirect_uri={Uri.EscapeDataString(redirectUri)}" +
    $"&state={state}";
```

**確認結果**:
- ✅ OAuthフローでは`GetShopifySetting("Scopes")`を使用
- ✅ `appsettings.json`の`Shopify:Scopes`設定から取得
- ❌ ShopifyAppsテーブルの`Scopes`カラムは**使用されていない**

#### 1.3 その他の使用箇所

**`ProcessCallbackAsync()`メソッド**（`ShopifyAuthController.cs`）:

```csharp
// backend/ShopifyAnalyticsApi/Controllers/ShopifyAuthController.cs (1072行目)
if (string.IsNullOrWhiteSpace(tokenResponse.Scope))
{
    var requestedScopes = GetShopifySetting("Scopes", "read_orders,read_products,read_customers");
    _logger.LogWarning("Shopify応答にscopeが含まれていません. リクエストしたスコープを使用します. Shop: {Shop}, RequestedScopes: {Scopes}", 
        shop, requestedScopes);
    tokenResponse.Scope = requestedScopes;
}
```

**確認結果**:
- ✅ トークン処理でも`GetShopifySetting("Scopes")`を使用
- ❌ ShopifyAppsテーブルの`Scopes`カラムは**使用されていない**

#### 1.4 コード内での参照確認

**grep検索結果**:
```bash
# ShopifyAppsテーブルのScopesカラムを直接参照している箇所
grep -r "shopifyApp\.Scopes\|a\.Scopes\|app\.Scopes" backend/
# → 結果: なし
```

**確認結果**:
- ❌ ShopifyAppsテーブルの`Scopes`カラムを直接参照している箇所は**存在しない**

---

## 2. 現在の実装方式

### 2.1 appsettings.jsonからの取得

**現在の実装**:
- OAuthフローでは`appsettings.json`の`Shopify:Scopes`設定を使用
- マルチアプリ対応のため、将来的にShopifyAppsテーブルの`Scopes`を使用する可能性がある

**appsettings.jsonの例**:
```json
{
  "Shopify": {
    "Scopes": "read_orders,read_products,read_customers"
  }
}
```

### 2.2 マルチアプリ対応の将来性

**設計意図**:
- ShopifyAppsテーブルに`Scopes`カラムが存在するのは、将来的にマルチアプリ対応で使用するため
- 現時点では、すべてのアプリで同じスコープを使用する前提

---

## 3. 結論

### 3.1 コードへの影響

**ShopifyAppsテーブルの`Scopes`カラムを更新しても、コードの動作には影響しない。**

**理由**:
1. OAuthフローでは`appsettings.json`の`Shopify:Scopes`設定を使用
2. ShopifyAppsテーブルの`Scopes`カラムを直接参照している箇所は存在しない
3. データベースの値を更新しても、OAuthフローや認証処理には影響しない

### 3.2 データの整合性

**推奨**: データの整合性を保つために、ShopifyAppsテーブルの`Scopes`カラムを更新することを推奨

**理由**:
1. Shopify Partner Dashboardで設定したScopesとデータベースのScopesを一致させておく
2. 将来的にマルチアプリ対応で使用する可能性がある
3. デバッグやトラブルシューティング時に参照する可能性がある

---

## 4. 更新方法

### 4.1 SQL更新例

```sql
-- NG環境のShopifyAppsテーブルのScopesを更新
UPDATE ShopifyApps
SET Scopes = 'read_all_orders,read_customers,read_orders,read_products'
WHERE ApiKey = '2d7e0e1f...';  -- 後半はマスク

-- 更新結果の確認
SELECT Id, Name, ApiKey, Scopes
FROM ShopifyApps
WHERE ApiKey = '2d7e0e1f...';
```

### 4.2 現在のScopes設定

**Shopify Partner Dashboard（NG環境）**:
- `read_all_orders`
- `read_customers`
- `read_orders`
- `read_products`

**appsettings.json（NG環境）**:
- `read_orders,read_products,read_customers`

**注意**: Shopify Partner Dashboardと`appsettings.json`でスコープが異なる場合は、どちらを優先するか確認が必要

---

## 5. 優先度評価

### 優先度: **低**（データの整合性のため）

**理由**:
- コードの動作には影響しない
- データの整合性を保つための修正
- 将来的な拡張性を考慮した設定

**実施タイミング**:
- 他の修正項目と合わせて実施することを推奨
- 緊急度は低いが、データの整合性のため実施することを推奨

---

## 6. 参考資料

- [ShopifyAppsテーブル影響調査（RedirectUri/AppType）](./404エラー-ShopifyAppsテーブル影響調査.md)
- [OK環境とNG環境の比較](./404エラー-OK環境とNG環境の比較.md)
- [修正アクション項目](./404エラー-修正アクション項目.md)

---

## 更新履歴

- 2025-12-28: 初版作成（Scopes影響調査）
