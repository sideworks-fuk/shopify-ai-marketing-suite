using System.ComponentModel.DataAnnotations;

namespace QuickShipTracker.Core.DTOs;

public class LoginRequest
{
    [Required]
    public string Shop { get; set; } = string.Empty;
}