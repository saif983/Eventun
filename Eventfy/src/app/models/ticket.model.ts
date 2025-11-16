// Backend DTO matching exact structure
export interface Ticket {
  tenantId: string;
  userId: string;
  eventId: string;
  ticketNumber: string;
  ticketType: string;
  price: number;
  quantity: number;
  isPurchased: boolean;
  purchasedByUserId?: string;
  purchaseDate?: Date;
  qrCode: string;
  ticketStatus: string;
  // Legacy fields for compatibility
  id?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  eventName?: string;
  eventLocation?: string;
  eventDate?: Date;
  eventTime?: string;
  category?: string;
  originalPrice?: number;
  sellingPrice?: number;
  availableQuantity?: number;
  totalQuantity?: number;
  imageUrl?: string;
  rating?: number;
  sellerName?: string;
  organizerName?: string;
  organizerEmail?: string;
  description?: string;
  customMessage?: string;
  qrCodeDataUrl?: string;
  qrCodeUrl?: string;
  ticketPrice?: number;
}

// Backend DTOs matching exact structure
export interface CreateTicketDto {
  eventId: string;
  ticketType: string;
  price: number;
  quantity: number;
}

export interface UpdateTicketDto {
  ticketType: string;
  price: number;
  quantity: number;
}

export interface PurchaseTicketDto {
  ticketId: string;
}

export interface TicketSearchDto {
  query?: string;
  ticketNumber?: string;
  ticketType?: string;
  ticketPrice?: string;
  ticketQte?: string;
}

export interface GenerateTicketsDto {
  ticketType: string;
  price: number;
  quantity: number;
}

export interface CreateTicketDto {
  eventId: string;
  ticketType: string;
  price: number;
  quantity: number;
}
