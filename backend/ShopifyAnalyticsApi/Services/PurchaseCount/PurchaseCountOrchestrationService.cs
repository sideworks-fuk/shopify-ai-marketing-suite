using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services.PurchaseCount;

namespace ShopifyAnalyticsApi.Services.PurchaseCount
{
    /// <summary>
    /// 購入回数オーケストレーションサービスの実装
    /// 責任範囲: 全体調整・ワークフロー管理・インサイト生成
    /// </summary>
    public class PurchaseCountOrchestrationService : IPurchaseCountOrchestrationService
    {
        private readonly IPurchaseCountAnalysisService _analysisService;
        private readonly IPurchaseCountDataService _dataService;
        private readonly ILogger<PurchaseCountOrchestrationService> _logger;

        public PurchaseCountOrchestrationService(
            IPurchaseCountAnalysisService analysisService,
            IPurchaseCountDataService dataService,
            ILogger<PurchaseCountOrchestrationService> logger)
        {
            _analysisService = analysisService;
            _dataService = dataService;
            _logger = logger;
        }

        /// <summary>
        /// 購入回数分析を実行
        /// </summary>
        public async Task<PurchaseCountAnalysisResponse> GetPurchaseCountAnalysisAsync(PurchaseCountAnalysisRequest request)
        {
            try
            {
                _logger.LogInformation("購入回数分析開始 - StoreId: {StoreId}, Period: {StartDate} - {EndDate}",
                    request.StoreId, request.StartDate, request.EndDate);

                var response = new PurchaseCountAnalysisResponse();

                // 1. サマリーデータ取得
                var days = (int)(request.EndDate - request.StartDate).TotalDays;
                response.Summary = await _analysisService.GetPurchaseCountSummaryAsync(request.StoreId, days);

                // 2. 詳細データ取得
                response.Details = await _analysisService.GetPurchaseCountDetailsAsync(request);

                // 3. トレンドデータ取得
                response.Trends = await _analysisService.GetPurchaseCountTrendsAsync(request.StoreId, 12);

                // 4. セグメント分析データ取得
                if (request.Segment == "all" || string.IsNullOrEmpty(request.Segment))
                {
                    response.SegmentAnalysis = await _analysisService.GetAllSegmentAnalysisAsync(request.StoreId);
                }
                else
                {
                    var segmentData = await _analysisService.GetSegmentAnalysisAsync(request.StoreId, request.Segment);
                    response.SegmentAnalysis = new List<SegmentAnalysisData> { segmentData };
                }

                // 5. インサイト生成
                response.Insights = GenerateInsights(response);

                _logger.LogInformation("購入回数分析完了 - DetailCount: {DetailCount}, TrendCount: {TrendCount}",
                    response.Details.Count, response.Trends.Count);

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "購入回数分析エラー - StoreId: {StoreId}", request.StoreId);
                throw;
            }
        }

        /// <summary>
        /// インサイトを生成
        /// </summary>
        public PurchaseCountInsights GenerateInsights(PurchaseCountAnalysisResponse response)
        {
            try
            {
                _logger.LogDebug("インサイト生成開始");

                var insights = new PurchaseCountInsights
                {
                    KeyFindings = new List<string>(),
                    Recommendations = new List<RecommendationItem>(),
                    Risk = new RiskAnalysis(),
                    Opportunity = new OpportunityAnalysis()
                };

                // 主要発見事項
                var oneTimeCustomers = response.Details.FirstOrDefault(d => d.PurchaseCount == 1);
                if (oneTimeCustomers != null && oneTimeCustomers.Percentage.CustomerPercentage > 60)
                {
                    insights.KeyFindings.Add($"一回購入顧客が{oneTimeCustomers.Percentage.CustomerPercentage:F1}%と高い比率を占めています");
                }

                var highFreqCustomers = response.Details.Where(d => d.PurchaseCount >= 5).Sum(d => d.Percentage.CustomerPercentage);
                if (highFreqCustomers > 15)
                {
                    insights.KeyFindings.Add($"5回以上購入する高頻度顧客が{highFreqCustomers:F1}%存在します");
                }

                // リピート率の分析
                var repeatCustomerRate = response.Summary?.RepeatCustomerRate ?? 0;
                if (repeatCustomerRate < 30)
                {
                    insights.KeyFindings.Add($"リピート率が{repeatCustomerRate:F1}%と低い水準です");
                }
                else if (repeatCustomerRate > 70)
                {
                    insights.KeyFindings.Add($"リピート率が{repeatCustomerRate:F1}%と高い水準を維持しています");
                }

                // 推奨アクション
                GenerateRecommendations(insights, oneTimeCustomers, repeatCustomerRate, highFreqCustomers);

                // リスク分析
                GenerateRiskAnalysis(insights, oneTimeCustomers, repeatCustomerRate);

                // 機会分析
                GenerateOpportunityAnalysis(insights, oneTimeCustomers, highFreqCustomers, repeatCustomerRate);

                _logger.LogDebug("インサイト生成完了");
                return insights;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "インサイト生成中にエラーが発生");
                throw;
            }
        }

        #region Private Methods

        /// <summary>
        /// 推奨アクションを生成
        /// </summary>
        private void GenerateRecommendations(PurchaseCountInsights insights, PurchaseCountDetail? oneTimeCustomers, 
            decimal repeatCustomerRate, decimal highFreqCustomers)
        {
            // 新規顧客リピート促進
            if (oneTimeCustomers?.Percentage.CustomerPercentage > 60)
            {
                insights.Recommendations.Add(new RecommendationItem
                {
                    Category = "リピート促進",
                    Title = "新規顧客リピート促進",
                    Description = "一回購入顧客の比率が高いため、リピート購入を促進する施策が必要です",
                    Priority = "高",
                    Action = "フォローアップメール、割引クーポン、リターゲティング広告の実施"
                });
            }

            // 高頻度顧客の維持
            if (highFreqCustomers > 10)
            {
                insights.Recommendations.Add(new RecommendationItem
                {
                    Category = "顧客維持",
                    Title = "ロイヤル顧客プログラム",
                    Description = "高頻度購入顧客向けの特別プログラムで満足度を向上させましょう",
                    Priority = "中",
                    Action = "VIPプログラム、専用サポート、限定商品の提供"
                });
            }

            // 全体的なリピート率改善
            if (repeatCustomerRate < 40)
            {
                insights.Recommendations.Add(new RecommendationItem
                {
                    Category = "全体改善",
                    Title = "購入体験の最適化",
                    Description = "全体的なリピート率向上のため、購入体験を改善しましょう",
                    Priority = "高",
                    Action = "チェックアウト最適化、配送改善、カスタマーサポート強化"
                });
            }
        }

        /// <summary>
        /// リスク分析を生成
        /// </summary>
        private void GenerateRiskAnalysis(PurchaseCountInsights insights, PurchaseCountDetail? oneTimeCustomers, 
            decimal repeatCustomerRate)
        {
            var oneTimeRate = oneTimeCustomers?.Percentage.CustomerPercentage ?? 0;
            
            insights.Risk = new RiskAnalysis
            {
                OneTimeCustomerRate = oneTimeRate,
                ChurnRisk = oneTimeRate > 70 ? 80 : oneTimeRate > 50 ? 60 : 40,
                RiskFactors = new List<string>(),
                OverallRiskLevel = DetermineOverallRiskLevel(oneTimeRate, repeatCustomerRate)
            };

            // リスク要因の特定
            if (oneTimeRate > 60)
            {
                insights.Risk.RiskFactors.Add("高い一回購入率");
            }
            
            if (repeatCustomerRate < 30)
            {
                insights.Risk.RiskFactors.Add("低いリピート率");
            }
            
            if (oneTimeRate > 80)
            {
                insights.Risk.RiskFactors.Add("顧客離反の高リスク");
            }
        }

        /// <summary>
        /// 機会分析を生成
        /// </summary>
        private void GenerateOpportunityAnalysis(PurchaseCountInsights insights, PurchaseCountDetail? oneTimeCustomers, 
            decimal highFreqCustomers, decimal repeatCustomerRate)
        {
            var oneTimeRate = oneTimeCustomers?.Percentage.CustomerPercentage ?? 0;
            
            insights.Opportunity = new OpportunityAnalysis
            {
                UpsellPotential = highFreqCustomers,
                RetentionOpportunity = Math.Max(0, 100 - oneTimeRate),
                GrowthOpportunities = new List<string>(),
                PrimaryOpportunityArea = DeterminePrimaryOpportunity(oneTimeRate, repeatCustomerRate, highFreqCustomers)
            };

            // 成長機会の特定
            if (oneTimeRate > 40)
            {
                insights.Opportunity.GrowthOpportunities.Add("リピート顧客育成");
            }
            
            if (highFreqCustomers > 5)
            {
                insights.Opportunity.GrowthOpportunities.Add("クロスセル機会拡大");
                insights.Opportunity.GrowthOpportunities.Add("アップセル強化");
            }
            
            if (repeatCustomerRate < 60)
            {
                insights.Opportunity.GrowthOpportunities.Add("顧客維持施策強化");
            }
        }

        /// <summary>
        /// 全体リスクレベルを判定
        /// </summary>
        private string DetermineOverallRiskLevel(decimal oneTimeRate, decimal repeatCustomerRate)
        {
            if (oneTimeRate > 70 || repeatCustomerRate < 25)
                return "高";
            else if (oneTimeRate > 50 || repeatCustomerRate < 40)
                return "中";
            else
                return "低";
        }

        /// <summary>
        /// 主要機会領域を判定
        /// </summary>
        private string DeterminePrimaryOpportunity(decimal oneTimeRate, decimal repeatCustomerRate, decimal highFreqCustomers)
        {
            if (oneTimeRate > 60)
                return "新規顧客のリピート化";
            else if (repeatCustomerRate < 40)
                return "全体的な顧客維持";
            else if (highFreqCustomers > 15)
                return "ロイヤル顧客の活用";
            else
                return "バランス型成長";
        }

        #endregion

        /// <summary>
        /// 簡易版購入回数分析を実行（5階層）
        /// </summary>
        public async Task<PurchaseCountAnalysisResponse> GetSimplifiedPurchaseCountAnalysisAsync(PurchaseCountAnalysisRequest request)
        {
            try
            {
                _logger.LogInformation("簡易版購入回数分析(5階層)開始 - StoreId: {StoreId}, Period: {StartDate} - {EndDate}",
                    request.StoreId, request.StartDate, request.EndDate);

                var response = new PurchaseCountAnalysisResponse();

                // 1. サマリーデータ取得
                var days = (int)(request.EndDate - request.StartDate).TotalDays;
                response.Summary = await _analysisService.GetPurchaseCountSummaryAsync(request.StoreId, days);

                // 2. 5階層の詳細データ取得
                response.Details = await GetSimplified5TierDetailsAsync(request);

                // 3. トレンドデータ取得（簡易版）
                response.Trends = await _analysisService.GetPurchaseCountTrendsAsync(request.StoreId, 6); // 6ヶ月分

                // 4. セグメント分析は簡易版では省略可能
                if (request.Segment == "all" || string.IsNullOrEmpty(request.Segment))
                {
                    response.SegmentAnalysis = new List<SegmentAnalysisData>();
                }

                // 5. 簡易版用のインサイト生成
                response.Insights = GenerateSimplifiedInsights(response);

                _logger.LogInformation("簡易版購入回数分析完了 - DetailCount: {DetailCount}(5階層), TrendCount: {TrendCount}",
                    response.Details.Count, response.Trends.Count);

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "簡易版購入回数分析エラー - StoreId: {StoreId}", request.StoreId);
                throw;
            }
        }

        /// <summary>
        /// 5階層の詳細データを取得
        /// </summary>
        private async Task<List<PurchaseCountDetail>> GetSimplified5TierDetailsAsync(PurchaseCountAnalysisRequest request)
        {
            // セグメント別の顧客IDを取得（セグメント指定がある場合）
            List<int> segmentCustomerIds = null;
            if (!string.IsNullOrEmpty(request.Segment) && request.Segment != "all")
            {
                _logger.LogInformation("セグメントフィルタリング実行: Segment={Segment}, StartDate={StartDate}, EndDate={EndDate}", 
                    request.Segment, request.StartDate, request.EndDate);
                    
                var (segmentName, customerIds) = await _dataService.GetSegmentCustomerIdsAsync(
                    request.StoreId, request.Segment, request.StartDate, request.EndDate);
                    
                segmentCustomerIds = customerIds;
                _logger.LogInformation("セグメント '{SegmentName}' の顧客数: {CustomerCount}", 
                    segmentName, customerIds?.Count ?? 0);
            }
            
            // 全ての詳細データを取得（セグメントフィルタ付き）
            var allDetails = await _analysisService.GetPurchaseCountDetailsAsync(request, segmentCustomerIds);

            // 5階層に集約
            var simplifiedDetails = new List<PurchaseCountDetail>
            {
                CreateSimplifiedTier(allDetails, 1, 1, "1回"),
                CreateSimplifiedTier(allDetails, 2, 2, "2回"),
                CreateSimplifiedTier(allDetails, 3, 5, "3-5回"),
                CreateSimplifiedTier(allDetails, 6, 10, "6-10回"),
                CreateSimplifiedTier(allDetails, 11, int.MaxValue, "11回以上")
            };

            // 全体に対する割合を再計算
            var totalCustomers = simplifiedDetails.Sum(d => d.Current.CustomerCount);
            var totalAmount = simplifiedDetails.Sum(d => d.Current.TotalAmount);

            foreach (var detail in simplifiedDetails)
            {
                detail.Percentage = new PercentageMetrics
                {
                    CustomerPercentage = totalCustomers > 0 
                        ? (decimal)detail.Current.CustomerCount / totalCustomers * 100 : 0,
                    AmountPercentage = totalAmount > 0 
                        ? detail.Current.TotalAmount / totalAmount * 100 : 0
                };
            }

            return simplifiedDetails;
        }

        /// <summary>
        /// 簡易階層を作成
        /// </summary>
        private PurchaseCountDetail CreateSimplifiedTier(List<PurchaseCountDetail> allDetails, 
            int minCount, int maxCount, string label)
        {
            var tierDetails = allDetails.Where(d => d.PurchaseCount >= minCount && d.PurchaseCount <= maxCount).ToList();
            
            var simplifiedDetail = new PurchaseCountDetail
            {
                PurchaseCount = minCount,
                PurchaseCountLabel = label,
                Current = new BasicMetrics
                {
                    CustomerCount = tierDetails.Sum(d => d.Current.CustomerCount),
                    OrderCount = tierDetails.Sum(d => d.Current.OrderCount),
                    TotalAmount = tierDetails.Sum(d => d.Current.TotalAmount)
                },
                Analysis = new DetailedAnalysisMetrics()
            };

            // 平均値の計算
            if (simplifiedDetail.Current.CustomerCount > 0)
            {
                simplifiedDetail.Current.AverageCustomerValue = 
                    simplifiedDetail.Current.TotalAmount / simplifiedDetail.Current.CustomerCount;
            }
            if (simplifiedDetail.Current.OrderCount > 0)
            {
                simplifiedDetail.Current.AverageOrderValue = 
                    simplifiedDetail.Current.TotalAmount / simplifiedDetail.Current.OrderCount;
            }

            // 前年同期データがある場合は集約
            if (tierDetails.Any(d => d.Previous != null))
            {
                simplifiedDetail.Previous = new BasicMetrics
                {
                    CustomerCount = tierDetails.Sum(d => d.Previous?.CustomerCount ?? 0),
                    OrderCount = tierDetails.Sum(d => d.Previous?.OrderCount ?? 0),
                    TotalAmount = tierDetails.Sum(d => d.Previous?.TotalAmount ?? 0)
                };

                // 成長率計算
                // 前年データが存在し、意味のある値の場合のみ成長率を計算
                // 極小値（1未満）や0の場合は計算しない
                if (simplifiedDetail.Previous.CustomerCount >= 1)
                {
                    simplifiedDetail.GrowthRate = new GrowthRateMetrics
                    {
                        CustomerCountGrowth = ((decimal)simplifiedDetail.Current.CustomerCount / simplifiedDetail.Previous.CustomerCount - 1) * 100,
                        OrderCountGrowth = simplifiedDetail.Previous.OrderCount > 0 
                            ? ((decimal)simplifiedDetail.Current.OrderCount / simplifiedDetail.Previous.OrderCount - 1) * 100 
                            : 0,
                        AmountGrowth = simplifiedDetail.Previous.TotalAmount > 0 
                            ? (simplifiedDetail.Current.TotalAmount / simplifiedDetail.Previous.TotalAmount - 1) * 100 
                            : 0
                    };
                }
                else if (simplifiedDetail.Current.CustomerCount > 0 && simplifiedDetail.Previous.CustomerCount < 1)
                {
                    // 前年データが0または極小値で、今年データがある場合は新規として扱う
                    // nullを返すことでフロントエンドで「新規」や「N/A」と表示可能
                    simplifiedDetail.GrowthRate = null;
                }
            }

            return simplifiedDetail;
        }

        /// <summary>
        /// 簡易版用のインサイト生成
        /// </summary>
        private PurchaseCountInsights GenerateSimplifiedInsights(PurchaseCountAnalysisResponse response)
        {
            var insights = new PurchaseCountInsights
            {
                KeyFindings = new List<string>(),
                Recommendations = new List<RecommendationItem>(),
                Risk = new RiskAnalysis { RiskFactors = new List<string>() },
                Opportunity = new OpportunityAnalysis { GrowthOpportunities = new List<string>() }
            };

            // 1回購入顧客の分析
            var oneTimeTier = response.Details.FirstOrDefault(d => d.PurchaseCountLabel == "1回");
            if (oneTimeTier != null)
            {
                if (oneTimeTier.Percentage.CustomerPercentage > 60)
                {
                    insights.KeyFindings.Add($"初回購入のみの顧客が{oneTimeTier.Percentage.CustomerPercentage:F1}%を占めています");
                    insights.Recommendations.Add(new RecommendationItem
                    {
                        Category = "リピート促進",
                        Title = "初回購入者のリピート化",
                        Description = "初回購入後のフォローアップを強化しましょう",
                        Priority = "高",
                        Action = "購入後メール、特別クーポン、商品レビュー依頼"
                    });
                }
            }

            // 高頻度購入層（11回以上）の分析
            var loyalTier = response.Details.FirstOrDefault(d => d.PurchaseCountLabel == "11回以上");
            if (loyalTier != null && loyalTier.Percentage.CustomerPercentage > 10)
            {
                insights.KeyFindings.Add($"11回以上購入のロイヤル顧客が{loyalTier.Percentage.CustomerPercentage:F1}%存在します");
                insights.Recommendations.Add(new RecommendationItem
                {
                    Category = "顧客維持",
                    Title = "ロイヤル顧客の維持強化",
                    Description = "最優良顧客への特別対応を実施しましょう",
                    Priority = "中",
                    Action = "VIPプログラム、限定商品、優先サポート"
                });
            }

            // リスクレベルの簡易判定
            var oneTimeRate = oneTimeTier?.Percentage.CustomerPercentage ?? 0;
            insights.Risk.OneTimeCustomerRate = oneTimeRate;
            insights.Risk.OverallRiskLevel = oneTimeRate > 70 ? "高" : oneTimeRate > 50 ? "中" : "低";

            return insights;
        }
    }
}