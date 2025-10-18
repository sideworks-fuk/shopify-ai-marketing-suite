using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace ShopifyAnalyticsApi.Services.Sync
{
    /// <summary>
    /// 同期範囲管理サービス
    /// </summary>
    public class SyncRangeManager : ISyncRangeManager
    {
        private readonly ShopifyDbContext _context;
        private readonly ILogger<SyncRangeManager> _logger;

        public SyncRangeManager(
            ShopifyDbContext context,
            ILogger<SyncRangeManager> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// 同期範囲を決定
        /// </summary>
        public async Task<DateRange> DetermineSyncRangeAsync(
            int storeId,
            string dataType,
            InitialSyncOptions? options = null)
        {
            options ??= new InitialSyncOptions();

            // 既存の設定を確認
            var existingSetting = await _context.SyncRangeSettings
                .FirstOrDefaultAsync(s => 
                    s.StoreId == storeId && 
                    s.DataType == dataType && 
                    s.IsActive);

            if (existingSetting != null)
            {
                _logger.LogInformation(
                    "既存の同期範囲設定を使用: StoreId={StoreId}, DataType={DataType}, " +
                    "Start={Start}, End={End}",
                    storeId, dataType, existingSetting.StartDate, existingSetting.EndDate);

                return new DateRange(existingSetting.StartDate, existingSetting.EndDate);
            }

            // 新しい範囲を計算
            var endDate = options.EndDate ?? DateTime.UtcNow;
            var startDate = options.StartDate ?? endDate.AddYears(-options.MaxYearsBack);

            // 設定を保存
            await SaveSyncRangeSettingAsync(storeId, dataType, startDate, endDate, options);

            _logger.LogInformation(
                "新しい同期範囲を決定: StoreId={StoreId}, DataType={DataType}, " +
                "Start={Start}, End={End}",
                storeId, dataType, startDate, endDate);

            return new DateRange(startDate, endDate);
        }

        /// <summary>
        /// 同期範囲設定を保存
        /// </summary>
        public async Task SaveSyncRangeSettingAsync(
            int storeId,
            string dataType,
            DateTime startDate,
            DateTime endDate,
            InitialSyncOptions options)
        {
            try
            {
                var setting = new SyncRangeSetting
                {
                    StoreId = storeId,
                    DataType = dataType,
                    StartDate = startDate,
                    EndDate = endDate,
                    YearsBack = options.MaxYearsBack,
                    IncludeArchived = options.IncludeArchived,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.SyncRangeSettings.Add(setting);
                await _context.SaveChangesAsync();

                _logger.LogDebug(
                    "同期範囲設定を保存: StoreId={StoreId}, DataType={DataType}",
                    storeId, dataType);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "同期範囲設定の保存エラー: StoreId={StoreId}, DataType={DataType}",
                    storeId, dataType);
                throw;
            }
        }

        /// <summary>
        /// 同期範囲を更新
        /// </summary>
        public async Task UpdateSyncRangeAsync(
            int storeId,
            string dataType,
            DateTime? newStartDate,
            DateTime? newEndDate)
        {
            try
            {
                var setting = await _context.SyncRangeSettings
                    .FirstOrDefaultAsync(s => 
                        s.StoreId == storeId && 
                        s.DataType == dataType && 
                        s.IsActive);

                if (setting == null)
                {
                    _logger.LogWarning(
                        "更新する同期範囲設定が見つかりません: StoreId={StoreId}, DataType={DataType}",
                        storeId, dataType);
                    return;
                }

                if (newStartDate.HasValue)
                    setting.StartDate = newStartDate.Value;

                if (newEndDate.HasValue)
                    setting.EndDate = newEndDate.Value;

                setting.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                _logger.LogInformation(
                    "同期範囲を更新: StoreId={StoreId}, DataType={DataType}, " +
                    "NewStart={Start}, NewEnd={End}",
                    storeId, dataType, setting.StartDate, setting.EndDate);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "同期範囲更新エラー: StoreId={StoreId}, DataType={DataType}",
                    storeId, dataType);
                throw;
            }
        }

        /// <summary>
        /// 同期範囲設定を取得
        /// </summary>
        public async Task<SyncRangeSetting?> GetSyncRangeSettingAsync(
            int storeId,
            string dataType)
        {
            return await _context.SyncRangeSettings
                .FirstOrDefaultAsync(s => 
                    s.StoreId == storeId && 
                    s.DataType == dataType && 
                    s.IsActive);
        }

        /// <summary>
        /// 同期範囲をリセット
        /// </summary>
        public async Task ResetSyncRangeAsync(int storeId, string dataType)
        {
            try
            {
                var settings = await _context.SyncRangeSettings
                    .Where(s => s.StoreId == storeId && s.DataType == dataType)
                    .ToListAsync();

                foreach (var setting in settings)
                {
                    setting.IsActive = false;
                    setting.UpdatedAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation(
                    "同期範囲をリセット: StoreId={StoreId}, DataType={DataType}",
                    storeId, dataType);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "同期範囲リセットエラー: StoreId={StoreId}, DataType={DataType}",
                    storeId, dataType);
                throw;
            }
        }

        /// <summary>
        /// データが同期範囲内かチェック
        /// </summary>
        public async Task<bool> IsWithinSyncRangeAsync(
            int storeId,
            string dataType,
            DateTime dataDate)
        {
            var setting = await GetSyncRangeSettingAsync(storeId, dataType);
            
            if (setting == null)
                return true; // 設定がない場合はすべて許可

            return dataDate >= setting.StartDate && dataDate <= setting.EndDate;
        }

        /// <summary>
        /// 推奨される同期範囲を取得
        /// </summary>
        public DateRange GetRecommendedRange(string dataType)
        {
            var endDate = DateTime.UtcNow;
            DateTime startDate;

            switch (dataType.ToLower())
            {
                case "products":
                    // 商品は全期間
                    startDate = endDate.AddYears(-10);
                    break;
                case "customers":
                    // 顧客は3年
                    startDate = endDate.AddYears(-3);
                    break;
                case "orders":
                    // 注文は1年
                    startDate = endDate.AddYears(-1);
                    break;
                default:
                    // デフォルトは2年
                    startDate = endDate.AddYears(-2);
                    break;
            }

            _logger.LogDebug(
                "推奨同期範囲: DataType={DataType}, Start={Start}, End={End}",
                dataType, startDate, endDate);

            return new DateRange(startDate, endDate);
        }
    }

    /// <summary>
    /// 同期範囲管理インターフェース
    /// </summary>
    public interface ISyncRangeManager
    {
        Task<DateRange> DetermineSyncRangeAsync(int storeId, string dataType, InitialSyncOptions? options = null);
        Task SaveSyncRangeSettingAsync(int storeId, string dataType, DateTime startDate, DateTime endDate, InitialSyncOptions options);
        Task UpdateSyncRangeAsync(int storeId, string dataType, DateTime? newStartDate, DateTime? newEndDate);
        Task<SyncRangeSetting?> GetSyncRangeSettingAsync(int storeId, string dataType);
        Task ResetSyncRangeAsync(int storeId, string dataType);
        Task<bool> IsWithinSyncRangeAsync(int storeId, string dataType, DateTime dataDate);
        DateRange GetRecommendedRange(string dataType);
    }
}