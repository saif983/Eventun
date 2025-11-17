import { Component, OnInit, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TicketCardComponent } from '../ticket-card/ticket-card.component';
import { Ticket } from '../../models/ticket.model';
import { TicketService } from '../../services/ticket.service';
import { EventService } from '../../services/event.service';
import { Event, EventSearchDto } from '../../models/event.model';
import { forkJoin, Subject, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-ticket-browse',
  standalone: true,
  imports: [CommonModule, FormsModule, TicketCardComponent],
  templateUrl: './ticket-browse.component.html',
  styleUrl: './ticket-browse.component.scss'
})
export class TicketBrowseComponent implements OnInit, OnDestroy {
  @Output() ticketClick = new EventEmitter<Ticket>();

  private destroy$ = new Subject<void>();

  searchQuery: string = '';
  selectedCategory: string = 'all';
  currentPage: number = 1;
  itemsPerPage: number = 6;

  categories = [
    { id: 'all', name: 'All Events' },
    { id: 'Music', name: 'Music' },
    { id: 'Sports', name: 'Sports' },
    { id: 'Conference', name: 'Conference' },
    { id: 'Entertainment', name: 'Entertainment' },
    { id: 'Other', name: 'Other' }
  ];

  tickets: Ticket[] = [];
  filteredTickets: Ticket[] = [];
  isLoading = true;

  constructor(
    private ticketService: TicketService, 
    private eventService: EventService
  ) {}

  ngOnInit() {
    this.loadTickets();
  }

  private loadTickets() {
    this.isLoading = true;
    // Use the same approach as home component - direct subscription
    this.eventService.getEvents()
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error loading events:', error);
          this.isLoading = false;
          this.tickets = [];
          this.filteredTickets = [];
          return of([] as Event[]);
        })
      )
      .subscribe({
        next: (events) => {
          if (events && events.length > 0) {
            this.fetchAvailableTicketsForEvents(events);
          } else {
            this.isLoading = false;
            this.tickets = [];
            this.filteredTickets = [];
          }
        }
      });
  }

  onSearch() {
    this.applyFilters();
  }

  onCategoryChange(category: string) {
    this.selectedCategory = category;
    this.applyFilters();
  }

  private applyFilters() {
    if (this.searchQuery.trim() || this.selectedCategory !== 'all') {
      const searchDto: EventSearchDto = {
        query: this.searchQuery.trim() || undefined,
        category: this.selectedCategory !== 'all' ? this.selectedCategory : undefined
      };
      this.isLoading = true;
      // Use the same direct subscription approach as home component
      this.eventService.searchEvents(searchDto)
        .pipe(
          takeUntil(this.destroy$),
          catchError(error => {
            console.error('Error searching events:', error);
            this.filteredTickets = [];
            this.isLoading = false;
            return of([] as Event[]);
          })
        )
        .subscribe({
          next: (events) => {
            if (events && events.length > 0) {
              this.fetchAvailableTicketsForEvents(events);
            } else {
              this.isLoading = false;
              this.filteredTickets = [];
            }
          }
        });
    } else {
      // Reset to all tickets when no filters
      this.filteredTickets = [...this.tickets];
      this.currentPage = 1;
    }
  }

  /**
   * Fetches available tickets for multiple events
   * Uses backend API: GET /api/ticket/available/{eventId}
   * Backend filters: IsActive && !IsPurchased && TicketStatus == "Available"
   * Backend orders by: Price (ascending), then TicketType
   * Ticket types: VIP, Standard, Student (from TicketType constants)
   */
  private fetchAvailableTicketsForEvents(events: Event[]) {
    if (!events || events.length === 0) {
      this.tickets = [];
      this.filteredTickets = [];
      this.isLoading = false;
      return;
    }

    // Create a map of eventId to event for quick lookup
    const eventMap = new Map<string, Event>();
    events.forEach(ev => {
      if (ev && ev.tenantId) {
        eventMap.set(ev.tenantId, ev);
      }
    });
    
    // Create requests for all events - using the same pattern as home component
    const requests = events
      .filter(e => e && e.tenantId)
      .map(e => 
        this.ticketService.getAvailableTickets(e.tenantId).pipe(
          catchError(error => {
            console.warn(`Error loading tickets for event ${e.tenantId}:`, error);
            return of([] as Ticket[]);
          })
        )
      );
    
    if (requests.length === 0) {
      this.tickets = [];
      this.filteredTickets = [];
      this.isLoading = false;
      return;
    }
    
    // Use forkJoin to fetch all tickets in parallel - similar to how home loads events
    forkJoin(requests)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error in forkJoin for tickets:', error);
          this.tickets = [];
          this.filteredTickets = [];
          this.isLoading = false;
          return of([] as Ticket[][]);
        })
      )
      .subscribe({
        next: (ticketsPerEvent) => {
          const enriched: Ticket[] = [];
          const seenTicketKeys = new Set<string>();
          
          // Process tickets from each event
          ticketsPerEvent.forEach((tickets, idx) => {
            if (!tickets || !Array.isArray(tickets)) {
              return;
            }
            
            const ev = events[idx];
            if (!ev || !ev.tenantId) {
              return;
            }
            
            tickets.forEach(t => {
              if (!t || !t.eventId || !t.ticketNumber) {
                return;
              }
              
              // Create unique key for ticket
              const ticketKey = `${t.eventId}-${t.ticketNumber}`;
              
              // Verify ticket belongs to this event and matches backend availability logic
              // Backend filters: IsActive && !IsPurchased && TicketStatus == "Available"
              const isBackendAvailable = !t.isPurchased && 
                                        (t.isActive !== false) && 
                                        t.ticketStatus === 'Available';
              
              if (t.eventId === ev.tenantId && 
                  !seenTicketKeys.has(ticketKey) && 
                  isBackendAvailable) {
                seenTicketKeys.add(ticketKey);
                
                // Get matching event data
                const matchingEvent = eventMap.get(t.eventId) || ev;
                
                // Enrich ticket with event data - matching backend DTO structure
                const enrichedTicket: Ticket = {
                  ...t,
                  // Event data enrichment from EventDto
                  eventName: matchingEvent.titre || 'Untitled Event',
                  eventLocation: matchingEvent.location || 'TBD',
                  eventDate: matchingEvent.startDate ? new Date(matchingEvent.startDate) : new Date(),
                  imageUrl: matchingEvent.picture || '',
                  category: matchingEvent.category || 'Other',
                  // Preserve all TicketDto fields exactly as returned from backend
                  tenantId: t.tenantId,
                  userId: t.userId,
                  eventId: t.eventId,
                  ticketNumber: t.ticketNumber,
                  ticketType: t.ticketType, // VIP, Standard, or Student
                  price: t.price || 0, // Backend uses decimal
                  quantity: t.quantity || 1, // Backend sets to 1 for individual tickets
                  isPurchased: t.isPurchased || false,
                  purchasedByUserId: t.purchasedByUserId,
                  purchaseDate: t.purchaseDate,
                  ticketStatus: t.ticketStatus || 'Available', // Available, Sold, etc.
                  qrCode: t.qrCode || '', // Empty string for unpurchased tickets
                  // Additional computed fields
                  availableQuantity: t.quantity || 1,
                  isActive: t.isActive !== undefined ? t.isActive : true
                };
                
                enriched.push(enrichedTicket);
              }
            });
          });
          
          // Sort tickets: Backend already orders by Price then TicketType
          // Frontend sorts by event date first, then maintains backend price ordering
          enriched.sort((a, b) => {
            // First sort by event date
            const dateA = a.eventDate ? new Date(a.eventDate).getTime() : 0;
            const dateB = b.eventDate ? new Date(b.eventDate).getTime() : 0;
            if (dateA !== dateB) {
              return dateA - dateB;
            }
            // Then by price (matching backend ordering)
            const priceDiff = (a.price || 0) - (b.price || 0);
            if (priceDiff !== 0) {
              return priceDiff;
            }
            // Finally by ticket type
            return (a.ticketType || '').localeCompare(b.ticketType || '');
          });
          
          this.tickets = enriched;
          this.filteredTickets = [...this.tickets];
          this.currentPage = 1;
          this.isLoading = false;
          
          console.log(`✅ Successfully loaded ${enriched.length} unique tickets from ${events.length} events`);
        },
        error: (error) => {
          console.error('❌ Error loading available tickets:', error);
          this.tickets = [];
          this.filteredTickets = [];
          this.isLoading = false;
        }
      });
  }

  get paginatedTickets(): Ticket[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredTickets.slice(startIndex, endIndex);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredTickets.length / this.itemsPerPage);
  }

  get pages(): number[] {
    const maxVisiblePages = 5;
    const total = this.totalPages;
    
    if (total <= maxVisiblePages) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    
    const pages: number[] = [];
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(total, startPage + maxVisiblePages - 1);
    
    // Adjust start page if we're near the end
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      // Scroll to top of the tickets section when page changes
      this.scrollToTop();
    }
  }

  private scrollToTop() {
    // Scroll to the tickets grid section
    const element = document.querySelector('.browse-view');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  onTicketClick(ticket: Ticket) {
    // Emit event to parent component to show ticket details modal
    this.ticketClick.emit(ticket);
  }

  trackByPage(index: number, page: number): number {
    return page;
  }

  // Expose ticket service helper methods for use in template if needed
  isTicketAvailable(ticket: Ticket): boolean {
    return this.ticketService.isTicketAvailable(ticket);
  }

  getTicketPriceDisplay(ticket: Ticket): string {
    return this.ticketService.getTicketPriceDisplay(ticket);
  }

  getTicketDisplayName(ticket: Ticket): string {
    return this.ticketService.getTicketDisplayName(ticket);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
