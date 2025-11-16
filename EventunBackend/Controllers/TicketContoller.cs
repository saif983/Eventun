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

    public class TicketController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TicketController(AppDbContext context)
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

        // GET: api/ticket
        [HttpGet]
        [Authorize]
        public async Task<ActionResult<IEnumerable<TicketDto>>> GetTickets(
            [FromQuery] TicketSearchDto searchDto,
            CancellationToken cancellationToken = default)
        {
            if (!await IsUserOrOwnerAsync(cancellationToken))
                return Forbid();

            var currentTenantId = GetCurrentTenantId();
            var currentUserId = GetCurrentUserId();
            var isOwner = await IsOwnerAsync(cancellationToken);

            var query = _context.Tickets.AsQueryable();

            // Filter by tenant
            if (!string.IsNullOrEmpty(currentTenantId))
                query = query.Where(t => t.TenantId == currentTenantId);

            // If not owner, only show user's own tickets
            if (!isOwner && !string.IsNullOrEmpty(currentUserId))
                query = query.Where(t => t.UserId == currentUserId);

            // Apply search filters
            if (!string.IsNullOrEmpty(searchDto.TicketNumber))
                query = query.Where(t => t.TicketNumber.Contains(searchDto.TicketNumber));

            if (!string.IsNullOrEmpty(searchDto.TicketType))
                query = query.Where(t => t.TicketType == searchDto.TicketType);

            if (!string.IsNullOrEmpty(searchDto.Query))
            {
                query = query.Where(t => 
                    t.TicketNumber.Contains(searchDto.Query) ||
                    t.TicketType.Contains(searchDto.Query) ||
                    t.TicketStatus.Contains(searchDto.Query));
            }

            // Only active tickets
            query = query.Where(t => t.IsActive);

            var tickets = await query
                .Select(t => new TicketDto
                {
                    TenantId = t.TenantId,
                    UserId = t.UserId,
                    EventId = t.EventId,
                    TicketNumber = t.TicketNumber,
                    TicketType = t.TicketType,
                    Price = t.Price,
                    Quantity = t.Quantity,
                    IsPurchased = t.IsPurchased,
                    PurchasedByUserId = t.PurchasedByUserId,
                    PurchaseDate = t.PurchaseDate,
                    QRCode = t.QRCode,
                    TicketStatus = t.TicketStatus
                })
                .ToListAsync(cancellationToken)
                .ConfigureAwait(false);

            return Ok(tickets);
        }

        // GET: api/ticket/{id}
        [HttpGet("{id}")]
        [Authorize]
        public async Task<ActionResult<TicketDto>> GetTicket(string id, CancellationToken cancellationToken = default)
        {
            if (!await IsUserOrOwnerAsync(cancellationToken))
                return Forbid();

            var currentTenantId = GetCurrentTenantId();
            var currentUserId = GetCurrentUserId();
            var isOwner = await IsOwnerAsync(cancellationToken);

            var ticket = await _context.Tickets
                .FirstOrDefaultAsync(t => t.TenantId == id && t.IsActive, cancellationToken)
                .ConfigureAwait(false);

            if (ticket == null)
                return NotFound();

            // Check tenant access
            if (ticket.TenantId != currentTenantId)
                return Forbid();

            // If not owner, only allow access to own tickets
            if (!isOwner && ticket.UserId != currentUserId)
                return Forbid();

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
                PurchasedByUserId = ticket.PurchasedByUserId,
                PurchaseDate = ticket.PurchaseDate,
                QRCode = ticket.QRCode,
                TicketStatus = ticket.TicketStatus
            };

            return Ok(ticketDto);
        }

        // POST: api/ticket
        [HttpPost]
        [Authorize(Roles = Roles.Owner)]
        public async Task<ActionResult<TicketDto>> CreateTicket(
            CreateTicketDto createTicketDto, 
            CancellationToken cancellationToken = default)
        {
            if (!await IsOwnerAsync(cancellationToken))
                return Forbid();

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var currentTenantId = GetCurrentTenantId();
            var currentUserId = GetCurrentUserId();

            if (string.IsNullOrEmpty(currentTenantId) || string.IsNullOrEmpty(currentUserId))
                return BadRequest("Invalid user or tenant information");

            // Validate ticket type
            if (!IsValidTicketType(createTicketDto.TicketType))
                return BadRequest("Invalid ticket type");

            // Verify event exists and belongs to owner
            var eventExists = await _context.Events
                .AnyAsync(e => e.TenantId == createTicketDto.EventId && e.UserId == currentUserId, cancellationToken)
                .ConfigureAwait(false);

            if (!eventExists)
                return BadRequest("Event not found or you don't have permission to create tickets for this event");

            var ticketId = Guid.NewGuid().ToString();
            var ticketNumber = GenerateTicketNumber();
            var qrCode = GenerateQRCode(ticketNumber);

            var ticket = new Ticket
            {
                TenantId = ticketId,
                UserId = currentUserId,
                EventId = createTicketDto.EventId,
                TicketNumber = ticketNumber,
                TicketType = createTicketDto.TicketType,
                Price = createTicketDto.Price,
                Quantity = createTicketDto.Quantity,
                TicketStatus = "Available",
                IsPurchased = false,
                QRCode = qrCode,
                IsActive = true,
                ticketFile = ""
            };

            _context.Tickets.Add(ticket);
            await _context.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

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
                PurchasedByUserId = ticket.PurchasedByUserId,
                PurchaseDate = ticket.PurchaseDate,
                QRCode = ticket.QRCode,
                TicketStatus = ticket.TicketStatus
            };

            return CreatedAtAction(nameof(GetTicket), new { id = ticket.TenantId }, ticketDto);
        }

        // POST: api/ticket/purchase
        [HttpPost("purchase")]
        [Authorize(Roles = Roles.User)]
        public async Task<ActionResult<TicketDto>> PurchaseTicket(
            PurchaseTicketDto purchaseDto,
            CancellationToken cancellationToken = default)
        {
            if (!await IsUserOrOwnerAsync(cancellationToken))
                return Forbid();

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var currentUserId = GetCurrentUserId();
            var currentTenantId = GetCurrentTenantId();

            if (string.IsNullOrEmpty(currentUserId))
                return BadRequest("Invalid user information");

            var ticket = await _context.Tickets
                .FirstOrDefaultAsync(t => t.TenantId == purchaseDto.TicketId && t.IsActive, cancellationToken)
                .ConfigureAwait(false);

            if (ticket == null)
                return NotFound("Ticket not found");

            if (ticket.IsPurchased)
                return BadRequest("Ticket is already purchased");

            if (ticket.TicketStatus != "Available")
                return BadRequest("Ticket is not available for purchase");

            // Update ticket as purchased
            ticket.IsPurchased = true;
            ticket.PurchasedByUserId = currentUserId;
            ticket.PurchaseDate = DateTime.UtcNow;
            ticket.TicketStatus = "Sold";

            await _context.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

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
                PurchasedByUserId = ticket.PurchasedByUserId,
                PurchaseDate = ticket.PurchaseDate,
                QRCode = ticket.QRCode,
                TicketStatus = ticket.TicketStatus
            };

            return Ok(ticketDto);
        }

        // GET: api/ticket/available/{eventId}
        [HttpGet("available/{eventId}")]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<TicketDto>>> GetAvailableTickets(
            string eventId,
            CancellationToken cancellationToken = default)
        {
            var tickets = await _context.Tickets
                .Where(t => t.EventId == eventId && 
                           t.IsActive && 
                           !t.IsPurchased && 
                           t.TicketStatus == "Available")
                .Select(t => new TicketDto
                {
                    TenantId = t.TenantId,
                    UserId = t.UserId,
                    EventId = t.EventId,
                    TicketNumber = t.TicketNumber,
                    TicketType = t.TicketType,
                    Price = t.Price,
                    Quantity = t.Quantity,
                    IsPurchased = t.IsPurchased,
                    QRCode = "", // Don't expose QR code until purchased
                    TicketStatus = t.TicketStatus
                })
                .ToListAsync(cancellationToken)
                .ConfigureAwait(false);

            return Ok(tickets);
        }

        // GET: api/ticket/my-purchases
        [HttpGet("my-purchases")]
        [Authorize(Roles = Roles.User)]
        public async Task<ActionResult<IEnumerable<TicketDto>>> GetMyPurchasedTickets(
            CancellationToken cancellationToken = default)
        {
            var currentUserId = GetCurrentUserId();

            if (string.IsNullOrEmpty(currentUserId))
                return BadRequest("Invalid user information");

            var tickets = await _context.Tickets
                .Where(t => t.PurchasedByUserId == currentUserId && 
                           t.IsActive && 
                           t.IsPurchased)
                .Select(t => new TicketDto
                {
                    TenantId = t.TenantId,
                    UserId = t.UserId,
                    EventId = t.EventId,
                    TicketNumber = t.TicketNumber,
                    TicketType = t.TicketType,
                    Price = t.Price,
                    Quantity = t.Quantity,
                    IsPurchased = t.IsPurchased,
                    PurchasedByUserId = t.PurchasedByUserId,
                    PurchaseDate = t.PurchaseDate,
                    QRCode = t.QRCode,
                    TicketStatus = t.TicketStatus
                })
                .ToListAsync(cancellationToken)
                .ConfigureAwait(false);

            return Ok(tickets);
        }

        // PUT: api/ticket/{id}
        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> UpdateTicket(
            string id, 
            CreateTicketDto updateTicketDto, 
            CancellationToken cancellationToken = default)
        {
            if (!await IsUserOrOwnerAsync(cancellationToken))
                return Forbid();

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var currentTenantId = GetCurrentTenantId();
            var currentUserId = GetCurrentUserId();
            var isOwner = await IsOwnerAsync(cancellationToken);

            var ticket = await _context.Tickets
                .FirstOrDefaultAsync(t => t.TenantId == id && t.IsActive, cancellationToken)
                .ConfigureAwait(false);

            if (ticket == null)
                return NotFound();

            // Check tenant access
            if (ticket.TenantId != currentTenantId)
                return Forbid();

            // If not owner, only allow updating own tickets
            if (!isOwner && ticket.UserId != currentUserId)
                return Forbid();

            // Validate ticket type
            if (!IsValidTicketType(updateTicketDto.TicketType))
                return BadRequest("Invalid ticket type");

            // Update ticket properties
            ticket.TicketType = updateTicketDto.TicketType;
            ticket.Price = updateTicketDto.Price;
            ticket.Quantity = updateTicketDto.Quantity;

            await _context.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

            return NoContent();
        }

        // DELETE: api/ticket/{id}
        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteTicket(string id, CancellationToken cancellationToken = default)
        {
            if (!await IsOwnerAsync(cancellationToken))
                return Forbid();

            var currentTenantId = GetCurrentTenantId();

            var ticket = await _context.Tickets
                .FirstOrDefaultAsync(t => t.TenantId == id && t.IsActive, cancellationToken)
                .ConfigureAwait(false);

            if (ticket == null)
                return NotFound();

            // Check tenant access
            if (ticket.TenantId != currentTenantId)
                return Forbid();

            // Soft delete
            ticket.IsActive = false;

            await _context.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

            return NoContent();
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
            // In a real implementation, you would use a QR code library
            // For now, we'll return a base64 encoded string of the ticket number
            var bytes = System.Text.Encoding.UTF8.GetBytes(ticketNumber);
            return Convert.ToBase64String(bytes);
        }
    }
}