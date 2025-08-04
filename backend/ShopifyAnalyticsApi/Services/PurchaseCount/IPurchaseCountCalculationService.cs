using ShopifyAnalyticsApi.Models;

namespace ShopifyAnalyticsApi.Services.PurchaseCount
{
    /// <summary>
    /// 購入回数計算サービスのインターフェース
    /// 責任範囲: 計算・メトリクス算出・統計処理
    /// </summary>
    public interface IPurchaseCountCalculationService
    {
        /// <summary>
        /// 購入回数サマリーを計算
        /// </summary>
        /// <param name="customerPurchaseCounts">顧客購入データ</param>
        /// <param name="totalRevenue">総売上</param>
        /// <param name="periodLabel">期間ラベル</param>
        /// <param name="comparison">比較データ</param>
        /// <returns>購入回数サマリー</returns>
        PurchaseCountSummary CalculatePurchaseCountSummary(
            List<CustomerPurchaseData> customerPurchaseCounts, 
            decimal totalRevenue,
            string periodLabel, 
            ComparisonMetrics? comparison = null);

        /// <summary>
        /// 購入回数詳細を計算
        /// </summary>
        /// <param name="currentData">現在期間データ</param>
        /// <param name="previousData">前年同期データ</param>
        /// <param name="request">リクエスト</param>
        /// <returns>購入回数詳細リスト</returns>
        List<PurchaseCountDetail> CalculatePurchaseCountDetails(
            List<CustomerPurchaseData> currentData,
            List<CustomerPurchaseData> previousData,
            PurchaseCountAnalysisRequest request);

        /// <summary>
        /// 購入回数トレンドを計算
        /// </summary>
        /// <param name="customerPurchaseCounts">顧客購入データ</param>
        /// <param name="periodStart">期間開始</param>
        /// <returns>購入回数トレンド</returns>
        PurchaseCountTrend CalculatePurchaseCountTrend(
            List<CustomerPurchaseData> customerPurchaseCounts, 
            DateTime periodStart);

        /// <summary>
        /// 成長率を計算
        /// </summary>
        /// <param name="current">現在データ</param>
        /// <param name="previous">前年データ</param>
        /// <returns>成長率メトリクス</returns>
        GrowthRateMetrics CalculateGrowthRate(BasicMetrics current, BasicMetrics previous);

        /// <summary>
        /// 比較メトリクスを計算
        /// </summary>
        /// <param name="customerPurchaseCounts">顧客購入データ</param>
        /// <param name="totalRevenue">総売上</param>
        /// <param name="comparisonPeriod">比較期間ラベル</param>
        /// <returns>比較メトリクス</returns>
        ComparisonMetrics CalculateComparisonMetrics(
            List<CustomerPurchaseData> customerPurchaseCounts, 
            decimal totalRevenue,
            string comparisonPeriod);

        /// <summary>
        /// 基本メトリクスを計算
        /// </summary>
        /// <param name="customerPurchaseCounts">顧客購入データ</param>
        /// <param name="purchaseCount">対象購入回数</param>
        /// <param name="maxPurchaseCount">最大購入回数</param>
        /// <returns>基本メトリクス</returns>
        BasicMetrics CalculateBasicMetrics(
            List<CustomerPurchaseData> customerPurchaseCounts, 
            int purchaseCount, 
            int maxPurchaseCount);

        /// <summary>
        /// パーセンテージメトリクスを計算
        /// </summary>
        /// <param name="currentMetrics">現在メトリクス</param>
        /// <param name="allCustomerData">全顧客データ</param>
        /// <returns>パーセンテージメトリクス</returns>
        PercentageMetrics CalculatePercentageMetrics(
            BasicMetrics currentMetrics, 
            List<CustomerPurchaseData> allCustomerData);

        /// <summary>
        /// セグメントサマリーを計算
        /// </summary>
        /// <param name="details">詳細データ</param>
        /// <returns>セグメントサマリーメトリクス</returns>
        SegmentSummaryMetrics CalculateSegmentSummary(List<PurchaseCountDetail> details);

        /// <summary>
        /// 詳細分析メトリクスを計算
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <param name="purchaseCount">購入回数</param>
        /// <returns>詳細分析メトリクス</returns>
        Task<DetailedAnalysisMetrics> CalculateDetailedAnalysisMetricsAsync(int storeId, int purchaseCount);
    }
}