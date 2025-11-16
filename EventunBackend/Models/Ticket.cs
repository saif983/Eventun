using System.ComponentModel.DataAnnotations;

namespace EventunBackend.Models
{
    public class Ticket
    {
        [Key]
        public string TenantId { get; set; } = string.Empty;
         
        public string ticketFile { get; set; } = string.Empty;

        [Required]
        public string EventId { get; set; } = string.Empty;
        
        [Required]
        public string UserId { get; set; } = string.Empty;
        
        public string TicketNumber { get; set; } = string.Empty;
        
        public string TicketStatus { get; set; } = string.Empty;
        
        public string TicketType { get; set; } = string.Empty;
        
        public decimal Price { get; set; } = 0;
        
        public int Quantity { get; set; } = 1;
        
        public bool IsPurchased { get; set; } = false;
        
        public string? PurchasedByUserId { get; set; }
        
        public DateTime? PurchaseDate { get; set; }
        
        public string QRCode { get; set; } = string.Empty;
        
        public bool IsActive { get; set; } = true;
    }
}