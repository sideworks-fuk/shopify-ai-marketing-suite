namespace DatabaseFunction.Models
{
    public class OrderStatistics
    {
        public int OrderCount { get; set; }
        public int UniqueCustomers { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal AverageOrderValue { get; set; }
        public decimal MaxOrderValue { get; set; }
        public decimal MinOrderValue { get; set; }
    }

    public class TopProduct
    {
        public string ProductTitle { get; set; } = string.Empty;
        public int OrderCount { get; set; }
        public int TotalQuantity { get; set; }
        public decimal TotalRevenue { get; set; }
    }

    public class CustomerSummary
    {
        public int TotalCustomers { get; set; }
        public int RepeatCustomers { get; set; }
        public int OneTimeCustomers { get; set; }
        public int EmailSubscribers { get; set; }
        public decimal AverageCustomerValue { get; set; }
        public decimal RepeatCustomerRate => TotalCustomers > 0 
            ? (decimal)RepeatCustomers / TotalCustomers * 100 
            : 0;
    }
}