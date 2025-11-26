import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Event, CreateEventDto, UpdateEventDto, EventSearchDto } from '../models/event.model';
import { Ticket, GenerateTicketsDto, CreateTicketDto } from '../models/ticket.model';
import { environment } from '../../environments/environment';
import { CookieService } from './cookie.service';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private eventsSubject = new BehaviorSubject<Event[]>([]);
  public events$ = this.eventsSubject.asObservable();
  private eventsLoaded = false;

  constructor(
    private apiService: ApiService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Only load events in browser, not during SSR/prerendering
    if (isPlatformBrowser(this.platformId)) {
      this.loadEvents();
    }
  }

  loadEvents(): void {
    // Prevent multiple concurrent load attempts
    if (this.eventsLoaded) {
      return;
    }
    this.eventsLoaded = true;

    this.apiService.getEvents().subscribe({
      next: (events) => {
        this.eventsSubject.next(events);
      },
      error: (error) => {
        console.error('Error loading events:', error);
        this.eventsLoaded = false; // Allow retry on error
      }
    });
  }

  getEvents(): Observable<Event[]> {
    return this.events$;
  }

  getEvent(id: string): Observable<Event> {
    return this.apiService.getEvent(id);
  }

  createEvent(event: CreateEventDto): Observable<Event> {
    return this.apiService.createEvent(event).pipe(
      map(newEvent => {
        const currentEvents = this.eventsSubject.value;
        this.eventsSubject.next([...currentEvents, newEvent]);
        return newEvent;
      })
    );
  }

  updateEvent(id: string, event: UpdateEventDto): Observable<any> {
    return this.apiService.updateEvent(id, event).pipe(
      map(result => {
        this.loadEvents(); // Reload events after update
        return result;
      })
    );
  }

  deleteEvent(id: string): Observable<any> {
    return this.apiService.deleteEvent(id).pipe(
      map(result => {
        const currentEvents = this.eventsSubject.value;
        const filteredEvents = currentEvents.filter(e => e.tenantId !== id);
        this.eventsSubject.next(filteredEvents);
        return result;
      })
    );
  }

  getEventsByCategory(category: string): Observable<Event[]> {
    return this.apiService.getEventsByCategory(category);
  }

  searchEvents(searchDto: EventSearchDto): Observable<Event[]> {
    return this.apiService.searchEvents(searchDto);
  }

  getMyEvents(): Observable<Event[]> {
    return this.apiService.getMyEvents();
  }

  // Convert Event to Ticket for compatibility with existing components
  private convertEventToTicket(event: Event): Ticket {
    console.log('Converting event to ticket:', event.titre, 'Picture:', event.picture);
    return {
      tenantId: event.tenantId,
      userId: event.userId,
      eventId: event.tenantId,
      ticketNumber: `TKT-${Date.now()}`,
      ticketType: 'General',
      price: parseFloat(event.ticketPrice || '0'),
      quantity: parseInt(event.ticketQte || '0'),
      isPurchased: false,
      qrCode: '',
      ticketStatus: 'Available',
      // Legacy fields for compatibility
      id: event.tenantId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      eventName: event.titre,
      eventLocation: event.location || 'TBD',
      eventDate: new Date(event.startDate),
      category: event.category || 'General',
      originalPrice: parseFloat(event.ticketPrice || '0'),
      sellingPrice: parseFloat(event.ticketPrice || '0'),
      availableQuantity: parseInt(event.ticketQte || '0'),
      totalQuantity: parseInt(event.ticketQte || '0'),
      imageUrl: event.picture || undefined,
      rating: 4.5, // Default rating
      sellerName: event.eventOwner,
      description: event.description || ''
    };
  }

  // Get events as tickets for compatibility
  getEventsAsTickets(): Observable<Ticket[]> {
    return this.events$.pipe(
      map(events => events.map(event => this.convertEventToTicket(event)))
    );
  }

  searchEventsAsTickets(searchDto: EventSearchDto): Observable<Ticket[]> {
    return this.searchEvents(searchDto).pipe(
      map(events => events.map(event => this.convertEventToTicket(event)))
    );
  }

  // Generate tickets for an event (for owners) - using exact backend API
  generateTicketsForEvent(eventId: string, generateDto: GenerateTicketsDto): Observable<Ticket[]> {
    const ticketRequests: CreateTicketDto[] = [{
      eventId: eventId,
      ticketType: generateDto.ticketType,
      price: generateDto.price,
      quantity: generateDto.quantity
    }];
    return this.apiService.generateEventTickets(eventId, ticketRequests);
  }

  // Get available tickets for an event - using exact backend API
  getEventTickets(eventId: string): Observable<Ticket[]> {
    return this.apiService.getAvailableTickets(eventId);
  }
}
