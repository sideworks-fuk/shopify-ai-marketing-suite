using System;
using System.Collections.Generic;
using System.Data;
using Microsoft.Data.SqlClient;
using System.Threading.Tasks;
using CsvHelper;
using System.IO;
using System.Globalization;
using System.Linq;
using CsvHelper.Configuration;
using ShopifyDataAnonymizer.Models;

namespace ShopifyDataAnonymizer.Services
{
    public class ImportService
    {
        private readonly string _connectionString;

        public ImportService(string connectionString)
        {
            if (string.IsNullOrEmpty(connectionString))
            {
                throw new ArgumentNullException(nameof(connectionString), "接続文字列がnullまたは空です。");
            }
            _connectionString = connectionString;
        }

        public async Task ImportCustomers(string csvFilePath)
        {
            using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            using var reader = new StreamReader(csvFilePath);
            using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);
            var records = csv.GetRecords<dynamic>();

            using var transaction = connection.BeginTransaction();
            try
            {
                foreach (var record in records)
                {
                    var command = connection.CreateCommand();
                    command.Transaction = transaction;
                    command.CommandText = @"
                        INSERT INTO Customers (
                            CustomerId, FirstName, LastName, Email, AcceptsEmailMarketing,
                            CompanyName, Address1, Address2, City, ProvinceCode,
                            CountryCode, ZipCode, Phone, TotalSpent, TotalOrders
                        ) VALUES (
                            @CustomerId, @FirstName, @LastName, @Email, @AcceptsEmailMarketing,
                            @CompanyName, @Address1, @Address2, @City, @ProvinceCode,
                            @CountryCode, @ZipCode, @Phone, @TotalSpent, @TotalOrders
                        )";

                    command.Parameters.AddWithValue("@CustomerId", record["Customer ID"]);
                    command.Parameters.AddWithValue("@FirstName", string.IsNullOrEmpty(record["First Name"]) ? DBNull.Value : record["First Name"]);
                    command.Parameters.AddWithValue("@LastName", string.IsNullOrEmpty(record["Last Name"]) ? DBNull.Value : record["Last Name"]);
                    command.Parameters.AddWithValue("@Email", string.IsNullOrEmpty(record["Email"]) ? DBNull.Value : record["Email"]);
                    command.Parameters.AddWithValue("@AcceptsEmailMarketing", string.IsNullOrEmpty(record["Accepts Email Marketing"]) ? DBNull.Value : record["Accepts Email Marketing"]);
                    command.Parameters.AddWithValue("@CompanyName", string.IsNullOrEmpty(record["Default Address Company"]) ? DBNull.Value : record["Default Address Company"]);
                    command.Parameters.AddWithValue("@Address1", string.IsNullOrEmpty(record["Default Address Address1"]) ? DBNull.Value : record["Default Address Address1"]);
                    command.Parameters.AddWithValue("@Address2", string.IsNullOrEmpty(record["Default Address Address2"]) ? DBNull.Value : record["Default Address Address2"]);
                    command.Parameters.AddWithValue("@City", string.IsNullOrEmpty(record["Default Address City"]) ? DBNull.Value : record["Default Address City"]);
                    command.Parameters.AddWithValue("@ProvinceCode", string.IsNullOrEmpty(record["Default Address Province Code"]) ? DBNull.Value : record["Default Address Province Code"]);
                    command.Parameters.AddWithValue("@CountryCode", string.IsNullOrEmpty(record["Default Address Country Code"]) ? DBNull.Value : record["Default Address Country Code"]);
                    command.Parameters.AddWithValue("@ZipCode", string.IsNullOrEmpty(record["Default Address Zip"]) ? DBNull.Value : record["Default Address Zip"]);
                    command.Parameters.AddWithValue("@Phone", string.IsNullOrEmpty(record["Phone"]) ? DBNull.Value : record["Phone"]);
                    command.Parameters.AddWithValue("@TotalSpent", string.IsNullOrEmpty(record["Total Spent"]) ? DBNull.Value : record["Total Spent"]);
                    command.Parameters.AddWithValue("@TotalOrders", string.IsNullOrEmpty(record["Total Orders"]) ? DBNull.Value : record["Total Orders"]);

                    await command.ExecuteNonQueryAsync();
                }

                await transaction.CommitAsync();
                Console.WriteLine("顧客データのインポートが完了しました。");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                throw new Exception($"顧客データのインポート中にエラーが発生しました: {ex.Message}", ex);
            }
        }

        public async Task ImportProducts(string csvFilePath)
        {
            try
            {
                using var reader = new StreamReader(csvFilePath, System.Text.Encoding.UTF8);
                var config = new CsvConfiguration(CultureInfo.InvariantCulture)
                {
                    HasHeaderRecord = true,
                    HeaderValidated = null,
                    MissingFieldFound = null
                };

                using var csv = new CsvReader(reader, config);
                csv.Context.RegisterClassMap<ProductMap>();
                var records = csv.GetRecords<Product>().ToList();

                using var connection = new SqlConnection(_connectionString);
                await connection.OpenAsync();
                using var transaction = connection.BeginTransaction();

                try
                {
                    foreach (var product in records)
                    {
                        var command = new SqlCommand(@"
                            INSERT INTO Products (
                                Handle, Title, BodyHtml, Vendor, ProductCategory, Type, Tags, Published,
                                Option1Name, Option1Value, Option2Name, Option2Value, Option3Name, Option3Value,
                                VariantSKU, VariantGrams, VariantInventoryTracker, VariantInventoryPolicy,
                                VariantFulfillmentService, VariantPrice, VariantCompareAtPrice,
                                VariantRequiresShipping, VariantTaxable, VariantBarcode,
                                ImageSrc, ImagePosition, ImageAltText, GiftCard,
                                SEOTitle, SEODescription, GoogleShoppingGoogleProductCategory,
                                ProductFunction, Material, Size, Color, FoodProductForm, UserType,
                                ComplementaryProducts, RelatedProducts, RelatedProductsDisplay,
                                ProductSearchBoostQueries, Status
                            ) VALUES (
                                @Handle, @Title, @BodyHtml, @Vendor, @ProductCategory, @Type, @Tags, @Published,
                                @Option1Name, @Option1Value, @Option2Name, @Option2Value, @Option3Name, @Option3Value,
                                @VariantSKU, @VariantGrams, @VariantInventoryTracker, @VariantInventoryPolicy,
                                @VariantFulfillmentService, @VariantPrice, @VariantCompareAtPrice,
                                @VariantRequiresShipping, @VariantTaxable, @VariantBarcode,
                                @ImageSrc, @ImagePosition, @ImageAltText, @GiftCard,
                                @SEOTitle, @SEODescription, @GoogleShoppingGoogleProductCategory,
                                @ProductFunction, @Material, @Size, @Color, @FoodProductForm, @UserType,
                                @ComplementaryProducts, @RelatedProducts, @RelatedProductsDisplay,
                                @ProductSearchBoostQueries, @Status
                            )", connection, transaction);

                        // nullableプロパティの安全なアクセス
                        command.Parameters.AddWithValue("@Handle", product.Handle);
                        command.Parameters.AddWithValue("@Title", product.Title);
                        command.Parameters.AddWithValue("@BodyHtml", (object?)product.BodyHtml ?? DBNull.Value);
                        command.Parameters.AddWithValue("@Vendor", (object?)product.Vendor ?? DBNull.Value);
                        command.Parameters.AddWithValue("@ProductCategory", (object?)product.ProductCategory ?? DBNull.Value);
                        command.Parameters.AddWithValue("@Type", (object?)product.Type ?? DBNull.Value);
                        command.Parameters.AddWithValue("@Tags", (object?)product.Tags ?? DBNull.Value);
                        command.Parameters.AddWithValue("@Published", (object?)product.Published ?? DBNull.Value);

                        command.Parameters.AddWithValue("@Option1Name", (object?)product.Option1Name ?? DBNull.Value);
                        command.Parameters.AddWithValue("@Option1Value", (object?)product.Option1Value ?? DBNull.Value);
                        command.Parameters.AddWithValue("@Option2Name", (object?)product.Option2Name ?? DBNull.Value);
                        command.Parameters.AddWithValue("@Option2Value", (object?)product.Option2Value ?? DBNull.Value);
                        command.Parameters.AddWithValue("@Option3Name", (object?)product.Option3Name ?? DBNull.Value);
                        command.Parameters.AddWithValue("@Option3Value", (object?)product.Option3Value ?? DBNull.Value);

                        command.Parameters.AddWithValue("@VariantSKU", (object?)product.VariantSku ?? DBNull.Value);
                        command.Parameters.AddWithValue("@VariantGrams", (object?)product.VariantGrams ?? DBNull.Value);
                        command.Parameters.AddWithValue("@VariantInventoryTracker", (object?)product.VariantInventoryTracker ?? DBNull.Value);
                        command.Parameters.AddWithValue("@VariantInventoryPolicy", (object?)product.VariantInventoryPolicy ?? DBNull.Value);
                        command.Parameters.AddWithValue("@VariantFulfillmentService", (object?)product.VariantFulfillmentService ?? DBNull.Value);
                        command.Parameters.AddWithValue("@VariantPrice", (object?)product.VariantPrice ?? DBNull.Value);
                        command.Parameters.AddWithValue("@VariantCompareAtPrice", (object?)product.VariantCompareAtPrice ?? DBNull.Value);
                        command.Parameters.AddWithValue("@VariantRequiresShipping", (object?)product.VariantRequiresShipping ?? DBNull.Value);
                        command.Parameters.AddWithValue("@VariantTaxable", (object?)product.VariantTaxable ?? DBNull.Value);
                        command.Parameters.AddWithValue("@VariantBarcode", (object?)product.VariantBarcode ?? DBNull.Value);

                        command.Parameters.AddWithValue("@ImageSrc", (object?)product.ImageSrc ?? DBNull.Value);
                        command.Parameters.AddWithValue("@ImagePosition", (object?)product.ImagePosition ?? DBNull.Value);
                        command.Parameters.AddWithValue("@ImageAltText", (object?)product.ImageAltText ?? DBNull.Value);
                        command.Parameters.AddWithValue("@GiftCard", (object?)product.GiftCard ?? DBNull.Value);

                        command.Parameters.AddWithValue("@SEOTitle", (object?)product.SeoTitle ?? DBNull.Value);
                        command.Parameters.AddWithValue("@SEODescription", (object?)product.SeoDescription ?? DBNull.Value);
                        command.Parameters.AddWithValue("@GoogleShoppingGoogleProductCategory", (object?)product.GoogleShoppingProductCategory ?? DBNull.Value);

                        // メタフィールド
                        command.Parameters.AddWithValue("@ProductFunction", (object?)product.Function ?? DBNull.Value);
                        command.Parameters.AddWithValue("@Material", (object?)product.Material ?? DBNull.Value);
                        command.Parameters.AddWithValue("@Size", (object?)product.Size ?? DBNull.Value);
                        command.Parameters.AddWithValue("@Color", (object?)product.ColorPattern ?? DBNull.Value);
                        command.Parameters.AddWithValue("@FoodProductForm", (object?)product.FoodProductForm ?? DBNull.Value);
                        command.Parameters.AddWithValue("@UserType", (object?)product.UserType ?? DBNull.Value);
                        command.Parameters.AddWithValue("@ComplementaryProducts", (object?)product.ComplementaryProducts ?? DBNull.Value);
                        command.Parameters.AddWithValue("@RelatedProducts", (object?)product.RelatedProducts ?? DBNull.Value);
                        command.Parameters.AddWithValue("@RelatedProductsDisplay", (object?)product.RelatedProductsDisplay ?? DBNull.Value);
                        command.Parameters.AddWithValue("@ProductSearchBoostQueries", (object?)product.ProductSearchBoost ?? DBNull.Value);
                        command.Parameters.AddWithValue("@Status", (object?)product.Status ?? DBNull.Value);

                        try
                        {
                            await command.ExecuteNonQueryAsync();
                        }
                        catch (SqlException ex)
                        {
                            Console.WriteLine($"レコードの挿入中にエラーが発生しました: {ex.Message}");
                            Console.WriteLine($"問題のレコード: Handle={product.Handle}, Title={product.Title}");
                            throw;
                        }
                    }

                    await transaction.CommitAsync();
                    Console.WriteLine($"正常にインポートが完了しました。処理件数: {records.Count}件");
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    throw new Exception($"データベースへの挿入中にエラーが発生しました: {ex.Message}", ex);
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"CSVファイルの読み込み中にエラーが発生しました: {ex.Message}", ex);
            }
        }

        /// <summary>
        /// ShopifyTestApi用の商品インポート（簡素化版）
        /// </summary>
        public async Task ImportProductsForTestApi(string csvFilePath)
        {
            try
            {
                using var reader = new StreamReader(csvFilePath, System.Text.Encoding.UTF8);
                var config = new CsvConfiguration(CultureInfo.InvariantCulture)
                {
                    HasHeaderRecord = true,
                    HeaderValidated = null,
                    MissingFieldFound = null
                };

                using var csv = new CsvReader(reader, config);
                csv.Context.RegisterClassMap<ProductMap>();
                var records = csv.GetRecords<Product>().ToList();

                using var connection = new SqlConnection(_connectionString);
                await connection.OpenAsync();
                using var transaction = connection.BeginTransaction();

                try
                {
                    int importedCount = 0;
                    int skippedCount = 0;
                    var processedTitles = new HashSet<string>();
                    
                    foreach (var product in records)
                    {
                        // 空のタイトルはスキップ
                        if (string.IsNullOrWhiteSpace(product.Title))
                        {
                            skippedCount++;
                            continue;
                        }
                        
                        // 重複チェック（同一タイトル）
                        if (processedTitles.Contains(product.Title))
                        {
                            skippedCount++;
                            continue;
                        }
                        processedTitles.Add(product.Title);
                        
                        var command = new SqlCommand(@"
                            INSERT INTO Products (
                                Title, Description, Price, Currency,
                                Category, Vendor, ProductType, InventoryQuantity,
                                CreatedAt, UpdatedAt
                            ) VALUES (
                                @Title, @Description, @Price, @Currency,
                                @Category, @Vendor, @ProductType, @InventoryQuantity,
                                @CreatedAt, @UpdatedAt
                            )", connection, transaction);

                        // 基本情報
                        command.Parameters.AddWithValue("@Title", (object?)product.Title ?? DBNull.Value);
                        command.Parameters.AddWithValue("@Description", (object?)product.BodyHtml ?? DBNull.Value);
                        
                        // 価格の処理（文字列から数値への変換）
                        decimal price = 0;
                        if (!string.IsNullOrWhiteSpace(product.VariantPrice))
                        {
                            if (decimal.TryParse(product.VariantPrice.Replace(",", ""), out decimal parsedPrice))
                            {
                                price = parsedPrice;
                            }
                        }
                        command.Parameters.AddWithValue("@Price", price);
                        command.Parameters.AddWithValue("@Currency", "JPY");
                        
                        // カテゴリ情報
                        command.Parameters.AddWithValue("@Category", (object?)product.ProductCategory ?? DBNull.Value);
                        command.Parameters.AddWithValue("@Vendor", (object?)product.Vendor ?? DBNull.Value);
                        command.Parameters.AddWithValue("@ProductType", (object?)product.Type ?? DBNull.Value);
                        
                        // 在庫情報（とりあえず100に設定）
                        command.Parameters.AddWithValue("@InventoryQuantity", 100);
                        
                        // 日付情報
                        command.Parameters.AddWithValue("@CreatedAt", DateTime.UtcNow);
                        command.Parameters.AddWithValue("@UpdatedAt", DateTime.UtcNow);

                        await command.ExecuteNonQueryAsync();
                        importedCount++;
                    }

                    await transaction.CommitAsync();
                    Console.WriteLine($"商品データのインポートが完了しました。");
                    Console.WriteLine($"  - インポート: {importedCount}件");
                    Console.WriteLine($"  - スキップ: {skippedCount}件（空タイトル/重複）");
                    Console.WriteLine($"  - 合計: {records.Count}件");
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    throw new Exception($"データベースへの挿入中にエラーが発生しました: {ex.Message}", ex);
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"CSVファイルの読み込み中にエラーが発生しました: {ex.Message}", ex);
            }
        }

        /// <summary>
        /// ShopifyTestApi用の商品インポート（バリアント対応版）
        /// </summary>
        public async Task ImportProductsWithVariantsForTestApi(string csvFilePath, int storeId = 1)
        {
            try
            {
                using var reader = new StreamReader(csvFilePath, System.Text.Encoding.UTF8);
                var config = new CsvConfiguration(CultureInfo.InvariantCulture)
                {
                    HasHeaderRecord = true,
                    HeaderValidated = null,
                    MissingFieldFound = null
                };

                using var csv = new CsvReader(reader, config);
                csv.Context.RegisterClassMap<ProductMap>();
                var records = csv.GetRecords<Product>().ToList();

                using var connection = new SqlConnection(_connectionString);
                await connection.OpenAsync();
                using var transaction = connection.BeginTransaction();

                try
                {
                    int productCount = 0;
                    int variantCount = 0;
                    var processedHandles = new Dictionary<string, int>(); // Handle -> ProductId

                    foreach (var record in records)
                    {
                        // Handleが空の場合はスキップ
                        if (string.IsNullOrWhiteSpace(record.Handle))
                        {
                            continue;
                        }

                        int productId;
                        if (!processedHandles.ContainsKey(record.Handle))
                        {
                            // 最初のレコードで商品を挿入（Titleが空でも構わない）
                            var insertProductCmd = new SqlCommand(@"
                                INSERT INTO Products (
                                    StoreId, Handle, Title, Description, Vendor, ProductType, Category, 
                                    InventoryQuantity, CreatedAt, UpdatedAt
                                ) OUTPUT INSERTED.Id VALUES (
                                    @StoreId, @Handle, @Title, @Description, @Vendor, @ProductType, @Category,
                                    @InventoryQuantity, @CreatedAt, @UpdatedAt
                                )", connection, transaction);

                            insertProductCmd.Parameters.AddWithValue("@StoreId", storeId);
                            insertProductCmd.Parameters.AddWithValue("@Handle", record.Handle);
                            insertProductCmd.Parameters.AddWithValue("@Title", (object?)record.Title ?? DBNull.Value);
                            insertProductCmd.Parameters.AddWithValue("@Description", (object?)record.BodyHtml ?? DBNull.Value);
                            insertProductCmd.Parameters.AddWithValue("@Vendor", (object?)record.Vendor ?? DBNull.Value);
                            insertProductCmd.Parameters.AddWithValue("@ProductType", (object?)record.Type ?? DBNull.Value);
                            insertProductCmd.Parameters.AddWithValue("@Category", (object?)record.ProductCategory ?? DBNull.Value);
                            insertProductCmd.Parameters.AddWithValue("@InventoryQuantity", 100); // 固定値
                            insertProductCmd.Parameters.AddWithValue("@CreatedAt", DateTime.UtcNow);
                            insertProductCmd.Parameters.AddWithValue("@UpdatedAt", DateTime.UtcNow);

                            productId = (int)await insertProductCmd.ExecuteScalarAsync();
                            processedHandles[record.Handle] = productId;
                            productCount++;
                        }
                        else
                        {
                            productId = processedHandles[record.Handle];
                        }

                        // Insert ProductVariant
                        var insertVariantCmd = new SqlCommand(@"
                            INSERT INTO ProductVariants (
                                ProductId, Sku, Price, CompareAtPrice, InventoryQuantity,
                                Option1Name, Option1Value, Option2Name, Option2Value, Option3Name, Option3Value,
                                Barcode, Weight, WeightUnit, RequiresShipping, Taxable, CreatedAt, UpdatedAt
                            ) VALUES (
                                @ProductId, @Sku, @Price, @CompareAtPrice, @InventoryQuantity,
                                @Option1Name, @Option1Value, @Option2Name, @Option2Value, @Option3Name, @Option3Value,
                                @Barcode, @Weight, @WeightUnit, @RequiresShipping, @Taxable, @CreatedAt, @UpdatedAt
                            )", connection, transaction);

                        insertVariantCmd.Parameters.AddWithValue("@ProductId", productId);
                        insertVariantCmd.Parameters.AddWithValue("@Sku", (object?)record.VariantSku ?? DBNull.Value);
                        
                        // 価格の処理
                        decimal price = 0;
                        if (!string.IsNullOrWhiteSpace(record.VariantPrice))
                        {
                            decimal.TryParse(record.VariantPrice.Replace(",", ""), out price);
                        }
                        insertVariantCmd.Parameters.AddWithValue("@Price", price);
                        
                        decimal? comparePrice = null;
                        if (!string.IsNullOrWhiteSpace(record.VariantCompareAtPrice))
                        {
                            if (decimal.TryParse(record.VariantCompareAtPrice.Replace(",", ""), out decimal parsed))
                                comparePrice = parsed;
                        }
                        insertVariantCmd.Parameters.AddWithValue("@CompareAtPrice", (object?)comparePrice ?? DBNull.Value);
                        
                        insertVariantCmd.Parameters.AddWithValue("@InventoryQuantity", 100); // 仮値
                        
                        // オプション
                        insertVariantCmd.Parameters.AddWithValue("@Option1Name", (object?)record.Option1Name ?? DBNull.Value);
                        insertVariantCmd.Parameters.AddWithValue("@Option1Value", (object?)record.Option1Value ?? DBNull.Value);
                        insertVariantCmd.Parameters.AddWithValue("@Option2Name", (object?)record.Option2Name ?? DBNull.Value);
                        insertVariantCmd.Parameters.AddWithValue("@Option2Value", (object?)record.Option2Value ?? DBNull.Value);
                        insertVariantCmd.Parameters.AddWithValue("@Option3Name", (object?)record.Option3Name ?? DBNull.Value);
                        insertVariantCmd.Parameters.AddWithValue("@Option3Value", (object?)record.Option3Value ?? DBNull.Value);
                        
                        insertVariantCmd.Parameters.AddWithValue("@Barcode", (object?)record.VariantBarcode ?? DBNull.Value);
                        
                        // 重量
                        decimal? weight = null;
                        if (!string.IsNullOrWhiteSpace(record.VariantGrams))
                        {
                            if (decimal.TryParse(record.VariantGrams, out decimal grams))
                                weight = grams / 1000; // グラムからキログラムへ
                        }
                        insertVariantCmd.Parameters.AddWithValue("@Weight", (object?)weight ?? DBNull.Value);
                        insertVariantCmd.Parameters.AddWithValue("@WeightUnit", (object?)record.VariantWeightUnit ?? "kg");
                        
                        // ブール値
                        bool requiresShipping = record.VariantRequiresShipping?.ToLower() != "false";
                        bool taxable = record.VariantTaxable?.ToLower() != "false";
                        insertVariantCmd.Parameters.AddWithValue("@RequiresShipping", requiresShipping);
                        insertVariantCmd.Parameters.AddWithValue("@Taxable", taxable);
                        
                        insertVariantCmd.Parameters.AddWithValue("@CreatedAt", DateTime.UtcNow);
                        insertVariantCmd.Parameters.AddWithValue("@UpdatedAt", DateTime.UtcNow);

                        await insertVariantCmd.ExecuteNonQueryAsync();
                        variantCount++;
                    }

                    await transaction.CommitAsync();
                    Console.WriteLine($"商品とバリアントのインポートが完了しました。");
                    Console.WriteLine($"  - 商品数: {productCount}件");
                    Console.WriteLine($"  - バリアント数: {variantCount}件");
                    Console.WriteLine($"  - CSVレコード数: {records.Count}件");
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    throw new Exception($"データベースへの挿入中にエラーが発生しました: {ex.Message}", ex);
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"CSVファイルの読み込み中にエラーが発生しました: {ex.Message}", ex);
            }
        }

        public async Task ImportOrders(string csvFilePath, int storeId = 1)
        {
            try
            {
                using var reader = new StreamReader(csvFilePath, System.Text.Encoding.UTF8);
                var config = new CsvConfiguration(CultureInfo.InvariantCulture)
                {
                    HasHeaderRecord = true,
                    HeaderValidated = null,
                    MissingFieldFound = null
                };

                using var csv = new CsvReader(reader, config);
                csv.Context.RegisterClassMap<OrderMap>();
                var records = csv.GetRecords<Order>().ToList();

                using var connection = new SqlConnection(_connectionString);
                await connection.OpenAsync();
                using var transaction = connection.BeginTransaction();

                try
                {
                    int processedCount = 0;
                    int currentOrderId = 0;
                    Order? currentOrder = null;
                    string? currentOrderNumber = null;

                    foreach (var record in records)
                    {
                        // 新しい注文かどうかを判定（注文番号が変わった場合）
                        bool isNewOrder = !string.IsNullOrWhiteSpace(record.OrderId) && record.OrderId != currentOrderNumber;

                        if (isNewOrder)
                        {
                            // 新しい注文を開始
                            currentOrder = record;
                            currentOrderNumber = record.OrderId;
                            currentOrderId = await InsertOrder(connection, transaction, record, storeId);
                            processedCount++;
                        }

                        // 常にOrderItemを作成（注文ごとに商品明細を作成）
                        if (currentOrder != null && !string.IsNullOrWhiteSpace(record.LineitemName))
                        {
                            try
                            {
                                var orderItem = new OrderItem
                                {
                                    Quantity = record.LineitemQuantity ?? 1,
                                    Name = record.LineitemName,
                                    Price = record.LineitemPrice ?? 0m,
                                    CompareAtPrice = record.LineitemCompareAtPrice,
                                    SKU = record.LineitemSku ?? string.Empty,
                                    RequiresShipping = record.LineitemRequiresShipping,
                                    Taxable = record.LineitemTaxable
                                };

                                await InsertOrderItem(connection, transaction, currentOrderId, orderItem);
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"警告: 注文明細の挿入に失敗しました。OrderId: {currentOrderId}, エラー: {ex.Message}");
                            }
                        }
                        
                        // 進捗状況の表示（10%ごと）
                        if (processedCount % Math.Max(1, (int)Math.Floor(records.Count / 10.0)) == 0)
                        {
                            int percentage = (int)Math.Round((processedCount / (double)records.Count) * 100);
                            Console.WriteLine($"処理中... {percentage}% 完了 ({processedCount} / {records.Count})");
                        }
                    }

                    await transaction.CommitAsync();
                    Console.WriteLine($"正常にインポートが完了しました。処理件数: {processedCount}件");
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    throw new Exception($"データベースへの挿入中にエラーが発生しました: {ex.Message}", ex);
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"CSVファイルの読み込み中にエラーが発生しました: {ex.Message}", ex);
            }
        }

        private async Task<int> InsertOrder(SqlConnection connection, SqlTransaction transaction, Order order, int storeId)
        {
            var sql = @"
            INSERT INTO Orders (
                StoreId, OrderNumber, CustomerId, TotalPrice, SubtotalPrice, TaxPrice, 
                Currency, Status, CreatedAt, UpdatedAt
            ) VALUES (
                @StoreId, @OrderNumber, @CustomerId, @TotalPrice, @SubtotalPrice, @TaxPrice,
                @Currency, @Status, @CreatedAt, @UpdatedAt
            );
            SELECT CAST(SCOPE_IDENTITY() as int)";

            using var command = new SqlCommand(sql, connection, transaction);

            // 顧客IDを取得（メールアドレスで検索）
            int customerId = 1; // デフォルト値
            if (!string.IsNullOrWhiteSpace(order.Email))
            {
                var customerCmd = new SqlCommand("SELECT Id FROM Customers WHERE Email = @Email AND StoreId = @StoreId", connection, transaction);
                customerCmd.Parameters.AddWithValue("@Email", order.Email);
                customerCmd.Parameters.AddWithValue("@StoreId", storeId);
                var customerResult = await customerCmd.ExecuteScalarAsync();
                if (customerResult != null && customerResult != DBNull.Value)
                {
                    customerId = (int)customerResult;
                }
            }

            // OrderNumberの生成
            string orderNumber;
            if (!string.IsNullOrWhiteSpace(order.OrderId))
            {
                orderNumber = order.OrderId;
            }
            else
            {
                // OrderIdが空の場合は、タイムスタンプベースのユニークな番号を生成
                orderNumber = $"ORD-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid().ToString("N").Substring(0, 8)}";
            }

            // パラメータの設定
            command.Parameters.AddWithValue("@StoreId", storeId);
            command.Parameters.AddWithValue("@OrderNumber", orderNumber);
            command.Parameters.AddWithValue("@CustomerId", customerId);
            command.Parameters.AddWithValue("@TotalPrice", (object?)order.Total ?? 0m);
            command.Parameters.AddWithValue("@SubtotalPrice", (object?)order.Subtotal ?? 0m);
            command.Parameters.AddWithValue("@TaxPrice", (object?)order.Taxes ?? 0m);
            command.Parameters.AddWithValue("@Currency", (object?)order.Currency ?? "JPY");
            command.Parameters.AddWithValue("@Status", GetOrderStatus(order.FinancialStatus, order.FulfillmentStatus));
            command.Parameters.AddWithValue("@CreatedAt", (object?)order.CreatedAt ?? DateTime.UtcNow);
            command.Parameters.AddWithValue("@UpdatedAt", DateTime.UtcNow);

            var result = await command.ExecuteScalarAsync();

            if (result == null || result == DBNull.Value)
            {
                throw new InvalidOperationException("SCOPE_IDENTITY() の結果が null です。");
            }

            return (int)result;
        }

        private string GetOrderStatus(string? financialStatus, string? fulfillmentStatus)
        {
            if (string.IsNullOrWhiteSpace(financialStatus))
                return "pending";

            return financialStatus.ToLower() switch
            {
                "paid" => "completed",
                "pending" => "pending", 
                "partially_paid" => "partially_paid",
                "refunded" => "refunded",
                "partially_refunded" => "partially_refunded",
                "cancelled" => "cancelled",
                "voided" => "voided",
                "authorized" => "authorized",
                _ => "pending"
            };
        }

        private async Task InsertOrderItem(SqlConnection connection, SqlTransaction transaction, int orderId, OrderItem item)
        {
            // 商品タイトルの優先順位
            // 1. CSVの"Lineitem name"（最優先）
            // 2. データベースから取得した商品タイトル（SKU検索）
            // 3. "不明な商品"（フォールバック）
            string productTitle = "不明な商品";
            string? productHandle = null;
            string? productVendor = null;
            string? productType = null;
            string? variantTitle = null;
            decimal? compareAtPrice = null;
            string? option1Name = null;
            string? option1Value = null;
            string? option2Name = null;
            string? option2Value = null;
            string? option3Name = null;
            string? option3Value = null;
            bool requiresShipping = true;
            bool taxable = true;
            
            // まずCSVの"Lineitem name"をチェック（最優先）
            if (!string.IsNullOrWhiteSpace(item.Name))
            {
                productTitle = item.Name;
                Console.WriteLine($"✅ CSVから商品名を取得: {productTitle}");
            }
            
            // SKUが存在する場合は、データベースから詳細情報を取得
            if (!string.IsNullOrWhiteSpace(item.SKU))
            {
                var productCmd = new SqlCommand(@"
                    SELECT p.Title, p.Handle, p.Vendor, p.ProductType, pv.Option1Name, pv.Option1Value,
                           pv.Option2Name, pv.Option2Value, pv.Option3Name, pv.Option3Value,
                           pv.CompareAtPrice, pv.RequiresShipping, pv.Taxable
                    FROM ProductVariants pv 
                    INNER JOIN Products p ON pv.ProductId = p.Id 
                    WHERE pv.Sku = @Sku AND p.StoreId = @StoreId", connection, transaction);
                productCmd.Parameters.AddWithValue("@Sku", item.SKU);
                productCmd.Parameters.AddWithValue("@StoreId", 1); // デフォルトストアID
                
                using var reader = await productCmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    // CSVに商品名がない場合のみ、データベースの商品タイトルを使用
                    if (string.IsNullOrWhiteSpace(item.Name))
                    {
                        productTitle = reader.GetString(0);
                        Console.WriteLine($"✅ データベースから商品名を取得: {productTitle}");
                    }
                    
                    productHandle = reader.IsDBNull(1) ? null : reader.GetString(1);
                    productVendor = reader.IsDBNull(2) ? null : reader.GetString(2);
                    productType = reader.IsDBNull(3) ? null : reader.GetString(3);
                    option1Name = reader.IsDBNull(4) ? null : reader.GetString(4);
                    option1Value = reader.IsDBNull(5) ? null : reader.GetString(5);
                    option2Name = reader.IsDBNull(6) ? null : reader.GetString(6);
                    option2Value = reader.IsDBNull(7) ? null : reader.GetString(7);
                    option3Name = reader.IsDBNull(8) ? null : reader.GetString(8);
                    option3Value = reader.IsDBNull(9) ? null : reader.GetString(9);
                    compareAtPrice = reader.IsDBNull(10) ? null : reader.GetDecimal(10);
                    requiresShipping = reader.GetBoolean(11);
                    taxable = reader.GetBoolean(12);
                    
                    // バリアントタイトルを生成
                    var options = new List<string>();
                    if (!string.IsNullOrEmpty(option1Value)) options.Add(option1Value);
                    if (!string.IsNullOrEmpty(option2Value)) options.Add(option2Value);
                    if (!string.IsNullOrEmpty(option3Value)) options.Add(option3Value);
                    variantTitle = options.Any() ? string.Join(" / ", options) : null;
                }
                reader.Close();
            }
            
            // 追加の設定（CSVデータを優先）
            if (item.CompareAtPrice.HasValue && compareAtPrice == null)
            {
                compareAtPrice = item.CompareAtPrice;
            }
            if (item.RequiresShipping == "true" || item.RequiresShipping == "false")
            {
                requiresShipping = item.RequiresShipping == "true";
            }
            if (item.Taxable == "true" || item.Taxable == "false")
            {
                taxable = item.Taxable == "true";
            }
            
            // 最終確認
            if (string.IsNullOrWhiteSpace(productTitle))
            {
                productTitle = "不明な商品";
                Console.WriteLine("⚠️ 商品名を取得できませんでした。フォールバック値を使用します。");
            }

            var sql = @"
            INSERT INTO OrderItems (
                OrderId, ProductTitle, ProductHandle, ProductVendor, ProductType, Sku, VariantTitle,
                Price, CompareAtPrice, Quantity, TotalPrice, Option1Name, Option1Value, Option2Name, Option2Value,
                Option3Name, Option3Value, RequiresShipping, Taxable, CreatedAt, UpdatedAt
            ) VALUES (
                @OrderId, @ProductTitle, @ProductHandle, @ProductVendor, @ProductType, @Sku, @VariantTitle,
                @Price, @CompareAtPrice, @Quantity, @TotalPrice, @Option1Name, @Option1Value, @Option2Name, @Option2Value,
                @Option3Name, @Option3Value, @RequiresShipping, @Taxable, @CreatedAt, @UpdatedAt
            )";

            using var command = new SqlCommand(sql, connection, transaction);

            command.Parameters.AddWithValue("@OrderId", orderId);
            command.Parameters.AddWithValue("@ProductTitle", productTitle);
            command.Parameters.AddWithValue("@ProductHandle", (object?)productHandle ?? DBNull.Value);
            command.Parameters.AddWithValue("@ProductVendor", (object?)productVendor ?? DBNull.Value);
            command.Parameters.AddWithValue("@ProductType", (object?)productType ?? DBNull.Value);
            command.Parameters.AddWithValue("@Sku", (object?)item.SKU ?? DBNull.Value);
            command.Parameters.AddWithValue("@VariantTitle", (object?)variantTitle ?? DBNull.Value);
            command.Parameters.AddWithValue("@Price", (object?)item.Price ?? 0m);
            command.Parameters.AddWithValue("@CompareAtPrice", (object?)compareAtPrice ?? DBNull.Value);
            command.Parameters.AddWithValue("@Quantity", item.Quantity);
            command.Parameters.AddWithValue("@TotalPrice", (object?)(item.Price * item.Quantity) ?? 0m);
            command.Parameters.AddWithValue("@Option1Name", (object?)option1Name ?? DBNull.Value);
            command.Parameters.AddWithValue("@Option1Value", (object?)option1Value ?? DBNull.Value);
            command.Parameters.AddWithValue("@Option2Name", (object?)option2Name ?? DBNull.Value);
            command.Parameters.AddWithValue("@Option2Value", (object?)option2Value ?? DBNull.Value);
            command.Parameters.AddWithValue("@Option3Name", (object?)option3Name ?? DBNull.Value);
            command.Parameters.AddWithValue("@Option3Value", (object?)option3Value ?? DBNull.Value);
            command.Parameters.AddWithValue("@RequiresShipping", requiresShipping);
            command.Parameters.AddWithValue("@Taxable", taxable);
            command.Parameters.AddWithValue("@CreatedAt", DateTime.UtcNow);
            command.Parameters.AddWithValue("@UpdatedAt", DateTime.UtcNow);

            await command.ExecuteNonQueryAsync();
        }

        private async Task InsertOrderAddress(SqlConnection connection, SqlTransaction transaction, int orderId, OrderAddress address, string type)
        {
            var sql = @"
            INSERT INTO OrderAddresses (
                OrderId, AddressType, Name, Street, Address1, Address2,
                Company, City, Zip, Province, ProvinceName, Country, Phone
            ) VALUES (
                @OrderId, @AddressType, @Name, @Street, @Address1, @Address2,
                @Company, @City, @Zip, @Province, @ProvinceName, @Country, @Phone
            )";

            using var command = new SqlCommand(sql, connection, transaction);

            command.Parameters.AddWithValue("@OrderId", orderId);
            command.Parameters.AddWithValue("@AddressType", type);
            command.Parameters.AddWithValue("@Name", (object?)address.Name ?? DBNull.Value);
            command.Parameters.AddWithValue("@Street", (object?)address.Street ?? DBNull.Value);
            command.Parameters.AddWithValue("@Address1", (object?)address.Address1 ?? DBNull.Value);
            command.Parameters.AddWithValue("@Address2", (object?)address.Address2 ?? DBNull.Value);
            command.Parameters.AddWithValue("@Company", DBNull.Value);
            command.Parameters.AddWithValue("@City", (object?)address.City ?? DBNull.Value);
            command.Parameters.AddWithValue("@Zip", (object?)address.Zip ?? DBNull.Value);
            command.Parameters.AddWithValue("@Province", (object?)address.Province ?? DBNull.Value);
            command.Parameters.AddWithValue("@ProvinceName", DBNull.Value);
            command.Parameters.AddWithValue("@Country", (object?)address.Country ?? DBNull.Value);
            command.Parameters.AddWithValue("@Phone", (object?)address.Phone ?? DBNull.Value);

            await command.ExecuteNonQueryAsync();
        }

        public async Task ImportAnonymizedCustomers(string csvFilePath, int storeId = 1)
        {
            try
            {
                using var reader = new StreamReader(csvFilePath, System.Text.Encoding.UTF8);
                var config = new CsvConfiguration(CultureInfo.InvariantCulture)
                {
                    HasHeaderRecord = true,
                    HeaderValidated = null,
                    MissingFieldFound = null
                };

                using var csv = new CsvReader(reader, config);
                csv.Context.RegisterClassMap<CustomerMap>();

                var records = csv.GetRecords<Customer>().ToList();

                using var connection = new SqlConnection(_connectionString);
                await connection.OpenAsync();
                using var transaction = connection.BeginTransaction();

                try
                {
                    foreach (var customer in records)
                    {
                        var command = connection.CreateCommand();
                        command.Transaction = transaction;
                        command.CommandText = @"
                        INSERT INTO Customers (
                            StoreId, ShopifyCustomerId, FirstName, LastName, Email, Phone,
                            Company, City, ProvinceCode, CountryCode,
                            AddressPhone, AcceptsEmailMarketing, AcceptsSMSMarketing,
                            TotalSpent, TotalOrders, OrdersCount, TaxExempt, Tags,
                            CompanyStoreName, Industry, CustomerSegment, CreatedAt, UpdatedAt
                        ) VALUES (
                            @StoreId, @ShopifyCustomerId, @FirstName, @LastName, @Email, @Phone,
                            @Company, @City, @ProvinceCode, @CountryCode,
                            @AddressPhone, @AcceptsEmailMarketing, @AcceptsSMSMarketing,
                            @TotalSpent, @TotalOrders, @OrdersCount, @TaxExempt, @Tags,
                            @CompanyStoreName, @Industry, @CustomerSegment, @CreatedAt, @UpdatedAt
                        )";

                        // ShopifyTestApiのテーブル構造に合わせてパラメータを設定
                        command.Parameters.AddWithValue("@StoreId", storeId);
                        command.Parameters.AddWithValue("@ShopifyCustomerId", (object?)customer.CustomerId ?? DBNull.Value);
                        // 必須フィールドのデフォルト値設定
                        command.Parameters.AddWithValue("@FirstName", string.IsNullOrEmpty(customer.FirstName) ? "Unknown" : customer.FirstName);
                        command.Parameters.AddWithValue("@LastName", string.IsNullOrEmpty(customer.LastName) ? "Customer" : customer.LastName);
                        command.Parameters.AddWithValue("@Email", string.IsNullOrEmpty(customer.Email) ? $"unknown{customer.CustomerId}@example.com" : customer.Email);
                        command.Parameters.AddWithValue("@Phone", (object?)customer.Phone ?? DBNull.Value);
                        command.Parameters.AddWithValue("@Company", (object?)customer.DefaultAddressCompany ?? DBNull.Value);
                        command.Parameters.AddWithValue("@City", (object?)customer.DefaultAddressCity ?? DBNull.Value);
                        command.Parameters.AddWithValue("@ProvinceCode", (object?)customer.DefaultAddressProvinceCode ?? DBNull.Value);
                        command.Parameters.AddWithValue("@CountryCode", (object?)customer.DefaultAddressCountryCode ?? DBNull.Value);
                        command.Parameters.AddWithValue("@AddressPhone", (object?)customer.DefaultAddressPhone ?? DBNull.Value);
                        
                        // ブール値の変換
                        bool acceptsEmail = customer.AcceptsEmailMarketing?.ToLower() == "yes" || customer.AcceptsEmailMarketing?.ToLower() == "true";
                        bool acceptsSMS = customer.AcceptsSMSMarketing?.ToLower() == "yes" || customer.AcceptsSMSMarketing?.ToLower() == "true";
                        bool taxExempt = customer.TaxExempt?.ToLower() == "yes" || customer.TaxExempt?.ToLower() == "true";
                        
                        command.Parameters.AddWithValue("@AcceptsEmailMarketing", acceptsEmail);
                        command.Parameters.AddWithValue("@AcceptsSMSMarketing", acceptsSMS);
                        // TotalSpentもデフォルト値0を設定
                        command.Parameters.AddWithValue("@TotalSpent", customer.TotalSpent ?? 0m);
                        // TotalOrdersはNOT NULL制約があるため、nullの場合は0を設定
                        command.Parameters.AddWithValue("@TotalOrders", customer.TotalOrders ?? 0);
                        // OrdersCountも同様に0をデフォルト値として設定
                        command.Parameters.AddWithValue("@OrdersCount", customer.TotalOrders ?? 0); // 互換性のため
                        command.Parameters.AddWithValue("@TaxExempt", taxExempt);
                        command.Parameters.AddWithValue("@Tags", (object?)customer.Tags ?? DBNull.Value);
                        command.Parameters.AddWithValue("@CompanyStoreName", (object?)customer.CompanyStoreName ?? DBNull.Value);
                        command.Parameters.AddWithValue("@Industry", (object?)customer.Industry ?? DBNull.Value);
                        
                        // CustomerSegmentを計算（購買行動に基づく分類）
                        // nullセーフな計算
                        int totalOrders = customer.TotalOrders ?? 0;
                        decimal totalSpent = customer.TotalSpent ?? 0m;
                        
                        string customerSegment = "新規顧客";
                        if (totalOrders >= 10 || totalSpent >= 100000)
                        {
                            customerSegment = "VIP顧客";
                        }
                        else if (totalOrders >= 2)
                        {
                            customerSegment = "リピーター";
                        }
                        
                        command.Parameters.AddWithValue("@CustomerSegment", customerSegment);
                        command.Parameters.AddWithValue("@CreatedAt", (object?)customer.CreatedAt ?? DateTime.UtcNow);
                        command.Parameters.AddWithValue("@UpdatedAt", (object?)customer.UpdatedAt ?? DateTime.UtcNow);

                        await command.ExecuteNonQueryAsync();
                    }

                    await transaction.CommitAsync();
                    Console.WriteLine($"正常にインポートが完了しました。処理件数: {records.Count}件");
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    throw new Exception($"データベースへの挿入中にエラーが発生しました: {ex.Message}", ex);
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"CSVファイルの読み込み中にエラーが発生しました: {ex.Message}", ex);
            }
        }

        public async Task CheckDatabaseRecords()
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                await connection.OpenAsync();

                // 商品数を確認
                var productCountCmd = new SqlCommand("SELECT COUNT(*) FROM Products WHERE StoreId = 1", connection);
                var productCount = await productCountCmd.ExecuteScalarAsync();

                // バリアント数を確認
                var variantCountCmd = new SqlCommand("SELECT COUNT(*) FROM ProductVariants", connection);
                var variantCount = await variantCountCmd.ExecuteScalarAsync();

                // 顧客数を確認
                var customerCountCmd = new SqlCommand("SELECT COUNT(*) FROM Customers WHERE StoreId = 1", connection);
                var customerCount = await customerCountCmd.ExecuteScalarAsync();

                // 注文数を確認
                var orderCountCmd = new SqlCommand("SELECT COUNT(*) FROM Orders WHERE StoreId = 1", connection);
                var orderCount = await orderCountCmd.ExecuteScalarAsync();

                Console.WriteLine("=== データベースレコード数確認 ===");
                Console.WriteLine($"商品数: {productCount}件");
                Console.WriteLine($"バリアント数: {variantCount}件");
                Console.WriteLine($"顧客数: {customerCount}件");
                Console.WriteLine($"注文数: {orderCount}件");
                Console.WriteLine("================================");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"データベース確認中にエラーが発生しました: {ex.Message}");
            }
        }
    }
}
