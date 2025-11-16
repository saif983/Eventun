import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { CartService } from '../services/cart.service';
import { AuthService } from '../services/auth.service';
import { Subscription } from 'rxjs';
import { User } from '../models/event.model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnInit, OnDestroy {
  isScrolled: boolean = false;
  isMobileMenuOpen: boolean = false;
  isProfileDropdownOpen: boolean = false;
  cartItemCount: number = 0;
  currentUser: User | null = null;
  isAuthenticated: boolean = false;
  private cartSubscription: Subscription | undefined;
  private authSubscription: Subscription | undefined;
  private isBrowser: boolean;

  constructor(
    private router: Router,
    private cartService: CartService,
    public authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    if (this.isBrowser) {
      this.onWindowScroll();
      window.addEventListener('scroll', this.onWindowScroll.bind(this));
    }
    
    // Subscribe to cart changes
    this.cartSubscription = this.cartService.getCartItemsObservable().subscribe(() => {
      this.cartItemCount = this.cartService.getCartItemCount();
    });

    // Subscribe to auth changes
    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.isAuthenticated = !!user;
    });
  }

  ngOnDestroy() {
    if (this.isBrowser) {
      window.removeEventListener('scroll', this.onWindowScroll.bind(this));
    }
    if (this.cartSubscription) {
      this.cartSubscription.unsubscribe();
    }
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  onWindowScroll() {
    if (this.isBrowser && typeof window !== 'undefined') {
      this.isScrolled = window.scrollY > 0;
    }
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  navigateToHome() {
    this.router.navigate(['/home']);
  }

  navigateToTicketStore() {
    this.router.navigate(['/ticket-store']);
  }

  navigateToCart() {
    this.router.navigate(['/store'], { queryParams: { view: 'cart' } });
  }

  navigateToQRTicket() {
    this.router.navigate(['/qr-ticket']);
  }

  navigateToQRCheckin() {
    this.router.navigate(['/qr-checkin']);
  }

  navigateToSignIn() {
    this.router.navigate([{ outlets: { modal: ['sign-in'] } }]);
  }


  toggleProfileDropdown() {
    this.isProfileDropdownOpen = !this.isProfileDropdownOpen;
  }

  navigateToProfile() {
    this.router.navigate(['/profile']);
    this.isProfileDropdownOpen = false;
  }

  navigateToMyEvents() {
    this.router.navigate(['/my-events']);
    this.isProfileDropdownOpen = false;
  }

  navigateToSettings() {
    this.router.navigate(['/settings']);
    this.isProfileDropdownOpen = false;
  }


  login() {
    this.authService.loginWithAuth0();
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/home']);
  }

  scrollToSection(sectionId: string) {
    if (this.isBrowser && typeof document !== 'undefined') {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }
}
