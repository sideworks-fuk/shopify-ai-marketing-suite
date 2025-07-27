using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShopifyAnalyticsApi.Migrations
{
    /// <inheritdoc />
    public partial class CheckCurrentSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Currency",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "Price",
                table: "Products");

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "StoreId", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 21, 10, 37, 33, 480, DateTimeKind.Utc).AddTicks(8101), 1, new DateTime(2025, 7, 21, 10, 37, 33, 480, DateTimeKind.Utc).AddTicks(8102) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "StoreId", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 14, 10, 37, 33, 480, DateTimeKind.Utc).AddTicks(8105), 1, new DateTime(2025, 7, 21, 10, 37, 33, 480, DateTimeKind.Utc).AddTicks(8106) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "StoreId", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 1, 22, 10, 37, 33, 480, DateTimeKind.Utc).AddTicks(8108), 1, new DateTime(2025, 7, 21, 10, 37, 33, 480, DateTimeKind.Utc).AddTicks(8108) });

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "StoreId", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 7, 10, 37, 33, 480, DateTimeKind.Utc).AddTicks(8215), 1, new DateTime(2025, 7, 7, 10, 37, 33, 480, DateTimeKind.Utc).AddTicks(8216) });

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "StoreId", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 14, 10, 37, 33, 480, DateTimeKind.Utc).AddTicks(8219), 1, new DateTime(2025, 7, 14, 10, 37, 33, 480, DateTimeKind.Utc).AddTicks(8219) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "StoreId", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 5, 22, 10, 37, 33, 480, DateTimeKind.Utc).AddTicks(8186), 1, new DateTime(2025, 7, 21, 10, 37, 33, 480, DateTimeKind.Utc).AddTicks(8186) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "StoreId", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 6, 10, 37, 33, 480, DateTimeKind.Utc).AddTicks(8188), 1, new DateTime(2025, 7, 21, 10, 37, 33, 480, DateTimeKind.Utc).AddTicks(8189) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "StoreId", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 21, 10, 37, 33, 480, DateTimeKind.Utc).AddTicks(8191), 1, new DateTime(2025, 7, 21, 10, 37, 33, 480, DateTimeKind.Utc).AddTicks(8191) });

            migrationBuilder.InsertData(
                table: "Stores",
                columns: new[] { "Id", "CreatedAt", "Domain", "Name", "ShopifyShopId", "UpdatedAt" },
                values: new object[] { 1, new DateTime(2024, 7, 21, 10, 37, 33, 480, DateTimeKind.Utc).AddTicks(7852), "test-store.myshopify.com", "テストストア", "test-store", new DateTime(2025, 7, 21, 10, 37, 33, 480, DateTimeKind.Utc).AddTicks(7867) });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Stores",
                keyColumn: "Id",
                keyValue: 1);

            migrationBuilder.AddColumn<string>(
                name: "Currency",
                table: "Products",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "Price",
                table: "Products",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "StoreId", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 21, 10, 31, 48, 227, DateTimeKind.Utc).AddTicks(938), 0, new DateTime(2025, 7, 21, 10, 31, 48, 227, DateTimeKind.Utc).AddTicks(958) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "StoreId", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 14, 10, 31, 48, 227, DateTimeKind.Utc).AddTicks(960), 0, new DateTime(2025, 7, 21, 10, 31, 48, 227, DateTimeKind.Utc).AddTicks(961) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "StoreId", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 1, 22, 10, 31, 48, 227, DateTimeKind.Utc).AddTicks(966), 0, new DateTime(2025, 7, 21, 10, 31, 48, 227, DateTimeKind.Utc).AddTicks(967) });

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "StoreId", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 7, 10, 31, 48, 227, DateTimeKind.Utc).AddTicks(1300), 0, new DateTime(2025, 7, 7, 10, 31, 48, 227, DateTimeKind.Utc).AddTicks(1301) });

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "StoreId", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 14, 10, 31, 48, 227, DateTimeKind.Utc).AddTicks(1304), 0, new DateTime(2025, 7, 14, 10, 31, 48, 227, DateTimeKind.Utc).AddTicks(1304) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "Currency", "Price", "StoreId", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 5, 22, 10, 31, 48, 227, DateTimeKind.Utc).AddTicks(1269), "JPY", 3500m, 0, new DateTime(2025, 7, 21, 10, 31, 48, 227, DateTimeKind.Utc).AddTicks(1269) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "Currency", "Price", "StoreId", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 6, 10, 31, 48, 227, DateTimeKind.Utc).AddTicks(1272), "JPY", 2800m, 0, new DateTime(2025, 7, 21, 10, 31, 48, 227, DateTimeKind.Utc).AddTicks(1273) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "Currency", "Price", "StoreId", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 21, 10, 31, 48, 227, DateTimeKind.Utc).AddTicks(1275), "JPY", 4200m, 0, new DateTime(2025, 7, 21, 10, 31, 48, 227, DateTimeKind.Utc).AddTicks(1275) });
        }
    }
}
