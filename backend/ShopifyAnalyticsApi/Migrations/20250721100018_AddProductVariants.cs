using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShopifyAnalyticsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddProductVariants : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Customers_Email",
                table: "Customers");

            migrationBuilder.AddColumn<int>(
                name: "ProductVariantId",
                table: "OrderItems",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ProductVariants",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    Sku = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Price = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    CompareAtPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    InventoryQuantity = table.Column<int>(type: "int", nullable: false),
                    Option1Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Option1Value = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Option2Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Option2Value = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Option3Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Option3Value = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Barcode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Weight = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    WeightUnit = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    RequiresShipping = table.Column<bool>(type: "bit", nullable: false),
                    Taxable = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductVariants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductVariants_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

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
                table: "OrderItems",
                keyColumn: "Id",
                keyValue: 1,
                column: "ProductVariantId",
                value: null);

            migrationBuilder.UpdateData(
                table: "OrderItems",
                keyColumn: "Id",
                keyValue: 2,
                column: "ProductVariantId",
                value: null);

            migrationBuilder.UpdateData(
                table: "OrderItems",
                keyColumn: "Id",
                keyValue: 3,
                column: "ProductVariantId",
                value: null);

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

            migrationBuilder.CreateIndex(
                name: "IX_OrderItems_ProductVariantId",
                table: "OrderItems",
                column: "ProductVariantId");

            migrationBuilder.CreateIndex(
                name: "IX_Customers_Email",
                table: "Customers",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_ProductVariants_ProductId",
                table: "ProductVariants",
                column: "ProductId");

            migrationBuilder.AddForeignKey(
                name: "FK_OrderItems_ProductVariants_ProductVariantId",
                table: "OrderItems",
                column: "ProductVariantId",
                principalTable: "ProductVariants",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_OrderItems_ProductVariants_ProductVariantId",
                table: "OrderItems");

            migrationBuilder.DropTable(
                name: "ProductVariants");

            migrationBuilder.DropIndex(
                name: "IX_OrderItems_ProductVariantId",
                table: "OrderItems");

            migrationBuilder.DropIndex(
                name: "IX_Customers_Email",
                table: "Customers");

            migrationBuilder.DropColumn(
                name: "ProductVariantId",
                table: "OrderItems");

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 21, 7, 21, 25, 214, DateTimeKind.Utc).AddTicks(2173), new DateTime(2025, 7, 21, 7, 21, 25, 214, DateTimeKind.Utc).AddTicks(2179) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 14, 7, 21, 25, 214, DateTimeKind.Utc).AddTicks(2181), new DateTime(2025, 7, 21, 7, 21, 25, 214, DateTimeKind.Utc).AddTicks(2182) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 1, 22, 7, 21, 25, 214, DateTimeKind.Utc).AddTicks(2184), new DateTime(2025, 7, 21, 7, 21, 25, 214, DateTimeKind.Utc).AddTicks(2185) });

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 7, 7, 21, 25, 214, DateTimeKind.Utc).AddTicks(2348), new DateTime(2025, 7, 7, 7, 21, 25, 214, DateTimeKind.Utc).AddTicks(2349) });

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 14, 7, 21, 25, 214, DateTimeKind.Utc).AddTicks(2352), new DateTime(2025, 7, 14, 7, 21, 25, 214, DateTimeKind.Utc).AddTicks(2352) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 5, 22, 7, 21, 25, 214, DateTimeKind.Utc).AddTicks(2325), new DateTime(2025, 7, 21, 7, 21, 25, 214, DateTimeKind.Utc).AddTicks(2326) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 6, 7, 21, 25, 214, DateTimeKind.Utc).AddTicks(2329), new DateTime(2025, 7, 21, 7, 21, 25, 214, DateTimeKind.Utc).AddTicks(2329) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 21, 7, 21, 25, 214, DateTimeKind.Utc).AddTicks(2331), new DateTime(2025, 7, 21, 7, 21, 25, 214, DateTimeKind.Utc).AddTicks(2332) });

            migrationBuilder.CreateIndex(
                name: "IX_Customers_Email",
                table: "Customers",
                column: "Email",
                unique: true);
        }
    }
}
