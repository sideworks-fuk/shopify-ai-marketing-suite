namespace ShopifyTestApi.Services
{
    /// <summary>
    /// 顧客購入データクラス（内部使用）
    /// </summary>
    internal class CustomerPurchaseData
    {
        public int CustomerId { get; set; }
        public int PurchaseCount { get; set; }
        public decimal TotalAmount { get; set; }
        public int OrderCount { get; set; }
    }
}