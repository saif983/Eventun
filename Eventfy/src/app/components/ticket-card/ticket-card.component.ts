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
    switch (type) {
      case 'VIP': return 'bg-purple-100 text-purple-800';
      case 'Premium': return 'bg-yellow-100 text-yellow-800';
      case 'General': return 'bg-blue-100 text-blue-800';
      case 'Student': return 'bg-orange-100 text-orange-800';
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
    return `$${price.toFixed(0)}`;
  }

  getDisplayPrice(): number {
    return this.ticket.price || this.ticket.sellingPrice || this.ticket.originalPrice || 0;
  }

  isTicketAvailable(): boolean {
    return !this.ticket.isPurchased && (this.ticket.isActive ?? true) && (this.ticket.quantity || this.ticket.availableQuantity || 0) > 0;
  }
}
