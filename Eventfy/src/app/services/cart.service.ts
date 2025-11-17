import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { CartItem } from '../models/cart-item.model';
import { Ticket, PurchaseTicketDto } from '../models/ticket.model';
import { CookieService } from './cookie.service';
import { TicketService } from './ticket.service';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartItems: CartItem[] = [];
  private cartSubject = new BehaviorSubject<CartItem[]>([]);
  private isBrowser: boolean;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private cookieService: CookieService,
    private ticketService: TicketService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    
    // Load cart from cookies
    this.loadCartFromStorage();
  }

  getCartItems(): CartItem[] {
    return this.cartItems;
  }

  getCartItemsObservable(): Observable<CartItem[]> {
    return this.cartSubject.asObservable();
  }

  addToCart(ticket: Ticket, quantity: number = 1): void {
    const existingItem = this.cartItems.find(item => item.ticket.id === ticket.id);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      this.cartItems.push({ ticket, quantity });
    }
    
    this.updateCart();
  }

  removeFromCart(ticketId: string): void {
    this.cartItems = this.cartItems.filter(item => item.ticket.id !== ticketId);
    this.updateCart();
  }

  updateQuantity(ticketId: string, quantity: number): void {
    const item = this.cartItems.find(item => item.ticket.id === ticketId);
    if (item) {
      item.quantity = quantity;
      this.updateCart();
    }
  }

  clearCart(): void {
    this.cartItems = [];
    this.updateCart();
  }

  getCartTotal(): number {
    return this.cartItems.reduce((total, item) => {
      const price = item.ticket.price || item.ticket.sellingPrice || 0;
      return total + (price * item.quantity);
    }, 0);
  }

  getCartItemCount(): number {
    return this.cartItems.reduce((total, item) => total + item.quantity, 0);
  }

  private updateCart(): void {
    this.cartSubject.next([...this.cartItems]);
    this.saveCartToStorage();
  }

  private saveCartToStorage(): void {
    try {
      if (this.cartItems.length === 0) {
        this.cookieService.deleteCookie('cart');
        this.cookieService.deleteCookie('checkoutData');
      } else {
        this.cookieService.setCookie('cart', JSON.stringify(this.cartItems), 7);
      }
    } catch (error) {
      console.error('Error saving cart to cookies:', error);
    }
  }

  private loadCartFromStorage(): void {
    try {
      const savedCart = this.cookieService.getCookie('cart');
      if (savedCart) {
        this.cartItems = JSON.parse(savedCart);
        this.cartSubject.next([...this.cartItems]);
      }
    } catch (error) {
      console.error('Error loading cart from storage:', error);
      this.cartItems = [];
    }
  }

  // Purchase all items in cart
  purchaseCartItems(): Observable<Ticket[]> {
    const purchaseObservables = this.cartItems.map(item => 
      this.ticketService.purchaseTicket({ ticketId: item.ticket.id! })
    );
    
    return new Observable(observer => {
      const subscriptions = purchaseObservables.map(obs => obs.toPromise());
      Promise.all(subscriptions).then(
        (purchasedTickets) => {
          const validTickets = purchasedTickets.filter((ticket): ticket is Ticket => ticket !== undefined);
          this.clearCart();
          observer.next(validTickets);
          observer.complete();
        },
        (error) => {
          observer.error(error);
        }
      );
    });
  }

  // Check if ticket is available for purchase
  isTicketAvailable(ticket: Ticket): boolean {
    return this.ticketService.isTicketAvailable(ticket);
  }
}
