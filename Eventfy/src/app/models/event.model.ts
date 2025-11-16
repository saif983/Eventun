export interface Event {
  id?: string;
  tenantId: string;
  userId: string;
  titre: string;
  eventOwner: string;
  picture?: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate: Date;
  category?: string;
  ticketQte?: string;
  ticketPrice?: string;
}

export interface CreateEventDto {
  titre: string;
  eventOwner: string;
  picture?: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate: Date;
  category?: string;
  ticketQte?: string;
  ticketPrice?: string;
}

export interface UpdateEventDto {
  titre: string;
  eventOwner: string;
  picture?: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate: Date;
  category?: string;
  ticketQte?: string;
  ticketPrice?: string;
}

export interface EventSearchDto {
  query?: string;
  category?: string;
  startDate?: Date;
  endDate?: Date;
  location?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role: string;
  isActive: boolean;
}

export interface AuthResponse {
  message: string;
  user: User;
}
