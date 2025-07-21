using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShopifyTestApi.Migrations
{
    /// <inheritdoc />
    public partial class AddShopifyCustomerId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ShopifyCustomerId",
                table: "Customers",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "ShopifyCustomerId", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 21, 10, 10, 11, 107, DateTimeKind.Utc).AddTicks(6055), null, new DateTime(2025, 7, 21, 10, 10, 11, 107, DateTimeKind.Utc).AddTicks(6079) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "ShopifyCustomerId", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 14, 10, 10, 11, 107, DateTimeKind.Utc).AddTicks(6137), null, new DateTime(2025, 7, 21, 10, 10, 11, 107, DateTimeKind.Utc).AddTicks(6138) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "ShopifyCustomerId", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 1, 22, 10, 10, 11, 107, DateTimeKind.Utc).AddTicks(6140), null, new DateTime(2025, 7, 21, 10, 10, 11, 107, DateTimeKind.Utc).AddTicks(6141) });

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 7, 10, 10, 11, 107, DateTimeKind.Utc).AddTicks(6394), new DateTime(2025, 7, 7, 10, 10, 11, 107, DateTimeKind.Utc).AddTicks(6395) });

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 14, 10, 10, 11, 107, DateTimeKind.Utc).AddTicks(6397), new DateTime(2025, 7, 14, 10, 10, 11, 107, DateTimeKind.Utc).AddTicks(6398) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 5, 22, 10, 10, 11, 107, DateTimeKind.Utc).AddTicks(6375), new DateTime(2025, 7, 21, 10, 10, 11, 107, DateTimeKind.Utc).AddTicks(6376) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 6, 10, 10, 11, 107, DateTimeKind.Utc).AddTicks(6378), new DateTime(2025, 7, 21, 10, 10, 11, 107, DateTimeKind.Utc).AddTicks(6378) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 21, 10, 10, 11, 107, DateTimeKind.Utc).AddTicks(6380), new DateTime(2025, 7, 21, 10, 10, 11, 107, DateTimeKind.Utc).AddTicks(6381) });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ShopifyCustomerId",
                table: "Customers");

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 21, 10, 0, 18, 357, DateTimeKind.Utc).AddTicks(5707), new DateTime(2025, 7, 21, 10, 0, 18, 357, DateTimeKind.Utc).AddTicks(5714) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 14, 10, 0, 18, 357, DateTimeKind.Utc).AddTicks(5717), new DateTime(2025, 7, 21, 10, 0, 18, 357, DateTimeKind.Utc).AddTicks(5718) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 1, 22, 10, 0, 18, 357, DateTimeKind.Utc).AddTicks(5720), new DateTime(2025, 7, 21, 10, 0, 18, 357, DateTimeKind.Utc).AddTicks(5721) });

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 7, 10, 0, 18, 357, DateTimeKind.Utc).AddTicks(5855), new DateTime(2025, 7, 7, 10, 0, 18, 357, DateTimeKind.Utc).AddTicks(5855) });

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 14, 10, 0, 18, 357, DateTimeKind.Utc).AddTicks(5858), new DateTime(2025, 7, 14, 10, 0, 18, 357, DateTimeKind.Utc).AddTicks(5858) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 5, 22, 10, 0, 18, 357, DateTimeKind.Utc).AddTicks(5830), new DateTime(2025, 7, 21, 10, 0, 18, 357, DateTimeKind.Utc).AddTicks(5831) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 6, 10, 0, 18, 357, DateTimeKind.Utc).AddTicks(5833), new DateTime(2025, 7, 21, 10, 0, 18, 357, DateTimeKind.Utc).AddTicks(5834) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 21, 10, 0, 18, 357, DateTimeKind.Utc).AddTicks(5836), new DateTime(2025, 7, 21, 10, 0, 18, 357, DateTimeKind.Utc).AddTicks(5836) });
        }
    }
}
