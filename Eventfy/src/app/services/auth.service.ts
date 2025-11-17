import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from '../models/event.model';
import { ApiService } from './api.service';
import { environment } from '../../environments/environment';
import { CookieService } from './cookie.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private isBrowser: boolean;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private apiService: ApiService,
    private cookieService: CookieService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.loadUserFromStorage();
  }

  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  get isAuthenticated(): boolean {
    return !!this.currentUserValue && !!this.getToken();
  }

  get isOwner(): boolean {
    return this.currentUserValue?.role === 'Owner';
  }

  get isUser(): boolean {
    return this.currentUserValue?.role === 'User' || this.currentUserValue?.role === 'Owner';
  }

  setToken(token: string): void {
    this.cookieService.setCookie('access_token', token, 7);
  }

  getToken(): string | null {
    return this.cookieService.getCookie('access_token');
  }

  setUser(user: User): void {
    this.currentUserSubject.next(user);
    this.cookieService.setCookie('current_user', JSON.stringify(user), 7);
  }

  loadUserProfile(): Observable<any> {
    return new Observable(observer => {
      this.apiService.getUserProfile().subscribe({
        next: (response) => {
          this.setUser(response.user);
          observer.next(response);
          observer.complete();
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }

  logout(): void {
    this.cookieService.deleteCookie('access_token');
    this.cookieService.deleteCookie('current_user');
    this.currentUserSubject.next(null);
  }

  private loadUserFromStorage(): void {
    try {
      const savedUser = this.cookieService.getCookie('current_user');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        this.currentUserSubject.next(user);
      }
    } catch (error) {
      console.error('Error loading user from storage:', error);
    }
  }

  // Auth0 integration methods
  loginWithAuth0(): void {
    if (!this.isBrowser) return;
    
    const auth0Domain = environment.auth0.domain;
    const clientId = environment.auth0.clientId;
    const redirectUri = encodeURIComponent(window.location.origin + '/callback');
    const audience = encodeURIComponent(environment.auth0.audience);
    
    const authUrl = `https://${auth0Domain}/authorize?` +
      `response_type=code&` +
      `client_id=${clientId}&` +
      `redirect_uri=${redirectUri}&` +
      `scope=openid profile email read:events write:events manage:users&` +
      `audience=${audience}&` +
      `state=${Math.random().toString(36).substring(7)}`;
    
    console.log('Auth0 Login URL:', authUrl);
    window.location.href = authUrl;
  }

  handleAuthCallback(code: string): Observable<any> {
    if (!this.isBrowser) return new Observable(observer => observer.error('Not in browser'));
    
    const redirectUri = window.location.origin + '/callback';
    return new Observable(observer => {
      this.apiService.exchangeCodeForToken(code, redirectUri).subscribe({
        next: (response) => {
          if (response.access_token) {
            this.setToken(response.access_token);
            if (response.user) {
              this.setUser(response.user);
            }
          }
          observer.next(response);
          observer.complete();
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }

  // Test private-scoped endpoint (requires read:events permission)
  testPrivateScoped(): Observable<any> {
    return this.apiService.getPrivateScoped();
  }
}
