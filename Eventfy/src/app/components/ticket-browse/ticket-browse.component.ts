import { Component, OnInit, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Ticket } from '../../models/ticket.model';
import { TicketService } from '../../services/ticket.service';
import { EventService } from '../../services/event.service';
import { Event, EventSearchDto } from '../../models/event.model';
import { Subject, of, forkJoin } from 'rxjs';
import { takeUntil, catchError, finalize, map } from 'rxjs/operators';

@Component({
  selector: 'app-ticket-browse',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  events: Event[] = [];
  filteredEvents: Event[] = [];
  isLoading = true;
  eventTicketLoading: Record<string, boolean> = {};
  eventAvailableQuantities: Record<string, number> = {};

  constructor(
    private ticketService: TicketService, 
    private eventService: EventService
  ) {}

  ngOnInit() {
    this.loadEvents();
  }

  loadEvents() {
    this.isLoading = true;
    this.eventService.getEvents()
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error loading events:', error);
          this.isLoading = false;
          this.events = [];
          this.filteredEvents = [];
          return of([] as Event[]);
        })
      )
      .subscribe({
        next: (events) => this.filterEventsByAvailability(events || [])
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
            this.filteredEvents = [];
            this.isLoading = false;
            return of([] as Event[]);
          })
        )
        .subscribe({
          next: (events) => this.filterEventsByAvailability(events || [], false)
        });
    } else {
      this.filteredEvents = [...this.events];
      this.currentPage = 1;
      this.isLoading = false;
    }
  }

  private buildTicketFromEvent(event: Event, ticketOverride?: Partial<Ticket>): Ticket {
    const fallbackPrice = parseFloat(event.ticketPrice || '0') || 0;
    const fallbackQty = parseInt(event.ticketQte || '1', 10) || 1;

    return {
      tenantId: ticketOverride?.tenantId || event.tenantId,
      userId: ticketOverride?.userId || event.userId,
      eventId: ticketOverride?.eventId || event.tenantId,
      ticketNumber: ticketOverride?.ticketNumber || `EVT-${event.tenantId}-${Date.now()}`,
      ticketType: ticketOverride?.ticketType || 'General',
      price: ticketOverride?.price ?? fallbackPrice,
      quantity: ticketOverride?.quantity ?? fallbackQty,
      isPurchased: ticketOverride?.isPurchased ?? false,
      purchasedByUserId: ticketOverride?.purchasedByUserId,
      purchaseDate: ticketOverride?.purchaseDate,
      qrCode: ticketOverride?.qrCode || '',
      ticketStatus: ticketOverride?.ticketStatus || 'Available',
      id: ticketOverride?.id || event.tenantId,
      isActive: ticketOverride?.isActive ?? true,
      createdAt: ticketOverride?.createdAt || new Date(event.startDate),
      updatedAt: ticketOverride?.updatedAt || new Date(event.startDate),
      eventName: event.titre,
      eventLocation: event.location || 'TBD',
      eventDate: new Date(event.startDate),
      category: event.category || 'Other',
      originalPrice: ticketOverride?.originalPrice ?? fallbackPrice,
      sellingPrice: ticketOverride?.sellingPrice ?? (ticketOverride?.price ?? fallbackPrice),
      availableQuantity: ticketOverride?.availableQuantity ?? fallbackQty,
      totalQuantity: ticketOverride?.totalQuantity ?? fallbackQty,
      imageUrl: event.picture,
      rating: ticketOverride?.rating ?? 4.5,
      sellerName: event.eventOwner,
      description: event.description,
    };
  }

  onEventSelect(event: Event) {
    if (!event?.tenantId) {
      return;
    }

    this.eventTicketLoading[event.tenantId] = true;

    this.ticketService.getAvailableTickets(event.tenantId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.eventTicketLoading[event.tenantId] = false;
        })
      )
      .subscribe({
        next: (tickets) => {
          const availableTicket = tickets?.find(t => this.ticketService.isTicketAvailable(t));

          if (!availableTicket) {
            alert('No tickets available for this event right now.');
            return;
          }

          const enriched = this.buildTicketFromEvent(event, availableTicket);
          this.ticketClick.emit(enriched);
        },
        error: (error) => {
          console.error('Error loading tickets for event:', error);
          alert('Unable to load tickets for this event. Please try again later.');
        }
      });
  }

  get paginatedEvents(): Event[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredEvents.slice(startIndex, endIndex);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredEvents.length / this.itemsPerPage);
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

  private scrollToTop(): void {
    const element = document.querySelector('.browse-view');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  trackByEvent(_index: number, event: Event): string {
    return event.tenantId;
  }

  trackByPage(_index: number, page: number): number {
    return page;
  }

  private filterEventsByAvailability(events: Event[], updateBaseList: boolean = true): void {
    if (!events || events.length === 0) {
      if (updateBaseList) {
        this.events = [];
      }
      this.filteredEvents = [];
      this.currentPage = 1;
      this.isLoading = false;
      return;
    }

    const availabilityRequests = events
      .filter(event => !!event?.tenantId)
      .map(event => 
        this.ticketService.getAvailableTickets(event.tenantId).pipe(
          map(tickets => {
            const totalQuantity = tickets.reduce((sum, ticket) => sum + (ticket.quantity || 0), 0);
            const hasTickets = tickets.some(ticket => this.ticketService.isTicketAvailable(ticket));
            return {
              event,
              hasTickets,
              availableCount: totalQuantity
            };
          }),
          catchError(error => {
            console.warn(`Error checking tickets for event ${event.tenantId}:`, error);
            return of({ event, hasTickets: false, availableCount: 0 });
          })
        )
      );

    if (availabilityRequests.length === 0) {
      if (updateBaseList) {
        this.events = [];
      }
      this.filteredEvents = [];
      this.currentPage = 1;
      this.isLoading = false;
      return;
    }

    forkJoin(availabilityRequests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results) => {
          const availabilityMap = results.reduce((acc, result) => {
            if (result.event?.tenantId) {
              acc[result.event.tenantId] = result.availableCount ?? 0;
            }
            return acc;
          }, {} as Record<string, number>);

          this.eventAvailableQuantities = updateBaseList
            ? availabilityMap
            : { ...this.eventAvailableQuantities, ...availabilityMap };

          const availableEvents = results
            .filter(result => result.hasTickets && (result.availableCount ?? 0) > 0)
            .map(result => result.event);

          if (updateBaseList) {
            this.events = availableEvents;
          }

          this.filteredEvents = [...availableEvents];
          this.currentPage = 1;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error filtering events by availability:', error);
          if (updateBaseList) {
            this.events = [];
          }
          this.filteredEvents = [];
          this.isLoading = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
