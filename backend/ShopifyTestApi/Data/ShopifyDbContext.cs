using Microsoft.EntityFrameworkCore;
using ShopifyTestApi.Models;

namespace ShopifyTestApi.Data
{
    /// <summary>
    /// Shopifyデータベースコンテキスト
    /// </summary>
    public class ShopifyDbContext : DbContext
    {
        public ShopifyDbContext(DbContextOptions<ShopifyDbContext> options) : base(options)
        {
        }

        // DbSets
        public DbSet<Customer> Customers { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<OrderItem> OrderItems { get; set; }
        public DbSet<Product> Products { get; set; }
        public DbSet<ProductVariant> ProductVariants { get; set; }
        public DbSet<Store> Stores { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // インデックス設定
            modelBuilder.Entity<Customer>()
                .HasIndex(c => c.Email);  // ユニーク制約を削除（実際のShopifyデータでは重複あり）
            
            modelBuilder.Entity<Customer>()
                .HasIndex(c => c.ShopifyCustomerId);  // Shopify Customer IDのインデックス
            
            // マルチストア対応のインデックス
            modelBuilder.Entity<Customer>()
                .HasIndex(c => new { c.StoreId, c.Email });
            
            modelBuilder.Entity<Customer>()
                .HasIndex(c => new { c.StoreId, c.ShopifyCustomerId });
            
            modelBuilder.Entity<Product>()
                .HasIndex(p => new { p.StoreId, p.Title });
            
            modelBuilder.Entity<Order>()
                .HasIndex(o => new { o.StoreId, o.OrderNumber });
            
            // Storeとのリレーション設定
            modelBuilder.Entity<Customer>()
                .HasOne<Store>()
                .WithMany(s => s.Customers)
                .HasForeignKey(c => c.StoreId)
                .OnDelete(DeleteBehavior.NoAction);
            
            modelBuilder.Entity<Product>()
                .HasOne<Store>()
                .WithMany(s => s.Products)
                .HasForeignKey(p => p.StoreId)
                .OnDelete(DeleteBehavior.NoAction);
            
            modelBuilder.Entity<Order>()
                .HasOne<Store>()
                .WithMany(s => s.Orders)
                .HasForeignKey(o => o.StoreId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<Order>()
                .HasIndex(o => o.OrderNumber)
                .IsUnique();

            modelBuilder.Entity<Product>()
                .HasIndex(p => p.Title);

            // リレーションシップ設定
            modelBuilder.Entity<Order>()
                .HasOne(o => o.Customer)
                .WithMany(c => c.Orders)
                .HasForeignKey(o => o.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<OrderItem>()
                .HasOne(oi => oi.Order)
                .WithMany(o => o.OrderItems)
                .HasForeignKey(oi => oi.OrderId)
                .OnDelete(DeleteBehavior.Cascade);

            // OrderItemは商品情報のスナップショットを保存するため、外部キー参照は不要
            // modelBuilder.Entity<OrderItem>()
            //     .HasOne(oi => oi.Product)
            //     .WithMany(p => p.OrderItems)
            //     .HasForeignKey(oi => oi.ProductId)
            //     .OnDelete(DeleteBehavior.Restrict);

            // サンプルデータ投入
            SeedData(modelBuilder);
        }

        private void SeedData(ModelBuilder modelBuilder)
        {
            // サンプルストアデータ
            modelBuilder.Entity<Store>().HasData(
                new Store
                {
                    Id = 1,
                    Name = "テストストア",
                    Domain = "test-store.myshopify.com",
                    ShopifyShopId = "test-store",
                    CreatedAt = DateTime.UtcNow.AddDays(-365),
                    UpdatedAt = DateTime.UtcNow
                }
            );

            // サンプル顧客データ
            modelBuilder.Entity<Customer>().HasData(
                new Customer
                {
                    Id = 1,
                    StoreId = 1,
                    FirstName = "太郎",
                    LastName = "山田",
                    Email = "yamada@example.com",
                    Phone = "090-1234-5678",
                    CustomerSegment = "リピーター",
                    TotalSpent = 25000,
                    TotalOrders = 3,
                    OrdersCount = 3, // 互換性のため
                    CreatedAt = DateTime.UtcNow.AddDays(-30),
                    UpdatedAt = DateTime.UtcNow
                },
                new Customer
                {
                    Id = 2,
                    StoreId = 1,
                    FirstName = "花子",
                    LastName = "佐藤",
                    Email = "sato@example.com",
                    Phone = "080-9876-5432",
                    CustomerSegment = "新規顧客",
                    TotalSpent = 8500,
                    TotalOrders = 1,
                    OrdersCount = 1, // 互換性のため
                    CreatedAt = DateTime.UtcNow.AddDays(-7),
                    UpdatedAt = DateTime.UtcNow
                },
                new Customer
                {
                    Id = 3,
                    StoreId = 1,
                    FirstName = "一郎",
                    LastName = "鈴木",
                    Email = "suzuki@example.com",
                    CustomerSegment = "VIP顧客",
                    TotalSpent = 125000,
                    TotalOrders = 15,
                    OrdersCount = 15, // 互換性のため
                    CreatedAt = DateTime.UtcNow.AddDays(-180),
                    UpdatedAt = DateTime.UtcNow
                }
            );

            // サンプル商品データ
            modelBuilder.Entity<Product>().HasData(
                new Product
                {
                    Id = 1,
                    StoreId = 1,
                    Title = "オーガニックコットンTシャツ",
                    Description = "環境に優しいオーガニックコットン100%のTシャツ",
                    Category = "衣類",
                    InventoryQuantity = 50,
                    CreatedAt = DateTime.UtcNow.AddDays(-60),
                    UpdatedAt = DateTime.UtcNow
                },
                new Product
                {
                    Id = 2,
                    StoreId = 1,
                    Title = "ステンレス製タンブラー",
                    Description = "保温・保冷効果抜群のステンレス製タンブラー",
                    Category = "雑貨",
                    InventoryQuantity = 25,
                    CreatedAt = DateTime.UtcNow.AddDays(-45),
                    UpdatedAt = DateTime.UtcNow
                },
                new Product
                {
                    Id = 3,
                    StoreId = 1,
                    Title = "オーガニック緑茶セット",
                    Description = "厳選されたオーガニック緑茶の詰め合わせセット",
                    Category = "食品",
                    InventoryQuantity = 15,
                    CreatedAt = DateTime.UtcNow.AddDays(-30),
                    UpdatedAt = DateTime.UtcNow
                }
            );

            // サンプル注文データ
            modelBuilder.Entity<Order>().HasData(
                new Order
                {
                    Id = 1,
                    StoreId = 1,
                    OrderNumber = "ORD-001",
                    CustomerId = 1,
                    TotalPrice = 7000,
                    SubtotalPrice = 6300,
                    TaxPrice = 700,
                    Status = "completed",
                    CreatedAt = DateTime.UtcNow.AddDays(-14),
                    UpdatedAt = DateTime.UtcNow.AddDays(-14)
                },
                new Order
                {
                    Id = 2,
                    StoreId = 1,
                    OrderNumber = "ORD-002",
                    CustomerId = 2,
                    TotalPrice = 8500,
                    SubtotalPrice = 7700,
                    TaxPrice = 800,
                    Status = "completed",
                    CreatedAt = DateTime.UtcNow.AddDays(-7),
                    UpdatedAt = DateTime.UtcNow.AddDays(-7)
                }
            );

            // サンプル注文明細データ
            modelBuilder.Entity<OrderItem>().HasData(
                new OrderItem
                {
                    Id = 1,
                    OrderId = 1,
                    ProductTitle = "オーガニックコットンTシャツ",
                    ProductHandle = "organic-cotton-tshirt",
                    ProductVendor = "テストベンダーA01",
                    ProductType = "衣類",
                    Sku = "TSHIRT-001",
                    VariantTitle = "M / ブルー",
                    Price = 3500,
                    CompareAtPrice = 4000,
                    Quantity = 2,
                    TotalPrice = 7000,
                    Option1Name = "サイズ",
                    Option1Value = "M",
                    Option2Name = "カラー",
                    Option2Value = "ブルー",
                    RequiresShipping = true,
                    Taxable = true,
                    CreatedAt = DateTime.UtcNow.AddDays(-14),
                    UpdatedAt = DateTime.UtcNow.AddDays(-14)
                },
                new OrderItem
                {
                    Id = 2,
                    OrderId = 2,
                    ProductTitle = "ステンレス製タンブラー",
                    ProductHandle = "stainless-tumbler",
                    ProductVendor = "テストベンダーB02",
                    ProductType = "雑貨",
                    Sku = "TUMBLER-001",
                    VariantTitle = "500ml",
                    Price = 2800,
                    CompareAtPrice = 3200,
                    Quantity = 1,
                    TotalPrice = 2800,
                    Option1Name = "容量",
                    Option1Value = "500ml",
                    RequiresShipping = true,
                    Taxable = true,
                    CreatedAt = DateTime.UtcNow.AddDays(-7),
                    UpdatedAt = DateTime.UtcNow.AddDays(-7)
                },
                new OrderItem
                {
                    Id = 3,
                    OrderId = 2,
                    ProductTitle = "オーガニック緑茶セット",
                    ProductHandle = "organic-green-tea-set",
                    ProductVendor = "テストベンダーC03",
                    ProductType = "食品",
                    Sku = "TEA-001",
                    VariantTitle = "100g",
                    Price = 4200,
                    CompareAtPrice = 4800,
                    Quantity = 1,
                    TotalPrice = 4200,
                    Option1Name = "容量",
                    Option1Value = "100g",
                    RequiresShipping = true,
                    Taxable = true,
                    CreatedAt = DateTime.UtcNow.AddDays(-7),
                    UpdatedAt = DateTime.UtcNow.AddDays(-7)
                }
            );
        }
    }
} 