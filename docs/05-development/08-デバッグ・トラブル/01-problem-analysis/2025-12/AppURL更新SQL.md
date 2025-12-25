# AppURL更新SQL

## 問題

API Key `23f81e22074df1b71fb0a5a495778f49` のAppUrlが古いURL（`white-island`）のままになっているため、OAuth認証後のリダイレクトが正しく動作していません。

## 現在の状態

- **ID 5**: API Key `23f81e22074df1b71fb0a5a495778f49`
  - AppUrl: `https://white-island-08e0a6300.2.azurestaticapps.net` ❌（古い）
  - RedirectUri: `https://white-island-08e0a6300.2.azurestaticapps.net/api/shopify/callback` ❌（古い）

## 修正SQL

```sql
-- API Key 23f81e22074df1b71fb0a5a495778f49 のAppUrlを更新
UPDATE [dbo].[ShopifyApps]
SET 
    [AppUrl] = 'https://black-flower-004e1de00.2.azurestaticapps.net',
    [RedirectUri] = 'https://black-flower-004e1de00.2.azurestaticapps.net/api/shopify/callback',
    [UpdatedAt] = GETUTCDATE()
WHERE [ApiKey] = '23f81e22074df1b71fb0a5a495778f49'
  AND [IsActive] = 1;

-- 更新結果を確認
SELECT 
    [Id],
    [Name],
    [ApiKey],
    [AppUrl],
    [RedirectUri],
    [UpdatedAt]
FROM [dbo].[ShopifyApps]
WHERE [ApiKey] = '23f81e22074df1b71fb0a5a495778f49';
```

## 期待される結果

更新後、以下のようになるはずです：

- **ID 5**: API Key `23f81e22074df1b71fb0a5a495778f49`
  - AppUrl: `https://black-flower-004e1de00.2.azurestaticapps.net` ✅（新しい）
  - RedirectUri: `https://black-flower-004e1de00.2.azurestaticapps.net/api/shopify/callback` ✅（新しい）

## 注意事項

- この更新により、OAuth認証後のリダイレクト先が正しいURL（`black-flower`）になります
- Shopify Partners DashboardのAppURL設定も `https://black-flower-004e1de00.2.azurestaticapps.net` になっていることを確認してください

