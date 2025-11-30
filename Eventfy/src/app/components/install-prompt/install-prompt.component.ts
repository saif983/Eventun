import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
    selector: 'app-install-prompt',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div *ngIf="showInstallButton" class="fixed bottom-6 right-6 z-50">
      <button
        (click)="installPwa()"
        class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl transform hover:scale-105"
      >
        <i class="fas fa-download"></i>
        <span class="font-medium">Install App</span>
      </button>
    </div>
  `,
    styles: []
})
export class InstallPromptComponent implements OnInit {
    showInstallButton = false;
    private deferredPrompt: any;

    constructor(@Inject(PLATFORM_ID) private platformId: Object) { }

    ngOnInit() {
        // Only run in browser context, not during SSR
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        // Listen for the beforeinstallprompt event
        window.addEventListener('beforeinstallprompt', (e) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later
            this.deferredPrompt = e;
            // Show the install button
            this.showInstallButton = true;
        });

        // Listen for the app installed event
        window.addEventListener('appinstalled', () => {
            // Hide the install button
            this.showInstallButton = false;
            this.deferredPrompt = null;
            console.log('PWA was installed');
        });
    }

    installPwa() {
        if (!this.deferredPrompt) {
            return;
        }

        // Show the install prompt
        this.deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        this.deferredPrompt.userChoice.then((choiceResult: any) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }
            this.deferredPrompt = null;
        });
    }
}
