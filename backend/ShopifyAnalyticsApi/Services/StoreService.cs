using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Data;
using Microsoft.EntityFrameworkCore;

namespace ShopifyAnalyticsApi.Services
{
    public interface IStoreService
    {
        Task<List<StoreDto>> GetActiveStoresAsync();
        Task<StoreDto?> GetStoreByIdAsync(int storeId);
        Task<StoreDetailResponse> GetStoreDetailAsync(int storeId);
    }

    public class StoreService : IStoreService
    {
        private readonly ShopifyDbContext _context;
        private readonly ILogger<StoreService> _logger;

        public StoreService(ShopifyDbContext context, ILogger<StoreService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<List<StoreDto>> GetActiveStoresAsync()
        {
            try
            {
                var stores = await _context.Stores
                    .Where(s => s.IsActive)
                    .OrderBy(s => s.Id)
                    .Select(s => new StoreDto
                    {
                        Id = s.Id,
                        Name = s.Name,
                        Description = s.Description,
                        DataType = s.DataType,
                        IsActive = s.IsActive,
                        ShopDomain = s.Domain ?? $"{s.Name.ToLower().Replace(" ", "-")}.myshopify.com",
                        TenantId = s.TenantId
                    })
                    .ToListAsync();

                _logger.LogInformation("アクティブなストア {Count} 件を取得しました", stores.Count);
                return stores;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ストア一覧の取得でエラーが発生しました");
                return GetDefaultStores();
            }
        }

        public async Task<StoreDto?> GetStoreByIdAsync(int storeId)
        {
            try
            {
                var store = await _context.Stores
                    .Where(s => s.Id == storeId && s.IsActive)
                    .Select(s => new StoreDto
                    {
                        Id = s.Id,
                        Name = s.Name,
                        Description = s.Description,
                        DataType = s.DataType,
                        IsActive = s.IsActive,
                        ShopDomain = s.Domain ?? $"{s.Name.ToLower().Replace(" ", "-")}.myshopify.com",
                        TenantId = s.TenantId
                    })
                    .FirstOrDefaultAsync();

                if (store == null)
                {
                    _logger.LogWarning("ストアID {StoreId} が見つかりません", storeId);
                    return GetDefaultStores().FirstOrDefault(s => s.Id == storeId);
                }

                return store;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ストアID {StoreId} の取得でエラーが発生しました", storeId);
                return GetDefaultStores().FirstOrDefault(s => s.Id == storeId);
            }
        }

        public async Task<StoreDetailResponse> GetStoreDetailAsync(int storeId)
        {
            var store = await GetStoreByIdAsync(storeId);
            if (store == null)
            {
                throw new KeyNotFoundException($"ストアID {storeId} が見つかりません");
            }

            var response = new StoreDetailResponse
            {
                Store = store,
                LastDataUpdate = DateTime.UtcNow
            };

            try
            {
                // ストアの統計情報を取得
                var statistics = await _context.Stores
                    .Where(s => s.Id == storeId)
                    .Select(s => new StoreStatistics
                    {
                        TotalCustomers = s.Customers.Count,
                        TotalOrders = s.Orders.Count,
                        TotalProducts = s.Products.Count,
                        TotalRevenue = s.Orders.Sum(o => o.TotalPrice),
                        LastOrderDate = s.Orders.Max(o => (DateTime?)o.CreatedAt)
                    })
                    .FirstOrDefaultAsync();

                response.Statistics = statistics;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "ストアID {StoreId} の統計情報取得でエラーが発生しました", storeId);
            }

            return response;
        }

        private List<StoreDto> GetDefaultStores()
        {
            return new List<StoreDto>
            {
                new StoreDto
                {
                    Id = 1,
                    Name = "本番ストア",
                    Description = "実データを使用したメイン分析環境",
                    DataType = "production",
                    IsActive = true,
                    ShopDomain = "production-store.myshopify.com",
                    TenantId = "default-tenant"
                },
                new StoreDto
                {
                    Id = 2,
                    Name = "テストストア",
                    Description = "2020-2025年のテストデータ環境",
                    DataType = "test",
                    IsActive = true,
                    ShopDomain = "test-store.myshopify.com",
                    TenantId = "default-tenant"
                }
            };
        }
    }
}