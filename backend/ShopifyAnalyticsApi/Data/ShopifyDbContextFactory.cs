using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace ShopifyAnalyticsApi.Data
{
    /// <summary>
    /// デザイン時のDbContextファクトリ
    /// EF Core Migrationsで使用
    /// </summary>
    public class ShopifyDbContextFactory : IDesignTimeDbContextFactory<ShopifyDbContext>
    {
        public ShopifyDbContext CreateDbContext(string[] args)
        {
            // 設定ファイルを読み込む
            var configuration = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", optional: false)
                .AddJsonFile("appsettings.Development.json", optional: true)
                .Build();

            // DbContextOptionsを作成
            var optionsBuilder = new DbContextOptionsBuilder<ShopifyDbContext>();
            var connectionString = configuration.GetConnectionString("DefaultConnection");
            
            optionsBuilder.UseSqlServer(connectionString);

            return new ShopifyDbContext(optionsBuilder.Options);
        }
    }
}

