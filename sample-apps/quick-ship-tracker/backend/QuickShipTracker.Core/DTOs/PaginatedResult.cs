namespace QuickShipTracker.Core.DTOs;

public class PaginatedResult<T>
{
    public List<T> Items { get; set; } = new();
    public PaginationInfo Pagination { get; set; } = new();
}

public class PaginationInfo
{
    public int Total { get; set; }
    public int Page { get; set; }
    public int Limit { get; set; }
    public int TotalPages { get; set; }
}