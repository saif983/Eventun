import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TicketBrowseComponent } from '../components/ticket-browse/ticket-browse.component';
import { ShoppingCartComponent } from '../components/shopping-cart/shopping-cart.component';
import { CheckoutComponent } from '../components/checkout/checkout.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { FooterComponent } from '../footer/footer.component';
import { CartService } from '../services/cart.service';
import { Ticket } from '../models/ticket.model';

@Component({
  selector: 'app-sales-ticket',
  standalone: true,
  imports: [
    CommonModule, 
    NavbarComponent,
    FooterComponent,
    TicketBrowseComponent,
    ShoppingCartComponent,
    CheckoutComponent
  ],
  templateUrl: './sales-ticket.component.html',
  styleUrl: './sales-ticket.component.scss'
})
export class SalesTicketComponent implements OnInit {
  currentView: 'browse' | 'cart' | 'checkout' = 'browse';
  selectedTicket: Ticket | null = null;
  showTicketModal: boolean = false;
  selectedQuantity: number = 1;

  constructor(
    private cartService: CartService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    // Listen to query parameters to determine the current view
    this.route.queryParams.subscribe(params => {
      const view = params['view'];
      if (view === 'cart' || view === 'checkout') {
        this.currentView = view;
      } else {
        this.currentView = 'browse';
      }
    });
  }

  setView(view: 'browse' | 'cart' | 'checkout') {
    this.currentView = view;
    
    // Update URL with query parameters
    if (view === 'browse') {
      this.router.navigate(['/store']);
    } else {
      this.router.navigate(['/store'], { queryParams: { view: view } });
    }
  }

  onTicketClick(ticket: Ticket) {
    this.selectedTicket = ticket;
    this.selectedQuantity = 1;
    this.showTicketModal = true;
  }

  closeTicketModal() {
    this.showTicketModal = false;
    this.selectedTicket = null;
    this.selectedQuantity = 1;
  }

  addToCart() {
    if (this.selectedTicket && this.selectedQuantity > 0) {
      // Verify ticket is available before adding to cart
      if (!this.cartService.isTicketAvailable(this.selectedTicket)) {
        // Ticket is not available - could show a toast notification here
        console.warn('Ticket is not available for purchase');
        return;
      }
      
      this.cartService.addToCart(this.selectedTicket, this.selectedQuantity);
      this.closeTicketModal();
      
      // Success - ticket added to cart (could show toast notification here)
      console.log(`${this.selectedQuantity} ticket(s) added to cart!`);
    }
  }

  updateQuantity(change: number) {
    if (this.selectedTicket) {
      const newQuantity = this.selectedQuantity + change;
      const maxQuantity = this.selectedTicket.quantity || (this.selectedTicket.availableQuantity ?? 0);
      if (newQuantity >= 1 && newQuantity <= maxQuantity) {
        this.selectedQuantity = newQuantity;
      }
    }
  }

  onProceedToCheckout() {
    this.setView('checkout');
  }

  onContinueShopping() {
    this.setView('browse');
  }

  onCheckoutCancel() {
    this.setView('cart');
  }
}
