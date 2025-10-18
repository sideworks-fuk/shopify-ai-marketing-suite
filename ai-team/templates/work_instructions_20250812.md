# 作業指示書 - 2025年8月13日（火）

## 🚀 前倒し実装開始

OAuth問題が解決したため、予定を前倒しして即座にデータ同期機能の実装を開始します。

---

## Takashi向け作業指示

### 📋 本日のタスク

#### 1. HangFire基本設定（AM: 9:00-12:00）

**実装内容:**

1. **NuGetパッケージ追加**
```xml
<PackageReference Include="Hangfire.Core" Version="1.8.6" />
<PackageReference Include="Hangfire.SqlServer" Version="1.8.6" />
<PackageReference Include="Hangfire.AspNetCore" Version="1.8.6" />
```

2. **Program.cs設定**
```csharp
// HangFire設定
builder.Services.AddHangfire(configuration => configuration
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UseSqlServerStorage(builder.Configuration.GetConnectionString("DefaultConnection")));

// HangFireサーバー追加
builder.Services.AddHangfireServer();

// Keep Aliveサービス（Azure App Service対策）
builder.Services.AddHostedService<KeepAliveService>();

// ミドルウェア設定
app.UseHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization = new[] { new HangfireAuthorizationFilter() }
});
```

3. **KeepAliveService実装**
```csharp
public class KeepAliveService : BackgroundService
{
    private readonly ILogger<KeepAliveService> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
            // Keep alive処理
        }
    }
}
```

4. **データベーステーブル作成**
- HangFireが自動的にテーブルを作成するが、確認必要

**確認事項:**
- [ ] パッケージインストール完了
- [ ] Program.cs設定追加
- [ ] HangFireダッシュボード表示確認（/hangfire）
- [ ] データベーステーブル作成確認

#### 2. 商品データ同期実装（PM: 13:00-18:00）

**実装内容:**

1. **ShopifyProductSyncJob.cs作成**
```csharp
public class ShopifyProductSyncJob
{
    private readonly ShopifyApiService _shopifyApi;
    private readonly ShopifyDbContext _context;
    private readonly ILogger<ShopifyProductSyncJob> _logger;
    
    public async Task SyncProducts(int storeId)
    {
        var store = await _context.Stores.FindAsync(storeId);
        if (store == null) return;
        
        // 1. Shopifyから商品データ取得
        var products = await _shopifyApi.GetProductsAsync(store.Domain, store.AccessToken);
        
        // 2. データベースに保存/更新
        foreach (var product in products)
        {
            await SaveOrUpdateProduct(product, storeId);
        }
        
        _logger.LogInformation($"商品同期完了: {products.Count}件");
    }
}
```

2. **ジョブスケジュール設定**
```csharp
// Program.csまたは起動時
RecurringJob.AddOrUpdate<ShopifyProductSyncJob>(
    $"sync-products-{storeId}",
    job => job.SyncProducts(storeId),
    Cron.Hourly);
```

3. **データモデル確認**
- Productテーブルのスキーマ確認
- 必要に応じてマイグレーション追加

**確認事項:**
- [ ] ShopifyProductSyncJob実装
- [ ] 商品データ取得API動作確認
- [ ] データベース保存処理実装
- [ ] エラーハンドリング実装
- [ ] ログ出力確認

### 📊 成果物

1. HangFireダッシュボード稼働
2. 商品データ同期ジョブ完成
3. 最低1店舗でのテスト完了

---

## Yuki向け作業指示

### 📋 本日のタスク

#### 1. ダッシュボード画面準備（全日: 9:00-18:00）

**実装内容:**

1. **ダッシュボードレイアウト作成**

ファイル: `frontend/src/app/(authenticated)/dashboard/page.tsx`

```tsx
export default function DashboardPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">ダッシュボード</h1>
      
      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <SummaryCard title="本日の売上" value="¥0" trend="+0%" />
        <SummaryCard title="注文数" value="0" trend="+0%" />
        <SummaryCard title="顧客数" value="0" trend="+0%" />
        <SummaryCard title="商品数" value="0" trend="+0%" />
      </div>
      
      {/* グラフエリア */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesChart />
        <TopProducts />
      </div>
      
      {/* 最近の注文 */}
      <RecentOrders />
    </div>
  );
}
```

2. **コンポーネント作成**

必要なコンポーネント:
- `SummaryCard.tsx` - サマリー表示カード
- `SalesChart.tsx` - 売上グラフ（Chart.jsまたはRecharts使用）
- `TopProducts.tsx` - 人気商品リスト
- `RecentOrders.tsx` - 最近の注文テーブル

3. **APIクライアント準備**

ファイル: `frontend/src/lib/api/dashboard.ts`

```typescript
export const dashboardApi = {
  getSummary: async () => {
    const response = await apiClient.get('/api/dashboard/summary');
    return response.data;
  },
  
  getSalesData: async (period: string) => {
    const response = await apiClient.get(`/api/dashboard/sales?period=${period}`);
    return response.data;
  },
  
  getTopProducts: async () => {
    const response = await apiClient.get('/api/dashboard/top-products');
    return response.data;
  },
  
  getRecentOrders: async () => {
    const response = await apiClient.get('/api/dashboard/recent-orders');
    return response.data;
  }
};
```

4. **モックデータ作成**

ファイル: `frontend/src/lib/mock/dashboard-mock.ts`

```typescript
export const mockDashboardData = {
  summary: {
    totalSales: 1234567,
    orderCount: 123,
    customerCount: 456,
    productCount: 789
  },
  salesData: [
    { date: '2025-08-01', amount: 50000 },
    { date: '2025-08-02', amount: 65000 },
    // ...
  ],
  topProducts: [
    { id: 1, name: '商品A', sales: 100, revenue: 100000 },
    // ...
  ],
  recentOrders: [
    { id: 1, orderNumber: 'ORD-001', customer: '顧客A', amount: 10000, status: '処理中' },
    // ...
  ]
};
```

5. **グラフライブラリセットアップ**

```bash
npm install recharts
# または
npm install chart.js react-chartjs-2
```

**確認事項:**
- [ ] ダッシュボードレイアウト完成
- [ ] 各コンポーネント作成
- [ ] モックデータ表示確認
- [ ] レスポンシブデザイン確認
- [ ] グラフ表示確認

### 📊 成果物

1. ダッシュボード画面の基本実装
2. 4つのサマリーカード表示
3. 売上グラフ表示（モックデータ）
4. APIクライアント準備完了

---

## 🔄 連携ポイント

### API仕様の確認
- Takashi: APIエンドポイントの仕様を共有
- Yuki: 必要なデータ形式をフィードバック

### 進捗共有タイミング
- 12:00 - 午前の進捗確認
- 15:00 - 午後の中間確認
- 18:00 - 本日の成果報告

### コミュニケーション
- ブロッカーは即座にtemp.mdに記載
- 技術的な質問は各自のto_[名前].mdに記載

---

## 📈 成功基準

### Takashi
1. HangFireダッシュボード稼働
2. 商品同期ジョブ1回以上実行成功
3. エラーログなし

### Yuki
1. ダッシュボード画面表示
2. モックデータでの動作確認
3. TypeScriptエラーなし

---

## 🚨 注意事項

1. **環境変数の確認**
   - Azure環境変数が正しく設定されているか確認
   - ローカルの.env.localも最新化

2. **ブランチ戦略**
   - feature/hangfire-setup（Takashi）
   - feature/dashboard-ui（Yuki）
   - 完了後mainにマージ

3. **テスト**
   - 単体テストも並行して作成
   - 統合テストは明日実施

---

## 💪 頑張りましょう！

前倒しでの実装開始により、スケジュールに余裕ができます。
品質を保ちながら、着実に実装を進めましょう。

質問があれば即座に共有してください。

---
作成: 2025年8月12日 20:00
作成者: Kenji（プロジェクトマネージャー）