using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using EventunBackend.Data;
using EventunBackend.Models;
using EventunBackend.DTOs;
using EventunBackend.Extensions;
using EventunBackend.Constants;

namespace EventunBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]

    public class EventController : ControllerBase
    {
        private readonly AppDbContext _context;

        public EventController(AppDbContext context)
        {
            _context = context;
        }

        private string GetCurrentUserId() => User.GetUserId();
        private string GetCurrentTenantId() => User.GetTenantId();
        private string GetCurrentUserRole() => User.GetUserRole();

        private async Task<bool> IsOwnerAsync(CancellationToken cancellationToken = default)
        {
            var currentUserId = GetCurrentUserId();
            if (string.IsNullOrEmpty(currentUserId))
                return false;

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.TenantId == currentUserId, cancellationToken)
                .ConfigureAwait(false);

            return user?.Role?.Equals(Roles.Owner, StringComparison.OrdinalIgnoreCase) == true;
        }

        private async Task<bool> IsUserOrOwnerAsync(CancellationToken cancellationToken = default)
        {
            var currentUserId = GetCurrentUserId();
            if (string.IsNullOrEmpty(currentUserId))
                return false;

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.TenantId == currentUserId, cancellationToken)
                .ConfigureAwait(false);

            return user?.Role?.Equals(Roles.User, StringComparison.OrdinalIgnoreCase) == true ||
                   user?.Role?.Equals(Roles.Owner, StringComparison.OrdinalIgnoreCase) == true;
        }

        // GET: api/Event
        [HttpGet]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<EventDto>>> GetEvents(CancellationToken cancellationToken = default)
        {
            var events = await _context.Events
                .Select(e => e.ToDto())
                .ToListAsync(cancellationToken)
                .ConfigureAwait(false);

            return events;
        }

        // GET: api/Event/5
        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<ActionResult<EventDto>> GetEvent(string id, CancellationToken cancellationToken = default)
        {
            var evente = await _context.Events
                .FirstOrDefaultAsync(e => e.TenantId == id, cancellationToken);

            if (evente == null)
            {
                return NotFound();
            }

            return evente.ToDto();
        }

        // PUT: api/Event/5
        [HttpPut("{id}")]
        [Authorize(Roles = Roles.Owner)]
        public async Task<IActionResult> PutEvent(string id, UpdateEventDto updateDto, CancellationToken cancellationToken = default)
        {

            var currentUserId = GetCurrentUserId();
            var evente = await _context.Events
                .FirstOrDefaultAsync(e => e.TenantId == id && e.UserId == currentUserId, cancellationToken)
                .ConfigureAwait(false);

            if (evente == null)
            {
                return NotFound();
            }

            updateDto.UpdateEntity(evente);

            try
            {
                await _context.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!EventExists(id, currentUserId))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        // POST: api/Event
        [HttpPost]
        [Authorize(Roles = Roles.Owner)]
        public async Task<ActionResult<EventDto>> PostEvent(CreateEventDto createDto, CancellationToken cancellationToken = default)
        {

            var currentUserId = GetCurrentUserId();
            var tenantId = Guid.NewGuid().ToString();

            var evente = createDto.ToEntity(currentUserId, tenantId);

            _context.Events.Add(evente);
            try
            {
                await _context.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            }
            catch (DbUpdateException)
            {
                if (EventExists(evente.TenantId, currentUserId))
                {
                    return Conflict();
                }
                else
                {
                    throw;
                }
            }

            return CreatedAtAction("GetEvent", new { id = evente.TenantId }, evente.ToDto());
        }

        // DELETE: api/Event/5
        [HttpDelete("{id}")]
        [Authorize(Roles = Roles.Owner)]
        public async Task<IActionResult> DeleteEvent(string id, CancellationToken cancellationToken = default)
        {

            var currentUserId = GetCurrentUserId();
            var evente = await _context.Events
                .FirstOrDefaultAsync(e => e.TenantId == id && e.UserId == currentUserId, cancellationToken)
                .ConfigureAwait(false);

            if (evente == null)
            {
                return NotFound();
            }

            _context.Events.Remove(evente);
            await _context.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

            return NoContent();
        }

        // GET: api/Event/category/5
        [HttpGet("category/{category}")]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<EventDto>>> GetEventsByCategory(string category, CancellationToken cancellationToken = default)
        {
            var events = await _context.Events
                .Where(e => e.Category.ToLower() == category.ToLower())
                .Select(e => e.ToDto())
                .ToListAsync(cancellationToken);

            return events;
        }

        // POST: api/Event/search
        [HttpPost("search")]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<EventDto>>> SearchEvents([FromBody] EventSearchDto searchDto, CancellationToken cancellationToken = default)
        {
            var query = _context.Events.AsQueryable();

            if (!string.IsNullOrEmpty(searchDto.Query))
            {
                query = query.Where(e => e.Titre.Contains(searchDto.Query) || 
                                       e.Description.Contains(searchDto.Query) || 
                                       e.Location.Contains(searchDto.Query) ||
                                       e.Category.Contains(searchDto.Query));
            }

            if (!string.IsNullOrEmpty(searchDto.Category))
            {
                query = query.Where(e => e.Category.ToLower() == searchDto.Category.ToLower());
            }

            if (!string.IsNullOrEmpty(searchDto.Location))
            {
                query = query.Where(e => e.Location.Contains(searchDto.Location));
            }

            if (searchDto.StartDate.HasValue)
            {
                query = query.Where(e => e.StartDate >= searchDto.StartDate.Value);
            }

            if (searchDto.EndDate.HasValue)
            {
                query = query.Where(e => e.EndDate <= searchDto.EndDate.Value);
            }

            var events = await query
                .Select(e => e.ToDto())
                .ToListAsync(cancellationToken)
                .ConfigureAwait(false);

            return events;
        }

        // GET: api/Event/my-events
        [HttpGet("my-events")]
        [Authorize(Roles = Roles.User + "," + Roles.Owner)]
        public async Task<ActionResult<IEnumerable<EventDto>>> GetMyEvents(CancellationToken cancellationToken = default)
        {

            var currentUserId = GetCurrentUserId();
            
            var events = await _context.Events
                .Where(e => e.UserId == currentUserId)
                .OrderByDescending(e => e.StartDate)
                .Select(e => e.ToDto())
                .ToListAsync(cancellationToken)
                .ConfigureAwait(false);

            return events;
        }

        // POST: api/Event/{eventId}/generate-tickets
        [HttpPost("{eventId}/generate-tickets")]
        [Authorize(Roles = Roles.Owner)]
        public async Task<ActionResult<IEnumerable<TicketDto>>> GenerateEventTickets(
            string eventId,
            [FromBody] List<CreateTicketDto> ticketRequests,
            CancellationToken cancellationToken = default)
        {
            if (!await IsOwnerAsync(cancellationToken))
                return Forbid();

            var currentUserId = GetCurrentUserId();
            
            // Verify event exists and belongs to owner
            var eventExists = await _context.Events
                .AnyAsync(e => e.TenantId == eventId && e.UserId == currentUserId, cancellationToken)
                .ConfigureAwait(false);

            if (!eventExists)
                return BadRequest("Event not found or you don't have permission to generate tickets for this event");

            var generatedTickets = new List<TicketDto>();

            foreach (var ticketRequest in ticketRequests)
            {
                if (!IsValidTicketType(ticketRequest.TicketType))
                    return BadRequest($"Invalid ticket type: {ticketRequest.TicketType}");

                for (int i = 0; i < ticketRequest.Quantity; i++)
                {
                    var ticketId = Guid.NewGuid().ToString();
                    var ticketNumber = GenerateTicketNumber();
                    var qrCode = GenerateQRCode(ticketNumber);

                    var ticket = new Ticket
                    {
                        TenantId = ticketId,
                        UserId = currentUserId,
                        EventId = eventId,
                        TicketNumber = ticketNumber,
                        TicketType = ticketRequest.TicketType,
                        Price = ticketRequest.Price,
                        Quantity = 1, // Each ticket is individual
                        TicketStatus = "Available",
                        IsPurchased = false,
                        QRCode = qrCode,
                        IsActive = true,
                        ticketFile = ""
                    };

                    _context.Tickets.Add(ticket);

                    var ticketDto = new TicketDto
                    {
                        TenantId = ticket.TenantId,
                        UserId = ticket.UserId,
                        EventId = ticket.EventId,
                        TicketNumber = ticket.TicketNumber,
                        TicketType = ticket.TicketType,
                        Price = ticket.Price,
                        Quantity = ticket.Quantity,
                        IsPurchased = ticket.IsPurchased,
                        QRCode = ticket.QRCode,
                        TicketStatus = ticket.TicketStatus
                    };

                    generatedTickets.Add(ticketDto);
                }
            }

            await _context.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

            return Ok(generatedTickets);
        }

        private bool EventExists(string id, string userId)
        {
            return _context.Events.Any(e => e.TenantId == id && e.UserId == userId);
        }

        private static bool IsValidTicketType(string ticketType)
        {
            return ticketType == TicketType.VI || 
                   ticketType == TicketType.Standard || 
                   ticketType == TicketType.Student;
        }

        private static string GenerateTicketNumber()
        {
            var timestamp = DateTime.UtcNow.ToString("yyyyMMddHHmmss");
            var random = new Random().Next(1000, 9999);
            return $"TKT-{timestamp}-{random}";
        }

        private static string GenerateQRCode(string ticketNumber)
        {
            // In a real implementation, you would use a QR code library like QRCoder
            // For now, we'll return a base64 encoded string of the ticket number
            var bytes = System.Text.Encoding.UTF8.GetBytes(ticketNumber);
            return Convert.ToBase64String(bytes);
        }
    }
}