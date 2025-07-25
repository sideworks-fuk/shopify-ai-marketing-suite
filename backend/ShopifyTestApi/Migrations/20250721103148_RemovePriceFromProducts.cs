using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShopifyTestApi.Migrations
{
    /// <inheritdoc />
    public partial class RemovePriceFromProducts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 21, 10, 31, 48, 227, DateTimeKind.Utc).AddTicks(938), new DateTime(2025, 7, 21, 10, 31, 48, 227, DateTimeKind.Utc).AddTicks(958) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 14, 10, 31, 48, 227, DateTimeKind.Utc).AddTicks(960), new DateTime(2025, 7, 21, 10, 31, 48, 227, DateTimeKind.Utc).AddTicks(961) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 1, 22, 10, 31, 48, 227, DateTimeKind.Utc).AddTicks(966), new DateTime(2025, 7, 21, 10, 31, 48, 227, DateTimeKind.Utc).AddTicks(967) });

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 7, 10, 31, 48, 227, DateTimeKind.Utc).AddTicks(1300), new DateTime(2025, 7, 7, 10, 31, 48, 227, DateTimeKind.Utc).AddTicks(1301) });

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 14, 10, 31, 48, 227, DateTimeKind.Utc).AddTicks(1304), new DateTime(2025, 7, 14, 10, 31, 48, 227, DateTimeKind.Utc).AddTicks(1304) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 5, 22, 10, 31, 48, 227, DateTimeKind.Utc).AddTicks(1269), new DateTime(2025, 7, 21, 10, 31, 48, 227, DateTimeKind.Utc).AddTicks(1269) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 6, 10, 31, 48, 227, DateTimeKind.Utc).AddTicks(1272), new DateTime(2025, 7, 21, 10, 31, 48, 227, DateTimeKind.Utc).AddTicks(1273) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 21, 10, 31, 48, 227, DateTimeKind.Utc).AddTicks(1275), new DateTime(2025, 7, 21, 10, 31, 48, 227, DateTimeKind.Utc).AddTicks(1275) });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 21, 10, 27, 38, 491, DateTimeKind.Utc).AddTicks(6358), new DateTime(2025, 7, 21, 10, 27, 38, 491, DateTimeKind.Utc).AddTicks(6379) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 14, 10, 27, 38, 491, DateTimeKind.Utc).AddTicks(6384), new DateTime(2025, 7, 21, 10, 27, 38, 491, DateTimeKind.Utc).AddTicks(6384) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 1, 22, 10, 27, 38, 491, DateTimeKind.Utc).AddTicks(6388), new DateTime(2025, 7, 21, 10, 27, 38, 491, DateTimeKind.Utc).AddTicks(6389) });

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 7, 10, 27, 38, 491, DateTimeKind.Utc).AddTicks(6650), new DateTime(2025, 7, 7, 10, 27, 38, 491, DateTimeKind.Utc).AddTicks(6652) });

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 14, 10, 27, 38, 491, DateTimeKind.Utc).AddTicks(6654), new DateTime(2025, 7, 14, 10, 27, 38, 491, DateTimeKind.Utc).AddTicks(6655) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 5, 22, 10, 27, 38, 491, DateTimeKind.Utc).AddTicks(6616), new DateTime(2025, 7, 21, 10, 27, 38, 491, DateTimeKind.Utc).AddTicks(6617) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 6, 10, 27, 38, 491, DateTimeKind.Utc).AddTicks(6623), new DateTime(2025, 7, 21, 10, 27, 38, 491, DateTimeKind.Utc).AddTicks(6623) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 21, 10, 27, 38, 491, DateTimeKind.Utc).AddTicks(6625), new DateTime(2025, 7, 21, 10, 27, 38, 491, DateTimeKind.Utc).AddTicks(6626) });
        }
    }
}
