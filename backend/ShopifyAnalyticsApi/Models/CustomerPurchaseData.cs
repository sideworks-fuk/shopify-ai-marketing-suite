namespace ShopifyAnalyticsApi.Models
{
    /// <summary>
    /// 顧客購入データクラス
    /// </summary>
    public class CustomerPurchaseData
    {
        public int CustomerId { get; set; }
        public int PurchaseCount { get; set; }
        public decimal TotalAmount { get; set; }
        public int OrderCount { get; set; }
    }
}