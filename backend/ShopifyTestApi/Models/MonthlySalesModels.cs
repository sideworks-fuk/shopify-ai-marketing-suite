using System.ComponentModel.DataAnnotations;

namespace ShopifyTestApi.Models
{
    /// <summary>
    /// 月別売上統計リクエストDTO
    /// </summary>
    public class MonthlySalesRequest
    {
        /// <summary>
        /// ストアID（マルチストア対応）
        /// </summary>
        public int StoreId { get; set; } = 1;

        /// <summary>
        /// 開始年
        /// </summary>
        [Range(2020, 2030)]
        public int StartYear { get; set; } = DateTime.Now.Year;

        /// <summary>
        /// 開始月
        /// </summary>
        [Range(1, 12)]
        public int StartMonth { get; set; } = 1;

        /// <summary>
        /// 終了年
        /// </summary>
        [Range(2020, 2030)]
        public int EndYear { get; set; } = DateTime.Now.Year;

        /// <summary>
        /// 終了月
        /// </summary>
        [Range(1, 12)]
        public int EndMonth { get; set; } = DateTime.Now.Month;

        /// <summary>
        /// 商品IDリスト（指定しない場合は全商品）
        /// </summary>
        public List<string>? ProductIds { get; set; }

        /// <summary>
        /// 表示モード: quantity, amount, both
        /// </summary>
        public string DisplayMode { get; set; } = "both";

        /// <summary>
        /// 商品数制限（パフォーマンス対策）
        /// </summary>
        [Range(1, 1000)]
        public int? MaxProducts { get; set; } = 100;

        /// <summary>
        /// カテゴリフィルター
        /// </summary>
        public string? CategoryFilter { get; set; }

        /// <summary>
        /// 最小売上金額フィルター
        /// </summary>
        public decimal? MinAmount { get; set; }
    }

    /// <summary>
    /// 月別売上統計レスポンスDTO
    /// </summary>
    public class MonthlySalesResponse
    {
        /// <summary>
        /// 商品別月次データ
        /// </summary>
        public List<ProductMonthlySalesData> Products { get; set; } = new();

        /// <summary>
        /// サマリー統計
        /// </summary>
        public MonthlySalesSummary Summary { get; set; } = new();

        /// <summary>
        /// 分析メタデータ
        /// </summary>
        public MonthlySalesMetadata Metadata { get; set; } = new();
    }

    /// <summary>
    /// 商品別月次売上データ
    /// </summary>
    public class ProductMonthlySalesData
    {
        /// <summary>
        /// 商品ID
        /// </summary>
        public string Id { get; set; } = string.Empty;

        /// <summary>
        /// 商品名
        /// </summary>
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// 商品カテゴリ
        /// </summary>
        public string Category { get; set; } = string.Empty;

        /// <summary>
        /// 商品ハンドル（URL用）
        /// </summary>
        public string? Handle { get; set; }

        /// <summary>
        /// 月別データ（Key: "YYYY-MM"）
        /// </summary>
        public Dictionary<string, ProductMonthlyData> MonthlyData { get; set; } = new();

        /// <summary>
        /// 期間合計データ
        /// </summary>
        public ProductTotalData Total { get; set; } = new();
    }

    /// <summary>
    /// 月別商品データ
    /// </summary>
    public class ProductMonthlyData
    {
        /// <summary>
        /// 販売数量
        /// </summary>
        public int Quantity { get; set; }

        /// <summary>
        /// 売上金額
        /// </summary>
        public decimal Amount { get; set; }

        /// <summary>
        /// 注文件数
        /// </summary>
        public int OrderCount { get; set; }

        /// <summary>
        /// 平均単価
        /// </summary>
        public decimal AveragePrice => Quantity > 0 ? Amount / Quantity : 0;
    }

    /// <summary>
    /// 商品合計データ
    /// </summary>
    public class ProductTotalData
    {
        /// <summary>
        /// 総販売数量
        /// </summary>
        public int TotalQuantity { get; set; }

        /// <summary>
        /// 総売上金額
        /// </summary>
        public decimal TotalAmount { get; set; }

        /// <summary>
        /// 総注文件数
        /// </summary>
        public int TotalOrderCount { get; set; }

        /// <summary>
        /// 期間平均売上（月あたり）
        /// </summary>
        public decimal MonthlyAverage { get; set; }

        /// <summary>
        /// 成長率（%）
        /// </summary>
        public decimal GrowthRate { get; set; }

        /// <summary>
        /// 売上構成比（%）
        /// </summary>
        public decimal SalesRatio { get; set; }
    }

    /// <summary>
    /// 月別売上サマリー
    /// </summary>
    public class MonthlySalesSummary
    {
        /// <summary>
        /// 分析期間
        /// </summary>
        public AnalysisPeriod Period { get; set; } = new();

        /// <summary>
        /// 総売上金額
        /// </summary>
        public decimal TotalAmount { get; set; }

        /// <summary>
        /// 総販売数量
        /// </summary>
        public int TotalQuantity { get; set; }

        /// <summary>
        /// 月平均売上
        /// </summary>
        public decimal MonthlyAverage { get; set; }

        /// <summary>
        /// 対象商品数
        /// </summary>
        public int ProductCount { get; set; }

        /// <summary>
        /// 最大売上月
        /// </summary>
        public string? PeakMonth { get; set; }

        /// <summary>
        /// 最大売上金額
        /// </summary>
        public decimal PeakAmount { get; set; }

        /// <summary>
        /// 最小売上月
        /// </summary>
        public string? LowestMonth { get; set; }

        /// <summary>
        /// 最小売上金額
        /// </summary>
        public decimal LowestAmount { get; set; }

        /// <summary>
        /// 成長率（%）
        /// </summary>
        public decimal GrowthRate { get; set; }

        /// <summary>
        /// 季節性指数
        /// </summary>
        public decimal SeasonalityIndex { get; set; }
    }

    /// <summary>
    /// 分析期間
    /// </summary>
    public class AnalysisPeriod
    {
        /// <summary>
        /// 開始年
        /// </summary>
        public int StartYear { get; set; }

        /// <summary>
        /// 開始月
        /// </summary>
        public int StartMonth { get; set; }

        /// <summary>
        /// 終了年
        /// </summary>
        public int EndYear { get; set; }

        /// <summary>
        /// 終了月
        /// </summary>
        public int EndMonth { get; set; }

        /// <summary>
        /// 月数
        /// </summary>
        public int MonthCount { get; set; }

        /// <summary>
        /// 開始日
        /// </summary>
        public DateTime StartDate => new DateTime(StartYear, StartMonth, 1);

        /// <summary>
        /// 終了日
        /// </summary>
        public DateTime EndDate => new DateTime(EndYear, EndMonth, DateTime.DaysInMonth(EndYear, EndMonth));
    }

    /// <summary>
    /// 分析メタデータ
    /// </summary>
    public class MonthlySalesMetadata
    {
        /// <summary>
        /// 分析実行日時
        /// </summary>
        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// データソース
        /// </summary>
        public string DataSource { get; set; } = "database";

        /// <summary>
        /// 計算時間（ミリ秒）
        /// </summary>
        public long CalculationTimeMs { get; set; }

        /// <summary>
        /// 処理レコード数
        /// </summary>
        public int ProcessedRecords { get; set; }

        /// <summary>
        /// データ品質
        /// </summary>
        public string DataQuality { get; set; } = "Good";

        /// <summary>
        /// 警告メッセージ
        /// </summary>
        public List<string> Warnings { get; set; } = new();

        /// <summary>
        /// フィルター条件
        /// </summary>
        public Dictionary<string, object> Filters { get; set; } = new();
    }

    /// <summary>
    /// 月別売上傾向データ（季節性分析用）
    /// </summary>
    public class MonthlySalesTrend
    {
        /// <summary>
        /// 月（1-12）
        /// </summary>
        public int Month { get; set; }

        /// <summary>
        /// 月名
        /// </summary>
        public string MonthName { get; set; } = string.Empty;

        /// <summary>
        /// 平均売上金額
        /// </summary>
        public decimal AverageAmount { get; set; }

        /// <summary>
        /// 売上指数（年平均を100とした場合）
        /// </summary>
        public decimal SalesIndex { get; set; }

        /// <summary>
        /// トレンド方向
        /// </summary>
        public string TrendDirection { get; set; } = "Stable"; // "Up", "Down", "Stable"
    }

    /// <summary>
    /// カテゴリ別売上サマリー
    /// </summary>
    public class CategorySalesSummary
    {
        /// <summary>
        /// カテゴリ名
        /// </summary>
        public string Category { get; set; } = string.Empty;

        /// <summary>
        /// 商品数
        /// </summary>
        public int ProductCount { get; set; }

        /// <summary>
        /// 総売上金額
        /// </summary>
        public decimal TotalAmount { get; set; }

        /// <summary>
        /// 構成比（%）
        /// </summary>
        public decimal Percentage { get; set; }

        /// <summary>
        /// 成長率（%）
        /// </summary>
        public decimal GrowthRate { get; set; }
    }

    /// <summary>
    /// 売上統計計算用の中間データ
    /// </summary>
    public class SalesCalculationData
    {
        public string ProductId { get; set; } = string.Empty;
        public string ProductTitle { get; set; } = string.Empty;
        public string ProductType { get; set; } = string.Empty;
        public string ProductHandle { get; set; } = string.Empty;
        public int Year { get; set; }
        public int Month { get; set; }
        public int Quantity { get; set; }
        public decimal Amount { get; set; }
        public int OrderCount { get; set; }
    }
}