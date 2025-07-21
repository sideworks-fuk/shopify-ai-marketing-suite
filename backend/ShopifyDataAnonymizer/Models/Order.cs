// Models/Order.cs
using System;
using CsvHelper.Configuration;

namespace ShopifyDataAnonymizer.Models
{
    public class Order
    {
        public string? OrderId { get; set; }
        public string? Name { get; set; }
        public string? Email { get; set; }
        public string? FinancialStatus { get; set; }
        public DateTime? PaidAt { get; set; }
        public string? FulfillmentStatus { get; set; }
        public DateTime? FulfilledAt { get; set; }
        public string? AcceptsMarketing { get; set; }
        public string? Currency { get; set; }
        public decimal? Subtotal { get; set; }
        public decimal? Shipping { get; set; }
        public decimal? Taxes { get; set; }
        public decimal? Total { get; set; }
        public string? DiscountCode { get; set; }
        public decimal? DiscountAmount { get; set; }
        public string? ShippingMethod { get; set; }
        public DateTime? CreatedAt { get; set; }
        public string? Notes { get; set; }
        public string? NoteAttributes { get; set; }
        public DateTime? CancelledAt { get; set; }
        public string? PaymentMethod { get; set; }
        public string? PaymentReference { get; set; }
        public string? PaymentId { get; set; }
        public string? PaymentTermsName { get; set; }
        public DateTime? NextPaymentDueAt { get; set; }
        public decimal? RefundedAmount { get; set; }
        public decimal? OutstandingBalance { get; set; }
        public string? Employee { get; set; }
        public string? Location { get; set; }
        public string? DeviceId { get; set; }
        public string? Tags { get; set; }
        public string? RiskLevel { get; set; }
        public string? Source { get; set; }
        public string? Phone { get; set; }
        public string? ReceiptNumber { get; set; }
        public decimal? Duties { get; set; }
        
        // Lineitem fields
        public int? LineitemQuantity { get; set; }
        public string? LineitemName { get; set; }
        public decimal? LineitemPrice { get; set; }
        public decimal? LineitemCompareAtPrice { get; set; }
        public string? LineitemSku { get; set; }
        public string? LineitemRequiresShipping { get; set; }
        public string? LineitemTaxable { get; set; }
        public string? LineitemFulfillmentStatus { get; set; }
        public decimal? LineitemDiscount { get; set; }
    }

    public class OrderItem
    {
        public int Quantity { get; set; }
        public string? Name { get; set; }
        public decimal? Price { get; set; }
        public decimal? CompareAtPrice { get; set; }
        public string? SKU { get; set; }
        public string? RequiresShipping { get; set; }
        public string? Taxable { get; set; }
        public string? FulfillmentStatus { get; set; }
        public string? Vendor { get; set; }
        public decimal? Discount { get; set; }
        public string? Tax1Name { get; set; }
        public decimal? Tax1Value { get; set; }
        public string? Tax2Name { get; set; }
        public decimal? Tax2Value { get; set; }
        public string? Tax3Name { get; set; }
        public decimal? Tax3Value { get; set; }
        public string? Tax4Name { get; set; }
        public decimal? Tax4Value { get; set; }
        public string? Tax5Name { get; set; }
        public decimal? Tax5Value { get; set; }
    }

    public class OrderAddress
    {
        public string? Name { get; set; }
        public string? Street { get; set; }
        public string? Address1 { get; set; }
        public string? Address2 { get; set; }
        public string? Company { get; set; }
        public string? City { get; set; }
        public string? Zip { get; set; }
        public string? Province { get; set; }
        public string? ProvinceName { get; set; }
        public string? Country { get; set; }
        public string? Phone { get; set; }
    }

    public sealed class OrderMap : ClassMap<Order>
    {
        public OrderMap()
        {
            Map(m => m.OrderId).Name("Id");  // ShopifyのオーダーID
            Map(m => m.Name).Name("Name");
            Map(m => m.Email).Name("Email");
            Map(m => m.FinancialStatus).Name("Financial Status");
            Map(m => m.PaidAt).Name("Paid at");
            Map(m => m.FulfillmentStatus).Name("Fulfillment Status");
            Map(m => m.FulfilledAt).Name("Fulfilled at");
            Map(m => m.AcceptsMarketing).Name("Accepts Marketing");
            Map(m => m.Currency).Name("Currency");
            Map(m => m.Subtotal).Name("Subtotal");
            Map(m => m.Shipping).Name("Shipping");
            Map(m => m.Taxes).Name("Taxes");
            Map(m => m.Total).Name("Total");
            Map(m => m.DiscountCode).Name("Discount Code");
            Map(m => m.DiscountAmount).Name("Discount Amount");
            Map(m => m.ShippingMethod).Name("Shipping Method");
            Map(m => m.CreatedAt).Name("Created at");
            Map(m => m.Notes).Name("Notes");
            Map(m => m.NoteAttributes).Name("Note Attributes");
            Map(m => m.CancelledAt).Name("Cancelled at");
            Map(m => m.PaymentMethod).Name("Payment Method");
            Map(m => m.PaymentReference).Name("Payment Reference");
            Map(m => m.PaymentId).Name("Payment ID");
            Map(m => m.PaymentTermsName).Name("Payment Terms Name");
            Map(m => m.NextPaymentDueAt).Name("Next Payment Due At");
            Map(m => m.RefundedAmount).Name("Refunded Amount");
            Map(m => m.OutstandingBalance).Name("Outstanding Balance");
            Map(m => m.Employee).Name("Employee");
            Map(m => m.Location).Name("Location");
            Map(m => m.DeviceId).Name("Device ID");
            Map(m => m.Tags).Name("Tags");
            Map(m => m.RiskLevel).Name("Risk Level");
            Map(m => m.Source).Name("Source");
            Map(m => m.Phone).Name("Phone");
            Map(m => m.ReceiptNumber).Name("Receipt Number");
            Map(m => m.Duties).Name("Duties");
            
            // Lineitem mappings
            Map(m => m.LineitemQuantity).Name("Lineitem quantity");
            Map(m => m.LineitemName).Name("Lineitem name");
            Map(m => m.LineitemPrice).Name("Lineitem price");
            Map(m => m.LineitemCompareAtPrice).Name("Lineitem compare at price");
            Map(m => m.LineitemSku).Name("Lineitem sku");
            Map(m => m.LineitemRequiresShipping).Name("Lineitem requires shipping");
            Map(m => m.LineitemTaxable).Name("Lineitem taxable");
            Map(m => m.LineitemFulfillmentStatus).Name("Lineitem fulfillment status");
            Map(m => m.LineitemDiscount).Name("Lineitem discount");
        }
    }
}