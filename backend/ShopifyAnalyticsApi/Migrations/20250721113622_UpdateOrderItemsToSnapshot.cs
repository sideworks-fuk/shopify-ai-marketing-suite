using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShopifyAnalyticsApi.Migrations
{
    /// <inheritdoc />
    public partial class UpdateOrderItemsToSnapshot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_OrderItems_ProductVariants_ProductVariantId",
                table: "OrderItems");

            migrationBuilder.DropForeignKey(
                name: "FK_OrderItems_Products_ProductId",
                table: "OrderItems");

            migrationBuilder.DropIndex(
                name: "IX_OrderItems_ProductId",
                table: "OrderItems");

            migrationBuilder.DropIndex(
                name: "IX_OrderItems_ProductVariantId",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "ProductId",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "ProductVariantId",
                table: "OrderItems");

            migrationBuilder.AddColumn<decimal>(
                name: "CompareAtPrice",
                table: "OrderItems",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "OrderItems",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "Option1Name",
                table: "OrderItems",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Option1Value",
                table: "OrderItems",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Option2Name",
                table: "OrderItems",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Option2Value",
                table: "OrderItems",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Option3Name",
                table: "OrderItems",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Option3Value",
                table: "OrderItems",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProductHandle",
                table: "OrderItems",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProductTitle",
                table: "OrderItems",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ProductType",
                table: "OrderItems",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProductVendor",
                table: "OrderItems",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "RequiresShipping",
                table: "OrderItems",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Sku",
                table: "OrderItems",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "Taxable",
                table: "OrderItems",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "OrderItems",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "VariantTitle",
                table: "OrderItems",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 21, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(5957), new DateTime(2025, 7, 21, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(5961) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 14, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(5963), new DateTime(2025, 7, 21, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(5964) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 1, 22, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(5966), new DateTime(2025, 7, 21, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(5967) });

            migrationBuilder.UpdateData(
                table: "OrderItems",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CompareAtPrice", "CreatedAt", "Option1Name", "Option1Value", "Option2Name", "Option2Value", "Option3Name", "Option3Value", "ProductHandle", "ProductTitle", "ProductType", "ProductVendor", "RequiresShipping", "Sku", "Taxable", "UpdatedAt", "VariantTitle" },
                values: new object[] { 4000m, new DateTime(2025, 7, 7, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(6166), "サイズ", "M", "カラー", "ブルー", null, null, "organic-cotton-tshirt", "オーガニックコットンTシャツ", "衣類", "テストベンダーA01", true, "TSHIRT-001", true, new DateTime(2025, 7, 7, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(6167), "M / ブルー" });

            migrationBuilder.UpdateData(
                table: "OrderItems",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CompareAtPrice", "CreatedAt", "Option1Name", "Option1Value", "Option2Name", "Option2Value", "Option3Name", "Option3Value", "ProductHandle", "ProductTitle", "ProductType", "ProductVendor", "RequiresShipping", "Sku", "Taxable", "UpdatedAt", "VariantTitle" },
                values: new object[] { 3200m, new DateTime(2025, 7, 14, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(6177), "容量", "500ml", null, null, null, null, "stainless-tumbler", "ステンレス製タンブラー", "雑貨", "テストベンダーB02", true, "TUMBLER-001", true, new DateTime(2025, 7, 14, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(6177), "500ml" });

            migrationBuilder.UpdateData(
                table: "OrderItems",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CompareAtPrice", "CreatedAt", "Option1Name", "Option1Value", "Option2Name", "Option2Value", "Option3Name", "Option3Value", "ProductHandle", "ProductTitle", "ProductType", "ProductVendor", "RequiresShipping", "Sku", "Taxable", "UpdatedAt", "VariantTitle" },
                values: new object[] { 4800m, new DateTime(2025, 7, 14, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(6181), "容量", "100g", null, null, null, null, "organic-green-tea-set", "オーガニック緑茶セット", "食品", "テストベンダーC03", true, "TEA-001", true, new DateTime(2025, 7, 14, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(6181), "100g" });

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 7, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(6086), new DateTime(2025, 7, 7, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(6086) });

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 14, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(6094), new DateTime(2025, 7, 14, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(6095) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 5, 22, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(6052), new DateTime(2025, 7, 21, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(6053) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 6, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(6056), new DateTime(2025, 7, 21, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(6056) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 21, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(6058), new DateTime(2025, 7, 21, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(6059) });

            migrationBuilder.UpdateData(
                table: "Stores",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2024, 7, 21, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(5698), new DateTime(2025, 7, 21, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(5728) });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CompareAtPrice",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "Option1Name",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "Option1Value",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "Option2Name",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "Option2Value",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "Option3Name",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "Option3Value",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "ProductHandle",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "ProductTitle",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "ProductType",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "ProductVendor",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "RequiresShipping",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "Sku",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "Taxable",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "VariantTitle",
                table: "OrderItems");

            migrationBuilder.AddColumn<int>(
                name: "ProductId",
                table: "OrderItems",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ProductVariantId",
                table: "OrderItems",
                type: "int",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 21, 10, 37, 33, 480, DateTimeKind.Utc).AddTicks(8101), new DateTime(2025, 7, 21, 10, 37, 33, 480, DateTimeKind.Utc).AddTicks(8102) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 14, 10, 37, 33, 480, DateTimeKind.Utc).AddTicks(8105), new DateTime(2025, 7, 21, 10, 37, 33, 480, DateTimeKind.Utc).AddTicks(8106) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 1, 22, 10, 37, 33, 480, DateTimeKind.Utc).AddTicks(8108), new DateTime(2025, 7, 21, 10, 37, 33, 480, DateTimeKind.Utc).AddTicks(8108) });

            migrationBuilder.UpdateData(
                table: "OrderItems",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "ProductId", "ProductVariantId" },
                values: new object[] { 1, null });

            migrationBuilder.UpdateData(
                table: "OrderItems",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "ProductId", "ProductVariantId" },
                values: new object[] { 2, null });

            migrationBuilder.UpdateData(
                table: "OrderItems",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "ProductId", "ProductVariantId" },
                values: new object[] { 3, null });

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 7, 10, 37, 33, 480, DateTimeKind.Utc).AddTicks(8215), new DateTime(2025, 7, 7, 10, 37, 33, 480, DateTimeKind.Utc).AddTicks(8216) });

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 14, 10, 37, 33, 480, DateTimeKind.Utc).AddTicks(8219), new DateTime(2025, 7, 14, 10, 37, 33, 480, DateTimeKind.Utc).AddTicks(8219) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 5, 22, 10, 37, 33, 480, DateTimeKind.Utc).AddTicks(8186), new DateTime(2025, 7, 21, 10, 37, 33, 480, DateTimeKind.Utc).AddTicks(8186) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 6, 10, 37, 33, 480, DateTimeKind.Utc).AddTicks(8188), new DateTime(2025, 7, 21, 10, 37, 33, 480, DateTimeKind.Utc).AddTicks(8189) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 21, 10, 37, 33, 480, DateTimeKind.Utc).AddTicks(8191), new DateTime(2025, 7, 21, 10, 37, 33, 480, DateTimeKind.Utc).AddTicks(8191) });

            migrationBuilder.UpdateData(
                table: "Stores",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2024, 7, 21, 10, 37, 33, 480, DateTimeKind.Utc).AddTicks(7852), new DateTime(2025, 7, 21, 10, 37, 33, 480, DateTimeKind.Utc).AddTicks(7867) });

            migrationBuilder.CreateIndex(
                name: "IX_OrderItems_ProductId",
                table: "OrderItems",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderItems_ProductVariantId",
                table: "OrderItems",
                column: "ProductVariantId");

            migrationBuilder.AddForeignKey(
                name: "FK_OrderItems_ProductVariants_ProductVariantId",
                table: "OrderItems",
                column: "ProductVariantId",
                principalTable: "ProductVariants",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_OrderItems_Products_ProductId",
                table: "OrderItems",
                column: "ProductId",
                principalTable: "Products",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
