using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShopifyAnalyticsApi.Migrations
{
    /// <inheritdoc />
    public partial class FixOrderNumberUniqueConstraint : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Orders_OrderNumber",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_Orders_StoreId_OrderNumber",
                table: "Orders");

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 12, 20, 14, 40, 13, 342, DateTimeKind.Utc).AddTicks(9310), new DateTime(2026, 1, 19, 14, 40, 13, 342, DateTimeKind.Utc).AddTicks(9315) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 1, 12, 14, 40, 13, 342, DateTimeKind.Utc).AddTicks(9318), new DateTime(2026, 1, 19, 14, 40, 13, 342, DateTimeKind.Utc).AddTicks(9318) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 23, 14, 40, 13, 342, DateTimeKind.Utc).AddTicks(9321), new DateTime(2026, 1, 19, 14, 40, 13, 342, DateTimeKind.Utc).AddTicks(9322) });

            migrationBuilder.UpdateData(
                table: "OrderItems",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 1, 5, 14, 40, 13, 342, DateTimeKind.Utc).AddTicks(9496), new DateTime(2026, 1, 5, 14, 40, 13, 342, DateTimeKind.Utc).AddTicks(9497) });

            migrationBuilder.UpdateData(
                table: "OrderItems",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 1, 12, 14, 40, 13, 342, DateTimeKind.Utc).AddTicks(9502), new DateTime(2026, 1, 12, 14, 40, 13, 342, DateTimeKind.Utc).AddTicks(9503) });

            migrationBuilder.UpdateData(
                table: "OrderItems",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 1, 12, 14, 40, 13, 342, DateTimeKind.Utc).AddTicks(9506), new DateTime(2026, 1, 12, 14, 40, 13, 342, DateTimeKind.Utc).AddTicks(9507) });

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 1, 5, 14, 40, 13, 342, DateTimeKind.Utc).AddTicks(9414), new DateTime(2026, 1, 5, 14, 40, 13, 342, DateTimeKind.Utc).AddTicks(9415) });

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 1, 12, 14, 40, 13, 342, DateTimeKind.Utc).AddTicks(9418), new DateTime(2026, 1, 12, 14, 40, 13, 342, DateTimeKind.Utc).AddTicks(9418) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 11, 20, 14, 40, 13, 342, DateTimeKind.Utc).AddTicks(9374), new DateTime(2026, 1, 19, 14, 40, 13, 342, DateTimeKind.Utc).AddTicks(9375) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 12, 5, 14, 40, 13, 342, DateTimeKind.Utc).AddTicks(9377), new DateTime(2026, 1, 19, 14, 40, 13, 342, DateTimeKind.Utc).AddTicks(9378) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 12, 20, 14, 40, 13, 342, DateTimeKind.Utc).AddTicks(9380), new DateTime(2026, 1, 19, 14, 40, 13, 342, DateTimeKind.Utc).AddTicks(9380) });

            migrationBuilder.UpdateData(
                table: "Stores",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 1, 19, 14, 40, 13, 342, DateTimeKind.Utc).AddTicks(8557), new DateTime(2026, 1, 19, 14, 40, 13, 342, DateTimeKind.Utc).AddTicks(8582) });

            migrationBuilder.CreateIndex(
                name: "IX_Orders_StoreId_OrderNumber",
                table: "Orders",
                columns: new[] { "StoreId", "OrderNumber" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Orders_StoreId_OrderNumber",
                table: "Orders");

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 12, 20, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4546), new DateTime(2026, 1, 19, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4548) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 1, 12, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4589), new DateTime(2026, 1, 19, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4590) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 23, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4592), new DateTime(2026, 1, 19, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4593) });

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
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 1, 5, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4639), new DateTime(2026, 1, 5, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4640) });

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 1, 12, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4643), new DateTime(2026, 1, 12, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4644) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 11, 20, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4615), new DateTime(2026, 1, 19, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4615) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 12, 5, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4617), new DateTime(2026, 1, 19, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4618) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 12, 20, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4619), new DateTime(2026, 1, 19, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4620) });

            migrationBuilder.UpdateData(
                table: "Stores",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 1, 19, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4374), new DateTime(2026, 1, 19, 13, 29, 2, 32, DateTimeKind.Utc).AddTicks(4381) });

            migrationBuilder.CreateIndex(
                name: "IX_Orders_OrderNumber",
                table: "Orders",
                column: "OrderNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Orders_StoreId_OrderNumber",
                table: "Orders",
                columns: new[] { "StoreId", "OrderNumber" });
        }
    }
}
