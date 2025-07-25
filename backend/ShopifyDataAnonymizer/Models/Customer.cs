using System;
using CsvHelper.Configuration;

namespace ShopifyDataAnonymizer.Models
{
    public class Customer
    {
        // Shopify CSVの実際の22カラムに対応
        public required string CustomerId { get; set; }
        public required string FirstName { get; set; }
        public required string LastName { get; set; }
        public required string Email { get; set; }
        public required string AcceptsEmailMarketing { get; set; }
        
        // Default Address情報
        public string? DefaultAddressCompany { get; set; }
        public string? DefaultAddressAddress1 { get; set; }
        public string? DefaultAddressAddress2 { get; set; }
        public string? DefaultAddressCity { get; set; }
        public string? DefaultAddressProvinceCode { get; set; }
        public string? DefaultAddressCountryCode { get; set; }
        public string? DefaultAddressZip { get; set; }
        public string? DefaultAddressPhone { get; set; }
        
        // 追加のマーケティング設定
        public string? Phone { get; set; }
        public required string AcceptsSMSMarketing { get; set; }
        
        // 購買統計
        public decimal? TotalSpent { get; set; }
        public int? TotalOrders { get; set; }
        
        // 顧客属性
        public string? Note { get; set; }
        public required string TaxExempt { get; set; }
        public string? Tags { get; set; }
        
        // Metafields
        public string? CompanyStoreName { get; set; }  // 会社名 または 店舗名 (customer.metafields.orig_fields.company_store)
        public string? Industry { get; set; }         // 業種名 (customer.metafields.orig_fields.industry)
        
        // システム情報（オプション）
        public DateTime? CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public sealed class CustomerMap : ClassMap<Customer>
    {
        public CustomerMap()
        {
            // 実際のShopify CSVヘッダーに完全対応
            Map(m => m.CustomerId).Name("Customer ID");
            Map(m => m.FirstName).Name("First Name");
            Map(m => m.LastName).Name("Last Name");
            Map(m => m.Email).Name("Email");
            Map(m => m.AcceptsEmailMarketing).Name("Accepts Email Marketing");
            
            // Default Address情報
            Map(m => m.DefaultAddressCompany).Name("Default Address Company");
            Map(m => m.DefaultAddressAddress1).Name("Default Address Address1");
            Map(m => m.DefaultAddressAddress2).Name("Default Address Address2");
            Map(m => m.DefaultAddressCity).Name("Default Address City");
            Map(m => m.DefaultAddressProvinceCode).Name("Default Address Province Code");
            Map(m => m.DefaultAddressCountryCode).Name("Default Address Country Code");
            Map(m => m.DefaultAddressZip).Name("Default Address Zip");
            Map(m => m.DefaultAddressPhone).Name("Default Address Phone");
            
            // マーケティング設定
            Map(m => m.Phone).Name("Phone");
            Map(m => m.AcceptsSMSMarketing).Name("Accepts SMS Marketing");
            
            // 購買統計
            Map(m => m.TotalSpent).Name("Total Spent");
            Map(m => m.TotalOrders).Name("Total Orders");
            
            // 顧客属性
            Map(m => m.Note).Name("Note");
            Map(m => m.TaxExempt).Name("Tax Exempt");
            Map(m => m.Tags).Name("Tags");
            
            // Metafields
            Map(m => m.CompanyStoreName).Name("会社名 または 店舗名 (customer.metafields.orig_fields.company_store)");
            Map(m => m.Industry).Name("業種名 (customer.metafields.orig_fields.industry)");
            
            // システム情報（オプション）
            Map(m => m.CreatedAt).Name("Created At");
            Map(m => m.UpdatedAt).Name("Updated At");
        }
    }
} 