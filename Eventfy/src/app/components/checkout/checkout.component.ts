import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CartService } from '../../services/cart.service';
import { CartItem } from '../../models/cart-item.model';
import { Router } from '@angular/router';
import { CookieService } from '../../services/cookie.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss'
})
export class CheckoutComponent implements OnInit {
  @Output() cancel = new EventEmitter<void>();
  
  checkoutForm!: FormGroup;
  cartItems: CartItem[] = [];
  cartTotal: number = 0;
  serviceFee: number = 0;
  totalWithFee: number = 0;
  isSubmitting: boolean = false;

  paymentMethods = [
    { value: 'Credit Card', label: 'Credit Card' },
    { value: 'PayPal', label: 'PayPal' },
    { value: 'Bank Transfer', label: 'Bank Transfer' }
  ];

  deliveryMethods = [
    { value: 'E-Ticket', label: 'E-Ticket (Instant Delivery)' },
    { value: 'Mobile Ticket', label: 'Mobile Ticket' },
    { value: 'Will Call', label: 'Will Call (Pickup at Venue)' }
  ];

  constructor(
    private fb: FormBuilder,
    private cartService: CartService,
    private router: Router,
    private cookieService: CookieService
  ) {}

  ngOnInit() {
    this.initForm();
    this.loadCartData();
  }

  initForm() {
    this.checkoutForm = this.fb.group({
      customerName: ['', [Validators.required]],
      customerEmail: ['', [Validators.required, Validators.email]],
      customerPhone: ['', [Validators.required]],
      paymentMethod: ['Credit Card', [Validators.required]],
      deliveryMethod: ['E-Ticket', [Validators.required]]
    });
  }

  loadCartData() {
    this.cartItems = this.cartService.getCartItems();
    this.cartTotal = this.cartService.getCartTotal();
    this.serviceFee = this.cartTotal * 0.05; // 5% service fee
    this.totalWithFee = this.cartTotal + this.serviceFee;
  }

  onSubmit() {
    if (this.checkoutForm.valid && this.cartItems.length > 0) {
      this.isSubmitting = true;

      const orderData = {
        ...this.checkoutForm.value,
        items: this.cartItems,
        totalAmount: this.totalWithFee,
        orderDate: new Date(),
        orderId: this.generateOrderId()
      };

      // Persist checkout data for payment step
      try {
        this.cookieService.setCookie('checkoutData', JSON.stringify(orderData), 7);
      } catch {}

      // Navigate to payment route
      this.router.navigate(['/payement']);
    } else {
      this.markFormGroupTouched();
    }
  }

  private generateOrderId(): string {
    return 'TKT-' + new Date().getFullYear() + '-' + 
           String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  }

  private markFormGroupTouched() {
    Object.keys(this.checkoutForm.controls).forEach(key => {
      const control = this.checkoutForm.get(key);
      control?.markAsTouched();
    });
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

  onCancel() {
    this.cancel.emit();
  }
}
