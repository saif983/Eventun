import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {
  private isBrowser: boolean;
  currentYear: number = new Date().getFullYear();

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
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

  scrollToTop() {
    if (this.isBrowser && typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  openSocialLink(platform: string) {
    if (this.isBrowser && typeof window !== 'undefined') {
      const links = {
        facebook: 'https://facebook.com/eventun',
        twitter: 'https://twitter.com/eventun',
        instagram: 'https://instagram.com/eventun',
        linkedin: 'https://linkedin.com/company/eventun'
      };
      window.open(links[platform as keyof typeof links], '_blank');
    }
  }
}
