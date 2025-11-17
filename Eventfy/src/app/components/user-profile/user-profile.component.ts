import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { Event } from '../../models/event.model';
import { NavbarComponent } from '../../navbar/navbar.component';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss']
})
export class UserProfileComponent implements OnInit, OnDestroy {
  currentUser: any = null;
  userEvents: Event[] = [];
  isLoading = true;
  isLoadingEvents = false;
  activeTab = 'profile'; // 'profile', 'events', 'settings'
  private subscription: Subscription = new Subscription();

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUserProfile();
    this.loadUserEvents();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private loadUserProfile(): void {
    this.isLoading = true;
    
    const userSub = this.authService.currentUser$.subscribe({
      next: (user: any) => {
        this.currentUser = user;
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading user profile:', error);
        this.isLoading = false;
      }
    });

    this.subscription.add(userSub);
  }

  private loadUserEvents(): void {
    this.isLoadingEvents = true;
    
    const eventsSub = this.apiService.getMyEvents().subscribe({
      next: (events) => {
        this.userEvents = events;
        this.isLoadingEvents = false;
      },
      error: (error) => {
        console.error('Error loading user events:', error);
        this.isLoadingEvents = false;
      }
    });

    this.subscription.add(eventsSub);
  }

  // Tab management
  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  isActiveTab(tab: string): boolean {
    return this.activeTab === tab;
  }

  // Navigation methods
  goBack(): void {
    this.router.navigate(['/']);
  }

  navigateToEvent(eventId: string): void {
    this.router.navigate(['/events', eventId]);
  }

  createNewEvent(): void {
    this.router.navigate(['/create-event']);
  }

  // Profile actions
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  editProfile(): void {
    // Navigate to profile edit page or open edit modal
    // For now, reload profile to get latest data
    this.loadUserProfile();
  }

  refreshProfile(): void {
    this.loadUserProfile();
    this.loadUserEvents();
  }

  // Event actions
  editEvent(event: Event): void {
    this.router.navigate(['/edit-event', event.tenantId]);
  }

  deleteEvent(event: Event): void {
    if (confirm(`Are you sure you want to delete "${event.titre}"?`)) {
      const deleteSub = this.apiService.deleteEvent(event.tenantId).subscribe({
        next: () => {
          this.userEvents = this.userEvents.filter(e => e.tenantId !== event.tenantId);
          // Event deleted successfully - could show toast notification here
        },
        error: (error) => {
          console.error('Error deleting event:', error);
          alert('Failed to delete event. Please try again.');
        }
      });
      this.subscription.add(deleteSub);
    }
  }

  // Utility methods for displaying user information
  getUserRole(): string {
    return this.currentUser?.role || 'User';
  }

  getUserStatus(): string {
    return this.currentUser?.status || 'Active';
  }

  getJoinDate(): string {
    if (this.currentUser?.createdAt) {
      return new Date(this.currentUser.createdAt).toLocaleDateString();
    }
    return 'N/A';
  }

  getLastLogin(): string {
    if (this.currentUser?.lastLogin) {
      return new Date(this.currentUser.lastLogin).toLocaleDateString();
    }
    return 'N/A';
  }

  // Event utility methods
  getEventDate(event: Event): string {
    return new Date(event.startDate).toLocaleDateString();
  }

  getEventTime(event: Event): string {
    return new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  getEventStatus(event: Event): string {
    const now = new Date();
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);

    if (now < startDate) return 'upcoming';
    if (now > endDate) return 'completed';
    return 'ongoing';
  }

  getEventStatusColor(event: Event): string {
    const status = this.getEventStatus(event);
    switch (status) {
      case 'upcoming': return 'text-blue-600 bg-blue-100';
      case 'ongoing': return 'text-green-600 bg-green-100';
      case 'completed': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }

  // Profile actions
  changePassword(): void {
    // Navigate to change password page or open modal
    // For now, show message that this feature is coming soon
    alert('Change password feature coming soon!');
  }

  updateNotifications(): void {
    // Navigate to notification settings page or open modal
    // For now, show message that this feature is coming soon
    alert('Notification settings feature coming soon!');
  }

  downloadData(): void {
    // Export user data as JSON
    const userData = {
      profile: this.currentUser,
      events: this.userEvents,
      exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(userData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `eventfy-data-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  deleteAccount(): void {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      // TODO: Implement account deletion API call when backend supports it
      alert('Account deletion feature coming soon. Please contact support for assistance.');
    }
  }

  closeProfile() {
    this.router.navigate(['/dashboard']);
  }

  shareProfile(): void {
    if (navigator.share) {
      navigator.share({
        title: 'User Profile',
        text: `Check out ${this.currentUser?.name}'s profile on Eventfy`,
        url: window.location.href
      });
    } else {
      // Fallback for browsers that don't support Web Share API
      const url = window.location.href;
      navigator.clipboard.writeText(url).then(() => {
        alert('Profile URL copied to clipboard!');
      });
    }
  }

  // Social features
  shareEvent(event: Event): void {
    if (navigator.share) {
      navigator.share({
        title: event.titre,
        text: event.description,
        url: window.location.origin + '/events/' + event.tenantId
      });
    } else {
      // Fallback for browsers that don't support Web Share API
      const url = window.location.origin + '/events/' + event.tenantId;
      navigator.clipboard.writeText(url).then(() => {
        alert('Event link copied to clipboard!');
      });
    }
  }

  // Helper method to check if user has profile picture
  hasProfilePicture(): boolean {
    return this.currentUser?.picture && this.currentUser.picture.trim() !== '';
  }

  // Method to get user initials for fallback avatar
  getUserInitials(): string {
    if (!this.currentUser?.name) return 'U';
    
    const names = this.currentUser.name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return names[0][0].toUpperCase();
  }

  // Method to get a consistent color for the user
  getUserColor(): string {
    if (!this.currentUser?.email) return '#6366f1';
    
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#6366f1', '#8b5cf6', '#ec4899'];
    const hash = this.currentUser.email.split('').reduce((a: number, b: string) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  }

  // Statistics methods
  getTotalEvents(): number {
    return this.userEvents.length;
  }

  getUpcomingEvents(): number {
    return this.userEvents.filter(event => this.getEventStatus(event) === 'upcoming').length;
  }

  getCompletedEvents(): number {
    return this.userEvents.filter(event => this.getEventStatus(event) === 'completed').length;
  }
}
