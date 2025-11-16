using EventunBackend.Models;
using EventunBackend.DTOs;

namespace EventunBackend.Extensions
{
    public static class MappingExtensions
    {
        public static EventDto ToDto(this Evente evente)
        {
            return new EventDto
            {
                TenantId = evente.TenantId,
                UserId = evente.UserId,
                Titre = evente.Titre,
                EventOwner = evente.EventOwner,
                Picture = evente.Picture,
                Description = evente.Description,
                Location = evente.Location,
                StartDate = evente.StartDate,
                EndDate = evente.EndDate,
                Category = evente.Category,
                TicketQte = evente.TicketQte,
                TicketPrice = evente.TicketPrice
            };
        }

        public static Evente ToEntity(this CreateEventDto dto, string userId, string tenantId)
        {
            return new Evente
            {
                TenantId = tenantId,
                UserId = userId,
                Titre = dto.Titre,
                EventOwner = dto.EventOwner,
                Picture = dto.Picture ?? string.Empty,
                Description = dto.Description ?? string.Empty,
                Location = dto.Location ?? string.Empty,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                Category = dto.Category ?? string.Empty,
                TicketQte = dto.TicketQte ?? string.Empty,
                TicketPrice = dto.TicketPrice ?? string.Empty
            };
        }

        public static void UpdateEntity(this UpdateEventDto dto, Evente evente)
        {
            evente.Titre = dto.Titre;
            evente.EventOwner = dto.EventOwner;
            evente.Picture = dto.Picture ?? string.Empty;
            evente.Description = dto.Description ?? string.Empty;
            evente.Location = dto.Location ?? string.Empty;
            evente.StartDate = dto.StartDate;
            evente.EndDate = dto.EndDate;
            evente.Category = dto.Category ?? string.Empty;
            evente.TicketQte = dto.TicketQte ?? string.Empty;
            evente.TicketPrice = dto.TicketPrice ?? string.Empty;
        }
    }
}
