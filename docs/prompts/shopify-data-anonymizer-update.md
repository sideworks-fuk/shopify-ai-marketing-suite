# ShopifyDataAnonymizer ImportService修正指示

## 問題
データベースのCustomersテーブルが`TotalOrders`カラムをNOT NULL制約で要求しているが、ImportServiceが適切なデフォルト値を設定していない。

## エラー内容
```
Cannot insert the value NULL into column 'TotalOrders', table 'shopify-test-db.dbo.Customers'; column does not allow nulls.
```

## 修正箇所

### ファイル: `backend/ShopifyDataAnonymizer/Services/ImportService.cs`

#### 修正1: Line 868付近
**現在のコード:**
```csharp
command.Parameters.AddWithValue("@TotalOrders", (object?)customer.TotalOrders ?? DBNull.Value);
```

**修正後:**
```csharp
// TotalOrdersはNOT NULL制約があるため、nullの場合は0を設定
command.Parameters.AddWithValue("@TotalOrders", customer.TotalOrders ?? 0);
```

#### 修正2: Line 869付近
**現在のコード:**
```csharp
command.Parameters.AddWithValue("@OrdersCount", (object?)customer.TotalOrders ?? DBNull.Value);
```

**修正後:**
```csharp
// OrdersCountも同様に0をデフォルト値として設定
command.Parameters.AddWithValue("@OrdersCount", customer.TotalOrders ?? 0);
```

#### 修正3: Line 867付近
**現在のコード:**
```csharp
command.Parameters.AddWithValue("@TotalSpent", (object?)customer.TotalSpent ?? DBNull.Value);
```

**修正後:**
```csharp
// TotalSpentもデフォルト値0を設定
command.Parameters.AddWithValue("@TotalSpent", customer.TotalSpent ?? 0m);
```

#### 修正4: CustomerSegment計算ロジックの更新（Line 875-885）
**現在のコード:**
```csharp
string customerSegment = "新規顧客";
if (customer.TotalOrders >= 10 || customer.TotalSpent >= 100000)
{
    customerSegment = "VIP顧客";
}
else if (customer.TotalOrders >= 2)
{
    customerSegment = "リピーター";
}
```

**修正後:**
```csharp
// nullセーフな計算
int totalOrders = customer.TotalOrders ?? 0;
decimal totalSpent = customer.TotalSpent ?? 0m;

string customerSegment = "新規顧客";
if (totalOrders >= 10 || totalSpent >= 100000)
{
    customerSegment = "VIP顧客";
}
else if (totalOrders >= 2)
{
    customerSegment = "リピーター";
}
```

## 追加の推奨修正

### データベースモデルとの整合性確認

以下のカラムもデフォルト値を持つ必要があります：

```csharp
// Line 863-865のブール値変換後に以下を追加
command.Parameters.AddWithValue("@AcceptsEmailMarketing", acceptsEmail);
command.Parameters.AddWithValue("@AcceptsSMSMarketing", acceptsSMS);
command.Parameters.AddWithValue("@TaxExempt", taxExempt);

// その他の必須フィールドのデフォルト値
command.Parameters.AddWithValue("@FirstName", string.IsNullOrEmpty(customer.FirstName) ? "Unknown" : customer.FirstName);
command.Parameters.AddWithValue("@LastName", string.IsNullOrEmpty(customer.LastName) ? "Customer" : customer.LastName);
command.Parameters.AddWithValue("@Email", string.IsNullOrEmpty(customer.Email) ? $"unknown{customer.CustomerId}@example.com" : customer.Email);
```

## テスト手順

1. 修正後、再度インポートコマンドを実行
2. エラーが解消されることを確認
3. データベースでTotalOrdersとTotalSpentが適切に設定されていることを確認

```sql
SELECT TOP 10 
    Id, FirstName, LastName, TotalOrders, TotalSpent, CustomerSegment 
FROM Customers 
WHERE StoreId = 2
ORDER BY Id DESC;
```

## 注意事項

- `DatabaseModels.cs`では`TotalOrders`と`TotalSpent`にデフォルト値0が設定されているが、ImportServiceでも明示的に0を設定する必要がある
- CSVファイルのnull値は適切にハンドリングする必要がある