# データ同期失敗 - Protected Customer Dataエラー

## 📋 問題概要

**発生日時**: 2026年1月19日 07:18:14  
**環境**: 本番環境（Production）  
**症状**: データ同期（顧客データ取得）が失敗する

### エラーログ

```
[07:18:14 ERR] 🛒 [ShopifyApiService] Failed to fetch customers: StatusCode=Forbidden, 
ErrorContent={"errors":"[API] This app is not approved to access REST endpoints with protected customer data. 
See https://shopify.dev/docs/apps/launch/protected-customer-data for more details."}, StoreId=18
```

### エラー詳細

- **ステータスコード**: `403 Forbidden`
- **エラーメッセージ**: `This app is not approved to access REST endpoints with protected customer data`
- **影響範囲**: 顧客データの同期が失敗
- **参考URL**: https://shopify.dev/docs/apps/launch/protected-customer-data

---

## 🔍 原因

### ShopifyのProtected Customer Data（保護された顧客データ）ポリシー

Shopifyは2024年から、顧客データへのアクセスに特別な承認を必要とするようになりました。

**対象となるデータ**:
- 顧客の個人情報（名前、メールアドレス、電話番号など）
- 顧客の注文履歴
- 顧客の購入履歴

**対象となるAPI**:
- REST API: `/admin/api/2024-01/customers.json`
- GraphQL API: `customers` クエリ（一部）

**承認が必要な条件**:
- `read_customers` スコープを使用している
- REST APIで顧客データにアクセスしている
- アプリがProtected Customer Dataへのアクセスを申請・承認されていない

---

## ✅ 解決方法

### 方法1: Protected Customer Dataへのアクセスを申請（推奨）

**手順**:

1. **Shopify Partners管理画面を開く**
   ```
   https://partners.shopify.com
   ```

2. **Apps → EC Ranger → App setup → Protected customer data**
   - 「Request access」をクリック
   - アクセス理由を記入:
     ```
     顧客分析機能のため、顧客データ（名前、メールアドレス、購入履歴）へのアクセスが必要です。
     顧客の休眠状態を分析し、マーケティング施策を提案するために使用します。
     ```
   - 「Submit」をクリック

3. **承認を待つ**
   - Shopifyの審査が完了するまで数日かかる場合があります
   - 承認後、自動的に有効になります

4. **確認**
   - 承認後、再度データ同期を実行
   - エラーが解消されているか確認

---

### 方法2: GraphQL APIを使用（一時的な回避策）

REST APIの代わりにGraphQL APIを使用することで、一部の制限を回避できる可能性があります。

**実装方法**:
- `ShopifyApiService.cs`の`FetchCustomersPageAsync`メソッドを修正
- REST APIからGraphQL APIに変更

**注意**: GraphQL APIでも完全に回避できるわけではありません。最終的には方法1の承認が必要です。

---

### 方法3: 自動的に顧客データ同期をスキップ（実装済み）

**実装状況**: ✅ 実装済み（2026-01-19）

Protected Customer Dataエラーが発生した場合、自動的に顧客データ同期をスキップし、商品・注文データの同期を続行するように実装しました。

**動作**:
- 顧客データ同期でProtected Customer Dataエラーが発生した場合
- エラーをログに記録し、警告を出力
- 商品・注文データの同期を続行
- 同期ステータスにエラーメッセージを記録

**確認方法**:
- 同期ステータスの`ErrorMessage`フィールドを確認
- ログで「顧客データ同期スキップ（Protected Customer Data未承認）」を確認

**注意**: これは一時的な回避策です。顧客分析機能を使用するには、最終的に方法1の承認が必要です。

---

## 🔧 実装内容（方法3: 自動スキップ機能）

### 実装済みの機能

**`InitialSyncOptions`クラスに追加**:
```csharp
/// <summary>
/// 顧客データ同期をスキップする（Protected Customer Data未承認時の一時的な回避策）
/// </summary>
public bool SkipCustomers { get; set; } = false;
```

**`ShopifyDataSyncService`でエラーハンドリング**:
- Protected Customer Dataエラーを検出
- 自動的に顧客データ同期をスキップ
- 商品・注文データの同期を続行
- エラーメッセージを同期ステータスに記録

**エラー検出条件**:
- エラーメッセージに "Protected customer data" が含まれる
- エラーメッセージに "not approved to access REST endpoints" が含まれる
- HTTPステータスコードが `403 Forbidden` の場合

---

## 📊 同期結果の確認

### 同期ステータスで確認

```sql
-- 同期ステータスとエラーメッセージを確認
SELECT 
    Id,
    StoreId,
    SyncType,
    Status,
    CurrentTask,
    ErrorMessage,
    ProcessedRecords,
    TotalRecords,
    CreatedAt,
    UpdatedAt
FROM SyncStatuses
WHERE StoreId = 18
ORDER BY CreatedAt DESC;
```

**確認ポイント**:
- `Status`: `completed` または `failed`
- `CurrentTask`: `顧客データ同期スキップ（Protected Customer Data未承認）`
- `ErrorMessage`: Protected Customer Dataエラーの詳細

---

### 同期されたデータを確認

```sql
-- 同期されたデータ数を確認
SELECT 
    (SELECT COUNT(*) FROM Customers WHERE StoreId = 18) AS CustomerCount,
    (SELECT COUNT(*) FROM Products WHERE StoreId = 18) AS ProductCount,
    (SELECT COUNT(*) FROM Orders WHERE StoreId = 18) AS OrderCount;
```

**期待される結果**:
- `CustomerCount`: 0（Protected Customer Data未承認のため）
- `ProductCount`: > 0（商品データは同期成功）
- `OrderCount`: > 0（注文データは同期成功）

---

## 📝 確認手順

### ステップ1: Shopify Partners管理画面で確認

1. **Protected Customer Dataの状態を確認**
   - Apps → EC Ranger → App setup → Protected customer data
   - 承認状態を確認

2. **スコープを確認**
   - Apps → EC Ranger → App setup → Client credentials
   - `read_customers` スコープが有効になっているか確認

---

### ステップ2: データベースで確認

```sql
-- 同期ステータスを確認
SELECT 
    Id,
    StoreId,
    SyncType,
    Status,
    CurrentTask,
    ErrorMessage,
    CreatedAt,
    UpdatedAt
FROM SyncStatuses
WHERE StoreId = 18
ORDER BY CreatedAt DESC;

-- 同期されたデータを確認
SELECT 
    (SELECT COUNT(*) FROM Customers WHERE StoreId = 18) AS CustomerCount,
    (SELECT COUNT(*) FROM Products WHERE StoreId = 18) AS ProductCount,
    (SELECT COUNT(*) FROM Orders WHERE StoreId = 18) AS OrderCount;
```

---

### ステップ3: ログで確認

**Application InsightsまたはKuduでログを確認**:
```kusto
// Protected Customer Dataエラーを確認
traces
| where timestamp > ago(1h)
| where message contains "Protected customer data" 
   or message contains "not approved to access REST endpoints"
| order by timestamp desc
| take 50
```

---

## ⚠️ 注意事項

### 1. 承認プロセス

- **審査期間**: 数日から数週間かかる場合があります
- **承認基準**: Shopifyがアプリの用途とデータの必要性を審査します
- **再申請**: 一度拒否された場合でも、理由を明確にして再申請可能です

### 2. 代替手段

- **GraphQL API**: REST APIの代わりにGraphQL APIを使用
- **Webhook**: 顧客データの変更をWebhookで受信
- **Customer Account API**: 顧客自身がデータにアクセスする場合

### 3. 一時的な回避策

- 顧客データの同期をスキップ
- 商品・注文データのみ同期
- 承認後に顧客データを同期

---

## 📚 参考情報

### Shopify公式ドキュメント

- [Protected Customer Data](https://shopify.dev/docs/apps/launch/protected-customer-data)
- [Customer Data Access](https://shopify.dev/docs/apps/custom-data/customer-data)
- [GraphQL Admin API - Customers](https://shopify.dev/docs/api/admin-graphql/latest/queries/customers)

### 関連ドキュメント

- [初期同期の処理フローとデータ追加確認方法](../2025-12/初期同期の処理フローとデータ追加確認方法.md)
- [データ同期設計仕様](../../../03-データベース/設計・モデリング/データ同期設計仕様.md)

---

## 🔄 次のステップ

### 推奨される対応順序

1. **Protected Customer Dataへのアクセスを申請**（方法1）
   - Shopify Partners管理画面で申請
   - 承認を待つ

2. **一時的な回避策を実装**（方法3）
   - 顧客データ同期をスキップ
   - 商品・注文データのみ同期

3. **承認後の確認**
   - 承認後、顧客データ同期を再試行
   - エラーが解消されているか確認

---

**最終更新**: 2026年1月19日  
**作成者**: 福田  
**修正者**: AI Assistant
