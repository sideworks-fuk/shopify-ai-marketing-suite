# Store 2データ表示問題調査指示

## 問題の概要
Store ID=2のテストデータをデータベースに登録したにもかかわらず、dev-bookmarks画面でストアを切り替えても、各分析画面でデータが表示されない（結果が0件になる）。

## 調査項目

### 1. データベース側の確認
```sql
-- Store 2の存在確認
SELECT Id, Name, DataType, IsActive, Description 
FROM Stores 
WHERE Id = 2;

-- Store 2のデータ件数確認
SELECT 
    'Customers' as TableName, COUNT(*) as RecordCount 
FROM Customers 
WHERE StoreId = 2
UNION ALL
SELECT 
    'Products', COUNT(*) 
FROM Products 
WHERE StoreId = 2
UNION ALL
SELECT 
    'Orders', COUNT(*) 
FROM Orders 
WHERE StoreId = 2;

-- 具体的なデータ内容確認（上位5件）
SELECT TOP 5 * FROM Customers WHERE StoreId = 2 ORDER BY Id DESC;
SELECT TOP 5 * FROM Products WHERE StoreId = 2 ORDER BY Id DESC;
SELECT TOP 5 * FROM Orders WHERE StoreId = 2 ORDER BY CreatedAt DESC;
```

### 2. API側の確認

#### 2.1 各APIエンドポイントでstoreIdパラメータが正しく処理されているか確認

**確認すべきファイル：**
- `backend/ShopifyAnalyticsApi/Controllers/CustomerController.cs`
- `backend/ShopifyAnalyticsApi/Controllers/AnalyticsController.cs`
- `backend/ShopifyAnalyticsApi/Controllers/PurchaseController.cs`

**確認ポイント：**
```csharp
// storeIdパラメータが正しく受け取られているか
[HttpGet("dormant")]
public async Task<IActionResult> GetDormantCustomers([FromQuery] int storeId = 1)

// データベースクエリでstoreIdが使用されているか
var customers = await _context.Customers
    .Where(c => c.StoreId == storeId)
    .ToListAsync();
```

#### 2.2 ログ確認
```csharp
// 各コントローラーにログを追加
_logger.LogInformation($"GetDormantCustomers called with storeId: {storeId}");
_logger.LogInformation($"Found {customers.Count} customers for store {storeId}");
```

### 3. フロントエンド側の確認

#### 3.1 StoreContextが正しく動作しているか
```typescript
// dev-bookmarks画面でストア切り替え時のログ確認
console.log('Current store:', currentStore);
console.log('Selected store ID from localStorage:', localStorage.getItem('selectedStoreId'));
```

#### 3.2 各画面でAPIリクエストにstoreIdが含まれているか

**確認すべきファイル：**
- `frontend/src/components/dashboards/DormantCustomerAnalysis.tsx`
- `frontend/src/components/dashboards/YearOverYearAnalysis.tsx`
- `frontend/src/components/dashboards/PurchaseCountAnalysis.tsx`

**確認ポイント：**
```typescript
// addStoreIdToParams関数が使用されているか
const params = addStoreIdToParams({ /* 他のパラメータ */ });

// または直接storeIdが設定されているか
const response = await fetch(`${API_URL}?storeId=${getCurrentStoreId()}`);
```

### 4. ネットワークリクエストの確認

ブラウザの開発者ツール（Network タブ）で以下を確認：
1. APIリクエストのURLにstoreId=2が含まれているか
2. APIレスポンスのステータスコード（200 OK？）
3. APIレスポンスの内容（data配列が空？）

### 5. DataTypeの影響確認

Store 2のDataTypeが"test"に設定されている場合、APIやフロントエンドでフィルタリングされていないか確認：

```csharp
// APIでIsActive=trueやDataType="production"でフィルタリングされていないか
var stores = await _context.Stores
    .Where(s => s.IsActive) // これだけならOK
    .Where(s => s.DataType == "production") // これがあると問題
    .ToListAsync();
```

## 修正案

### 1. 全APIエンドポイントにstoreIdログを追加
```csharp
public async Task<IActionResult> GetDormantCustomers([FromQuery] int storeId = 1)
{
    _logger.LogInformation($"=== GetDormantCustomers START ===");
    _logger.LogInformation($"Requested storeId: {storeId}");
    
    var customerCount = await _context.Customers
        .Where(c => c.StoreId == storeId)
        .CountAsync();
    _logger.LogInformation($"Total customers for store {storeId}: {customerCount}");
    
    // 既存の処理...
}
```

### 2. フロントエンド全画面でaddStoreIdToParams使用を徹底
```typescript
// 修正前
const response = await fetch(`${getApiUrl()}/api/customer/dormant?days=${days}`);

// 修正後
import { addStoreIdToParams } from '@/lib/api-config';

const params = addStoreIdToParams({ days: days.toString() });
const response = await fetch(`${getApiUrl()}/api/customer/dormant?${params}`);
```

### 3. デバッグ用エンドポイントの追加
```csharp
[HttpGet("debug/store-data")]
public async Task<IActionResult> GetStoreDataSummary([FromQuery] int storeId)
{
    var summary = new
    {
        StoreId = storeId,
        Store = await _context.Stores.FindAsync(storeId),
        CustomerCount = await _context.Customers.CountAsync(c => c.StoreId == storeId),
        ProductCount = await _context.Products.CountAsync(p => p.StoreId == storeId),
        OrderCount = await _context.Orders.CountAsync(o => o.StoreId == storeId),
        SampleCustomers = await _context.Customers
            .Where(c => c.StoreId == storeId)
            .Take(3)
            .Select(c => new { c.Id, c.FirstName, c.LastName, c.Email })
            .ToListAsync()
    };
    
    return Ok(summary);
}
```

## 緊急対応

もし時間がない場合の最速確認方法：

1. **APIを直接テスト**
```bash
# PowerShellまたはcurl
curl "https://your-api.azurewebsites.net/api/customer/dormant?storeId=2"
```

2. **ブラウザコンソールで確認**
```javascript
// F12でコンソールを開いて実行
localStorage.getItem('selectedStoreId'); // "2"であることを確認
fetch(`${location.origin}/api/customer/dormant?storeId=2`).then(r => r.json()).then(console.log);
```

3. **SQL直接確認**
Azure PortalのSQL Databaseクエリエディタで上記のSQLを実行して、データが存在することを確認。

この調査を実施すれば、Store 2のデータが表示されない原因を特定できるはずです。