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
        public DbSet<Product> Products { get; set; }
        public DbSet<OrderItem> OrderItems { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // decimal プロパティの精度設定
            modelBuilder.Entity<Customer>()
                .Property(c => c.TotalSpent)
                .HasColumnType("decimal(18,2)");

            // インデックス設定
            modelBuilder.Entity<Customer>()
                .HasIndex(c => c.Email)
                .IsUnique();

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

            modelBuilder.Entity<OrderItem>()
                .HasOne(oi => oi.Product)
                .WithMany(p => p.OrderItems)
                .HasForeignKey(oi => oi.ProductId)
                .OnDelete(DeleteBehavior.Restrict);

            // サンプルデータ投入
            SeedData(modelBuilder);
        }

        private void SeedData(ModelBuilder modelBuilder)
        {
            // サンプル顧客データ
            modelBuilder.Entity<Customer>().HasData(
                new Customer
                {
                    Id = 1,
                    FirstName = "太郎",
                    LastName = "山田",
                    Email = "yamada@example.com",
                    Phone = "090-1234-5678",
                    CustomerSegment = "リピーター",
                    TotalSpent = 25000,
                    OrdersCount = 3,
                    CreatedAt = DateTime.UtcNow.AddDays(-30),
                    UpdatedAt = DateTime.UtcNow
                },
                new Customer
                {
                    Id = 2,
                    FirstName = "花子",
                    LastName = "佐藤",
                    Email = "sato@example.com",
                    Phone = "080-9876-5432",
                    CustomerSegment = "新規顧客",
                    TotalSpent = 8500,
                    OrdersCount = 1,
                    CreatedAt = DateTime.UtcNow.AddDays(-7),
                    UpdatedAt = DateTime.UtcNow
                },
                new Customer
                {
                    Id = 3,
                    FirstName = "一郎",
                    LastName = "鈴木",
                    Email = "suzuki@example.com",
                    CustomerSegment = "VIP顧客",
                    TotalSpent = 125000,
                    OrdersCount = 15,
                    CreatedAt = DateTime.UtcNow.AddDays(-180),
                    UpdatedAt = DateTime.UtcNow
                }
            );

            // サンプル商品データ
            modelBuilder.Entity<Product>().HasData(
                new Product
                {
                    Id = 1,
                    Title = "オーガニックコットンTシャツ",
                    Description = "環境に優しいオーガニックコットン100%のTシャツ",
                    Price = 3500,
                    Category = "衣類",
                    InventoryQuantity = 50,
                    CreatedAt = DateTime.UtcNow.AddDays(-60),
                    UpdatedAt = DateTime.UtcNow
                },
                new Product
                {
                    Id = 2,
                    Title = "ステンレス製タンブラー",
                    Description = "保温・保冷効果抜群のステンレス製タンブラー",
                    Price = 2800,
                    Category = "雑貨",
                    InventoryQuantity = 25,
                    CreatedAt = DateTime.UtcNow.AddDays(-45),
                    UpdatedAt = DateTime.UtcNow
                },
                new Product
                {
                    Id = 3,
                    Title = "オーガニック緑茶セット",
                    Description = "厳選されたオーガニック緑茶の詰め合わせセット",
                    Price = 4200,
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
                    ProductId = 1,
                    Quantity = 2,
                    Price = 3500,
                    TotalPrice = 7000
                },
                new OrderItem
                {
                    Id = 2,
                    OrderId = 2,
                    ProductId = 2,
                    Quantity = 1,
                    Price = 2800,
                    TotalPrice = 2800
                },
                new OrderItem
                {
                    Id = 3,
                    OrderId = 2,
                    ProductId = 3,
                    Quantity = 1,
                    Price = 4200,
                    TotalPrice = 4200
                }
            );
        }
    }
} 