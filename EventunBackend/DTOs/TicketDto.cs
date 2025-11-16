using System.ComponentModel.DataAnnotations;

namespace EventunBackend.DTOs
{
    public class TicketDto
    {
        public string TenantId { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string EventId { get; set; } = string.Empty;
        public string TicketNumber { get; set; } = string.Empty;
        public string TicketType { get; set; } = string.Empty;
        public decimal Price { get; set; } = 0;
        public int Quantity { get; set; } = 1;
        public bool IsPurchased { get; set; } = false;
        public string? PurchasedByUserId { get; set; }
        public DateTime? PurchaseDate { get; set; }
        public string QRCode { get; set; } = string.Empty;
        public string TicketStatus { get; set; } = string.Empty;
    }

    public class CreateTicketDto
    {
        [Required]
        public string EventId { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string TicketType { get; set; } = string.Empty;

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Price must be greater than 0")]
        public decimal Price { get; set; }

        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "Quantity must be at least 1")]
        public int Quantity { get; set; } = 1;
    }

    public class PurchaseTicketDto
    {
        [Required]
        public string TicketId { get; set; } = string.Empty;
    }

    public class TicketSearchDto
    {
        public string? Query { get; set; }
        public string? TicketNumber { get; set; }
        public string? TicketType { get; set; }
        public string? TicketPrice { get; set; }
        public string? TicketQte { get; set; }
    }
}