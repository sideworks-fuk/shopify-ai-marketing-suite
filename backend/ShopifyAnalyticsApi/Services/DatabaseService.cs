using Microsoft.EntityFrameworkCore;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Helpers;
using System.Globalization;
using System.Text;

namespace ShopifyAnalyticsApi.Services
{
    public class CsvImportResult
    {
        public int ImportedCount { get; set; }
        public int SkippedCount { get; set; }
        public int ErrorCount { get; set; }
        public List<string> Errors { get; set; } = new();
        public Dictionary<string, object> Summary { get; set; } = new();
    }

    public interface IDatabaseService
    {
        Task<IEnumerable<Customer>> GetCustomersAsync();
        Task<Customer?> GetCustomerByIdAsync(int id);
        Task<IEnumerable<Order>> GetOrdersAsync();
        Task<IEnumerable<Product>> GetProductsAsync();
        Task<bool> TestConnectionAsync();
        Task InitializeDatabaseAsync();
        Task<CsvImportResult> ImportCustomersFromCsvAsync(IFormFile csvFile);
    }

    public class DatabaseService : IDatabaseService
    {
        private readonly ShopifyDbContext _context;
        private readonly ILogger<DatabaseService> _logger;

        public DatabaseService(ShopifyDbContext context, ILogger<DatabaseService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<IEnumerable<Customer>> GetCustomersAsync()
        {
            try
            {
                _logger.LogInformation("Fetching customers from database");
                
                using var performanceScope = LoggingHelper.CreatePerformanceScope(_logger, "GetCustomersAsync");
                
                var customers = await _context.Customers
                    .Include(c => c.Orders)
                    .ToListAsync();
                
                _logger.LogInformation("Successfully fetched {CustomerCount} customers from database", customers.Count());
                
                return customers;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching customers from database");
                throw;
            }
        }

        public async Task<Customer?> GetCustomerByIdAsync(int id)
        {
            try
            {
                _logger.LogInformation("Fetching customer {CustomerId} from database", id);
                return await _context.Customers
                    .Include(c => c.Orders)
                    .ThenInclude(o => o.OrderItems)
                    .FirstOrDefaultAsync(c => c.Id == id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching customer {CustomerId} from database", id);
                throw;
            }
        }

        public async Task<IEnumerable<Order>> GetOrdersAsync()
        {
            try
            {
                _logger.LogInformation("Fetching orders from database");
                return await _context.Orders
                    .Include(o => o.Customer)
                    .Include(o => o.OrderItems)
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching orders from database");
                throw;
            }
        }

        public async Task<IEnumerable<Product>> GetProductsAsync()
        {
            try
            {
                _logger.LogInformation("Fetching products from database");
                return await _context.Products.ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching products from database");
                throw;
            }
        }

        public async Task<bool> TestConnectionAsync()
        {
            try
            {
                _logger.LogInformation("Testing database connection");
                await _context.Database.CanConnectAsync();
                
                var customerCount = await _context.Customers.CountAsync();
                _logger.LogInformation("Database connection successful. Customer count: {Count}", customerCount);
                
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Database connection test failed");
                return false;
            }
        }

        public async Task InitializeDatabaseAsync()
        {
            try
            {
                _logger.LogInformation("Initializing database");
                
                // マイグレーションを適用
                await _context.Database.MigrateAsync();
                
                _logger.LogInformation("Database initialization completed");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Database initialization failed");
                throw;
            }
        }

        public async Task<CsvImportResult> ImportCustomersFromCsvAsync(IFormFile csvFile)
        {
            var result = new CsvImportResult();
            var customers = new List<Customer>();

            try
            {
                _logger.LogInformation("Starting CSV import for file: {FileName}", csvFile.FileName);

                using var stream = csvFile.OpenReadStream();
                using var reader = new StreamReader(stream, Encoding.UTF8);
                
                var lines = new List<string>();
                string? line;
                while ((line = await reader.ReadLineAsync()) != null)
                {
                    lines.Add(line);
                }

                if (lines.Count < 2) // ヘッダー + 最低1データ行
                {
                    result.Errors.Add("CSVファイルが空または無効です");
                    return result;
                }

                // ヘッダー行をパース
                var headers = ParseCsvLine(lines[0]);
                _logger.LogInformation("Found {HeaderCount} columns in CSV", headers.Length);

                // 期待されるカラムのマッピング
                var columnMapping = GetColumnMapping(headers);
                
                if (!ValidateRequiredColumns(columnMapping, result))
                {
                    return result;
                }

                // データ行をパース
                for (int i = 1; i < lines.Count; i++)
                {
                    try
                    {
                        var values = ParseCsvLine(lines[i]);
                        if (values.Length != headers.Length)
                        {
                            result.Errors.Add($"行 {i + 1}: カラム数が一致しません（期待: {headers.Length}, 実際: {values.Length}）");
                            result.ErrorCount++;
                            continue;
                        }

                        var customer = ParseCustomerFromCsv(values, columnMapping, i + 1);
                        if (customer != null)
                        {
                            // 重複チェック（Customer IDまたはEmail）
                            var existingCustomer = await _context.Customers
                                .FirstOrDefaultAsync(c => c.Id == customer.Id || c.Email == customer.Email);
                            
                            if (existingCustomer != null)
                            {
                                result.SkippedCount++;
                                continue;
                            }

                            customers.Add(customer);
                        }
                        else
                        {
                            result.ErrorCount++;
                        }
                    }
                    catch (Exception ex)
                    {
                        result.Errors.Add($"行 {i + 1}: パースエラー - {ex.Message}");
                        result.ErrorCount++;
                    }
                }

                // データベースに一括保存
                if (customers.Any())
                {
                    await _context.Customers.AddRangeAsync(customers);
                    await _context.SaveChangesAsync();
                    result.ImportedCount = customers.Count;
                    
                    _logger.LogInformation("Successfully imported {Count} customers", customers.Count);
                }

                // サマリー作成
                result.Summary = new Dictionary<string, object>
                {
                    ["totalRows"] = lines.Count - 1,
                    ["processedRows"] = result.ImportedCount + result.SkippedCount + result.ErrorCount,
                    ["successRate"] = lines.Count > 1 ? (double)result.ImportedCount / (lines.Count - 1) : 0,
                    ["topIndustries"] = customers.GroupBy(c => c.Industry)
                        .Where(g => !string.IsNullOrEmpty(g.Key))
                        .OrderByDescending(g => g.Count())
                        .Take(5)
                        .Select(g => new { Industry = g.Key, Count = g.Count() })
                        .ToList(),
                    ["topRegions"] = customers.GroupBy(c => c.ProvinceCode)
                        .Where(g => !string.IsNullOrEmpty(g.Key))
                        .OrderByDescending(g => g.Count())
                        .Take(5)
                        .Select(g => new { Region = g.Key, Count = g.Count() })
                        .ToList(),
                    ["totalRevenue"] = customers.Sum(c => c.TotalSpent),
                    ["averageOrderValue"] = customers.Where(c => c.TotalOrders > 0)
                        .DefaultIfEmpty()
                        .Average(c => c?.TotalOrders > 0 ? c.TotalSpent / c.TotalOrders : 0),
                    ["highValueCustomers"] = customers.Count(c => c.TotalSpent > 100000)
                };

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "CSV import failed");
                result.Errors.Add($"インポート処理エラー: {ex.Message}");
                result.ErrorCount++;
                return result;
            }
        }

        private string[] ParseCsvLine(string line)
        {
            // 簡易CSVパーサー（CsvHelper使わずに実装）
            var values = new List<string>();
            var current = new StringBuilder();
            bool inQuotes = false;
            
            for (int i = 0; i < line.Length; i++)
            {
                char c = line[i];
                
                if (c == '"')
                {
                    if (inQuotes && i + 1 < line.Length && line[i + 1] == '"')
                    {
                        current.Append('"');
                        i++; // エスケープされた引用符をスキップ
                    }
                    else
                    {
                        inQuotes = !inQuotes;
                    }
                }
                else if (c == ',' && !inQuotes)
                {
                    values.Add(current.ToString());
                    current.Clear();
                }
                else
                {
                    current.Append(c);
                }
            }
            
            values.Add(current.ToString());
            return values.ToArray();
        }

        private Dictionary<string, int> GetColumnMapping(string[] headers)
        {
            var mapping = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            
            for (int i = 0; i < headers.Length; i++)
            {
                var header = headers[i].Trim();
                mapping[header] = i;
            }
            
            return mapping;
        }

        private bool ValidateRequiredColumns(Dictionary<string, int> columnMapping, CsvImportResult result)
        {
            var requiredColumns = new[] 
            { 
                "Customer ID", 
                "First Name", 
                "Last Name", 
                "Email", 
                "Total Spent", 
                "Total Orders" 
            };

            foreach (var column in requiredColumns)
            {
                if (!columnMapping.ContainsKey(column))
                {
                    result.Errors.Add($"必須カラム '{column}' が見つかりません");
                }
            }

            return result.Errors.Count == 0;
        }

        private Customer? ParseCustomerFromCsv(string[] values, Dictionary<string, int> columnMapping, int lineNumber)
        {
            try
            {
                var customer = new Customer();

                // 必須フィールド
                customer.Id = GetIntValue(values, columnMapping, "Customer ID");
                customer.FirstName = GetStringValue(values, columnMapping, "First Name") ?? "不明";
                customer.LastName = GetStringValue(values, columnMapping, "Last Name") ?? "不明";
                customer.Email = GetStringValue(values, columnMapping, "Email") ?? $"unknown-{customer.Id}@example.com";

                // 住所情報
                customer.Company = GetStringValue(values, columnMapping, "Default Address Company");
                customer.City = GetStringValue(values, columnMapping, "Default Address City");
                customer.ProvinceCode = GetStringValue(values, columnMapping, "Default Address Province Code");
                customer.CountryCode = GetStringValue(values, columnMapping, "Default Address Country Code");
                customer.Phone = GetStringValue(values, columnMapping, "Phone");
                customer.AddressPhone = GetStringValue(values, columnMapping, "Default Address Phone");

                // マーケティング設定
                customer.AcceptsEmailMarketing = GetBoolValue(values, columnMapping, "Accepts Email Marketing");
                customer.AcceptsSMSMarketing = GetBoolValue(values, columnMapping, "Accepts SMS Marketing");

                // 購買統計
                customer.TotalSpent = GetDecimalValue(values, columnMapping, "Total Spent");
                customer.TotalOrders = GetIntValue(values, columnMapping, "Total Orders");

                // 顧客属性
                customer.TaxExempt = GetBoolValue(values, columnMapping, "Tax Exempt");
                customer.Tags = GetStringValue(values, columnMapping, "Tags");

                // Metafields
                customer.CompanyStoreName = GetStringValue(values, columnMapping, "会社名 または 店舗名 (customer.metafields.orig_fields.company_store)");
                customer.Industry = GetStringValue(values, columnMapping, "業種名 (customer.metafields.orig_fields.industry)");

                // システム日時
                customer.CreatedAt = DateTime.UtcNow;
                customer.UpdatedAt = DateTime.UtcNow;

                // 互換性フィールド
                customer.OrdersCount = customer.TotalOrders; // 非推奨だが互換性のため

                return customer;
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Failed to parse customer at line {LineNumber}: {Error}", lineNumber, ex.Message);
                return null;
            }
        }

        private string? GetStringValue(string[] values, Dictionary<string, int> mapping, string columnName)
        {
            if (!mapping.TryGetValue(columnName, out int index) || index >= values.Length)
                return null;
            
            var value = values[index]?.Trim();
            return string.IsNullOrEmpty(value) ? null : value;
        }

        private int GetIntValue(string[] values, Dictionary<string, int> mapping, string columnName)
        {
            var stringValue = GetStringValue(values, mapping, columnName);
            return int.TryParse(stringValue, out int result) ? result : 0;
        }

        private decimal GetDecimalValue(string[] values, Dictionary<string, int> mapping, string columnName)
        {
            var stringValue = GetStringValue(values, mapping, columnName);
            return decimal.TryParse(stringValue, NumberStyles.Currency, CultureInfo.InvariantCulture, out decimal result) ? result : 0;
        }

        private bool GetBoolValue(string[] values, Dictionary<string, int> mapping, string columnName)
        {
            var stringValue = GetStringValue(values, mapping, columnName);
            if (string.IsNullOrEmpty(stringValue)) return false;
            
            return stringValue.Equals("true", StringComparison.OrdinalIgnoreCase) ||
                   stringValue.Equals("yes", StringComparison.OrdinalIgnoreCase) ||
                   stringValue.Equals("1", StringComparison.OrdinalIgnoreCase);
        }
    }
} 