using Microsoft.EntityFrameworkCore;
using QuickShipTracker.Core.Models;

namespace QuickShipTracker.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }
    
    public DbSet<Shop> Shops { get; set; }
    public DbSet<Order> Orders { get; set; }
    public DbSet<TrackingInfo> TrackingInfos { get; set; }
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // Shop configuration
        modelBuilder.Entity<Shop>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Domain).IsUnique();
            entity.Property(e => e.Domain).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Email).HasMaxLength(255);
            entity.Property(e => e.AccessToken).IsRequired();
            entity.Property(e => e.PlanId).HasMaxLength(50);
        });
        
        // Order configuration
        modelBuilder.Entity<Order>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.ShopId, e.ShopifyOrderId }).IsUnique();
            entity.Property(e => e.OrderNumber).IsRequired().HasMaxLength(50);
            entity.Property(e => e.CustomerName).HasMaxLength(255);
            entity.Property(e => e.CustomerEmail).HasMaxLength(255);
            entity.Property(e => e.Currency).HasMaxLength(10);
            entity.Property(e => e.FulfillmentStatus).HasMaxLength(50);
            entity.Property(e => e.FinancialStatus).HasMaxLength(50);
            entity.Property(e => e.TotalPrice).HasPrecision(10, 2);
            
            entity.HasOne(e => e.Shop)
                .WithMany(s => s.Orders)
                .HasForeignKey(e => e.ShopId)
                .OnDelete(DeleteBehavior.Cascade);
        });
        
        // TrackingInfo configuration
        modelBuilder.Entity<TrackingInfo>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.OrderId).IsUnique();
            entity.Property(e => e.Carrier).IsRequired().HasMaxLength(100);
            entity.Property(e => e.TrackingNumber).IsRequired().HasMaxLength(255);
            entity.Property(e => e.TrackingUrl).HasMaxLength(500);
            
            entity.HasOne(e => e.Shop)
                .WithMany(s => s.TrackingInfos)
                .HasForeignKey(e => e.ShopId)
                .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasOne(e => e.Order)
                .WithOne(o => o.TrackingInfo)
                .HasForeignKey<TrackingInfo>(e => e.OrderId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}