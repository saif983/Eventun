using Microsoft.EntityFrameworkCore;
using EventunBackend.Models;

namespace EventunBackend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Evente> Events { get; set; }
        public DbSet<Ticket> Tickets { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure User entity
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.TenantId);
                entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
                entity.HasIndex(e => e.Email).IsUnique();
                entity.Property(e => e.Name).HasMaxLength(255);
                entity.Property(e => e.Picture).HasMaxLength(500);
            });

            // Configure Evente entity
            modelBuilder.Entity<Evente>(entity =>
            {
                entity.HasKey(e => e.TenantId);
                entity.Property(e => e.Titre).IsRequired().HasMaxLength(255);
                entity.Property(e => e.EventOwner).IsRequired().HasMaxLength(255);
                entity.Property(e => e.Description).HasMaxLength(1000);
                entity.Property(e => e.Location).HasMaxLength(500);
                entity.Property(e => e.Category).HasMaxLength(100);
                entity.Property(e => e.Picture).HasMaxLength(500);
                entity.Property(e => e.TicketQte).HasMaxLength(50);
                entity.Property(e => e.TicketPrice).HasMaxLength(50);
            });

            // Configure Ticket entity
            modelBuilder.Entity<Ticket>(entity =>
            {
                entity.HasKey(t => t.TenantId);
                entity.Property(t => t.TicketNumber).HasMaxLength(100);
                entity.Property(t => t.TicketStatus).HasMaxLength(50);
                entity.Property(t => t.TicketType).HasMaxLength(50);
                entity.Property(t => t.ticketFile).HasMaxLength(500);
                
                // Configure foreign key relationships
                entity.HasOne<Evente>()
                    .WithMany()
                    .HasForeignKey(t => t.EventId)
                    .OnDelete(DeleteBehavior.Cascade);
                    
                entity.HasOne<User>()
                    .WithMany()
                    .HasForeignKey(t => t.UserId)
                    .OnDelete(DeleteBehavior.Restrict);
            });
        }
    }
}