import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { FooterComponent } from '../footer/footer.component';
import { CookieService } from '../services/cookie.service';

declare var Stripe: any;

// Extend Window interface to include Stripe
declare global {
  interface Window {
    Stripe: any;
  }
}

interface PaymentIntent {
  id: string;
  client_secret: string;
  amount: number;
  currency: string;
  status: string;
}

interface TicketItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  description?: string;
  eventDate?: string;
  eventTime?: string;
  eventLocation?: string;
}

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule, NavbarComponent, FooterComponent],
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.scss'
})
export class PaymentComponent implements OnInit {
  paymentForm!: FormGroup;
  stripe: any;
  elements: any;
  cardElement: any;
  isProcessing: boolean = false;
  paymentSucceeded: boolean = false;
  paymentError: string = '';
  paymentIntent: PaymentIntent | null = null;
  
  // Ticket items to pay for
  ticketItems: TicketItem[] = [];

  private isBrowser: boolean;

  // Stripe test publishable key (replace with your actual test key)
  private stripePublishableKey = 'pk_test_51234567890abcdef'; // This is a placeholder

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cookieService: CookieService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    this.initForm();
    // Prefill from checkout data if available
    this.loadFromCheckoutData();
    if (this.isBrowser) {
      this.loadStripe();
    }
  }

  private loadFromCheckoutData() {
    try {
      const raw = this.cookieService.getCookie('checkoutData');
      if (!raw) {
        // If no checkout data, keep demo items for standalone testing
        this.ticketItems = this.ticketItems.length ? this.ticketItems : [];
        return;
      }
      const data = JSON.parse(raw);
      // Prefill customer info
      if (data.customerEmail) this.paymentForm.get('email')?.setValue(data.customerEmail);
      if (data.customerName) this.paymentForm.get('fullName')?.setValue(data.customerName);
      if (data.customerPhone) this.paymentForm.get('phone')?.setValue(data.customerPhone);

      // Map cart items to payment TicketItem shape
      if (Array.isArray(data.items)) {
        this.ticketItems = data.items.map((ci: any) => {
          const t = ci.ticket || {};
          const eventDate = t.eventDate ? new Date(t.eventDate) : null;
          return {
            id: t.id || ci.id || 'unknown',
            name: t.eventName || ci.name || 'Ticket',
            price: Number(t.sellingPrice ?? ci.price ?? 0),
            quantity: Number(ci.quantity ?? 1),
            description: t.description,
            eventDate: eventDate ? eventDate.toISOString().slice(0, 10) : undefined,
            eventTime: undefined,
            eventLocation: t.eventLocation
          } as TicketItem;
        });
      }
    } catch {
      // Ignore parse errors; leave defaults
    }
  }

  initForm() {
    this.paymentForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      phone: ['', [Validators.required, Validators.pattern(/^\+?[\d\s\-\(\)]+$/)]],
      billingAddress: this.fb.group({
        line1: ['', [Validators.required]],
        line2: [''],
        city: ['', [Validators.required]],
        state: ['', [Validators.required]],
        postal_code: ['', [Validators.required]],
        country: ['US', [Validators.required]]
      })
    });
  }

  async loadStripe() {
    try {
      // Load Stripe.js
      if (!window.Stripe) {
        const script = document.createElement('script');
        script.src = 'https://js.stripe.com/v3/';
        script.onload = () => this.initializeStripe();
        document.head.appendChild(script);
      } else {
        this.initializeStripe();
      }
    } catch (error) {
      console.error('Error loading Stripe:', error);
      this.paymentError = 'Failed to load payment system. Please refresh the page.';
    }
  }

  initializeStripe() {
    try {
      this.stripe = Stripe(this.stripePublishableKey);
      this.elements = this.stripe.elements();
      
      // Create card element
      this.cardElement = this.elements.create('card', {
        style: {
          base: {
            fontSize: '16px',
            color: '#424770',
            '::placeholder': {
              color: '#aab7c4',
            },
          },
          invalid: {
            color: '#9e2146',
          },
        },
      });

      // Mount card element (with retry if container isn't ready yet)
      const mountSelector = '#card-element';
      const mountIfReady = () => {
        const target = document.querySelector(mountSelector);
        if (target) {
          try {
            this.cardElement.mount(mountSelector);
          } catch (e) {
            console.warn('Stripe mount failed, retrying once...', e);
            setTimeout(() => {
              try { this.cardElement.mount(mountSelector); } catch {}
            }, 300);
          }
        } else {
          // Retry once after a short delay if the element isn't in DOM yet
          setTimeout(() => {
            try { this.cardElement.mount(mountSelector); } catch {}
          }, 300);
        }
      };
      mountIfReady();

      // Handle real-time validation errors from the card Element
      this.cardElement.on('change', ({error}: any) => {
        const displayError = document.getElementById('card-errors');
        if (displayError) {
          if (error) {
            displayError.textContent = error.message;
          } else {
            displayError.textContent = '';
          }
        }
      });
    } catch (error) {
      console.error('Error initializing Stripe:', error);
      this.paymentError = 'Failed to initialize payment system.';
    }
  }

  getTotalAmount(): number {
    return this.ticketItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  getTotalItems(): number {
    return this.ticketItems.reduce((total, item) => total + item.quantity, 0);
  }

  async createPaymentIntent(): Promise<PaymentIntent> {
    // For now, use mock payment intent since backend doesn't have payment endpoints yet
    return this.mockCreatePaymentIntent();
  }

  async processPayment() {
    if (!this.paymentForm.valid || !this.stripe || !this.cardElement) {
      this.markFormGroupTouched();
      return;
    }

    this.isProcessing = true;
    this.paymentError = '';

    try {
      // Create payment intent
      this.paymentIntent = await this.createPaymentIntent();

      // For demo purposes, simulate successful payment without calling Stripe
      // In production, you would use the real Stripe confirmCardPayment
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time
      
      // Mock successful payment response
      const mockPaymentIntent = {
        id: this.paymentIntent.id,
        status: 'succeeded',
        amount: this.paymentIntent.amount,
        currency: this.paymentIntent.currency
      };

      this.paymentSucceeded = true;
      this.isProcessing = false;
      
      // Save payment details and redirect to success page
      this.handlePaymentSuccess(mockPaymentIntent);
    } catch (error: any) {
      console.error('Payment error:', error);
      this.paymentError = error.message || 'Payment processing failed. Please try again.';
      this.isProcessing = false;
    }
  }

  handlePaymentSuccess(paymentIntent: any) {
    // Store payment details in cookies for receipt/ticket generation
    const paymentDetails = {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      tickets: this.ticketItems,
      customerInfo: {
        email: this.paymentForm.get('email')?.value,
        fullName: this.paymentForm.get('fullName')?.value,
        phone: this.paymentForm.get('phone')?.value
      },
      timestamp: new Date().toISOString()
    };

    this.cookieService.setCookie('lastPayment', JSON.stringify(paymentDetails), 7);

    // Redirect to success page after 3 seconds
    setTimeout(() => {
      this.router.navigate(['/payment-success'], { 
        queryParams: { 
          payment_intent: paymentIntent.id 
        } 
      });
    }, 3000);
  }

  // Mock function for demo - replace with actual backend call
  private async mockCreatePaymentIntent(): Promise<PaymentIntent> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate a proper Stripe-like payment intent ID and client secret
    const randomId = Math.random().toString(36).substr(2, 24);
    const id = `pi_${randomId}`;
    const secretPart = Math.random().toString(36).substr(2, 32) + Math.random().toString(36).substr(2, 32);
    
    return {
      id: id,
      client_secret: `${id}_secret_${secretPart}`,
      amount: Math.round(this.getTotalAmount() * 100),
      currency: 'usd',
      status: 'requires_payment_method'
    };
  }

  updateQuantity(itemId: string, change: number) {
    const item = this.ticketItems.find(i => i.id === itemId);
    if (item) {
      const newQuantity = item.quantity + change;
      if (newQuantity >= 0 && newQuantity <= 10) {
        item.quantity = newQuantity;
      }
    }
  }

  removeItem(itemId: string) {
    this.ticketItems = this.ticketItems.filter(item => item.id !== itemId);
  }

  private markFormGroupTouched() {
    Object.keys(this.paymentForm.controls).forEach(key => {
      const control = this.paymentForm.get(key);
      control?.markAsTouched();
      
      if (control instanceof FormGroup) {
        Object.keys(control.controls).forEach(nestedKey => {
          control.get(nestedKey)?.markAsTouched();
        });
      }
    });
  }

  goBack() {
    this.router.navigate(['/tickets']);
  }
}
