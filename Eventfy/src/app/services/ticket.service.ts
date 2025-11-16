import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Ticket, CreateTicketDto, UpdateTicketDto, PurchaseTicketDto, GenerateTicketsDto, TicketSearchDto } from '../models/ticket.model';
import { environment } from '../../environments/environment';
import { CookieService } from './cookie.service';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  private baseUrl = environment.apiUrl;
  private ticketsSubject = new BehaviorSubject<Ticket[]>([]);
  public tickets$ = this.ticketsSubject.asObservable();

  constructor(
    private http: HttpClient, 
    private cookieService: CookieService,
    private apiService: ApiService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.cookieService.getCookie('access_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  // Get all tickets for an event (public)
  getAvailableTickets(eventId: string): Observable<Ticket[]> {
    return this.apiService.getAvailableTickets(eventId);
  }

  // Get user's purchased tickets
  getMyPurchasedTickets(): Observable<Ticket[]> {
    return this.apiService.getMyPurchasedTickets();
  }

  // Get all tickets (for owners) with search
  getAllTickets(searchDto?: TicketSearchDto): Observable<Ticket[]> {
    return this.apiService.getAllTickets(searchDto);
  }

  // Get single ticket
  getTicket(id: string): Observable<Ticket> {
    return this.apiService.getTicket(id);
  }

  // Create single ticket (for owners)
  createTicket(ticketDto: CreateTicketDto): Observable<Ticket> {
    return this.apiService.createTicket(ticketDto);
  }

  // Update ticket (for owners)
  updateTicket(id: string, ticketDto: UpdateTicketDto): Observable<any> {
    return this.apiService.updateTicket(id, ticketDto);
  }

  // Delete ticket (for owners)
  deleteTicket(id: string): Observable<any> {
    return this.apiService.deleteTicket(id);
  }

  // Purchase ticket (for users)
  purchaseTicket(purchaseDto: PurchaseTicketDto): Observable<Ticket> {
    return this.apiService.purchaseTicket(purchaseDto);
  }

  // Generate multiple tickets for an event (for owners)
  generateEventTickets(eventId: string, generateDto: GenerateTicketsDto): Observable<Ticket[]> {
    const ticketRequests: CreateTicketDto[] = [{
      eventId: eventId,
      ticketType: generateDto.ticketType,
      price: generateDto.price,
      quantity: generateDto.quantity
    }];
    return this.apiService.generateEventTickets(eventId, ticketRequests);
  }

  // Load tickets for current user context
  loadMyTickets(): void {
    this.getMyPurchasedTickets().subscribe({
      next: (tickets) => {
        this.ticketsSubject.next(tickets);
      },
      error: (error) => {
        console.error('Error loading tickets:', error);
      }
    });
  }

  // Get tickets observable
  getTickets(): Observable<Ticket[]> {
    return this.tickets$;
  }

  // Helper method to check if ticket is available for purchase
  isTicketAvailable(ticket: Ticket): boolean {
    return !ticket.isPurchased && (ticket.isActive ?? true) && ticket.quantity > 0;
  }

  // Helper method to format ticket display name
  getTicketDisplayName(ticket: Ticket): string {
    return `${ticket.ticketType} - ${ticket.ticketNumber}`;
  }

  // Helper method to get ticket price display
  getTicketPriceDisplay(ticket: Ticket): string {
    return `$${ticket.price.toFixed(2)}`;
  }
}
