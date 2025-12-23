using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using System.Collections.Concurrent;

namespace ShopifyAnalyticsApi.Services
{
    /// <summary>
    /// 無料プラン機能選択サービス
    /// </summary>
    public class FeatureSelectionService : IFeatureSelectionService
    {
        private readonly ShopifyDbContext _context;
        private readonly ILogger<FeatureSelectionService> _logger;
        private readonly IMemoryCache _cache;
        private readonly IHttpContextAccessor _httpContextAccessor;
        
        // 同時実行制御用
        private static readonly ConcurrentDictionary<int, SemaphoreSlim> _storeLocks = new();
        
        // キャッシュキー
        private const string CACHE_KEY_PREFIX = "feature_selection_";
        private const int CACHE_DURATION_MINUTES = 5;

        // 無料プランで未選択の場合のデフォルト機能（初回UX改善）
        private const string DEFAULT_FREE_FEATURE = FeatureConstants.DormantAnalysis;

        public FeatureSelectionService(
            ShopifyDbContext context,
            ILogger<FeatureSelectionService> logger,
            IMemoryCache memoryCache,
            IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _logger = logger;
            _cache = memoryCache;
            _httpContextAccessor = httpContextAccessor;
        }

        /// <summary>
        /// 現在の機能選択状態を取得
        /// </summary>
        public async Task<CurrentSelectionResponse> GetCurrentSelectionAsync(int storeId)
        {
            var cacheKey = $"{CACHE_KEY_PREFIX}{storeId}";
            
            // キャッシュから取得を試みる
            if (_cache.TryGetValue<CurrentSelectionResponse>(cacheKey, out var cached))
            {
                _logger.LogDebug("Feature selection retrieved from cache for store {StoreId}", storeId);
                return cached;
            }

            // データベースから取得
            var selection = await _context.UserFeatureSelections
                .Include(s => s.Store)
                .ThenInclude(st => st!.StoreSubscriptions)
                .ThenInclude(ss => ss.Plan)
                .FirstOrDefaultAsync(s => s.StoreId == storeId && s.IsActive);

            // ストアのサブスクリプション状態を確認
            var subscription = await _context.StoreSubscriptions
                .Include(ss => ss.Plan)
                .FirstOrDefaultAsync(ss => ss.StoreId == storeId && ss.Status == "active");

            var planType = GetPlanType(subscription);

            // ✅ UX改善: 無料プランで未選択の場合はデフォルト機能を「選択済み扱い」にする
            // - これにより FeatureAccessMiddleware で selectedFeatures=[] となって 403 になる問題を回避
            // - 物理的なDB更新は SelectFeature API を通したタイミングで行う（GETでは更新しない）
            var effectiveSelectedFeatureId = selection?.SelectedFeatureId;
            if (planType == PlanTypes.Free && string.IsNullOrEmpty(effectiveSelectedFeatureId))
            {
                effectiveSelectedFeatureId = DEFAULT_FREE_FEATURE;
            }

            var response = new CurrentSelectionResponse
            {
                SelectedFeature = effectiveSelectedFeatureId,
                CanChangeToday = selection?.CanChangeToday ?? true,
                NextChangeAvailableDate = selection?.NextChangeAvailableDate ?? DateTime.UtcNow,
                PlanType = planType,
                AvailableFeatures = GetAvailableFeatures(planType, effectiveSelectedFeatureId),
                UsageLimit = await GetUsageLimitAsync(storeId, effectiveSelectedFeatureId)
            };

            // キャッシュに保存
            var cacheOptions = new MemoryCacheEntryOptions()
                .SetSlidingExpiration(TimeSpan.FromMinutes(CACHE_DURATION_MINUTES));
            _cache.Set(cacheKey, response, cacheOptions);

            return response;
        }

        /// <summary>
        /// 機能を選択/変更
        /// </summary>
        public async Task<(bool success, string? errorCode, string? message)> SelectFeatureAsync(
            int storeId, 
            string featureId, 
            string idempotencyToken)
        {
            // 機能IDの検証
            if (!FeatureConstants.IsValidFeature(featureId))
            {
                await LogUsageAsync(storeId, featureId, "change", null, featureId, "error", "invalid_feature_id", idempotencyToken);
                return (false, "invalid_feature_id", "指定された機能は無効です");
            }

            // ストアごとのロックを取得
            var storeLock = _storeLocks.GetOrAdd(storeId, _ => new SemaphoreSlim(1, 1));
            
            await storeLock.WaitAsync();
            try
            {
                // 冪等性チェック
                var existingLog = await _context.FeatureUsageLogs
                    .FirstOrDefaultAsync(log => log.IdempotencyToken == idempotencyToken);
                
                if (existingLog != null)
                {
                    _logger.LogInformation("Idempotent request detected for token {Token}", idempotencyToken);
                    return (existingLog.Result == "success", null, "リクエストは既に処理されています");
                }

                // 現在の選択を取得（楽観ロック用）
                var currentSelection = await _context.UserFeatureSelections
                    .FirstOrDefaultAsync(s => s.StoreId == storeId && s.IsActive);

                // サブスクリプション状態を確認
                var subscription = await _context.StoreSubscriptions
                    .Include(ss => ss.Plan)
                    .FirstOrDefaultAsync(ss => ss.StoreId == storeId && ss.Status == "active");

                var planType = GetPlanType(subscription);
                
                // 無料プランの場合の制限チェック
                if (planType == PlanTypes.Free)
                {
                    if (currentSelection != null && !currentSelection.CanChangeToday)
                    {
                        var daysLeft = currentSelection.DaysUntilNextChange ?? 0;
                        await LogUsageAsync(
                            storeId, 
                            featureId, 
                            "change", 
                            currentSelection.SelectedFeatureId, 
                            featureId, 
                            "limited", 
                            "change_not_allowed", 
                            idempotencyToken);
                        
                        return (false, "change_not_allowed", $"機能の変更は{daysLeft}日後に可能になります");
                    }
                }

                // トランザクション開始
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var beforeFeatureId = currentSelection?.SelectedFeatureId;
                    
                    if (currentSelection != null)
                    {
                        // 既存の選択を更新
                        currentSelection.SelectedFeatureId = featureId;
                        currentSelection.LastChangeDate = DateTime.UtcNow;
                        currentSelection.NextChangeAvailableDate = planType == PlanTypes.Free 
                            ? DateTime.UtcNow.AddDays(30) 
                            : null;
                        currentSelection.UpdatedAt = DateTime.UtcNow;
                        
                        _context.UserFeatureSelections.Update(currentSelection);
                    }
                    else
                    {
                        // 新規作成
                        var newSelection = new UserFeatureSelection
                        {
                            StoreId = storeId,
                            SelectedFeatureId = featureId,
                            LastChangeDate = DateTime.UtcNow,
                            NextChangeAvailableDate = planType == PlanTypes.Free 
                                ? DateTime.UtcNow.AddDays(30) 
                                : null,
                            IsActive = true
                        };
                        
                        await _context.UserFeatureSelections.AddAsync(newSelection);
                    }

                    // 変更履歴を記録
                    var changeHistory = new FeatureSelectionChangeHistory
                    {
                        StoreId = storeId,
                        BeforeFeatureId = beforeFeatureId,
                        AfterFeatureId = featureId,
                        ChangeReason = "user_requested",
                        ChangedBy = GetCurrentUserId(),
                        IdempotencyToken = idempotencyToken,
                        CreatedAt = DateTime.UtcNow
                    };
                    
                    await _context.FeatureSelectionChangeHistories.AddAsync(changeHistory);

                    // 使用ログを記録
                    await LogUsageAsync(
                        storeId, 
                        featureId, 
                        "change", 
                        beforeFeatureId, 
                        featureId, 
                        "success", 
                        null, 
                        idempotencyToken);

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    // キャッシュをクリア
                    _cache.Remove($"{CACHE_KEY_PREFIX}{storeId}");

                    _logger.LogInformation(
                        "Feature selection changed for store {StoreId}: {Before} -> {After}", 
                        storeId, 
                        beforeFeatureId ?? "none", 
                        featureId);

                    return (true, null, "機能の選択が完了しました");
                }
                catch (DbUpdateConcurrencyException ex)
                {
                    await transaction.RollbackAsync();
                    _logger.LogWarning(ex, "Concurrency conflict for store {StoreId}", storeId);
                    return (false, "concurrent_update_conflict", "同時更新が検出されました。再度お試しください");
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    _logger.LogError(ex, "Failed to select feature for store {StoreId}", storeId);
                    throw;
                }
            }
            finally
            {
                storeLock.Release();
            }
        }

        /// <summary>
        /// 利用可能な機能一覧を取得
        /// </summary>
        public async Task<List<AvailableFeature>> GetAvailableFeaturesAsync(int storeId)
        {
            var currentSelection = await GetCurrentSelectionAsync(storeId);
            var features = new List<AvailableFeature>();

            foreach (var featureId in FeatureConstants.FreeSelectableFeatures)
            {
                var feature = new AvailableFeature
                {
                    FeatureId = featureId,
                    DisplayName = FeatureConstants.FeatureDisplayNames[featureId],
                    Description = FeatureConstants.FeatureDescriptions[featureId],
                    IsSelected = currentSelection.SelectedFeature == featureId,
                    IsAccessible = currentSelection.PlanType != PlanTypes.Free || currentSelection.SelectedFeature == featureId,
                    SortOrder = FeatureConstants.FreeSelectableFeatures.IndexOf(featureId)
                };
                
                features.Add(feature);
            }

            return features.OrderBy(f => f.SortOrder).ToList();
        }

        /// <summary>
        /// 機能の使用状況を取得
        /// </summary>
        public async Task<FeatureUsageResponse> GetFeatureUsageAsync(int storeId, string featureId)
        {
            var today = DateTime.UtcNow.Date;
            var monthStart = new DateTime(today.Year, today.Month, 1);

            // 今日の使用回数
            var todayUsage = await _context.FeatureUsageLogs
                .CountAsync(log => 
                    log.StoreId == storeId && 
                    log.FeatureId == featureId && 
                    log.EventType == "access" && 
                    log.Result == "success" &&
                    log.CreatedAt >= today);

            // 今月の使用回数
            var monthlyUsage = await _context.FeatureUsageLogs
                .CountAsync(log => 
                    log.StoreId == storeId && 
                    log.FeatureId == featureId && 
                    log.EventType == "access" && 
                    log.Result == "success" &&
                    log.CreatedAt >= monthStart);

            // 最近の使用履歴
            var recentUsage = await _context.FeatureUsageLogs
                .Where(log => 
                    log.StoreId == storeId && 
                    log.FeatureId == featureId)
                .OrderByDescending(log => log.CreatedAt)
                .Take(10)
                .Select(log => new UsageHistoryItem
                {
                    UsedAt = log.CreatedAt,
                    EventType = log.EventType,
                    Result = log.Result
                })
                .ToListAsync();

            // 制限情報を取得
            var subscription = await _context.StoreSubscriptions
                .Include(ss => ss.Plan)
                .FirstOrDefaultAsync(ss => ss.StoreId == storeId && ss.Status == "active");
            
            var planType = GetPlanType(subscription);
            var limits = await _context.FeatureLimits
                .FirstOrDefaultAsync(fl => fl.PlanType == planType && fl.FeatureId == featureId);

            return new FeatureUsageResponse
            {
                FeatureId = featureId,
                TodayUsageCount = todayUsage,
                MonthlyUsageCount = monthlyUsage,
                DailyLimit = limits?.DailyLimit,
                MonthlyLimit = limits?.MonthlyLimit,
                LastUsedAt = recentUsage.FirstOrDefault()?.UsedAt,
                RecentUsage = recentUsage
            };
        }

        /// <summary>
        /// 機能へのアクセス権限をチェック
        /// </summary>
        public async Task<FeatureAccessResult> CheckFeatureAccessAsync(int storeId, string featureId)
        {
            // サブスクリプション状態を確認
            var subscription = await _context.StoreSubscriptions
                .Include(ss => ss.Plan)
                .FirstOrDefaultAsync(ss => ss.StoreId == storeId && ss.Status == "active");
            
            var planType = GetPlanType(subscription);

            // 有料プランは全機能アクセス可能
            if (PlanTypes.IsPaidPlan(planType))
            {
                await LogUsageAsync(storeId, featureId, "access", null, null, "success", null, null);
                return new FeatureAccessResult
                {
                    IsAllowed = true,
                    DeniedReason = null,
                    RequiredPlan = null,
                    Message = "アクセスが許可されました"
                };
            }

            // 無料プランの場合、選択された機能のみアクセス可能
            var selection = await _context.UserFeatureSelections
                .FirstOrDefaultAsync(s => s.StoreId == storeId && s.IsActive);

            if (selection?.SelectedFeatureId != featureId)
            {
                await LogUsageAsync(storeId, featureId, "access", null, null, "limited", "not_selected", null);
                return new FeatureAccessResult
                {
                    IsAllowed = false,
                    DeniedReason = "not_selected",
                    RequiredPlan = "basic",
                    Message = "この機能を使用するには、設定から選択するか有料プランにアップグレードしてください"
                };
            }

            // 使用制限チェック
            var usage = await GetFeatureUsageAsync(storeId, featureId);
            var limits = await _context.FeatureLimits
                .FirstOrDefaultAsync(fl => fl.PlanType == planType && fl.FeatureId == featureId);

            if (limits?.DailyLimit != null && usage.TodayUsageCount >= limits.DailyLimit)
            {
                await LogUsageAsync(storeId, featureId, "access", null, null, "limited", "daily_limit_reached", null);
                return new FeatureAccessResult
                {
                    IsAllowed = false,
                    DeniedReason = "limit_reached",
                    RequiredPlan = "basic",
                    Message = $"本日の使用回数上限（{limits.DailyLimit}回）に達しました"
                };
            }

            if (limits?.MonthlyLimit != null && usage.MonthlyUsageCount >= limits.MonthlyLimit)
            {
                await LogUsageAsync(storeId, featureId, "access", null, null, "limited", "monthly_limit_reached", null);
                return new FeatureAccessResult
                {
                    IsAllowed = false,
                    DeniedReason = "limit_reached",
                    RequiredPlan = "basic",
                    Message = $"今月の使用回数上限（{limits.MonthlyLimit}回）に達しました"
                };
            }

            await LogUsageAsync(storeId, featureId, "access", null, null, "success", null, null);
            return new FeatureAccessResult
            {
                IsAllowed = true,
                DeniedReason = null,
                RequiredPlan = null,
                Message = "アクセスが許可されました"
            };
        }

        /// <summary>
        /// プラン変更時の処理
        /// </summary>
        public async Task HandlePlanChangeAsync(int storeId, string newPlanType, string changeReason)
        {
            if (newPlanType == PlanTypes.Free)
            {
                // 無料プランへのダウングレード：最後に選択された機能のみを有効化
                var lastSelection = await _context.FeatureSelectionChangeHistories
                    .Where(h => h.StoreId == storeId)
                    .OrderByDescending(h => h.CreatedAt)
                    .FirstOrDefaultAsync();

                var featureToSelect = lastSelection?.AfterFeatureId ?? FeatureConstants.DormantAnalysis;

                var currentSelection = await _context.UserFeatureSelections
                    .FirstOrDefaultAsync(s => s.StoreId == storeId && s.IsActive);

                if (currentSelection != null)
                {
                    currentSelection.SelectedFeatureId = featureToSelect;
                    currentSelection.LastChangeDate = DateTime.UtcNow;
                    currentSelection.NextChangeAvailableDate = DateTime.UtcNow.AddDays(30);
                    currentSelection.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    currentSelection = new UserFeatureSelection
                    {
                        StoreId = storeId,
                        SelectedFeatureId = featureToSelect,
                        LastChangeDate = DateTime.UtcNow,
                        NextChangeAvailableDate = DateTime.UtcNow.AddDays(30),
                        IsActive = true
                    };
                    await _context.UserFeatureSelections.AddAsync(currentSelection);
                }

                await LogUsageAsync(storeId, featureToSelect, "plan_downgraded", null, featureToSelect, "success", null, null);
            }
            else
            {
                // 有料プランへのアップグレード：全機能を即座に解放
                var currentSelection = await _context.UserFeatureSelections
                    .FirstOrDefaultAsync(s => s.StoreId == storeId && s.IsActive);

                if (currentSelection != null)
                {
                    currentSelection.NextChangeAvailableDate = null; // 制限解除
                    currentSelection.UpdatedAt = DateTime.UtcNow;
                }

                await LogUsageAsync(storeId, "all", "plan_upgraded", null, null, "success", null, null);
            }

            // キャッシュをクリア
            _cache.Remove($"{CACHE_KEY_PREFIX}{storeId}");

            await _context.SaveChangesAsync();
        }

        // ========== Private Helper Methods ==========

        private string GetPlanType(StoreSubscription? subscription)
        {
            if (subscription == null)
                return PlanTypes.Free;

            // ✅ 案1: trialing 中は有料相当として全機能解放
            if (string.Equals(subscription.Status, "trialing", StringComparison.OrdinalIgnoreCase))
            {
                var inTrial = !subscription.TrialEndsAt.HasValue || subscription.TrialEndsAt > DateTime.UtcNow;
                return inTrial ? PlanTypes.Professional : PlanTypes.Free;
            }

            if (!string.Equals(subscription.Status, "active", StringComparison.OrdinalIgnoreCase))
                return PlanTypes.Free;

            var planName = subscription.Plan?.Name?.ToLower() ?? "free";
            
            return planName switch
            {
                "basic" => PlanTypes.Basic,
                "professional" => PlanTypes.Professional,
                _ => PlanTypes.Free
            };
        }

        private List<string> GetAvailableFeatures(string planType, string? selectedFeatureId)
        {
            if (PlanTypes.IsPaidPlan(planType))
            {
                return FeatureConstants.FreeSelectableFeatures;
            }

            // 無料プランの場合、選択された機能のみ
            return selectedFeatureId != null 
                ? new List<string> { selectedFeatureId }
                : new List<string>();
        }

        private async Task<UsageLimit> GetUsageLimitAsync(int storeId, string? featureId)
        {
            if (string.IsNullOrEmpty(featureId))
            {
                return new UsageLimit { Remaining = 0, Total = 0, Period = "daily" };
            }

            var usage = await GetFeatureUsageAsync(storeId, featureId);
            var subscription = await _context.StoreSubscriptions
                .Include(ss => ss.Plan)
                .FirstOrDefaultAsync(ss =>
                    ss.StoreId == storeId &&
                    (ss.Status == "active" || ss.Status == "trialing"));
            
            var planType = GetPlanType(subscription);
            var limits = await _context.FeatureLimits
                .FirstOrDefaultAsync(fl => fl.PlanType == planType && fl.FeatureId == featureId);

            if (limits?.DailyLimit != null)
            {
                return new UsageLimit
                {
                    Remaining = Math.Max(0, limits.DailyLimit.Value - usage.TodayUsageCount),
                    Total = limits.DailyLimit.Value,
                    Period = "daily"
                };
            }

            if (limits?.MonthlyLimit != null)
            {
                return new UsageLimit
                {
                    Remaining = Math.Max(0, limits.MonthlyLimit.Value - usage.MonthlyUsageCount),
                    Total = limits.MonthlyLimit.Value,
                    Period = "monthly"
                };
            }

            return new UsageLimit { Remaining = int.MaxValue, Total = int.MaxValue, Period = "unlimited" };
        }

        private async Task LogUsageAsync(
            int storeId,
            string featureId,
            string eventType,
            string? beforeFeatureId,
            string? afterFeatureId,
            string result,
            string? errorMessage,
            string? idempotencyToken)
        {
            var log = new FeatureUsageLog
            {
                StoreId = storeId,
                FeatureId = featureId,
                EventType = eventType,
                BeforeFeatureId = beforeFeatureId,
                AfterFeatureId = afterFeatureId,
                Result = result,
                ErrorMessage = errorMessage,
                IpAddress = GetClientIpAddress(),
                UserAgent = GetUserAgent(),
                IdempotencyToken = idempotencyToken,
                CreatedAt = DateTime.UtcNow
            };

            await _context.FeatureUsageLogs.AddAsync(log);
        }

        private string? GetClientIpAddress()
        {
            return _httpContextAccessor.HttpContext?.Connection?.RemoteIpAddress?.ToString();
        }

        private string? GetUserAgent()
        {
            return _httpContextAccessor.HttpContext?.Request?.Headers["User-Agent"].ToString();
        }

        private string GetCurrentUserId()
        {
            return _httpContextAccessor.HttpContext?.User?.Identity?.Name ?? "system";
        }

        /// <summary>
        /// 選択された機能を取得（Webhook連携用）
        /// </summary>
        public async Task<IEnumerable<AvailableFeature>> GetSelectedFeaturesAsync(string storeId)
        {
            // storeIdをintに変換
            if (!int.TryParse(storeId, out var storeIdInt))
            {
                var store = await _context.Stores.FirstOrDefaultAsync(s => s.Domain == storeId || s.ShopifyUrl == storeId);
                if (store == null)
                {
                    _logger.LogWarning("Store not found: {StoreId}", storeId);
                    return Enumerable.Empty<AvailableFeature>();
                }
                storeIdInt = store.Id;
            }

            var selection = await _context.UserFeatureSelections
                .FirstOrDefaultAsync(s => s.StoreId == storeIdInt && s.IsActive);

            if (selection == null || string.IsNullOrEmpty(selection.SelectedFeatureId))
            {
                // ✅ UX改善: 未選択なら無料プランのデフォルト機能を選択済み扱い
                var featureId = DEFAULT_FREE_FEATURE;
                return new[] {
                    new AvailableFeature
                    {
                        FeatureId = featureId,
                        DisplayName = FeatureConstants.FeatureDisplayNames.GetValueOrDefault(featureId, featureId),
                        Description = FeatureConstants.FeatureDescriptions.GetValueOrDefault(featureId, ""),
                        IsSelected = true,
                        IsAccessible = true
                    }
                };
            }

            // 選択された機能IDをAvailableFeatureオブジェクトに変換
            if (FeatureConstants.IsValidFeature(selection.SelectedFeatureId))
            {
                var feature = new AvailableFeature
                {
                    FeatureId = selection.SelectedFeatureId,
                    DisplayName = FeatureConstants.FeatureDisplayNames.GetValueOrDefault(selection.SelectedFeatureId, selection.SelectedFeatureId),
                    Description = FeatureConstants.FeatureDescriptions.GetValueOrDefault(selection.SelectedFeatureId, ""),
                    IsSelected = true,
                    IsAccessible = true
                };
                return new[] { feature };
            }

            _logger.LogWarning("Invalid feature ID: {FeatureId}", selection.SelectedFeatureId);
            return Enumerable.Empty<AvailableFeature>();
        }

        /// <summary>
        /// 選択された機能を更新（Webhook連携用）
        /// </summary>
        public async Task UpdateSelectedFeaturesAsync(string storeId, IEnumerable<AvailableFeature> features)
        {
            // storeIdをintに変換
            if (!int.TryParse(storeId, out var storeIdInt))
            {
                var store = await _context.Stores.FirstOrDefaultAsync(s => s.Domain == storeId || s.ShopifyUrl == storeId);
                if (store == null)
                {
                    _logger.LogWarning("Store not found: {StoreId}", storeId);
                    return;
                }
                storeIdInt = store.Id;
            }

            var selection = await _context.UserFeatureSelections
                .FirstOrDefaultAsync(s => s.StoreId == storeIdInt && s.IsActive);

            // 最初の機能を選択（無料プランの場合は1つのみ）
            var selectedFeature = features.FirstOrDefault();
            if (selectedFeature == null)
            {
                _logger.LogWarning("No features provided for update");
                return;
            }

            var featureId = selectedFeature.FeatureId;

            if (selection != null)
            {
                selection.SelectedFeatureId = featureId;
                selection.UpdatedAt = DateTime.UtcNow;
                _context.UserFeatureSelections.Update(selection);
            }
            else
            {
                selection = new UserFeatureSelection
                {
                    StoreId = storeIdInt,
                    SelectedFeatureId = featureId,
                    LastChangeDate = DateTime.UtcNow,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                await _context.UserFeatureSelections.AddAsync(selection);
            }

            await _context.SaveChangesAsync();

            // キャッシュをクリア
            _cache.Remove($"{CACHE_KEY_PREFIX}{storeIdInt}");
            _cache.Remove($"feature_access_{storeId}");

            _logger.LogInformation("Features updated for store {StoreId}: {Features}", storeId, string.Join(", ", features));
        }
    }

    /// <summary>
    /// 機能選択サービスのインターフェース
    /// </summary>
    public interface IFeatureSelectionService
    {
        Task<CurrentSelectionResponse> GetCurrentSelectionAsync(int storeId);
        Task<(bool success, string? errorCode, string? message)> SelectFeatureAsync(int storeId, string featureId, string idempotencyToken);
        Task<List<AvailableFeature>> GetAvailableFeaturesAsync(int storeId);
        Task<FeatureUsageResponse> GetFeatureUsageAsync(int storeId, string featureId);
        Task<FeatureAccessResult> CheckFeatureAccessAsync(int storeId, string featureId);
        Task HandlePlanChangeAsync(int storeId, string newPlanType, string changeReason);
        Task<IEnumerable<AvailableFeature>> GetSelectedFeaturesAsync(string storeId);
        Task UpdateSelectedFeaturesAsync(string storeId, IEnumerable<AvailableFeature> features);
    }
}