using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Helpers;

namespace ShopifyAnalyticsApi.Services.Dormant
{
    /// <summary>
    /// 休眠顧客データ取得サービス
    /// 責任範囲: 休眠顧客データの読み取り専用操作
    /// </summary>
    public class DormantCustomerQueryService : IDormantCustomerQueryService
    {
        private readonly ShopifyDbContext _context;
        private readonly IMemoryCache _cache;
        private readonly ILogger<DormantCustomerQueryService> _logger;
        private readonly IConfiguration _configuration;

        // 休眠判定の閾値日数（設定可能）
        private int DormancyThresholdDays => _configuration.GetValue<int>("DormancyThresholdDays", 90);

        public DormantCustomerQueryService(
            ShopifyDbContext context,
            IMemoryCache cache,
            ILogger<DormantCustomerQueryService> logger,
            IConfiguration configuration)
        {
            _context = context;
            _cache = cache;
            _logger = logger;
            _configuration = configuration;
        }

        /// <summary>
        /// 休眠顧客リストを取得（ページング対応）
        /// </summary>
        public async Task<PaginatedResult<DormantCustomerDto>> GetDormantCustomersAsync(DormantCustomerQuery query)
        {
            // 入力検証
            if (query == null)
            {
                throw new ArgumentNullException(nameof(query));
            }

            // ページサイズの設定（最大500件、デフォルト50件）
            query.PageSize = Math.Min(Math.Max(query.PageSize, 1), 500);

            var logProperties = new Dictionary<string, object>
            {
                ["RequestId"] = Guid.NewGuid().ToString(),
                ["StoreId"] = query.StoreId,
                ["PageNumber"] = query.PageNumber,
                ["PageSize"] = query.PageSize,
                ["SortBy"] = query.SortBy
            };

            using var performanceScope = LoggingHelper.CreatePerformanceScope(_logger, "GetDormantCustomersAsync", logProperties);

            try
            {
                _logger.LogInformation("休眠顧客クエリ開始 {@QueryParameters}", logProperties);

                // キャッシュキー生成
                var cacheKey = GenerateCacheKey(query);

                // キャッシュチェック（15分間）
                if (_cache.TryGetValue(cacheKey, out PaginatedResult<DormantCustomerDto>? cachedResult))
                {
                    _logger.LogInformation("キャッシュから休眠顧客データを取得 CacheKey: {CacheKey}", cacheKey);
                    return cachedResult!;
                }

                // データ取得実行
                var result = await ExecuteQueryAsync(query);

                // キャッシュに保存（15分間）
                _cache.Set(cacheKey, result, TimeSpan.FromMinutes(15));

                _logger.LogInformation("休眠顧客クエリ完了 取得件数: {Count}, 総件数: {TotalCount}",
                    result.Items.Count, result.Pagination.TotalItems);

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "休眠顧客クエリエラー {@QueryParameters}", logProperties);
                throw;
            }
        }

        /// <summary>
        /// 指定されたIDの休眠顧客を取得
        /// </summary>
        public async Task<DormantCustomerDto?> GetDormantCustomerByIdAsync(int customerId)
        {
            _logger.LogInformation("休眠顧客詳細取得開始 CustomerId: {CustomerId}", customerId);

            try
            {
                var customer = await _context.Customers
                    .FirstOrDefaultAsync(c => c.Id == customerId);

                if (customer == null)
                {
                    _logger.LogWarning("顧客が見つかりません CustomerId: {CustomerId}", customerId);
                    return null;
                }

                // 最終注文日を取得
                var lastOrderDate = await _context.Orders
                    .Where(o => o.CustomerId == customerId)
                    .OrderByDescending(o => o.ShopifyProcessedAt ?? o.ShopifyCreatedAt ?? o.CreatedAt)
                    .Select(o => (DateTime?)(o.ShopifyProcessedAt ?? o.ShopifyCreatedAt ?? o.CreatedAt))
                    .FirstOrDefaultAsync();

                var daysSinceLastPurchase = lastOrderDate.HasValue 
                    ? (int)(DateTime.UtcNow - lastOrderDate.Value).TotalDays 
                    : int.MaxValue;

                // 休眠判定
                if (daysSinceLastPurchase < DormancyThresholdDays)
                {
                    _logger.LogInformation("顧客は休眠状態ではありません CustomerId: {CustomerId}, DaysSince: {Days}", 
                        customerId, daysSinceLastPurchase);
                    return null;
                }

                return await ConvertToDto(customer, lastOrderDate, daysSinceLastPurchase);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "休眠顧客詳細取得エラー CustomerId: {CustomerId}", customerId);
                throw;
            }
        }

        /// <summary>
        /// 休眠顧客の総数を取得
        /// </summary>
        public async Task<int> GetDormantCustomerCountAsync(int storeId, DormantCustomerFilters? filters = null)
        {
            _logger.LogInformation("休眠顧客総数取得開始 StoreId: {StoreId}", storeId);

            try
            {
                var query = BuildBaseQuery(storeId);
                query = ApplyFilters(query, filters);

                var count = await query.CountAsync();

                _logger.LogInformation("休眠顧客総数取得完了 StoreId: {StoreId}, Count: {Count}", storeId, count);
                return count;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "休眠顧客総数取得エラー StoreId: {StoreId}", storeId);
                throw;
            }
        }

        /// <summary>
        /// クエリ実行（メインロジック）
        /// </summary>
        private async Task<PaginatedResult<DormantCustomerDto>> ExecuteQueryAsync(DormantCustomerQuery query)
        {
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            
            // 基本クエリ構築
            var baseQuery = BuildBaseQuery(query.StoreId);

            // フィルター適用
            var filteredQuery = ApplyFilters(baseQuery, query.Filters);

            // ソート適用
            var sortedQuery = ApplySorting(filteredQuery, query.SortBy, query.Descending);

            // 総件数取得（高速化のため別クエリ）
            var countStopwatch = System.Diagnostics.Stopwatch.StartNew();
            var totalCount = await filteredQuery.CountAsync();
            countStopwatch.Stop();
            _logger.LogInformation("📊 [パフォーマンス] 総件数クエリ実行時間: {ElapsedMs}ms, 件数: {Count}", 
                countStopwatch.ElapsedMilliseconds, totalCount);

            // ページネーション適用
            var pageStopwatch = System.Diagnostics.Stopwatch.StartNew();
            var pagedItems = await sortedQuery
                .Skip((query.PageNumber - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToListAsync();
            pageStopwatch.Stop();
            _logger.LogInformation("📊 [パフォーマンス] ページネーションクエリ実行時間: {ElapsedMs}ms, 取得件数: {Count}", 
                pageStopwatch.ElapsedMilliseconds, pagedItems.Count);

            // DTOに変換
            var dtoItems = new List<DormantCustomerDto>();
            foreach (var item in pagedItems)
            {
                var daysSinceLastPurchase = item.LastOrderDate.HasValue 
                    ? (int)(DateTime.UtcNow - item.LastOrderDate.Value).TotalDays 
                    : int.MaxValue;

                var dto = new DormantCustomerDto
                {
                    CustomerId = item.CustomerId,
                    Name = item.CustomerName ?? "不明",
                    Email = item.CustomerEmail ?? "",
                    Phone = item.CustomerPhone,
                    Company = item.CustomerCompany,
                    LastPurchaseDate = item.LastOrderDate,
                    DaysSinceLastPurchase = daysSinceLastPurchase,
                    DormancySegment = CalculateDormancySegment(daysSinceLastPurchase),
                    RiskLevel = CalculateRiskLevel(daysSinceLastPurchase, item.TotalOrders),
                    ChurnProbability = CalculateChurnProbability(daysSinceLastPurchase),
                    TotalSpent = item.TotalSpent,
                    TotalOrders = item.TotalOrders,
                    AverageOrderValue = item.TotalOrders > 0 ? item.TotalSpent / item.TotalOrders : 0,
                    Tags = ParseTags(item.Tags),
                    PreferredCategories = new List<string>(), // TODO: 実装
                    Insight = GenerateReactivationInsight(daysSinceLastPurchase, item.TotalOrders, 
                        item.TotalOrders > 0 ? item.TotalSpent / item.TotalOrders : 0)
                };

                dtoItems.Add(dto);
            }

            stopwatch.Stop();
            _logger.LogInformation("📊 [パフォーマンス] ExecuteQueryAsync 全体実行時間: {ElapsedMs}ms", 
                stopwatch.ElapsedMilliseconds);

            return new PaginatedResult<DormantCustomerDto>
            {
                Items = dtoItems,
                Pagination = new PaginationMetadata
                {
                    CurrentPage = query.PageNumber,
                    PageSize = query.PageSize,
                    TotalItems = totalCount
                }
            };
        }

        /// <summary>
        /// 基本クエリ構築
        /// 改善版: Customer.LastOrderDate を直接使用（サブクエリ排除）
        /// </summary>
        private IQueryable<DormantCustomerQueryResult> BuildBaseQuery(int storeId)
        {
            var cutoffDate = DateTime.UtcNow.AddDays(-DormancyThresholdDays);

            // 改善版: LastOrderDate を直接使用（非正規化カラム）
            // サブクエリを排除し、パフォーマンスを大幅に改善
            return from customer in _context.Customers
                   where customer.StoreId == storeId 
                         && customer.TotalOrders > 0
                         && customer.LastOrderDate.HasValue 
                         && customer.LastOrderDate < cutoffDate
                   select new DormantCustomerQueryResult
                   {
                       CustomerId = customer.Id,
                       CustomerName = customer.DisplayName,
                       CustomerEmail = customer.Email,
                       CustomerPhone = customer.Phone,
                       CustomerCompany = customer.Company,
                       TotalSpent = customer.TotalSpent,
                       TotalOrders = customer.TotalOrders,
                       Tags = customer.Tags,
                       LastOrderDate = customer.LastOrderDate
                   };
        }

        /// <summary>
        /// フィルター適用
        /// </summary>
        private IQueryable<DormantCustomerQueryResult> ApplyFilters(IQueryable<DormantCustomerQueryResult> query, DormantCustomerFilters? filters)
        {
            if (filters == null) return query;

            // 休眠期間フィルター
            if (filters.MinDaysSinceLastPurchase.HasValue)
            {
                var maxDate = DateTime.UtcNow.AddDays(-filters.MinDaysSinceLastPurchase.Value);
                query = query.Where(c => c.LastOrderDate <= maxDate);
            }

            if (filters.MaxDaysSinceLastPurchase.HasValue)
            {
                var minDate = DateTime.UtcNow.AddDays(-filters.MaxDaysSinceLastPurchase.Value);
                query = query.Where(c => c.LastOrderDate >= minDate);
            }

            // 購入金額フィルター
            if (filters.MinTotalSpent.HasValue)
            {
                query = query.Where(c => c.TotalSpent >= filters.MinTotalSpent.Value);
            }

            if (filters.MaxTotalSpent.HasValue)
            {
                query = query.Where(c => c.TotalSpent <= filters.MaxTotalSpent.Value);
            }

            // セグメントフィルター
            if (!string.IsNullOrEmpty(filters.DormancySegment))
            {
                var segmentRange = GetSegmentDateRange(filters.DormancySegment);
                if (segmentRange.HasValue)
                {
                    query = query.Where(c => 
                        c.LastOrderDate >= segmentRange.Value.minDate && 
                        c.LastOrderDate <= segmentRange.Value.maxDate);
                }
            }

            return query;
        }

        /// <summary>
        /// ソート適用
        /// </summary>
        private IQueryable<DormantCustomerQueryResult> ApplySorting(IQueryable<DormantCustomerQueryResult> query, string sortBy, bool descending)
        {
            return sortBy?.ToLower() switch
            {
                "dayssincelastpurchase" => descending 
                    ? query.OrderByDescending(c => c.LastOrderDate)
                    : query.OrderBy(c => c.LastOrderDate),
                "totalspent" => descending 
                    ? query.OrderByDescending(c => c.TotalSpent)
                    : query.OrderBy(c => c.TotalSpent),
                "totalorders" => descending 
                    ? query.OrderByDescending(c => c.TotalOrders)
                    : query.OrderBy(c => c.TotalOrders),
                "customername" => descending
                    ? query.OrderByDescending(c => c.CustomerName)
                    : query.OrderBy(c => c.CustomerName),
                _ => query.OrderByDescending(c => c.LastOrderDate) // デフォルト: 休眠期間の長い順
            };
        }

        /// <summary>
        /// キャッシュキー生成
        /// </summary>
        private string GenerateCacheKey(DormantCustomerQuery query)
        {
            var filterHash = query.Filters != null 
                ? $"{query.Filters.MinDaysSinceLastPurchase}_{query.Filters.MaxDaysSinceLastPurchase}_{query.Filters.MinTotalSpent}_{query.Filters.MaxTotalSpent}_{query.Filters.DormancySegment}_{query.Filters.RiskLevel}"
                : "null";

            return $"dormant_query_v3_{query.StoreId}_{query.PageNumber}_{query.PageSize}_{query.SortBy}_{query.Descending}_{filterHash}";
        }

        /// <summary>
        /// 顧客をDTOに変換
        /// </summary>
        private async Task<DormantCustomerDto> ConvertToDto(Customer customer, DateTime? lastOrderDate, int daysSinceLastPurchase)
        {
            return new DormantCustomerDto
            {
                CustomerId = customer.Id,
                Name = customer.DisplayName ?? "不明",
                Email = customer.Email ?? "",
                Phone = customer.Phone,
                Company = customer.Company,
                LastPurchaseDate = lastOrderDate,
                DaysSinceLastPurchase = daysSinceLastPurchase,
                DormancySegment = CalculateDormancySegment(daysSinceLastPurchase),
                RiskLevel = CalculateRiskLevel(daysSinceLastPurchase, customer.TotalOrders),
                ChurnProbability = CalculateChurnProbability(daysSinceLastPurchase),
                TotalSpent = customer.TotalSpent,
                TotalOrders = customer.TotalOrders,
                AverageOrderValue = customer.TotalOrders > 0 ? customer.TotalSpent / customer.TotalOrders : 0,
                Tags = ParseTags(customer.Tags),
                PreferredCategories = await GetPreferredCategories(customer.Id),
                Insight = GenerateReactivationInsight(daysSinceLastPurchase, customer.TotalOrders, 
                    customer.TotalOrders > 0 ? customer.TotalSpent / customer.TotalOrders : 0)
            };
        }

        /// <summary>
        /// 休眠セグメント計算
        /// </summary>
        private string CalculateDormancySegment(int daysSinceLastPurchase)
        {
            return daysSinceLastPurchase switch
            {
                <= 180 => "90-180日",
                <= 365 => "180-365日",
                _ => "365日以上"
            };
        }

        /// <summary>
        /// リスクレベル計算
        /// </summary>
        private string CalculateRiskLevel(int daysSinceLastPurchase, int totalOrders)
        {
            // 購入回数も考慮したリスク判定
            var baseRisk = daysSinceLastPurchase switch
            {
                <= 120 => "low",
                <= 240 => "medium",
                <= 365 => "high",
                _ => "critical"
            };

            // 過去の購入回数が多い場合はリスクを下げる
            if (totalOrders >= 10 && baseRisk == "high") return "medium";
            if (totalOrders >= 5 && baseRisk == "critical") return "high";

            return baseRisk;
        }

        /// <summary>
        /// チャーン確率計算（簡易版）
        /// </summary>
        private decimal CalculateChurnProbability(int daysSinceLastPurchase)
        {
            return daysSinceLastPurchase switch
            {
                <= 90 => 0.1m,
                <= 180 => 0.3m,
                <= 365 => 0.6m,
                _ => 0.9m
            };
        }

        /// <summary>
        /// タグ解析
        /// </summary>
        private List<string> ParseTags(string? tags)
        {
            if (string.IsNullOrEmpty(tags)) return new List<string>();

            return tags.Split(',', StringSplitOptions.RemoveEmptyEntries)
                      .Select(tag => tag.Trim())
                      .Where(tag => !string.IsNullOrEmpty(tag))
                      .ToList();
        }

        /// <summary>
        /// セグメント日付範囲取得
        /// </summary>
        private (DateTime minDate, DateTime maxDate)? GetSegmentDateRange(string segment)
        {
            var now = DateTime.UtcNow;
            
            // セグメント文字列の正規化（半角・全角対応）
            var normalizedSegment = segment?.Replace("－", "-").ToLower();
            
            return normalizedSegment switch
            {
                "90-180日" => (now.AddDays(-180), now.AddDays(-90)),
                "180-365日" => (now.AddDays(-365), now.AddDays(-180)),
                "365日以上" => (DateTime.MinValue, now.AddDays(-365)),
                // 英語版もサポート
                "90-180" => (now.AddDays(-180), now.AddDays(-90)),
                "180-365" => (now.AddDays(-365), now.AddDays(-180)),
                "365+" => (DateTime.MinValue, now.AddDays(-365)),
                _ => null
            };
        }

        /// <summary>
        /// 好みカテゴリ取得
        /// </summary>
        private async Task<List<string>> GetPreferredCategories(int customerId)
        {
            try
            {
                var categories = await _context.OrderItems
                    .Where(oi => oi.Order.CustomerId == customerId)
                    .Where(oi => !string.IsNullOrEmpty(oi.ProductType))
                    .GroupBy(oi => oi.ProductType)
                    .OrderByDescending(g => g.Count())
                    .Take(3)
                    .Select(g => g.Key!)
                    .ToListAsync();

                return categories;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "好みカテゴリ取得エラー CustomerId: {CustomerId}", customerId);
                return new List<string>();
            }
        }

        /// <summary>
        /// 復帰インサイト生成
        /// </summary>
        private ReactivationInsight GenerateReactivationInsight(int daysSinceLastPurchase, int totalOrders, decimal averageOrderValue)
        {
            var insight = new ReactivationInsight();

            // 復帰アクション推奨
            insight.RecommendedAction = daysSinceLastPurchase switch
            {
                <= 120 => "軽微なフォローアップ",
                <= 240 => "パーソナライズドメール",
                <= 365 => "特別オファー提供",
                _ => "集中的な復帰キャンペーン"
            };

            // 最適タイミング
            insight.OptimalTiming = totalOrders switch
            {
                >= 10 => "平日午前中",
                >= 5 => "週末夕方",
                _ => "平日午後"
            };

            // 成功率予測
            insight.EstimatedSuccessRate = Math.Max(0.05m, Math.Min(0.8m, 
                (1.0m - (daysSinceLastPurchase / 365.0m)) * (totalOrders / 10.0m)));

            // 提案オファー
            insight.SuggestedOffer = averageOrderValue switch
            {
                >= 50000 => "VIP限定割引20%",
                >= 20000 => "送料無料 + 10%割引",
                >= 10000 => "次回購入15%OFF",
                _ => "お試し商品無料サンプル"
            };

            // パーソナライゼーションのヒント
            insight.PersonalizationTips = new List<string>
            {
                $"過去の購入回数: {totalOrders}回を強調",
                $"平均注文額: {averageOrderValue:N0}円のお客様向け商品を推奨",
                "過去の購入カテゴリに基づく商品推薦"
            };

            return insight;
        }
    }

    /// <summary>
    /// 休眠顧客クエリ結果用の内部DTO
    /// </summary>
    internal class DormantCustomerQueryResult
    {
        public int CustomerId { get; set; }
        public string? CustomerName { get; set; }
        public string? CustomerEmail { get; set; }
        public string? CustomerPhone { get; set; }
        public string? CustomerCompany { get; set; }
        public decimal TotalSpent { get; set; }
        public int TotalOrders { get; set; }
        public string? Tags { get; set; }
        public DateTime? LastOrderDate { get; set; }
    }
}