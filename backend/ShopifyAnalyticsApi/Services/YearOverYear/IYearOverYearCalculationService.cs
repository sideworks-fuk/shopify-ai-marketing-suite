using ShopifyAnalyticsApi.Models;

namespace ShopifyAnalyticsApi.Services.YearOverYear
{
    /// <summary>
    /// 前年同月比計算サービスのインターフェース
    /// 責任範囲: 成長率計算・ビジネスロジック
    /// </summary>
    public interface IYearOverYearCalculationService
    {
        /// <summary>
        /// 商品データを処理して前年比データを生成
        /// </summary>
        /// <param name="rawData">生データ</param>
        /// <param name="request">リクエスト</param>
        /// <param name="currentYear">現在年</param>
        /// <param name="previousYear">前年</param>
        /// <returns>前年比商品データリスト</returns>
        List<YearOverYearProductData> ProcessProductData(
            List<OrderItemAnalysisData> rawData, 
            YearOverYearRequest request, 
            int currentYear, 
            int previousYear);

        /// <summary>
        /// 月次比較データを作成
        /// </summary>
        /// <param name="productData">商品データ</param>
        /// <param name="request">リクエスト</param>
        /// <param name="currentYear">現在年</param>
        /// <param name="previousYear">前年</param>
        /// <returns>月次比較データリスト</returns>
        List<MonthlyComparisonData> CreateMonthlyData(
            List<ProductAggregateData> productData, 
            YearOverYearRequest request, 
            int currentYear, 
            int previousYear);

        /// <summary>
        /// 成長率を計算
        /// </summary>
        /// <param name="current">現在値</param>
        /// <param name="previous">前年値</param>
        /// <returns>成長率（パーセント）</returns>
        decimal CalculateGrowthRate(decimal current, decimal previous);

        /// <summary>
        /// 成長カテゴリを判定
        /// </summary>
        /// <param name="growthRate">成長率</param>
        /// <returns>成長カテゴリ</returns>
        string DetermineGrowthCategory(decimal growthRate);

        /// <summary>
        /// 商品合計データを計算
        /// </summary>
        /// <param name="monthlyData">月次データ</param>
        /// <param name="viewMode">表示モード</param>
        /// <returns>商品合計データ</returns>
        ProductAggregateData CalculateProductTotals(List<ProductMonthlyData> monthlyData, string viewMode);
    }

    /// <summary>
    /// 商品集計データ
    /// </summary>
    public class ProductAggregateData
    {
        public string ProductName { get; set; } = string.Empty;
        public string ProductType { get; set; } = string.Empty;
        public string Vendor { get; set; } = string.Empty;
        public decimal CurrentYearValue { get; set; }
        public decimal PreviousYearValue { get; set; }
        public List<ProductMonthlyData> MonthlyData { get; set; } = new();
    }

    /// <summary>
    /// 商品月次データ
    /// </summary>
    public class ProductMonthlyData
    {
        public int Month { get; set; }
        public decimal CurrentYearRevenue { get; set; }
        public decimal PreviousYearRevenue { get; set; }
        public int CurrentYearQuantity { get; set; }
        public int PreviousYearQuantity { get; set; }
        public int CurrentYearOrders { get; set; }
        public int PreviousYearOrders { get; set; }
    }
}