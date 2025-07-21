using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace ShopifyTestApi.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Customers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FirstName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    LastName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    Phone = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CustomerSegment = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    TotalSpent = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    OrdersCount = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Customers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Products",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Title = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Price = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Category = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    InventoryQuantity = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Products", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Orders",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OrderNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CustomerId = table.Column<int>(type: "int", nullable: false),
                    TotalPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    SubtotalPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TaxPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Orders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Orders_Customers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "Customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OrderItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OrderId = table.Column<int>(type: "int", nullable: false),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    Price = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TotalPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrderItems_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_OrderItems_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                table: "Customers",
                columns: new[] { "Id", "CreatedAt", "CustomerSegment", "Email", "FirstName", "LastName", "OrdersCount", "Phone", "TotalSpent", "UpdatedAt" },
                values: new object[,]
                {
                    { 1, new DateTime(2025, 6, 21, 4, 56, 29, 723, DateTimeKind.Utc).AddTicks(2103), "リピーター", "yamada@example.com", "太郎", "山田", 3, "090-1234-5678", 25000m, new DateTime(2025, 7, 21, 4, 56, 29, 723, DateTimeKind.Utc).AddTicks(2128) },
                    { 2, new DateTime(2025, 7, 14, 4, 56, 29, 723, DateTimeKind.Utc).AddTicks(2130), "新規顧客", "sato@example.com", "花子", "佐藤", 1, "080-9876-5432", 8500m, new DateTime(2025, 7, 21, 4, 56, 29, 723, DateTimeKind.Utc).AddTicks(2131) },
                    { 3, new DateTime(2025, 1, 22, 4, 56, 29, 723, DateTimeKind.Utc).AddTicks(2133), "VIP顧客", "suzuki@example.com", "一郎", "鈴木", 15, null, 125000m, new DateTime(2025, 7, 21, 4, 56, 29, 723, DateTimeKind.Utc).AddTicks(2133) }
                });

            migrationBuilder.InsertData(
                table: "Products",
                columns: new[] { "Id", "Category", "CreatedAt", "Currency", "Description", "InventoryQuantity", "Price", "Title", "UpdatedAt" },
                values: new object[,]
                {
                    { 1, "衣類", new DateTime(2025, 5, 22, 4, 56, 29, 723, DateTimeKind.Utc).AddTicks(2337), "JPY", "環境に優しいオーガニックコットン100%のTシャツ", 50, 3500m, "オーガニックコットンTシャツ", new DateTime(2025, 7, 21, 4, 56, 29, 723, DateTimeKind.Utc).AddTicks(2338) },
                    { 2, "雑貨", new DateTime(2025, 6, 6, 4, 56, 29, 723, DateTimeKind.Utc).AddTicks(2340), "JPY", "保温・保冷効果抜群のステンレス製タンブラー", 25, 2800m, "ステンレス製タンブラー", new DateTime(2025, 7, 21, 4, 56, 29, 723, DateTimeKind.Utc).AddTicks(2340) },
                    { 3, "食品", new DateTime(2025, 6, 21, 4, 56, 29, 723, DateTimeKind.Utc).AddTicks(2342), "JPY", "厳選されたオーガニック緑茶の詰め合わせセット", 15, 4200m, "オーガニック緑茶セット", new DateTime(2025, 7, 21, 4, 56, 29, 723, DateTimeKind.Utc).AddTicks(2343) }
                });

            migrationBuilder.InsertData(
                table: "Orders",
                columns: new[] { "Id", "CreatedAt", "Currency", "CustomerId", "OrderNumber", "Status", "SubtotalPrice", "TaxPrice", "TotalPrice", "UpdatedAt" },
                values: new object[,]
                {
                    { 1, new DateTime(2025, 7, 7, 4, 56, 29, 723, DateTimeKind.Utc).AddTicks(2358), "JPY", 1, "ORD-001", "completed", 6300m, 700m, 7000m, new DateTime(2025, 7, 7, 4, 56, 29, 723, DateTimeKind.Utc).AddTicks(2359) },
                    { 2, new DateTime(2025, 7, 14, 4, 56, 29, 723, DateTimeKind.Utc).AddTicks(2361), "JPY", 2, "ORD-002", "completed", 7700m, 800m, 8500m, new DateTime(2025, 7, 14, 4, 56, 29, 723, DateTimeKind.Utc).AddTicks(2362) }
                });

            migrationBuilder.InsertData(
                table: "OrderItems",
                columns: new[] { "Id", "OrderId", "Price", "ProductId", "Quantity", "TotalPrice" },
                values: new object[,]
                {
                    { 1, 1, 3500m, 1, 2, 7000m },
                    { 2, 2, 2800m, 2, 1, 2800m },
                    { 3, 2, 4200m, 3, 1, 4200m }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Customers_Email",
                table: "Customers",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OrderItems_OrderId",
                table: "OrderItems",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderItems_ProductId",
                table: "OrderItems",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_CustomerId",
                table: "Orders",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_OrderNumber",
                table: "Orders",
                column: "OrderNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Products_Title",
                table: "Products",
                column: "Title");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OrderItems");

            migrationBuilder.DropTable(
                name: "Orders");

            migrationBuilder.DropTable(
                name: "Products");

            migrationBuilder.DropTable(
                name: "Customers");
        }
    }
}
