# AccessToken保存確認方法

**作成日**: 2025-01-23  
**目的**: インストール時にStoreテーブルに保存されたAccessTokenが正しく保存されているか確認する方法

## 確認方法

### 1. デバッグエンドポイントを使用（推奨）

#### 全ストアの確認
```bash
GET /api/shopify/debug-stores
```

#### 特定のストアの確認
```bash
GET /api/shopify/debug-stores?shop=xn-fbkq6e5da0fpb.myshopify.com
```

#### レスポンス例
```json
{
  "message": "Storeテーブルの状態（AccessToken保存状況）",
  "count": 2,
  "stores": [
    {
      "id": 1,
      "name": "xn-fbkq6e5da0fpb",
      "domain": "xn-fbkq6e5da0fpb.myshopify.com",
      "shopifyShopId": "xn-fbkq6e5da0fpb.myshopify.com",
      "hasAccessToken": true,
      "accessTokenLength": 128,
      "accessTokenPreview": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "hasApiKey": false,
      "hasApiSecret": false,
      "shopifyAppId": 1,
      "shopifyAppName": "EC Ranger-demo",
      "isActive": true,
      "lastSyncDate": "2025-01-23T10:00:00Z",
      "initialSetupCompleted": true,
      "createdAt": "2025-01-20T08:00:00Z",
      "updatedAt": "2025-01-23T10:00:00Z",
      "canDecryptToken": true,
      "decryptTestResult": "復号化成功: shpat_abc123..."
    }
  ],
  "timestamp": "2025-01-23T12:00:00Z",
  "note": "AccessTokenは暗号化されて保存されています。DecryptTestResultで復号化の可否を確認できます。"
}
```

#### 確認ポイント
- `hasAccessToken`: `true` であること
- `accessTokenLength`: 0より大きい値であること（暗号化されているため通常は100文字以上）
- `canDecryptToken`: `true` であること（復号化可能）
- `decryptTestResult`: "復号化成功" と表示されること

---

### 2. データベースを直接確認

#### SQL Server Management Studio (SSMS) または Azure Data Studio

```sql
-- 全ストアのAccessToken保存状況を確認
SELECT 
    Id,
    Name,
    Domain,
    CASE 
        WHEN AccessToken IS NULL THEN 'NULL'
        WHEN AccessToken = '' THEN 'EMPTY'
        ELSE 'EXISTS'
    END AS AccessTokenStatus,
    LEN(AccessToken) AS AccessTokenLength,
    LEFT(AccessToken, 20) + '...' AS AccessTokenPreview,
    IsActive,
    LastSyncDate,
    CreatedAt,
    UpdatedAt
FROM Stores
ORDER BY CreatedAt DESC;
```

#### 特定のストアの確認
```sql
SELECT 
    Id,
    Name,
    Domain,
    CASE 
        WHEN AccessToken IS NULL THEN 'NULL'
        WHEN AccessToken = '' THEN 'EMPTY'
        ELSE 'EXISTS'
    END AS AccessTokenStatus,
    LEN(AccessToken) AS AccessTokenLength,
    LEFT(AccessToken, 20) + '...' AS AccessTokenPreview,
    IsActive,
    LastSyncDate,
    CreatedAt,
    UpdatedAt
FROM Stores
WHERE Domain = 'xn-fbkq6e5da0fpb.myshopify.com';
```

#### 確認ポイント
- `AccessTokenStatus`: `EXISTS` であること
- `AccessTokenLength`: 0より大きい値であること
- `AccessTokenPreview`: 暗号化された文字列が表示されること（Base64形式）

---

### 3. ログを確認

#### インストール時のログ
インストール時に以下のログが出力されます：

```
[INFO] ストア情報を保存しました. Shop: xn-fbkq6e5da0fpb.myshopify.com, StoreId: 1, ShopifyAppId: 1, HasApiKey: False
[INFO] OAuth認証完了. Shop: xn-fbkq6e5da0fpb.myshopify.com, StoreId: 1, ShopifyAppId: 1
```

#### データ同期時のログ
バックグラウンドジョブが実行される際、以下のログでAccessTokenの使用状況を確認できます：

```
[INFO] Starting customer sync for store: xn-fbkq6e5da0fpb (ID: 1)
[ERROR] Store 1 not found or not authenticated  ← AccessTokenが無い場合
```

---

### 4. プログラムから確認（C#）

```csharp
using (var context = new ShopifyDbContext())
{
    var store = await context.Stores
        .FirstOrDefaultAsync(s => s.Domain == "xn-fbkq6e5da0fpb.myshopify.com");
    
    if (store != null)
    {
        var hasAccessToken = !string.IsNullOrEmpty(store.AccessToken);
        var tokenLength = store.AccessToken?.Length ?? 0;
        
        Console.WriteLine($"Store: {store.Name}");
        Console.WriteLine($"HasAccessToken: {hasAccessToken}");
        Console.WriteLine($"TokenLength: {tokenLength}");
        
        // 復号化テスト
        if (hasAccessToken)
        {
            try
            {
                var decrypted = DecryptToken(store.AccessToken);
                Console.WriteLine($"Decrypted (first 10 chars): {decrypted.Substring(0, Math.Min(10, decrypted.Length))}...");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Decrypt Error: {ex.Message}");
            }
        }
    }
}
```

---

## トラブルシューティング

### AccessTokenが保存されていない場合

1. **OAuth認証フローを確認**
   - `/api/shopify/install` が正常に呼び出されているか
   - `/api/shopify/callback` が正常に処理されているか
   - エラーログを確認

2. **データベース接続を確認**
   - データベース接続が正常か
   - トランザクションがコミットされているか

3. **暗号化キーの確認**
   - `Shopify:EncryptionKey` が設定されているか
   - 暗号化処理でエラーが発生していないか

### AccessTokenが復号化できない場合

1. **暗号化キーの確認**
   - `Shopify:EncryptionKey` が正しく設定されているか
   - 環境変数と設定ファイルの両方を確認

2. **暗号化方式の確認**
   - 開発環境ではBase64エンコード、本番環境ではAES暗号化を使用
   - 環境に応じた復号化処理が実行されているか

---

## 関連ファイル

- `backend/ShopifyAnalyticsApi/Controllers/ShopifyAuthController.cs`
  - `SaveOrUpdateStore` メソッド: AccessTokenの保存処理
  - `DecryptToken` メソッド: AccessTokenの復号化処理
  - `DebugStores` エンドポイント: デバッグ用エンドポイント

- `backend/ShopifyAnalyticsApi/Services/ShopifyApiService.cs`
  - `DecryptTokenIfEncrypted` メソッド: AccessTokenの復号化処理（API呼び出し時）

- `backend/ShopifyAnalyticsApi/Models/DatabaseModels.cs`
  - `Store` エンティティ: AccessTokenプロパティの定義

---

## セキュリティ注意事項

⚠️ **重要**: AccessTokenは機密情報です。以下の点に注意してください。

1. **本番環境でのデバッグエンドポイント**
   - `[AllowAnonymous]` 属性が付いているため、本番環境では削除または認証を必須にする
   - または、開発環境のみで有効にする

2. **ログ出力**
   - AccessTokenをログに出力しない
   - デバッグ時も最初の数文字のみ表示する

3. **データベースアクセス**
   - データベースへの直接アクセスは最小限に
   - アクセスログを監視する

---

## 参考

- [Shopify OAuth ドキュメント](https://shopify.dev/docs/apps/auth/oauth)
- [データ同期機能実装状況レビュー](../03-feature-development/データ同期機能/データ同期機能実装状況レビュー.md)

