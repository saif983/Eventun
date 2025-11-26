import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EventService } from '../services/event.service';
import { Event } from '../models/event.model';
import { NavbarComponent } from '../navbar/navbar.component';
import { FooterComponent } from '../footer/footer.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NavbarComponent, FooterComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  contactForm!: FormGroup;
  isSubmitting: boolean = false;
  showSuccessModal: boolean = false;
  private isBrowser: boolean;

  // Hero Section Data
  heroTitle = 'Professional Event Ticketing System';
  heroSubtitle = 'Our customizable ticketing platform helps you sell tickets, manage attendees, and streamline check-in for any event.';

  // Services Section Data
  services = [
    {
      icon: 'fas fa-ticket-alt',
      title: 'Ticket Sales',
      description: 'Sell tickets online with our secure payment processing and automated delivery system.',
      features: ['Secure payments', 'Automated delivery', 'Real-time inventory']
    },
    {
      icon: 'fas fa-users',
      title: 'Attendee Management',
      description: 'Manage your attendees with our comprehensive dashboard and reporting tools.',
      features: ['Attendee tracking', 'Check-in system', 'Analytics dashboard']
    },
    {
      icon: 'fas fa-chart-line',
      title: 'Analytics & Reporting',
      description: 'Get detailed insights into your event performance with advanced analytics.',
      features: ['Sales reports', 'Attendee analytics', 'Revenue tracking']
    },
    {
      icon: 'fas fa-mobile-alt',
      title: 'Mobile App',
      description: 'Provide a seamless experience with our mobile app for attendees.',
      features: ['Digital tickets', 'QR code scanning', 'Push notifications']
    },
    {
      icon: 'fas fa-cog',
      title: 'Customization',
      description: 'Customize your ticketing platform to match your brand and requirements.',
      features: ['Brand customization', 'Flexible pricing', 'Integration options']
    },
    {
      icon: 'fas fa-headset',
      title: '24/7 Support',
      description: 'Get help whenever you need it with our round-the-clock customer support.',
      features: ['Live chat', 'Phone support', 'Email support']
    }
  ];

  // Features Section Data
  features = [
    {
      icon: 'fas fa-shield-alt',
      title: 'Secure & Reliable',
      description: 'Bank-level security ensures your transactions and data are always protected.'
    },
    {
      icon: 'fas fa-rocket',
      title: 'Easy Setup',
      description: 'Get started in minutes with our intuitive setup process and guided tours.'
    },
    {
      icon: 'fas fa-globe',
      title: 'Global Reach',
      description: 'Sell tickets worldwide with multi-currency support and international payment methods.'
    },
    {
      icon: 'fas fa-sync',
      title: 'Real-time Updates',
      description: 'Stay informed with real-time updates on sales, attendance, and event status.'
    }
  ];

  // Portfolio Section Data
  portfolioItems: Array<{ image?: string; title: string; category?: string; icon?: string; attendees?: string; location?: string; description?: string; revenue?: string; eventId?: string; tenantId?: string; }> = [];

  // Contact Information
  contactInfo = [
    {
      icon: 'fas fa-map-marker-alt',
      title: 'Our Location',
      value: 'Tunis ,Gouvernorat de tunis, Tunisie'
    },
    {
      icon: 'fas fa-phone',
      title: 'Phone Support',
      value: '+216 21 333 495'
    },
    {
      icon: 'fas fa-envelope',
      title: 'Email Us',
      value: 'info@eventun.com'
    },
    {
      icon: 'fas fa-clock',
      title: 'Working Hours',
      value: 'Mon - Fri: 9:00 AM - 6:00 PM'
    }
  ];

  constructor(
    private fb: FormBuilder, 
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private eventService: EventService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    this.initForm();
    // Only load portfolio in browser, not during SSR/prerendering
    if (this.isBrowser) {
      this.loadPortfolioFromEvents();
    }
  }

  initForm() {
    this.contactForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      eventType: [''],
      eventDate: [''],
      attendees: [''],
      message: [''],
      newsletter: [false]
    });
  }

  scrollToSection(sectionId: string) {
    if (this.isBrowser && typeof document !== 'undefined') {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }

  navigateToStore() {
    this.router.navigate(['/store']);
  }

  navigateToTickets() {
    this.router.navigate(['/tickets']);
  }

  navigateToTicketStore() {
    this.router.navigate(['/ticket-store']);
  }

  async onSubmit() {
    if (this.contactForm.valid) {
      this.isSubmitting = true;
      
      try {
        // Prepare email data
        const formData = this.contactForm.value;
        const emailData = {
          to: 'haddadsaif1920@gmail.com',
          subject: `New Event Request - ${formData.name}`,
          body: `
            New Event Request from Eventun Website
            
            Contact Information:
            - Name: ${formData.name}
            - Email: ${formData.email}
            - Phone: ${formData.phone || 'Not provided'}
            
            Event Details:
            - Event Type: ${formData.eventType || 'Not specified'}
            - Event Date: ${formData.eventDate || 'Not specified'}
            - Expected Attendees: ${formData.attendees || 'Not specified'}
            
            Message:
            ${formData.message || 'No additional message provided'}
            
            Newsletter Subscription: ${formData.newsletter ? 'Yes' : 'No'}
            
            Submitted on: ${new Date().toLocaleString()}
          `
        };
        
        // Send email using mailto link (for now)
        if (this.isBrowser && typeof window !== 'undefined') {
          const mailtoLink = `mailto:${emailData.to}?subject=${encodeURIComponent(emailData.subject)}&body=${encodeURIComponent(emailData.body)}`;
          window.open(mailtoLink, '_blank');
        }
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        this.isSubmitting = false;
        this.showSuccessModal = true;
        this.contactForm.reset();
        
      } catch (error) {
        console.error('Error submitting form:', error);
        this.isSubmitting = false;
        // You can add error handling here
      }
    } else {
      this.markFormGroupTouched();
    }
  }

  closeSuccessModal() {
    this.showSuccessModal = false;
  }

  private markFormGroupTouched() {
    Object.keys(this.contactForm.controls).forEach(key => {
      const control = this.contactForm.get(key);
      control?.markAsTouched();
    });
  }
  private loadPortfolioFromEvents() {
    this.eventService.getEvents().subscribe({
      next: (events: Event[]) => {
        this.portfolioItems = events.map(e => ({
          image: e.picture,
          title: e.titre,
          category: e.category,
          icon: 'fas fa-calendar-alt',
          attendees: e.ticketQte ? `${e.ticketQte}+` : undefined,
          location: e.location,
          description: e.description,
          eventId: e.tenantId,
          tenantId: e.tenantId
        }));
      },
      error: () => {
        this.portfolioItems = [];
      }
    });
  }

  viewEventDetails(item: { eventId?: string; tenantId?: string; title?: string }) {
    // Navigate to tickets/store page where users can browse and view event details
    // Since there's no dedicated event details page, navigate to the ticket store
    // Users can search for the event there or browse available tickets
    this.router.navigate(['/tickets'], {
      queryParams: {
        event: item.eventId || item.tenantId || '',
        search: item.title || ''
      }
    });
  }

  getQuote(item: { title?: string }) {
    // Scroll to contact form section for quote request
    this.scrollToSection('contact');
    
    // Pre-fill the event type in the contact form if available
    if (item.title) {
      this.contactForm.patchValue({
        eventType: item.title.toLowerCase().includes('music') ? 'concert' :
                   item.title.toLowerCase().includes('sport') ? 'sports' :
                   item.title.toLowerCase().includes('conference') ? 'conference' : 'other',
        message: `I'm interested in getting a quote for an event similar to: ${item.title}`
      });
    }
  }
}
