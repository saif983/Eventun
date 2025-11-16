using System.ComponentModel.DataAnnotations;

namespace EventunBackend.DTOs
{
    public class EventDto
    {
        public string TenantId { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string Titre { get; set; } = string.Empty;
        public string EventOwner { get; set; } = string.Empty;
        public string? Picture { get; set; }
        public string? Description { get; set; }
        public string? Location { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string? Category { get; set; }
        public string? TicketQte { get; set; }
        public string? TicketPrice { get; set; }
    }

    public class CreateEventDto
    {
        [Required]
        [MaxLength(255)]
        public string Titre { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        public string EventOwner { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Picture { get; set; }

        [MaxLength(1000)]
        public string? Description { get; set; }

        [MaxLength(500)]
        public string? Location { get; set; }

        public DateTime StartDate { get; set; } = DateTime.UtcNow;
        public DateTime EndDate { get; set; } = DateTime.UtcNow;

        [MaxLength(100)]
        public string? Category { get; set; }

        [MaxLength(50)]
        public string? TicketQte { get; set; }

        [MaxLength(50)]
        public string? TicketPrice { get; set; }
    }

    public class UpdateEventDto
    {
        [Required]
        [MaxLength(255)]
        public string Titre { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        public string EventOwner { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Picture { get; set; }

        [MaxLength(1000)]
        public string? Description { get; set; }

        [MaxLength(500)]
        public string? Location { get; set; }

        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }

        [MaxLength(100)]
        public string? Category { get; set; }

        [MaxLength(50)]
        public string? TicketQte { get; set; }

        [MaxLength(50)]
        public string? TicketPrice { get; set; }
    }

    public class EventSearchDto
    {
        public string? Query { get; set; }
        public string? Category { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string? Location { get; set; }
    }
}
