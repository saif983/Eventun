using System.ComponentModel.DataAnnotations;

namespace EventunBackend.Models
{
    public class Evente
    {
        [Key]
        public string TenantId { get; set; } = string.Empty;
        
        [Required]
        public string UserId { get; set; } = string.Empty;
        
        [Required]
        public string Titre { get; set; } = string.Empty;
        
        [Required]
        public string EventOwner { get; set; } = string.Empty;
        
        public string Picture { get; set; } = string.Empty;
        
        public string Description { get; set; } = string.Empty;
        
        public string Location { get; set; } = string.Empty;
        
        public DateTime StartDate { get; set; } = DateTime.UtcNow;
        
        public DateTime EndDate { get; set; } = DateTime.UtcNow;

        public string Category { get; set; } = string.Empty;

        public string TicketQte { get; set; } = string.Empty;

        public string TicketPrice { get; set; } = string.Empty;
        

    }
}