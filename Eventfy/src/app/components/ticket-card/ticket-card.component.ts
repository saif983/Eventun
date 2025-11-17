import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Ticket } from '../../models/ticket.model';

@Component({
  selector: 'app-ticket-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ticket-card.component.html',
  styleUrl: './ticket-card.component.scss'
})
export class TicketCardComponent {
  @Input() ticket!: Ticket;
  @Output() ticketClick = new EventEmitter<Ticket>();

  onViewDetails() {
    this.ticketClick.emit(this.ticket);
  }

  getTicketTypeColor(type: string): string {
    // Match backend TicketType constants: VIP, Standard, Student
    switch (type?.toUpperCase()) {
      case 'VIP': return 'bg-purple-100 text-purple-800';
      case 'STANDARD': return 'bg-blue-100 text-blue-800';
      case 'STUDENT': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  formatPrice(price: number): string {
    // Format price with 2 decimal places, matching backend decimal type
    return `$${price.toFixed(2)}`;
  }

  getDisplayPrice(): number {
    // Backend returns Price as decimal, use it directly
    return this.ticket.price || 0;
  }

  isTicketAvailable(): boolean {
    // Match backend logic: IsActive && !IsPurchased && TicketStatus == "Available"
    // Backend sets Quantity = 1 for each individual ticket
    return !this.ticket.isPurchased && 
           (this.ticket.isActive ?? true) && 
           this.ticket.ticketStatus === 'Available' &&
           (this.ticket.quantity || 0) > 0;
  }

  getTicketStatusBadge(): string {
    // Display ticket status based on backend TicketStatus field
    switch (this.ticket.ticketStatus?.toLowerCase()) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'sold': return 'bg-red-100 text-red-800';
      case 'reserved': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getTicketStatusText(): string {
    return this.ticket.ticketStatus || 'Unknown';
  }
}
