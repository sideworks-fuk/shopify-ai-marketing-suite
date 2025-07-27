using ShopifyAnalyticsApi.Models;

namespace ShopifyAnalyticsApi.Services
{
    public interface IMockDataService
    {
        CustomerDashboardData GetCustomerDashboardData();
        List<CustomerDetail> GetCustomerDetails();
        CustomerDetail? GetCustomerDetail(string customerId);
        List<CustomerSegment> GetCustomerSegments();
        List<TopCustomer> GetTopCustomers();
    }

    public class MockDataService : IMockDataService
    {
        private readonly List<string> _productNames = new()
        {
            "カットケーキ箱 No.2（4.5寸）白無地",
            "デコ箱 TSD No.1 白無地",
            "パウンドケーキ箱 No.3 クラフト",
            "ギフトボックス レッド リボン付き",
            "透明バッグ Mサイズ",
            "プラトレー 丸型 5号",
            "紙トレー 角型 白",
            "ダンボール 宅配60サイズ",
            "保冷剤 ソフトタイプ 25g",
            "紙袋 ブラウン Lサイズ"
        };

        private readonly List<string> _categories = new()
        {
            "デコ箱・ケーキ系",
            "パウンドケーキ箱",
            "ギフト・包装材",
            "プラトレー・紙トレー",
            "配送・保冷材"
        };

        public CustomerDashboardData GetCustomerDashboardData()
        {
            return new CustomerDashboardData
            {
                CustomerSegments = GetCustomerSegments(),
                CustomerAcquisition = GetCustomerAcquisitions(),
                CustomerLifetimeValue = GetCustomerLifetimeValues(),
                TopCustomers = GetTopCustomers(),
                PurchaseFrequencies = GetPurchaseFrequencies(),
                CustomerDetails = GetCustomerDetails()
            };
        }

        public List<CustomerSegment> GetCustomerSegments()
        {
            return new List<CustomerSegment>
            {
                new() { Name = "新規顧客", Value = 35, Color = "#3b82f6" },
                new() { Name = "リピーター", Value = 45, Color = "#10b981" },
                new() { Name = "VIP顧客", Value = 15, Color = "#f59e0b" },
                new() { Name = "休眠顧客", Value = 5, Color = "#ef4444" }
            };
        }

        public List<CustomerAcquisition> GetCustomerAcquisitions()
        {
            return new List<CustomerAcquisition>
            {
                new() { Month = "1月", NewCustomers = 120, Cost = 45000 },
                new() { Month = "2月", NewCustomers = 135, Cost = 52000 },
                new() { Month = "3月", NewCustomers = 158, Cost = 48000 },
                new() { Month = "4月", NewCustomers = 142, Cost = 51000 },
                new() { Month = "5月", NewCustomers = 167, Cost = 49000 },
                new() { Month = "6月", NewCustomers = 189, Cost = 53000 }
            };
        }

        public List<CustomerLifetimeValue> GetCustomerLifetimeValues()
        {
            return new List<CustomerLifetimeValue>
            {
                new() { Segment = "新規", Ltv = 15000, Orders = 1.2m },
                new() { Segment = "リピーター", Ltv = 45000, Orders = 3.8m },
                new() { Segment = "VIP", Ltv = 120000, Orders = 8.5m },
                new() { Segment = "休眠", Ltv = 8000, Orders = 0.8m }
            };
        }

        public List<TopCustomer> GetTopCustomers()
        {
            return new List<TopCustomer>
            {
                new() { Id = "C001", Name = "パティスリー・ラ・シュエット", TotalSpent = 450000, Orders = 12, LastOrder = "2024-03-15", Segment = "VIP" },
                new() { Id = "C002", Name = "菓子工房マリエット", TotalSpent = 380000, Orders = 9, LastOrder = "2024-03-18", Segment = "VIP" },
                new() { Id = "C003", Name = "カフェ・ミラージュ", TotalSpent = 320000, Orders = 8, LastOrder = "2024-03-20", Segment = "リピーター" },
                new() { Id = "C004", Name = "洋菓子店エトワール", TotalSpent = 280000, Orders = 7, LastOrder = "2024-03-12", Segment = "リピーター" },
                new() { Id = "C005", Name = "手作りお菓子工房クローバー", TotalSpent = 250000, Orders = 6, LastOrder = "2024-03-22", Segment = "リピーター" }
            };
        }

        public List<PurchaseFrequency> GetPurchaseFrequencies()
        {
            return new List<PurchaseFrequency>
            {
                new() { Frequency = "1回", Current = 1500, Previous = 1200 },
                new() { Frequency = "2回", Current = 800, Previous = 750 },
                new() { Frequency = "3回", Current = 450, Previous = 520 },
                new() { Frequency = "4回", Current = 280, Previous = 290 },
                new() { Frequency = "5回", Current = 180, Previous = 200 }
            };
        }

        public List<CustomerDetail> GetCustomerDetails()
        {
            return new List<CustomerDetail>
            {
                new()
                {
                    Id = "12345",
                    Name = "パティスリー・ノースター",
                    PurchaseCount = 15,
                    TotalAmount = 450000,
                    Frequency = 2.5m,
                    AvgInterval = 14,
                    TopProduct = GetRandomProductName(),
                    Status = "VIP",
                    LastOrderDate = new DateTime(2024, 5, 20),
                    TopProducts = GetTopProductsByCategory(new[] { "デコ箱・ケーキ系", "パウンドケーキ箱", "ギフト・包装材" }),
                    ProductCategories = new List<string> { "デコ箱・ケーキ系", "パウンドケーキ箱", "ギフト・包装材" },
                    RepeatProducts = 3
                },
                new()
                {
                    Id = "12346",
                    Name = "スイーツハウス・ベルファーム",
                    PurchaseCount = 8,
                    TotalAmount = 180000,
                    Frequency = 1.8m,
                    AvgInterval = 20,
                    TopProduct = GetRandomProductName(),
                    Status = "リピーター",
                    LastOrderDate = new DateTime(2024, 5, 15),
                    TopProducts = GetTopProductsByCategory(new[] { "プラトレー・紙トレー", "ギフト・包装材" }),
                    ProductCategories = new List<string> { "プラトレー・紙トレー", "ギフト・包装材" },
                    RepeatProducts = 2
                },
                new()
                {
                    Id = "12347",
                    Name = "ケーキ工房・ミルフィーユ",
                    PurchaseCount = 3,
                    TotalAmount = 75000,
                    Frequency = 0.8m,
                    AvgInterval = 45,
                    TopProduct = GetRandomProductName(),
                    Status = "新規",
                    LastOrderDate = new DateTime(2024, 5, 10),
                    TopProducts = GetTopProductsByCategory(new[] { "デコ箱・ケーキ系" }),
                    ProductCategories = new List<string> { "デコ箱・ケーキ系" },
                    RepeatProducts = 1
                },
                new()
                {
                    Id = "12348",
                    Name = "カフェ・コトリノート",
                    PurchaseCount = 8,
                    TotalAmount = 230000,
                    Frequency = 1.5m,
                    AvgInterval = 21,
                    TopProduct = GetRandomProductName(),
                    Status = "リピーター",
                    LastOrderDate = new DateTime(2024, 5, 18),
                    TopProducts = GetTopProductsByCategory(new[] { "配送・保冷材", "デコ箱・ケーキ系", "ギフト・包装材" }),
                    ProductCategories = new List<string> { "配送・保冷材", "デコ箱・ケーキ系", "ギフト・包装材" },
                    RepeatProducts = 2
                },
                new()
                {
                    Id = "12349",
                    Name = "洋菓子アトリエ・ルシオル",
                    PurchaseCount = 2,
                    TotalAmount = 45000,
                    Frequency = 0.5m,
                    AvgInterval = 60,
                    TopProduct = GetRandomProductName(),
                    Status = "リピーター",
                    LastOrderDate = new DateTime(2024, 3, 25),
                    TopProducts = GetTopProductsByCategory(new[] { "パウンドケーキ箱" }),
                    ProductCategories = new List<string> { "パウンドケーキ箱" },
                    RepeatProducts = 0
                },
                new()
                {
                    Id = "12350",
                    Name = "お菓子工房・コリーヌ",
                    PurchaseCount = 0,
                    TotalAmount = 35000,
                    Frequency = 0,
                    AvgInterval = 180,
                    TopProduct = GetRandomProductName(),
                    Status = "休眠",
                    LastOrderDate = new DateTime(2023, 12, 5),
                    TopProducts = GetTopProductsByCategory(new[] { "ギフト・包装材" }),
                    ProductCategories = new List<string> { "ギフト・包装材" },
                    RepeatProducts = 0
                }
            };
        }

        public CustomerDetail? GetCustomerDetail(string customerId)
        {
            return GetCustomerDetails().FirstOrDefault(c => c.Id == customerId);
        }

        private string GetRandomProductName()
        {
            var random = new Random();
            return _productNames[random.Next(_productNames.Count)];
        }

        private List<ProductInfo> GetTopProductsByCategory(string[] categories)
        {
            var random = new Random();
            var products = new List<ProductInfo>();

            foreach (var category in categories.Take(3)) // 最大3カテゴリ
            {
                products.Add(new ProductInfo
                {
                    Name = GetRandomProductName(),
                    Count = random.Next(1, 9),
                    Percentage = random.Next(10, 51),
                    Category = category,
                    IsRepeat = random.NextDouble() > 0.3
                });
            }

            return products;
        }
    }
} 