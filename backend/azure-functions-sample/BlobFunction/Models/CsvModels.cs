using CsvHelper.Configuration.Attributes;

namespace BlobFunction.Models;

public class CustomerCsvRecord
{
    [Name("First Name")]
    public string? FirstName { get; set; }

    [Name("Last Name")]
    public string? LastName { get; set; }

    [Name("Email")]
    public string? Email { get; set; }

    [Name("Phone")]
    public string? Phone { get; set; }

    [Name("Accepts Email Marketing")]
    public string? AcceptsEmailMarketing { get; set; }

    [Name("Customer Since")]
    public string? CustomerSince { get; set; }

    [Name("Total Spent")]
    public string? TotalSpent { get; set; }

    [Name("Total Orders")]
    public string? TotalOrders { get; set; }

    [Name("Tags")]
    public string? Tags { get; set; }

    [Name("Note")]
    public string? Note { get; set; }

    [Name("Verified Email")]
    public string? VerifiedEmail { get; set; }

    [Name("Accepts SMS Marketing")]
    public string? AcceptsSmsMarketing { get; set; }
}

public class OrderCsvRecord
{
    [Name("Name")]
    public string? Name { get; set; }

    [Name("Email")]
    public string? Email { get; set; }

    [Name("Financial Status")]
    public string? FinancialStatus { get; set; }

    [Name("Fulfillment Status")]
    public string? FulfillmentStatus { get; set; }

    [Name("Currency")]
    public string? Currency { get; set; }

    [Name("Total")]
    public string? Total { get; set; }

    [Name("Subtotal")]
    public string? Subtotal { get; set; }

    [Name("Taxes")]
    public string? Taxes { get; set; }

    [Name("Discount Amount")]
    public string? DiscountAmount { get; set; }

    [Name("Discount Code")]
    public string? DiscountCode { get; set; }

    [Name("Created at")]
    public string? CreatedAt { get; set; }

    [Name("Updated at")]
    public string? UpdatedAt { get; set; }

    [Name("Processed at")]
    public string? ProcessedAt { get; set; }

    [Name("Lineitem quantity")]
    public string? LineitemQuantity { get; set; }

    [Name("Lineitem name")]
    public string? LineitemName { get; set; }

    [Name("Lineitem price")]
    public string? LineitemPrice { get; set; }

    [Name("Lineitem sku")]
    public string? LineitemSku { get; set; }

    [Name("Lineitem requires shipping")]
    public string? LineitemRequiresShipping { get; set; }

    [Name("Lineitem taxable")]
    public string? LineitemTaxable { get; set; }

    [Name("Lineitem fulfillment status")]
    public string? LineitemFulfillmentStatus { get; set; }

    [Name("Billing Name")]
    public string? BillingName { get; set; }

    [Name("Billing Street")]
    public string? BillingStreet { get; set; }

    [Name("Billing Address1")]
    public string? BillingAddress1 { get; set; }

    [Name("Billing Address2")]
    public string? BillingAddress2 { get; set; }

    [Name("Billing Company")]
    public string? BillingCompany { get; set; }

    [Name("Billing City")]
    public string? BillingCity { get; set; }

    [Name("Billing Zip")]
    public string? BillingZip { get; set; }

    [Name("Billing Province")]
    public string? BillingProvince { get; set; }

    [Name("Billing Country")]
    public string? BillingCountry { get; set; }

    [Name("Billing Phone")]
    public string? BillingPhone { get; set; }

    [Name("Shipping Name")]
    public string? ShippingName { get; set; }

    [Name("Shipping Street")]
    public string? ShippingStreet { get; set; }

    [Name("Shipping Address1")]
    public string? ShippingAddress1 { get; set; }

    [Name("Shipping Address2")]
    public string? ShippingAddress2 { get; set; }

    [Name("Shipping Company")]
    public string? ShippingCompany { get; set; }

    [Name("Shipping City")]
    public string? ShippingCity { get; set; }

    [Name("Shipping Zip")]
    public string? ShippingZip { get; set; }

    [Name("Shipping Province")]
    public string? ShippingProvince { get; set; }

    [Name("Shipping Country")]
    public string? ShippingCountry { get; set; }

    [Name("Shipping Phone")]
    public string? ShippingPhone { get; set; }

    [Name("Notes")]
    public string? Notes { get; set; }

    [Name("Note Attributes")]
    public string? NoteAttributes { get; set; }

    [Name("Cancelled at")]
    public string? CancelledAt { get; set; }

    [Name("Payment Method")]
    public string? PaymentMethod { get; set; }

    [Name("Payment Reference")]
    public string? PaymentReference { get; set; }

    [Name("Refunded Amount")]
    public string? RefundedAmount { get; set; }

    [Name("Vendor")]
    public string? Vendor { get; set; }

    [Name("Outstanding Balance")]
    public string? OutstandingBalance { get; set; }

    [Name("Employee")]
    public string? Employee { get; set; }

    [Name("Location")]
    public string? Location { get; set; }

    [Name("Device ID")]
    public string? DeviceId { get; set; }

    [Name("Id")]
    public string? Id { get; set; }

    [Name("Tags")]
    public string? Tags { get; set; }

    [Name("Risk Level")]
    public string? RiskLevel { get; set; }

    [Name("Source")]
    public string? Source { get; set; }

    [Name("Lineitem discount")]
    public string? LineitemDiscount { get; set; }

    [Name("Tax 1 Name")]
    public string? Tax1Name { get; set; }

    [Name("Tax 1 Value")]
    public string? Tax1Value { get; set; }

    [Name("Tax 2 Name")]
    public string? Tax2Name { get; set; }

    [Name("Tax 2 Value")]
    public string? Tax2Value { get; set; }

    [Name("Tax 3 Name")]
    public string? Tax3Name { get; set; }

    [Name("Tax 3 Value")]
    public string? Tax3Value { get; set; }

    [Name("Tax 4 Name")]
    public string? Tax4Name { get; set; }

    [Name("Tax 4 Value")]
    public string? Tax4Value { get; set; }

    [Name("Tax 5 Name")]
    public string? Tax5Name { get; set; }

    [Name("Tax 5 Value")]
    public string? Tax5Value { get; set; }

    [Name("Phone")]
    public string? Phone { get; set; }

    [Name("Receipt Number")]
    public string? ReceiptNumber { get; set; }

    [Name("Duties")]
    public string? Duties { get; set; }

    [Name("Billing Province Name")]
    public string? BillingProvinceName { get; set; }

    [Name("Shipping Province Name")]
    public string? ShippingProvinceName { get; set; }

    [Name("Payment ID")]
    public string? PaymentId { get; set; }

    [Name("Payment Terms Name")]
    public string? PaymentTermsName { get; set; }

    [Name("Next Payment Due At")]
    public string? NextPaymentDueAt { get; set; }

    [Name("Payment References")]
    public string? PaymentReferences { get; set; }
}

public class ProductCsvRecord
{
    [Name("Handle")]
    public string? Handle { get; set; }

    [Name("Title")]
    public string? Title { get; set; }

    [Name("Body (HTML)")]
    public string? BodyHtml { get; set; }

    [Name("Vendor")]
    public string? Vendor { get; set; }

    [Name("Product Category")]
    public string? ProductCategory { get; set; }

    [Name("Type")]
    public string? Type { get; set; }

    [Name("Tags")]
    public string? Tags { get; set; }

    [Name("Published")]
    public string? Published { get; set; }

    [Name("Option1 Name")]
    public string? Option1Name { get; set; }

    [Name("Option1 Value")]
    public string? Option1Value { get; set; }

    [Name("Option2 Name")]
    public string? Option2Name { get; set; }

    [Name("Option2 Value")]
    public string? Option2Value { get; set; }

    [Name("Option3 Name")]
    public string? Option3Name { get; set; }

    [Name("Option3 Value")]
    public string? Option3Value { get; set; }

    [Name("Variant SKU")]
    public string? VariantSku { get; set; }

    [Name("Variant Grams")]
    public string? VariantGrams { get; set; }

    [Name("Variant Inventory Tracker")]
    public string? VariantInventoryTracker { get; set; }

    [Name("Variant Inventory Qty")]
    public string? VariantInventoryQty { get; set; }

    [Name("Variant Inventory Policy")]
    public string? VariantInventoryPolicy { get; set; }

    [Name("Variant Fulfillment Service")]
    public string? VariantFulfillmentService { get; set; }

    [Name("Variant Price")]
    public string? VariantPrice { get; set; }

    [Name("Variant Compare At Price")]
    public string? VariantCompareAtPrice { get; set; }

    [Name("Variant Requires Shipping")]
    public string? VariantRequiresShipping { get; set; }

    [Name("Variant Taxable")]
    public string? VariantTaxable { get; set; }

    [Name("Variant Barcode")]
    public string? VariantBarcode { get; set; }

    [Name("Image Src")]
    public string? ImageSrc { get; set; }

    [Name("Image Position")]
    public string? ImagePosition { get; set; }

    [Name("Image Alt Text")]
    public string? ImageAltText { get; set; }

    [Name("Gift Card")]
    public string? GiftCard { get; set; }

    [Name("SEO Title")]
    public string? SeoTitle { get; set; }

    [Name("SEO Description")]
    public string? SeoDescription { get; set; }

    [Name("Google Shopping / Google Product Category")]
    public string? GoogleProductCategory { get; set; }

    [Name("Google Shopping / Gender")]
    public string? GoogleGender { get; set; }

    [Name("Google Shopping / Age Group")]
    public string? GoogleAgeGroup { get; set; }

    [Name("Google Shopping / MPN")]
    public string? GoogleMpn { get; set; }

    [Name("Google Shopping / AdWords Grouping")]
    public string? GoogleAdWordsGrouping { get; set; }

    [Name("Google Shopping / AdWords Labels")]
    public string? GoogleAdWordsLabels { get; set; }

    [Name("Google Shopping / Condition")]
    public string? GoogleCondition { get; set; }

    [Name("Google Shopping / Custom Product")]
    public string? GoogleCustomProduct { get; set; }

    [Name("Google Shopping / Custom Label 0")]
    public string? GoogleCustomLabel0 { get; set; }

    [Name("Google Shopping / Custom Label 1")]
    public string? GoogleCustomLabel1 { get; set; }

    [Name("Google Shopping / Custom Label 2")]
    public string? GoogleCustomLabel2 { get; set; }

    [Name("Google Shopping / Custom Label 3")]
    public string? GoogleCustomLabel3 { get; set; }

    [Name("Google Shopping / Custom Label 4")]
    public string? GoogleCustomLabel4 { get; set; }

    [Name("Variant Image")]
    public string? VariantImage { get; set; }

    [Name("Variant Weight Unit")]
    public string? VariantWeightUnit { get; set; }

    [Name("Variant Tax Code")]
    public string? VariantTaxCode { get; set; }

    [Name("Cost per item")]
    public string? CostPerItem { get; set; }

    [Name("Included / Japan")]
    public string? IncludedJapan { get; set; }

    [Name("Price / Japan")]
    public string? PriceJapan { get; set; }

    [Name("Compare At Price / Japan")]
    public string? CompareAtPriceJapan { get; set; }

    [Name("Included / International")]
    public string? IncludedInternational { get; set; }

    [Name("Price / International")]
    public string? PriceInternational { get; set; }

    [Name("Compare At Price / International")]
    public string? CompareAtPriceInternational { get; set; }

    [Name("Status")]
    public string? Status { get; set; }
}

public class FileValidationResult
{
    public bool IsValid { get; set; }
    public List<string> Errors { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
    public long FileSizeBytes { get; set; }
    public int EstimatedRecordCount { get; set; }
}

public class ImportResult
{
    public int ImportedCount { get; set; }
    public int SkippedCount { get; set; }
    public int ErrorCount { get; set; }
    public List<string> Errors { get; set; } = new();
    public TimeSpan ProcessingTime { get; set; }
}