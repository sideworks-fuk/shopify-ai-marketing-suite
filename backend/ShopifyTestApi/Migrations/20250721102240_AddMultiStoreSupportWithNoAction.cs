using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShopifyTestApi.Migrations
{
    /// <inheritdoc />
    public partial class AddMultiStoreSupportWithNoAction : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "StoreId",
                table: "Products",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "StoreId",
                table: "Orders",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "StoreId",
                table: "Customers",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "Stores",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Domain = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    ShopifyShopId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Stores", x => x.Id);
                });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "StoreId", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 21, 10, 22, 39, 697, DateTimeKind.Utc).AddTicks(5222), 0, new DateTime(2025, 7, 21, 10, 22, 39, 697, DateTimeKind.Utc).AddTicks(5237) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "StoreId", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 14, 10, 22, 39, 697, DateTimeKind.Utc).AddTicks(5243), 0, new DateTime(2025, 7, 21, 10, 22, 39, 697, DateTimeKind.Utc).AddTicks(5244) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "StoreId", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 1, 22, 10, 22, 39, 697, DateTimeKind.Utc).AddTicks(5246), 0, new DateTime(2025, 7, 21, 10, 22, 39, 697, DateTimeKind.Utc).AddTicks(5247) });

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "StoreId", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 7, 10, 22, 39, 697, DateTimeKind.Utc).AddTicks(5650), 0, new DateTime(2025, 7, 7, 10, 22, 39, 697, DateTimeKind.Utc).AddTicks(5650) });

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "StoreId", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 14, 10, 22, 39, 697, DateTimeKind.Utc).AddTicks(5653), 0, new DateTime(2025, 7, 14, 10, 22, 39, 697, DateTimeKind.Utc).AddTicks(5653) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "StoreId", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 5, 22, 10, 22, 39, 697, DateTimeKind.Utc).AddTicks(5619), 0, new DateTime(2025, 7, 21, 10, 22, 39, 697, DateTimeKind.Utc).AddTicks(5620) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "StoreId", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 6, 10, 22, 39, 697, DateTimeKind.Utc).AddTicks(5622), 0, new DateTime(2025, 7, 21, 10, 22, 39, 697, DateTimeKind.Utc).AddTicks(5622) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "StoreId", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 21, 10, 22, 39, 697, DateTimeKind.Utc).AddTicks(5624), 0, new DateTime(2025, 7, 21, 10, 22, 39, 697, DateTimeKind.Utc).AddTicks(5624) });

            migrationBuilder.CreateIndex(
                name: "IX_Products_StoreId_Title",
                table: "Products",
                columns: new[] { "StoreId", "Title" });

            migrationBuilder.CreateIndex(
                name: "IX_Orders_StoreId_OrderNumber",
                table: "Orders",
                columns: new[] { "StoreId", "OrderNumber" });

            migrationBuilder.CreateIndex(
                name: "IX_Customers_ShopifyCustomerId",
                table: "Customers",
                column: "ShopifyCustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_Customers_StoreId_Email",
                table: "Customers",
                columns: new[] { "StoreId", "Email" });

            migrationBuilder.CreateIndex(
                name: "IX_Customers_StoreId_ShopifyCustomerId",
                table: "Customers",
                columns: new[] { "StoreId", "ShopifyCustomerId" });

            migrationBuilder.AddForeignKey(
                name: "FK_Customers_Stores_StoreId",
                table: "Customers",
                column: "StoreId",
                principalTable: "Stores",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Orders_Stores_StoreId",
                table: "Orders",
                column: "StoreId",
                principalTable: "Stores",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Products_Stores_StoreId",
                table: "Products",
                column: "StoreId",
                principalTable: "Stores",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Customers_Stores_StoreId",
                table: "Customers");

            migrationBuilder.DropForeignKey(
                name: "FK_Orders_Stores_StoreId",
                table: "Orders");

            migrationBuilder.DropForeignKey(
                name: "FK_Products_Stores_StoreId",
                table: "Products");

            migrationBuilder.DropTable(
                name: "Stores");

            migrationBuilder.DropIndex(
                name: "IX_Products_StoreId_Title",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_Orders_StoreId_OrderNumber",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_Customers_ShopifyCustomerId",
                table: "Customers");

            migrationBuilder.DropIndex(
                name: "IX_Customers_StoreId_Email",
                table: "Customers");

            migrationBuilder.DropIndex(
                name: "IX_Customers_StoreId_ShopifyCustomerId",
                table: "Customers");

            migrationBuilder.DropColumn(
                name: "StoreId",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "StoreId",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "StoreId",
                table: "Customers");

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 21, 10, 10, 11, 107, DateTimeKind.Utc).AddTicks(6055), new DateTime(2025, 7, 21, 10, 10, 11, 107, DateTimeKind.Utc).AddTicks(6079) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 14, 10, 10, 11, 107, DateTimeKind.Utc).AddTicks(6137), new DateTime(2025, 7, 21, 10, 10, 11, 107, DateTimeKind.Utc).AddTicks(6138) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 1, 22, 10, 10, 11, 107, DateTimeKind.Utc).AddTicks(6140), new DateTime(2025, 7, 21, 10, 10, 11, 107, DateTimeKind.Utc).AddTicks(6141) });

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
    }
}
