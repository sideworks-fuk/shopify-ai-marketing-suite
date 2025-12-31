using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShopifyAnalyticsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddWebhookEventsIdempotencyKeyIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // WebhookEvents.IdempotencyKeyにユニークインデックスを追加
            // NULL値を許容するためのフィルター付きインデックス
            migrationBuilder.CreateIndex(
                name: "IX_WebhookEvents_IdempotencyKey",
                table: "WebhookEvents",
                column: "IdempotencyKey",
                unique: true,
                filter: "[IdempotencyKey] IS NOT NULL");

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 11, 30, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1026), new DateTime(2025, 12, 30, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1045) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 12, 23, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1062), new DateTime(2025, 12, 30, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1063) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 3, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1066), new DateTime(2025, 12, 30, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1066) });

            migrationBuilder.UpdateData(
                table: "OrderItems",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 12, 16, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1307), new DateTime(2025, 12, 16, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1308) });

            migrationBuilder.UpdateData(
                table: "OrderItems",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 12, 23, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1313), new DateTime(2025, 12, 23, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1313) });

            migrationBuilder.UpdateData(
                table: "OrderItems",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 12, 23, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1323), new DateTime(2025, 12, 23, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1324) });

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 12, 16, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1221), new DateTime(2025, 12, 16, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1228) });

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 12, 23, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1234), new DateTime(2025, 12, 23, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1234) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 10, 31, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1145), new DateTime(2025, 12, 30, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1146) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 11, 15, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1157), new DateTime(2025, 12, 30, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1158) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 11, 30, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1160), new DateTime(2025, 12, 30, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(1161) });

            migrationBuilder.UpdateData(
                table: "Stores",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2024, 12, 30, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(51), new DateTime(2025, 12, 30, 17, 46, 56, 916, DateTimeKind.Utc).AddTicks(71) });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // インデックスを削除
            migrationBuilder.DropIndex(
                name: "IX_WebhookEvents_IdempotencyKey",
                table: "WebhookEvents");

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 11, 22, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(457), new DateTime(2025, 12, 22, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(460) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 12, 15, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(463), new DateTime(2025, 12, 22, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(463) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 25, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(466), new DateTime(2025, 12, 22, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(467) });

            migrationBuilder.UpdateData(
                table: "OrderItems",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 12, 8, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(552), new DateTime(2025, 12, 8, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(553) });

            migrationBuilder.UpdateData(
                table: "OrderItems",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 12, 15, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(557), new DateTime(2025, 12, 15, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(557) });

            migrationBuilder.UpdateData(
                table: "OrderItems",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 12, 15, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(561), new DateTime(2025, 12, 15, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(562) });

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 12, 8, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(516), new DateTime(2025, 12, 8, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(516) });

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 12, 15, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(520), new DateTime(2025, 12, 15, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(520) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 10, 23, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(490), new DateTime(2025, 12, 22, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(490) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 11, 7, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(492), new DateTime(2025, 12, 22, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(493) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 11, 22, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(495), new DateTime(2025, 12, 22, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(495) });

            migrationBuilder.UpdateData(
                table: "Stores",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2024, 12, 22, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(276), new DateTime(2025, 12, 22, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(282) });
        }
    }
}
