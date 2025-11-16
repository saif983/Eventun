import { Ticket } from './ticket.model';

export interface CartItem {
  ticket: Ticket;
  quantity: number;
}
