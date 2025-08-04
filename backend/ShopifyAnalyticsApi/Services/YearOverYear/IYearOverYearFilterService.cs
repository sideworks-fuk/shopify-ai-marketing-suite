using ShopifyAnalyticsApi.Models;

namespace ShopifyAnalyticsApi.Services.YearOverYear
{
    /// <summary>
    /// 前年同月比フィルターサービスのインターフェース
    /// 責任範囲: フィルタリング・集約・ソート
    /// </summary>
    public interface IYearOverYearFilterService
    {
        /// <summary>
        /// フィルターとソートを適用
        /// </summary>
        /// <param name="products">商品データリスト</param>
        /// <param name="request">リクエスト</param>
        /// <returns>フィルター・ソート済み商品データリスト</returns>
        List<YearOverYearProductData> ApplyFiltersAndSorting(List<YearOverYearProductData> products, YearOverYearRequest request);

        /// <summary>
        /// サマリー統計を計算
        /// </summary>
        /// <param name="products">商品データリスト</param>
        /// <param name="currentYear">現在年</param>
        /// <param name="previousYear">前年</param>
        /// <param name="viewMode">表示モード</param>
        /// <returns>サマリー統計</returns>
        YearOverYearSummary CalculateSummary(List<YearOverYearProductData> products, int currentYear, int previousYear, string viewMode);

        /// <summary>
        /// 表示モードに応じた値を取得
        /// </summary>
        /// <param name="data">商品集計データ</param>
        /// <param name="viewMode">表示モード</param>
        /// <param name="isCurrentYear">現在年フラグ</param>
        /// <returns>値</returns>
        decimal GetValueByMode(YearOverYearProductData data, string viewMode, bool isCurrentYear);

        /// <summary>
        /// 成長カテゴリ別の統計を取得
        /// </summary>
        /// <param name="products">商品データリスト</param>
        /// <returns>成長カテゴリ別統計</returns>
        Dictionary<string, CategoryStats> GetCategoryStats(List<YearOverYearProductData> products);
    }

}