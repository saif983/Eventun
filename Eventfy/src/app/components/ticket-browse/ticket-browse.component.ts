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
    this.eventService.getEvents()
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error loading events:', error);
          this.isLoading = false;
          this.tickets = [];
          this.filteredTickets = [];
          return of([]);
        })
      )
      .subscribe({
        next: (events) => {
          if (events.length > 0) {
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
      this.eventService.searchEvents(searchDto)
        .pipe(
          takeUntil(this.destroy$),
          catchError(error => {
            console.error('Error searching events:', error);
            this.filteredTickets = [];
            this.isLoading = false;
            return of([]);
          })
        )
        .subscribe({
          next: (events) => {
            if (events.length > 0) {
              this.fetchAvailableTicketsForEvents(events);
            } else {
              this.isLoading = false;
              this.filteredTickets = [];
            }
          }
        });
    } else {
      this.filteredTickets = [...this.tickets];
      this.currentPage = 1;
    }
  }

  private fetchAvailableTicketsForEvents(events: Event[]) {
    // Create a map of eventId to event for quick lookup
    const eventMap = new Map<string, Event>();
    events.forEach(ev => {
      eventMap.set(ev.tenantId, ev);
    });
    
    const requests = events.map(e => 
      this.ticketService.getAvailableTickets(e.tenantId).pipe(
        catchError(error => {
          console.error(`Error loading tickets for event ${e.tenantId}:`, error);
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
    
    forkJoin(requests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (ticketsPerEvent) => {
          const enriched: Ticket[] = [];
          const seenTicketIds = new Set<string>(); // Track unique tickets to avoid duplicates
          
          ticketsPerEvent.forEach((tickets, idx) => {
            const ev = events[idx];
            tickets.forEach(t => {
              // Ensure ticket belongs to this event and is unique
              // Use ticketNumber as unique identifier since tenantId might not be unique
              const ticketKey = `${t.eventId}-${t.ticketNumber}`;
              
              if (t.eventId === ev.tenantId && 
                  !seenTicketIds.has(ticketKey) && 
                  this.ticketService.isTicketAvailable(t)) {
                seenTicketIds.add(ticketKey);
                
                // Match ticket to event by eventId to ensure correct data
                const matchingEvent = eventMap.get(t.eventId) || ev;
                
                // Preserve all original ticket data and enrich with event data
                const enrichedTicket: Ticket = {
                  ...t,
                  // Event enrichment data
                  eventName: matchingEvent.titre,
                  eventLocation: matchingEvent.location || 'TBD',
                  eventDate: new Date(matchingEvent.startDate),
                  imageUrl: matchingEvent.picture,
                  category: matchingEvent.category,
                  // Ensure all ticket-specific fields are preserved
                  tenantId: t.tenantId,
                  userId: t.userId,
                  eventId: t.eventId,
                  ticketNumber: t.ticketNumber,
                  ticketType: t.ticketType,
                  price: t.price,
                  quantity: t.quantity || 1, // Ensure quantity is set
                  isPurchased: t.isPurchased || false,
                  ticketStatus: t.ticketStatus,
                  qrCode: t.qrCode || '',
                  // Additional fields
                  availableQuantity: t.quantity || 1,
                  isActive: t.isActive !== undefined ? t.isActive : true
                };
                
                enriched.push(enrichedTicket);
              }
            });
          });
          
          // Sort tickets by event date for better UX
          enriched.sort((a, b) => {
            const dateA = a.eventDate ? new Date(a.eventDate).getTime() : 0;
            const dateB = b.eventDate ? new Date(b.eventDate).getTime() : 0;
            return dateA - dateB;
          });
          
          this.tickets = enriched;
          this.filteredTickets = [...this.tickets];
          this.currentPage = 1;
          this.isLoading = false;
          
          // Debug logging
          console.log(`Loaded ${enriched.length} unique tickets from ${events.length} events`);
          if (enriched.length > 0) {
            console.log('Sample ticket data:', {
              eventName: enriched[0].eventName,
              ticketType: enriched[0].ticketType,
              price: enriched[0].price,
              ticketNumber: enriched[0].ticketNumber,
              quantity: enriched[0].quantity,
              eventId: enriched[0].eventId
            });
            // Log unique ticket types and prices
            const uniqueTypes = new Set(enriched.map(t => t.ticketType));
            const uniquePrices = new Set(enriched.map(t => t.price));
            console.log(`Unique ticket types: ${Array.from(uniqueTypes).join(', ')}`);
            console.log(`Unique prices: ${Array.from(uniquePrices).join(', ')}`);
          }
        },
        error: (error) => {
          console.error('Error loading available tickets:', error);
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
