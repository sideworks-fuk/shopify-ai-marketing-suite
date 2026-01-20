using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShopifyAnalyticsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddShopifyTimestampsAndSyncedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ShopifyCreatedAt",
                table: "Products",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ShopifyUpdatedAt",
                table: "Products",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "SyncedAt",
                table: "Products",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ShopifyCreatedAt",
                table: "Orders",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ShopifyUpdatedAt",
                table: "Orders",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "SyncedAt",
                table: "Orders",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ShopifyCreatedAt",
                table: "Customers",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ShopifyUpdatedAt",
                table: "Customers",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "SyncedAt",
                table: "Customers",
                type: "datetime2",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "ShopifyCreatedAt", "ShopifyUpdatedAt", "SyncedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 12, 20, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4546), null, null, null, new DateTime(2026, 1, 19, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4548) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "ShopifyCreatedAt", "ShopifyUpdatedAt", "SyncedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 1, 12, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4589), null, null, null, new DateTime(2026, 1, 19, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4590) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "ShopifyCreatedAt", "ShopifyUpdatedAt", "SyncedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 23, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4592), null, null, null, new DateTime(2026, 1, 19, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4593) });

            migrationBuilder.UpdateData(
                table: "OrderItems",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 1, 5, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4675), new DateTime(2026, 1, 5, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4676) });

            migrationBuilder.UpdateData(
                table: "OrderItems",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 1, 12, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4680), new DateTime(2026, 1, 12, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4680) });

            migrationBuilder.UpdateData(
                table: "OrderItems",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 1, 12, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4684), new DateTime(2026, 1, 12, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4684) });

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "ShopifyCreatedAt", "ShopifyUpdatedAt", "SyncedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 1, 5, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4639), null, null, null, new DateTime(2026, 1, 5, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4640) });

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "ShopifyCreatedAt", "ShopifyUpdatedAt", "SyncedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 1, 12, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4643), null, null, null, new DateTime(2026, 1, 12, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4644) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "ShopifyCreatedAt", "ShopifyUpdatedAt", "SyncedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 11, 20, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4615), null, null, null, new DateTime(2026, 1, 19, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4615) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "ShopifyCreatedAt", "ShopifyUpdatedAt", "SyncedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 12, 5, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4617), null, null, null, new DateTime(2026, 1, 19, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4618) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "ShopifyCreatedAt", "ShopifyUpdatedAt", "SyncedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 12, 20, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4619), null, null, null, new DateTime(2026, 1, 19, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4620) });

            migrationBuilder.UpdateData(
                table: "Stores",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 1, 19, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4374), new DateTime(2026, 1, 19, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4381) });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ShopifyCreatedAt",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "ShopifyUpdatedAt",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "SyncedAt",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "ShopifyCreatedAt",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ShopifyUpdatedAt",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "SyncedAt",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ShopifyCreatedAt",
                table: "Customers");

            migrationBuilder.DropColumn(
                name: "ShopifyUpdatedAt",
                table: "Customers");

            migrationBuilder.DropColumn(
                name: "SyncedAt",
                table: "Customers");

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 11, 30, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1026), new DateTime(2025, 12, 30, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1045) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 12, 23, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1062), new DateTime(2025, 12, 30, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1063) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 3, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1066), new DateTime(2025, 12, 30, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1066) });

            migrationBuilder.UpdateData(
                table: "OrderItems",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 12, 16, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1307), new DateTime(2025, 12, 16, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1308) });

            migrationBuilder.UpdateData(
                table: "OrderItems",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 12, 23, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1313), new DateTime(2025, 12, 23, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1313) });

            migrationBuilder.UpdateData(
                table: "OrderItems",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 12, 23, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1323), new DateTime(2025, 12, 23, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1324) });

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 12, 16, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1221), new DateTime(2025, 12, 16, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1228) });

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 12, 23, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1234), new DateTime(2025, 12, 23, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1234) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 10, 31, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1145), new DateTime(2025, 12, 30, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1146) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 11, 15, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1157), new DateTime(2025, 12, 30, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1158) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 11, 30, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1160), new DateTime(2025, 12, 30, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1161) });

            migrationBuilder.UpdateData(
                table: "Stores",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2024, 12, 30, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(51), new DateTime(2025, 12, 30, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(71) });
        }
    }
}
