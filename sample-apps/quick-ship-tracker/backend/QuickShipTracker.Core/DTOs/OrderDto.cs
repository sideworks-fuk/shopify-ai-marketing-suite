namespace QuickShipTracker.Core.DTOs;

public class OrderDto
{
    public string Id { get; set; } = string.Empty;
    public string OrderNumber { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string TotalPrice { get; set; } = string.Empty;
    public string Currency { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string FulfillmentStatus { get; set; } = string.Empty;
    public TrackingInfoDto? TrackingInfo { get; set; }
}

public class OrderDetailDto : OrderDto
{
    public CustomerDto Customer { get; set; } = new();
    public AddressDto ShippingAddress { get; set; } = new();
    public List<LineItemDto> LineItems { get; set; } = new();
    public string FinancialStatus { get; set; } = string.Empty;
}

public class CustomerDto
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
}

public class AddressDto
{
    public string Name { get; set; } = string.Empty;
    public string Address1 { get; set; } = string.Empty;
    public string? Address2 { get; set; }
    public string City { get; set; } = string.Empty;
    public string Province { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string Zip { get; set; } = string.Empty;
}

public class LineItemDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? VariantTitle { get; set; }
    public int Quantity { get; set; }
    public string Price { get; set; } = string.Empty;
}