import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';

import { PaymentComponent } from './payment.component';

// Mock Stripe
declare global {
  interface Window {
    Stripe: any;
  }
}

const mockStripe = {
  elements: jasmine.createSpy('elements').and.returnValue({
    create: jasmine.createSpy('create').and.returnValue({
      mount: jasmine.createSpy('mount'),
      on: jasmine.createSpy('on')
    })
  }),
  confirmCardPayment: jasmine.createSpy('confirmCardPayment').and.returnValue(
    Promise.resolve({
      paymentIntent: {
        id: 'pi_test_123',
        status: 'succeeded',
        amount: 7750,
        currency: 'usd'
      }
    })
  )
};

describe('PaymentComponent', () => {
  let component: PaymentComponent;
  let fixture: ComponentFixture<PaymentComponent>;
  let httpMock: HttpTestingController;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [PaymentComponent, HttpClientTestingModule, ReactiveFormsModule],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    // Mock Stripe
    window.Stripe = jasmine.createSpy('Stripe').and.returnValue(mockStripe);
    
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with required validators', () => {
    expect(component.paymentForm).toBeDefined();
    expect(component.paymentForm.get('email')?.hasError('required')).toBeTruthy();
    expect(component.paymentForm.get('fullName')?.hasError('required')).toBeTruthy();
    expect(component.paymentForm.get('phone')?.hasError('required')).toBeTruthy();
    
    const billingAddress = component.paymentForm.get('billingAddress');
    expect(billingAddress?.get('line1')?.hasError('required')).toBeTruthy();
    expect(billingAddress?.get('city')?.hasError('required')).toBeTruthy();
    expect(billingAddress?.get('state')?.hasError('required')).toBeTruthy();
    expect(billingAddress?.get('postal_code')?.hasError('required')).toBeTruthy();
  });

  it('should validate email format', () => {
    const emailControl = component.paymentForm.get('email');
    
    emailControl?.setValue('invalid-email');
    expect(emailControl?.hasError('email')).toBeTruthy();
    
    emailControl?.setValue('valid@email.com');
    expect(emailControl?.hasError('email')).toBeFalsy();
  });

  it('should calculate total amount correctly', () => {
    component.ticketItems = [
      { id: '1', name: 'Ticket 1', price: 50, quantity: 2 },
      { id: '2', name: 'Ticket 2', price: 75, quantity: 1 }
    ];
    
    expect(component.getTotalAmount()).toBe(175);
  });

  it('should calculate total items correctly', () => {
    component.ticketItems = [
      { id: '1', name: 'Ticket 1', price: 50, quantity: 2 },
      { id: '2', name: 'Ticket 2', price: 75, quantity: 3 }
    ];
    
    expect(component.getTotalItems()).toBe(5);
  });

  it('should update quantity correctly', () => {
    component.ticketItems = [
      { id: '1', name: 'Ticket 1', price: 50, quantity: 2 }
    ];
    
    component.updateQuantity('1', 1);
    expect(component.ticketItems[0].quantity).toBe(3);
    
    component.updateQuantity('1', -1);
    expect(component.ticketItems[0].quantity).toBe(2);
  });

  it('should not allow quantity below 0 or above 10', () => {
    component.ticketItems = [
      { id: '1', name: 'Ticket 1', price: 50, quantity: 1 }
    ];
    
    component.updateQuantity('1', -2);
    expect(component.ticketItems[0].quantity).toBe(1); // Should not go below 1
    
    component.ticketItems[0].quantity = 10;
    component.updateQuantity('1', 1);
    expect(component.ticketItems[0].quantity).toBe(10); // Should not go above 10
  });

  it('should remove item correctly', () => {
    component.ticketItems = [
      { id: '1', name: 'Ticket 1', price: 50, quantity: 2 },
      { id: '2', name: 'Ticket 2', price: 75, quantity: 1 }
    ];
    
    component.removeItem('1');
    expect(component.ticketItems.length).toBe(1);
    expect(component.ticketItems[0].id).toBe('2');
  });

  it('should initialize Stripe when in browser', () => {
    component.ngOnInit();
    
    // Simulate script loading
    const scripts = document.querySelectorAll('script[src="https://js.stripe.com/v3/"]');
    expect(scripts.length).toBeGreaterThan(0);
  });

  it('should handle payment success', () => {
    const mockPaymentIntent = {
      id: 'pi_test_123',
      status: 'succeeded',
      amount: 7750,
      currency: 'usd'
    };
    
    spyOn(localStorage, 'setItem');
    
    component.handlePaymentSuccess(mockPaymentIntent);
    
    expect(component.paymentSucceeded).toBeTruthy();
    expect(localStorage.setItem).toHaveBeenCalled();
    
    // Check if navigation is scheduled
    setTimeout(() => {
      expect(router.navigate).toHaveBeenCalledWith(['/payment-success'], {
        queryParams: { payment_intent: 'pi_test_123' }
      });
    }, 3100);
  });

  it('should handle form validation errors', () => {
    spyOn(component, 'markFormGroupTouched' as any);
    
    component.processPayment();
    
    expect(component['markFormGroupTouched']).toHaveBeenCalled();
  });

  it('should navigate back to tickets', () => {
    component.goBack();
    expect(router.navigate).toHaveBeenCalledWith(['/tickets']);
  });

  it('should handle payment processing state', () => {
    expect(component.isProcessing).toBeFalsy();
    
    // Mock valid form
    component.paymentForm.patchValue({
      email: 'test@example.com',
      fullName: 'Test User',
      phone: '+1234567890',
      billingAddress: {
        line1: '123 Test St',
        city: 'Test City',
        state: 'TS',
        postal_code: '12345',
        country: 'US'
      }
    });
    
    // Mock Stripe elements
    component.stripe = mockStripe;
    component.cardElement = {
      mount: jasmine.createSpy('mount'),
      on: jasmine.createSpy('on')
    };
    
    component.processPayment();
    
    expect(component.isProcessing).toBeTruthy();
  });

  it('should handle payment errors', async () => {
    const mockError = { message: 'Payment failed' };
    
    // Mock Stripe with error
    const mockStripeWithError = {
      ...mockStripe,
      confirmCardPayment: jasmine.createSpy('confirmCardPayment').and.returnValue(
        Promise.resolve({ error: mockError })
      )
    };
    
    component.stripe = mockStripeWithError;
    component.cardElement = {
      mount: jasmine.createSpy('mount'),
      on: jasmine.createSpy('on')
    };
    
    // Mock valid form
    component.paymentForm.patchValue({
      email: 'test@example.com',
      fullName: 'Test User',
      phone: '+1234567890',
      billingAddress: {
        line1: '123 Test St',
        city: 'Test City',
        state: 'TS',
        postal_code: '12345',
        country: 'US'
      }
    });
    
    // Mock createPaymentIntent
    spyOn(component, 'createPaymentIntent').and.returnValue(
      Promise.resolve({
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret',
        amount: 7750,
        currency: 'usd',
        status: 'requires_payment_method'
      })
    );
    
    await component.processPayment();
    
    expect(component.paymentError).toBe('Payment failed');
    expect(component.isProcessing).toBeFalsy();
  });

  it('should mark form group as touched', () => {
    const markTouchedSpy = jasmine.createSpy('markAsTouched');
    
    // Mock form controls
    spyOn(component.paymentForm, 'get').and.returnValue({
      markAsTouched: markTouchedSpy
    } as any);
    
    spyOn(Object, 'keys').and.returnValue(['email', 'fullName']);
    
    component['markFormGroupTouched']();
    
    expect(markTouchedSpy).toHaveBeenCalled();
  });
});
