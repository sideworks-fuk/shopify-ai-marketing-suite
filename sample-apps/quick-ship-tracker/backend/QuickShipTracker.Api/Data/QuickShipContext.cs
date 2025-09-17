using Microsoft.EntityFrameworkCore;
using QuickShipTracker.Models;

namespace QuickShipTracker.Data
{
    public class QuickShipContext : DbContext
    {
        public QuickShipContext(DbContextOptions<QuickShipContext> options)
            : base(options)
        {
        }

        public DbSet<Shop> Shops { get; set; } = null!;
        public DbSet<ShipmentRecord> ShipmentRecords { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Shop>()
                .HasIndex(s => s.ShopDomain)
                .IsUnique();

            modelBuilder.Entity<ShipmentRecord>()
                .HasIndex(s => new { s.ShopDomain, s.OrderId })
                .IsUnique();

            modelBuilder.Entity<ShipmentRecord>()
                .HasIndex(s => s.ShopDomain);
        }
    }
}