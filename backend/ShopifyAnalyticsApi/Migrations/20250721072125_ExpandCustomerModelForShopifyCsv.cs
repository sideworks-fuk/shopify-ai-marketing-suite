using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShopifyAnalyticsApi.Migrations
{
    /// <inheritdoc />
    public partial class ExpandCustomerModelForShopifyCsv : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ProductType",
                table: "Products",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Vendor",
                table: "Products",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "AcceptsEmailMarketing",
                table: "Customers",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "AcceptsSMSMarketing",
                table: "Customers",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "AddressPhone",
                table: "Customers",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "City",
                table: "Customers",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Company",
                table: "Customers",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CompanyStoreName",
                table: "Customers",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CountryCode",
                table: "Customers",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Industry",
                table: "Customers",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProvinceCode",
                table: "Customers",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Tags",
                table: "Customers",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "TaxExempt",
                table: "Customers",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "TotalOrders",
                table: "Customers",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "AcceptsEmailMarketing", "AcceptsSMSMarketing", "AddressPhone", "City", "Company", "CompanyStoreName", "CountryCode", "CreatedAt", "Industry", "ProvinceCode", "Tags", "TaxExempt", "TotalOrders", "UpdatedAt" },
                values: new object[] { false, false, null, null, null, null, null, new DateTime(2025, 6, 21, 7, 21, 25, 214, DateTimeKind.Utc).AddTicks(2173), null, null, null, false, 3, new DateTime(2025, 7, 21, 7, 21, 25, 214, DateTimeKind.Utc).AddTicks(2179) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "AcceptsEmailMarketing", "AcceptsSMSMarketing", "AddressPhone", "City", "Company", "CompanyStoreName", "CountryCode", "CreatedAt", "Industry", "ProvinceCode", "Tags", "TaxExempt", "TotalOrders", "UpdatedAt" },
                values: new object[] { false, false, null, null, null, null, null, new DateTime(2025, 7, 14, 7, 21, 25, 214, DateTimeKind.Utc).AddTicks(2181), null, null, null, false, 1, new DateTime(2025, 7, 21, 7, 21, 25, 214, DateTimeKind.Utc).AddTicks(2182) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "AcceptsEmailMarketing", "AcceptsSMSMarketing", "AddressPhone", "City", "Company", "CompanyStoreName", "CountryCode", "CreatedAt", "Industry", "ProvinceCode", "Tags", "TaxExempt", "TotalOrders", "UpdatedAt" },
                values: new object[] { false, false, null, null, null, null, null, new DateTime(2025, 1, 22, 7, 21, 25, 214, DateTimeKind.Utc).AddTicks(2184), null, null, null, false, 15, new DateTime(2025, 7, 21, 7, 21, 25, 214, DateTimeKind.Utc).AddTicks(2185) });

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
                columns: new[] { "CreatedAt", "ProductType", "UpdatedAt", "Vendor" },
                values: new object[] { new DateTime(2025, 5, 22, 7, 21, 25, 214, DateTimeKind.Utc).AddTicks(2325), null, new DateTime(2025, 7, 21, 7, 21, 25, 214, DateTimeKind.Utc).AddTicks(2326), null });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "ProductType", "UpdatedAt", "Vendor" },
                values: new object[] { new DateTime(2025, 6, 6, 7, 21, 25, 214, DateTimeKind.Utc).AddTicks(2329), null, new DateTime(2025, 7, 21, 7, 21, 25, 214, DateTimeKind.Utc).AddTicks(2329), null });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "ProductType", "UpdatedAt", "Vendor" },
                values: new object[] { new DateTime(2025, 6, 21, 7, 21, 25, 214, DateTimeKind.Utc).AddTicks(2331), null, new DateTime(2025, 7, 21, 7, 21, 25, 214, DateTimeKind.Utc).AddTicks(2332), null });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ProductType",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "Vendor",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "AcceptsEmailMarketing",
                table: "Customers");

            migrationBuilder.DropColumn(
                name: "AcceptsSMSMarketing",
                table: "Customers");

            migrationBuilder.DropColumn(
                name: "AddressPhone",
                table: "Customers");

            migrationBuilder.DropColumn(
                name: "City",
                table: "Customers");

            migrationBuilder.DropColumn(
                name: "Company",
                table: "Customers");

            migrationBuilder.DropColumn(
                name: "CompanyStoreName",
                table: "Customers");

            migrationBuilder.DropColumn(
                name: "CountryCode",
                table: "Customers");

            migrationBuilder.DropColumn(
                name: "Industry",
                table: "Customers");

            migrationBuilder.DropColumn(
                name: "ProvinceCode",
                table: "Customers");

            migrationBuilder.DropColumn(
                name: "Tags",
                table: "Customers");

            migrationBuilder.DropColumn(
                name: "TaxExempt",
                table: "Customers");

            migrationBuilder.DropColumn(
                name: "TotalOrders",
                table: "Customers");

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 21, 4, 56, 29, 723, DateTimeKind.Utc).AddTicks(2103), new DateTime(2025, 7, 21, 4, 56, 29, 723, DateTimeKind.Utc).AddTicks(2128) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 14, 4, 56, 29, 723, DateTimeKind.Utc).AddTicks(2130), new DateTime(2025, 7, 21, 4, 56, 29, 723, DateTimeKind.Utc).AddTicks(2131) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 1, 22, 4, 56, 29, 723, DateTimeKind.Utc).AddTicks(2133), new DateTime(2025, 7, 21, 4, 56, 29, 723, DateTimeKind.Utc).AddTicks(2133) });

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 7, 4, 56, 29, 723, DateTimeKind.Utc).AddTicks(2358), new DateTime(2025, 7, 7, 4, 56, 29, 723, DateTimeKind.Utc).AddTicks(2359) });

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 14, 4, 56, 29, 723, DateTimeKind.Utc).AddTicks(2361), new DateTime(2025, 7, 14, 4, 56, 29, 723, DateTimeKind.Utc).AddTicks(2362) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 5, 22, 4, 56, 29, 723, DateTimeKind.Utc).AddTicks(2337), new DateTime(2025, 7, 21, 4, 56, 29, 723, DateTimeKind.Utc).AddTicks(2338) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 6, 4, 56, 29, 723, DateTimeKind.Utc).AddTicks(2340), new DateTime(2025, 7, 21, 4, 56, 29, 723, DateTimeKind.Utc).AddTicks(2340) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 21, 4, 56, 29, 723, DateTimeKind.Utc).AddTicks(2342), new DateTime(2025, 7, 21, 4, 56, 29, 723, DateTimeKind.Utc).AddTicks(2343) });
        }
    }
}
