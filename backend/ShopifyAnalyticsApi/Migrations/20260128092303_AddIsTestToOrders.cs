using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShopifyAnalyticsApi.Migrations
{
    /// <inheritdoc />
    /// <summary>
    /// OrdersテーブルにIsTest（テスト注文フラグ）カラムを追加。
    /// 分析では本注文のみ対象とするため、IsTest=trueの注文は除外する。
    /// </summary>
    public partial class AddIsTestToOrders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsTest",
                table: "Orders",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsTest",
                table: "Orders");
        }
    }
}
