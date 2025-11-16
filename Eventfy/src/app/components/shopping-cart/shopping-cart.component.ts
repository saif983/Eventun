import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '../../services/cart.service';
import { CartItem } from '../../models/cart-item.model';

@Component({
  selector: 'app-shopping-cart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './shopping-cart.component.html',
  styleUrl: './shopping-cart.component.scss'
})
export class ShoppingCartComponent implements OnInit {
  @Output() proceedToCheckout = new EventEmitter<void>();
  @Output() continueShopping = new EventEmitter<void>();
  
  cartItems: CartItem[] = [];
  cartTotal: number = 0;
  serviceFee: number = 0;
  totalWithFee: number = 0;

  constructor(private cartService: CartService) {}

  ngOnInit() {
    this.loadCart();
  }

  loadCart() {
    this.cartItems = this.cartService.getCartItems();
    this.calculateTotals();
  }

  updateQuantity(item: CartItem, change: number) {
    const newQuantity = item.quantity + change;
    if (newQuantity >= 1 && newQuantity <= (item.ticket.quantity || item.ticket.availableQuantity || 0)) {
      if (item.ticket.id) {
        this.cartService.updateQuantity(item.ticket.id, newQuantity);
      }
    } else if (newQuantity <= 0) {
      if (item.ticket.id) {
        this.removeItem(item.ticket.id);
      }
    }
  }

  removeItem(ticketId: string) {
    this.cartService.removeFromCart(ticketId);
    this.loadCart();
  }

  private calculateTotals() {
    this.cartTotal = this.cartItems.reduce((total, item) => {
      const price = item.ticket.price || item.ticket.sellingPrice || 0;
      return total + (price * item.quantity);
    }, 0);
    
    this.serviceFee = this.cartTotal * 0.05; // 5% service fee
    this.totalWithFee = this.cartTotal + this.serviceFee;
  }

  formatPrice(price: number): string {
    return `$${price.toFixed(2)}`;
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

  getTicketTypeColor(type: string): string {
    switch (type) {
      case 'VIP': return 'bg-purple-100 text-purple-800';
      case 'Premium': return 'bg-yellow-100 text-yellow-800';
      case 'General': return 'bg-blue-100 text-blue-800';
      case 'Student': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  onProceedToCheckout() {
    this.proceedToCheckout.emit();
  }

  onContinueShopping() {
    this.continueShopping.emit();
  }
}
