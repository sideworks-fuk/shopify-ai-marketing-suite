using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShopifyAnalyticsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddHandleToProducts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Handle",
                table: "Products",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

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
                columns: new[] { "CreatedAt", "Handle", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 5, 22, 10, 27, 38, 491, DateTimeKind.Utc).AddTicks(6616), null, new DateTime(2025, 7, 21, 10, 27, 38, 491, DateTimeKind.Utc).AddTicks(6617) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "Handle", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 6, 10, 27, 38, 491, DateTimeKind.Utc).AddTicks(6623), null, new DateTime(2025, 7, 21, 10, 27, 38, 491, DateTimeKind.Utc).AddTicks(6623) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "Handle", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 21, 10, 27, 38, 491, DateTimeKind.Utc).AddTicks(6625), null, new DateTime(2025, 7, 21, 10, 27, 38, 491, DateTimeKind.Utc).AddTicks(6626) });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Handle",
                table: "Products");

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 21, 10, 22, 39, 697, DateTimeKind.Utc).AddTicks(5222), new DateTime(2025, 7, 21, 10, 22, 39, 697, DateTimeKind.Utc).AddTicks(5237) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 14, 10, 22, 39, 697, DateTimeKind.Utc).AddTicks(5243), new DateTime(2025, 7, 21, 10, 22, 39, 697, DateTimeKind.Utc).AddTicks(5244) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 1, 22, 10, 22, 39, 697, DateTimeKind.Utc).AddTicks(5246), new DateTime(2025, 7, 21, 10, 22, 39, 697, DateTimeKind.Utc).AddTicks(5247) });

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 7, 10, 22, 39, 697, DateTimeKind.Utc).AddTicks(5650), new DateTime(2025, 7, 7, 10, 22, 39, 697, DateTimeKind.Utc).AddTicks(5650) });

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 14, 10, 22, 39, 697, DateTimeKind.Utc).AddTicks(5653), new DateTime(2025, 7, 14, 10, 22, 39, 697, DateTimeKind.Utc).AddTicks(5653) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 5, 22, 10, 22, 39, 697, DateTimeKind.Utc).AddTicks(5619), new DateTime(2025, 7, 21, 10, 22, 39, 697, DateTimeKind.Utc).AddTicks(5620) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 6, 10, 22, 39, 697, DateTimeKind.Utc).AddTicks(5622), new DateTime(2025, 7, 21, 10, 22, 39, 697, DateTimeKind.Utc).AddTicks(5622) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 21, 10, 22, 39, 697, DateTimeKind.Utc).AddTicks(5624), new DateTime(2025, 7, 21, 10, 22, 39, 697, DateTimeKind.Utc).AddTicks(5624) });
        }
    }
}
