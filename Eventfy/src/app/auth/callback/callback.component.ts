import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="callback-container">
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p>{{ message }}</p>
      </div>
    </div>
  `,
  styles: [`
    .callback-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background-color: #f8f9fa;
    }
    
    .loading-spinner {
      text-align: center;
    }
    
    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #007bff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    p {
      color: #666;
      font-size: 16px;
      margin: 0;
    }
  `]
})
export class CallbackComponent implements OnInit {
  message = 'Processing authentication...';
  private isBrowser: boolean;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    if (!this.isBrowser) {
      this.router.navigate(['/home']);
      return;
    }

    this.route.queryParams.subscribe(params => {
      const code = params['code'];
      const error = params['error'];
      
      if (error) {
        this.message = 'Authentication failed. Redirecting...';
        console.error('Auth0 error:', error);
        setTimeout(() => {
          this.router.navigate(['/home']);
        }, 2000);
        return;
      }
      
      if (code) {
        this.message = 'Exchanging authorization code...';
        this.authService.handleAuthCallback(code).subscribe({
          next: (response) => {
            this.message = 'Authentication successful! Redirecting...';
            setTimeout(() => {
              this.router.navigate(['/home']);
            }, 1000);
          },
          error: (error) => {
            this.message = 'Authentication failed. Redirecting...';
            console.error('Token exchange error:', error);
            setTimeout(() => {
              this.router.navigate(['/home']);
            }, 2000);
          }
        });
      } else {
        this.message = 'No authorization code received. Redirecting...';
        setTimeout(() => {
          this.router.navigate(['/home']);
        }, 2000);
      }
    });
  }
}
