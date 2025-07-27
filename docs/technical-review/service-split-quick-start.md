# DormantCustomerService 分割 - クイックスタートガイド

## ✅ 完了済み作業

### 1. インターフェース定義
- `IDormantCustomerQueryService` - データ取得専門
- `IChurnAnalysisService` - チャーン分析専門  
- `IDormantAnalyticsService` - 統計・分析専門
- `IDormantCustomerService` - ファサード（互換性維持）

### 2. 型定義の統一
- 既存の `DormantCustomerRequest/Response` との互換性確保
- `DormantCustomerDto` 使用で型安全性向上
- `PaginationInfo` の重複解決

## 🚀 次のステップ: 実装開始

### Step 1: DormantCustomerQueryService の実装

```csharp
// /Services/Dormant/DormantCustomerQueryService.cs
public class DormantCustomerQueryService : IDormantCustomerQueryService
{
    private readonly ShopifyDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly ILogger<DormantCustomerQueryService> _logger;

    public DormantCustomerQueryService(
        ShopifyDbContext context,
        IMemoryCache cache,
        ILogger<DormantCustomerQueryService> logger)
    {
        _context = context;
        _cache = cache;
        _logger = logger;
    }

    public async Task<PaginatedResult<DormantCustomerDto>> GetDormantCustomersAsync(DormantCustomerQuery query)
    {
        // 既存のDormantCustomerServiceからクエリロジックを移植
        var cacheKey = $"dormant_customers_{query.StoreId}_{query.PageNumber}_{query.PageSize}";
        
        if (_cache.TryGetValue(cacheKey, out PaginatedResult<DormantCustomerDto>? cached))
        {
            return cached!;
        }

        // TODO: 既存サービスのGetDormantCustomersAsyncからクエリ部分を移植
        var result = new PaginatedResult<DormantCustomerDto>();
        
        _cache.Set(cacheKey, result, TimeSpan.FromMinutes(15));
        return result;
    }

    public async Task<DormantCustomerDto?> GetDormantCustomerByIdAsync(int customerId)
    {
        // TODO: 実装
        throw new NotImplementedException();
    }

    public async Task<int> GetDormantCustomerCountAsync(int storeId, DormantCustomerFilters? filters = null)
    {
        // TODO: 実装
        throw new NotImplementedException();
    }
}
```

### Step 2: 依存性注入の設定

```csharp
// Program.cs または Startup.cs
services.AddScoped<IDormantCustomerQueryService, DormantCustomerQueryService>();
services.AddScoped<IChurnAnalysisService, ChurnAnalysisService>();
services.AddScoped<IDormantAnalyticsService, DormantAnalyticsService>();

// 既存サービスは Facade として使用
services.AddScoped<IDormantCustomerService, DormantCustomerService>();
```

### Step 3: 段階的移行の準備

```csharp
// Controllers/CustomerController.cs
[ApiController]
[Route("api/customers")]
public class CustomerController : ControllerBase
{
    private readonly IDormantCustomerService _dormantService; // ファサード使用
    
    [HttpGet("dormant")]
    public async Task<ActionResult<DormantCustomerResponse>> GetDormantCustomers(
        [FromQuery] DormantCustomerRequest request)
    {
        var result = await _dormantService.GetDormantCustomersAsync(request);
        return Ok(result);
    }
}
```

## 📋 実装の優先順位

### Week 1: 基盤実装
1. `DormantCustomerQueryService` 実装
2. 基本的なユニットテスト作成
3. 依存性注入設定

### Week 2: 分析機能実装  
1. `ChurnAnalysisService` 実装
2. `DormantAnalyticsService` 実装
3. 統合テスト作成

### Week 3: 統合・テスト
1. `DormantCustomerService` ファサード完成
2. A/Bテスト環境構築
3. パフォーマンステスト

### Week 4: 本格運用
1. フィーチャートグルで段階切替
2. 監視・ログ強化
3. 問題修正

### Week 5: 完全移行
1. 既存サービス削除
2. ドキュメント更新
3. 他サービスへの知見展開

## 🎯 成功基準

- [ ] コンパイルエラー 0件
- [ ] ユニットテストカバレッジ 80%以上
- [ ] APIレスポンス時間 既存の110%以内
- [ ] 機能完全互換性
- [ ] エラー率 0.1%未満

## 🔧 開発環境での確認方法

```bash
# ビルド確認
dotnet build

# テスト実行
dotnet test

# API動作確認
curl -X GET "https://localhost:5001/api/customers/dormant?storeId=1&pageSize=10"
```

## 📚 参考リソース

- [技術レビューレポート](./service-layer-review-2025-01.md)
- [移行計画詳細](./dormant-service-migration-plan.md)
- [既存サービスコード](../backend/ShopifyTestApi/Services/DormantCustomerService.cs)

---

**次のアクション**: `DormantCustomerQueryService.cs` の実装開始
**担当者**: 開発チーム
**期限**: 今週末まで