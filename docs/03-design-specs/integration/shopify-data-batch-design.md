# Shopifyデータ取得バッチ処理 設計書

## 概要
Shopifyストアから定期的にデータを取得し、分析用データベースに保存するバッチ処理の設計書。

## 目的
- Shopify APIから注文、顧客、商品データを定期的に取得
- データベースへの差分更新
- マルチテナント対応
- エラーハンドリングとリトライ機能

## 実装方式の比較

### 1. Azure Functions（サーバーレス）

#### メリット
- スケーラビリティが高い
- 使用した分だけの課金
- メンテナンスが少ない
- 並列処理が容易

#### デメリット
- コールドスタート問題
- 実行時間制限（最大10分）
- デバッグが難しい
- 新しい技術の学習コスト

#### 実装例
```csharp
[FunctionName("ShopifyDataSync")]
public static async Task Run(
    [TimerTrigger("0 */30 * * * *")] TimerInfo myTimer,
    ILogger log)
{
    log.LogInformation($"Shopify data sync started at: {DateTime.Now}");
    // 実装
}
```

### 2. Hangfire（App Service内）

#### メリット
- 既存のApp Service内で実行
- Webダッシュボードで管理可能
- 長時間実行可能
- デバッグが容易

#### デメリット
- App Serviceのリソースを使用
- スケーラビリティに制限
- App Service停止時は実行されない

#### 実装例
```csharp
// Startup.cs
services.AddHangfire(config =>
    config.UseSqlServerStorage(connectionString));

// Job定義
RecurringJob.AddOrUpdate(
    "shopify-data-sync",
    () => shopifyService.SyncAllStores(),
    Cron.Hourly);
```

### 3. Azure WebJobs（App Service内）

#### メリット
- App Serviceと統合
- 継続的な実行可能
- Application Insightsとの統合

#### デメリット
- 古い技術
- 管理UIが限定的
- スケーラビリティの制限

## 推奨アーキテクチャ

### フェーズ1: Hangfireでの実装（短期）
開発期間の制約を考慮し、まずはHangfireで実装することを推奨。

```csharp
public class ShopifyDataSyncService
{
    private readonly ShopifyDbContext _context;
    private readonly IShopifyApiService _shopifyApi;
    private readonly ILogger<ShopifyDataSyncService> _logger;

    public async Task SyncAllStores()
    {
        var stores = await _context.Stores
            .Where(s => s.IsActive)
            .ToListAsync();

        foreach (var store in stores)
        {
            try
            {
                await SyncStore(store.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error syncing store {store.Id}");
            }
        }
    }

    private async Task SyncStore(int storeId)
    {
        await SyncOrders(storeId);
        await SyncCustomers(storeId);
        await SyncProducts(storeId);
    }

    private async Task SyncOrders(int storeId)
    {
        var store = await _context.Stores.FindAsync(storeId);
        var lastSync = store.LastOrderSync ?? DateTime.MinValue;
        
        var orders = await _shopifyApi.GetOrders(
            store.Domain, 
            store.AccessToken, 
            lastSync);

        foreach (var order in orders)
        {
            await UpsertOrder(storeId, order);
        }
        
        store.LastOrderSync = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }
}
```

### フェーズ2: Azure Functionsへの移行（将来）
スケーラビリティが必要になった場合に移行。

## データ同期戦略

### 1. 差分更新
- 各エンティティに`UpdatedAt`フィールドを使用
- 最終同期日時を記録
- 変更されたデータのみ取得

### 2. エラーハンドリング
```csharp
public class RetryPolicy
{
    public static async Task<T> ExecuteAsync<T>(
        Func<Task<T>> action,
        int maxRetries = 3)
    {
        for (int i = 0; i < maxRetries; i++)
        {
            try
            {
                return await action();
            }
            catch (ShopifyRateLimitException)
            {
                await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, i)));
            }
        }
        throw new Exception("Max retries exceeded");
    }
}
```

### 3. レート制限対応
- Shopify API: 2リクエスト/秒
- バックオフ戦略の実装
- 並列度の制御

## 実装スケジュール

### 本日（8/2）
1. Hangfireの基本セットアップ
2. ShopifyDataSyncServiceの骨組み作成
3. 単一ストアでのテスト

### 明日（8/3）
1. 全エンティティの同期実装
2. エラーハンドリング実装
3. マルチストアでのテスト

## 監視とログ

### Application Insights統合
```csharp
public async Task SyncOrders(int storeId)
{
    using var operation = _telemetryClient.StartOperation<RequestTelemetry>("SyncOrders");
    operation.Telemetry.Properties["StoreId"] = storeId.ToString();
    
    try
    {
        // 実装
        _telemetryClient.TrackMetric("OrdersSynced", orderCount);
    }
    catch (Exception ex)
    {
        _telemetryClient.TrackException(ex);
        throw;
    }
}
```

### ダッシュボード
- 同期成功/失敗率
- 処理時間
- エラー発生状況

## 未決事項

### 1. Shopify API認証情報の管理方法
- **課題**: 各ストアのアクセストークンをどのように安全に管理するか
- **選択肢**:
  - データベースに暗号化して保存
  - Azure Key Vaultを使用
  - App Service構成に保存
- **検討事項**: セキュリティ、アクセスの容易さ、コスト
- **決定期限**: 2025-08-05

### 2. データ同期の範囲
- **課題**: どこまでのデータを同期するか、履歴データの扱い
- **検討事項**:
  - 初回同期: 過去何ヶ月分のデータを取得するか
  - 定期同期: 更新頻度（30分、1時間、1日）
  - 削除されたデータの扱い
- **影響**: ストレージコスト、処理時間、分析精度
- **決定期限**: 2025-08-03

### 3. エラー時の動作
- **課題**: 同期エラーが発生した場合の処理方針
- **検討事項**:
  - 部分的な成功を許可するか（一部のストアが失敗しても続行）
  - トランザクション境界（ストア単位、エンティティ単位）
  - 通知方法（メール、Slack、Application Insights）
  - リトライ回数とバックオフ戦略
- **決定期限**: 2025-08-04

### 4. パフォーマンス最適化
- **課題**: 大量データの同期時のパフォーマンス
- **検討事項**:
  - バッチサイズの最適値
  - 並列処理の実装（ストア並列、エンティティ並列）
  - データベース書き込みの最適化（バルクインサート）
- **決定期限**: 実装後のパフォーマンステストにより決定

### 5. データ整合性の保証
- **課題**: Shopifyとローカルデータベースの整合性維持
- **検討事項**:
  - 重複データの防止策
  - 関連データの整合性（注文と顧客の関係など）
  - データ検証ロジック
- **決定期限**: 2025-08-06

---

作成: 2025-08-02 09:30
更新: 2025-08-02 11:00
作成者: KENJI