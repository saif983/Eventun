import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Event, CreateEventDto, UpdateEventDto, EventSearchDto, AuthResponse } from '../models/event.model';
import { Ticket, CreateTicketDto, UpdateTicketDto, PurchaseTicketDto, GenerateTicketsDto, TicketSearchDto } from '../models/ticket.model';
import { environment } from '../../environments/environment';
import { CookieService } from './cookie.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl;
  
  constructor(private http: HttpClient, private cookieService: CookieService) {}

  private getHeaders(): HttpHeaders {
    const token = this.cookieService.getCookie('access_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  // Auth endpoints
  getPublic(): Observable<any> {
    return this.http.get(`${this.baseUrl}/public`);
  }

  getPrivate(): Observable<any> {
    return this.http.get(`${this.baseUrl}/private`, { headers: this.getHeaders() });
  }

  getPrivateScoped(): Observable<any> {
    return this.http.get(`${this.baseUrl}/private-scoped`, { headers: this.getHeaders() });
  }

  getUserProfile(): Observable<AuthResponse> {
    return this.http.get<AuthResponse>(`${this.baseUrl}/user-profile`, { headers: this.getHeaders() });
  }

  assignOwnerRole(): Observable<any> {
    return this.http.post(`${this.baseUrl}/assign-owner-role`, {}, { headers: this.getHeaders() });
  }

  exchangeCodeForToken(code: string, redirectUri: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/token`, { code, redirectUri });
  }

  // Event endpoints
  getEvents(): Observable<Event[]> {
    return this.http.get<Event[]>(`${this.baseUrl}/Event`);
  }

  getEvent(id: string): Observable<Event> {
    return this.http.get<Event>(`${this.baseUrl}/Event/${id}`);
  }

  createEvent(event: CreateEventDto): Observable<Event> {
    return this.http.post<Event>(`${this.baseUrl}/Event`, event, { headers: this.getHeaders() });
  }

  updateEvent(id: string, event: UpdateEventDto): Observable<any> {
    return this.http.put(`${this.baseUrl}/Event/${id}`, event, { headers: this.getHeaders() });
  }

  deleteEvent(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/Event/${id}`, { headers: this.getHeaders() });
  }

  getEventsByCategory(category: string): Observable<Event[]> {
    return this.http.get<Event[]>(`${this.baseUrl}/Event/category/${category}`);
  }

  searchEvents(searchDto: EventSearchDto): Observable<Event[]> {
    return this.http.post<Event[]>(`${this.baseUrl}/Event/search`, searchDto);
  }

  getMyEvents(): Observable<Event[]> {
    return this.http.get<Event[]>(`${this.baseUrl}/Event/my-events`, { headers: this.getHeaders() });
  }

  // Ticket endpoints - matching exact backend API
  getAvailableTickets(eventId: string): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.baseUrl}/ticket/available/${eventId}`);
  }

  getMyPurchasedTickets(): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.baseUrl}/ticket/my-purchases`, { headers: this.getHeaders() });
  }

  getAllTickets(searchDto?: TicketSearchDto): Observable<Ticket[]> {
    let params = '';
    if (searchDto) {
      const urlParams = new URLSearchParams();
      if (searchDto.query) urlParams.append('query', searchDto.query);
      if (searchDto.ticketNumber) urlParams.append('ticketNumber', searchDto.ticketNumber);
      if (searchDto.ticketType) urlParams.append('ticketType', searchDto.ticketType);
      if (searchDto.ticketPrice) urlParams.append('ticketPrice', searchDto.ticketPrice);
      if (searchDto.ticketQte) urlParams.append('ticketQte', searchDto.ticketQte);
      params = urlParams.toString();
    }
    const url = params ? `${this.baseUrl}/ticket?${params}` : `${this.baseUrl}/ticket`;
    return this.http.get<Ticket[]>(url, { headers: this.getHeaders() });
  }

  getTicket(id: string): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.baseUrl}/ticket/${id}`, { headers: this.getHeaders() });
  }

  createTicket(ticketDto: CreateTicketDto): Observable<Ticket> {
    return this.http.post<Ticket>(`${this.baseUrl}/ticket`, ticketDto, { headers: this.getHeaders() });
  }

  updateTicket(id: string, ticketDto: UpdateTicketDto): Observable<any> {
    return this.http.put(`${this.baseUrl}/ticket/${id}`, ticketDto, { headers: this.getHeaders() });
  }

  deleteTicket(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/ticket/${id}`, { headers: this.getHeaders() });
  }

  purchaseTicket(purchaseDto: PurchaseTicketDto): Observable<Ticket> {
    return this.http.post<Ticket>(`${this.baseUrl}/ticket/purchase`, purchaseDto, { headers: this.getHeaders() });
  }

  generateEventTickets(eventId: string, ticketRequests: CreateTicketDto[]): Observable<Ticket[]> {
    return this.http.post<Ticket[]>(`${this.baseUrl}/Event/${eventId}/generate-tickets`, ticketRequests, {
      headers: this.getHeaders()
    });
  }
}
