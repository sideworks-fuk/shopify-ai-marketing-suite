namespace QuickShipTracker.Core.DTOs;

public class ErrorResponse
{
    public string Error { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public object? Details { get; set; }
    
    public ErrorResponse(string error, string message, object? details = null)
    {
        Error = error;
        Message = message;
        Details = details;
    }
}

public class PlanLimitErrorDetails
{
    public int CurrentUsage { get; set; }
    public int PlanLimit { get; set; }
}