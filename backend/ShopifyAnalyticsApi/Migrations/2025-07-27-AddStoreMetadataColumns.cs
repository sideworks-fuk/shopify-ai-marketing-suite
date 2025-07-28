using System;
using Microsoft.EntityFrameworkCore.Migrations;

namespace ShopifyAnalyticsApi.Migrations
{
    public partial class AddStoreMetadataColumns : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Description カラムを追加
            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Stores",
                maxLength: 500,
                nullable: true);

            // DataType カラムを追加（production/test）
            migrationBuilder.AddColumn<string>(
                name: "DataType",
                table: "Stores",
                maxLength: 50,
                nullable: false,
                defaultValue: "production");

            // IsActive カラムを追加
            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "Stores",
                nullable: false,
                defaultValue: true);

            // Settings カラムを追加（JSON形式の追加設定用）
            migrationBuilder.AddColumn<string>(
                name: "Settings",
                table: "Stores",
                nullable: true);

            // 既存データの更新
            migrationBuilder.UpdateData(
                table: "Stores",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "Description", "DataType" },
                values: new object[] { "実データを使用したメイン分析環境", "production" });

            // テストストアデータを追加
            migrationBuilder.InsertData(
                table: "Stores",
                columns: new[] { "Id", "Name", "Description", "DataType", "IsActive", "CreatedAt", "UpdatedAt" },
                values: new object[,]
                {
                    { 2, "テストストア", "2020-2025年のテストデータ環境", "test", true, DateTime.UtcNow, DateTime.UtcNow },
                    { 3, "デモストア", "デモンストレーション用環境", "test", true, DateTime.UtcNow, DateTime.UtcNow }
                });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // 追加したストアデータを削除
            migrationBuilder.DeleteData(
                table: "Stores",
                keyColumn: "Id",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "Stores",
                keyColumn: "Id",
                keyValue: 3);

            // カラムを削除
            migrationBuilder.DropColumn(name: "Description", table: "Stores");
            migrationBuilder.DropColumn(name: "DataType", table: "Stores");
            migrationBuilder.DropColumn(name: "IsActive", table: "Stores");
            migrationBuilder.DropColumn(name: "Settings", table: "Stores");
        }
    }
}