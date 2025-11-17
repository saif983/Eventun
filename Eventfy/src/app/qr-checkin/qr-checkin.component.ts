import { Component, OnInit, Inject, PLATFORM_ID, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { NavbarComponent } from '../navbar/navbar.component';
import { FooterComponent } from '../footer/footer.component';
import { CookieService } from '../services/cookie.service';
import { TicketService } from '../services/ticket.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

interface QRCodeResponse {
  type: string;
  symbol: Array<{
    seq: number;
    data: string | null;
    error: string | null;
  }>;
}

interface TicketData {
  ticketId: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  organizerName: string;
  organizerEmail: string;
  ticketType: string;
  ticketPrice: string;
  generatedAt: string;
}

@Component({
  selector: 'app-qr-checkin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule, NavbarComponent, FooterComponent],
  templateUrl: './qr-checkin.component.html',
  styleUrl: './qr-checkin.component.scss'
})
export class QrCheckinComponent implements OnInit, OnDestroy {
  checkinForm!: FormGroup;
  isScanning: boolean = false;
  scanResult: any = null;
  ticketData: TicketData | null = null;
  isValidTicket: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  checkedInTickets: string[] = [];
  private isBrowser: boolean;
  // Camera scanning state
  @ViewChild('videoEl') videoEl?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasEl') canvasEl?: ElementRef<HTMLCanvasElement>;
  private mediaStream?: MediaStream;
  isCameraActive: boolean = false;
  private scanTimer?: number;
  cameras: MediaDeviceInfo[] = [];
  selectedDeviceId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cookieService: CookieService,
    private ticketService: TicketService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    this.initForm();
    this.loadCheckedInTickets();
    // Preload device list when possible (labels may require permission)
    if (this.isBrowser && typeof navigator.mediaDevices?.enumerateDevices === 'function') {
      this.refreshCameras();
    }
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  initForm() {
    this.checkinForm = this.fb.group({
      qrCodeUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
      qrCodeFile: [null]
    });
  }

  loadCheckedInTickets() {
    try {
      const stored = this.cookieService.getCookie('checkedInTickets');
      if (stored) {
        this.checkedInTickets = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading checked-in tickets:', error);
    }
  }

  saveCheckedInTickets() {
    try {
      this.cookieService.setCookie('checkedInTickets', JSON.stringify(this.checkedInTickets), 7);
    } catch (error) {
      console.error('Error saving checked-in tickets:', error);
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.checkinForm.patchValue({ qrCodeFile: file });
      this.scanQRCodeFromFile(file);
    }
  }

  scanQRCodeFromUrl() {
    const url = this.checkinForm.get('qrCodeUrl')?.value;
    if (!url) {
      this.errorMessage = 'Please enter a valid QR code URL';
      return;
    }

    this.startScanning();
    const encodedUrl = encodeURIComponent(url);
    const apiUrl = `https://api.qrserver.com/v1/read-qr-code/?fileurl=${encodedUrl}&outputformat=json`;

    this.http.get<QRCodeResponse[]>(apiUrl).subscribe({
      next: (response) => {
        this.handleQRResponse(response);
      },
      error: (error) => {
        this.handleScanError('Failed to scan QR code from URL: ' + error.message);
      }
    });
  }

  scanQRCodeFromFile(file: File) {
    this.startScanning();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('outputformat', 'json');

    const apiUrl = 'https://api.qrserver.com/v1/read-qr-code/';

    this.http.post<QRCodeResponse[]>(apiUrl, formData).subscribe({
      next: (response) => {
        this.handleQRResponse(response);
      },
      error: (error) => {
        this.handleScanError('Failed to scan QR code from file: ' + error.message);
      }
    });
  }

  private startScanning() {
    this.isScanning = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.scanResult = null;
    this.ticketData = null;
    this.isValidTicket = false;
  }

  private handleQRResponse(response: QRCodeResponse[]) {
    this.isScanning = false;

    if (!response || response.length === 0) {
      this.handleScanError('No QR code found in the image');
      return;
    }

    const qrData = response[0];
    if (!qrData.symbol || qrData.symbol.length === 0) {
      this.handleScanError('No QR code data found');
      return;
    }

    const symbol = qrData.symbol[0];
    if (symbol.error) {
      this.handleScanError('QR code reading error: ' + symbol.error);
      return;
    }

    if (!symbol.data) {
      this.handleScanError('QR code contains no data');
      return;
    }

    this.scanResult = symbol.data;
    this.validateTicket(symbol.data);
  }

  // --- Camera Scanning Methods ---
  async startCamera() {
    if (!this.isBrowser) return;
    this.errorMessage = '';
    // Stop any previous stream
    this.stopCamera();
    try {
      const constraints: MediaStreamConstraints = {
        video: this.selectedDeviceId
          ? { deviceId: { exact: this.selectedDeviceId } }
          : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      };
      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      const video = this.videoEl?.nativeElement;
      if (video && this.mediaStream) {
        video.srcObject = this.mediaStream;
        await video.play();
        this.isCameraActive = true;
        // After permission is granted, refresh camera labels
        this.refreshCameras();
        // Start periodic scan every 1.2s
        this.scanTimer = window.setInterval(() => this.scanFrame(), 1200);
      }
    } catch (err: any) {
      // If failed with selected device, retry without selection
      if (this.selectedDeviceId) {
        try {
          const fallback = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          const video = this.videoEl?.nativeElement;
          if (video) {
            video.srcObject = fallback;
            await video.play();
            this.mediaStream = fallback;
            this.isCameraActive = true;
            this.refreshCameras();
            this.scanTimer = window.setInterval(() => this.scanFrame(), 1200);
            return;
          }
        } catch {}
      }
      // If no device was selected and we still failed, try a very loose constraint as last resort
      if (!this.selectedDeviceId) {
        try {
          const loose = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          const video = this.videoEl?.nativeElement;
          if (video) {
            video.srcObject = loose;
            await video.play();
            this.mediaStream = loose;
            this.isCameraActive = true;
            this.refreshCameras();
            this.scanTimer = window.setInterval(() => this.scanFrame(), 1200);
            return;
          }
        } catch {}
      }
      const msg = (err && (err.name || err.message)) || 'Unknown error';
      if (err?.name === 'NotAllowedError') {
        this.errorMessage = 'Camera permission denied. Please allow camera access in the browser.';
      } else if (err?.name === 'NotFoundError' || err?.name === 'OverconstrainedError') {
        this.errorMessage = 'No suitable camera found. Try another device or change the selected camera.';
      } else if (err?.name === 'NotReadableError') {
        this.errorMessage = 'Camera is in use by another application. Close other apps (Zoom, Teams, etc.) and try again.';
      } else {
        this.errorMessage = 'Cannot access camera: ' + msg;
      }
      this.isCameraActive = false;
    }
  }

  stopCamera() {
    if (this.scanTimer) {
      window.clearInterval(this.scanTimer);
      this.scanTimer = undefined;
    }
    const video = this.videoEl?.nativeElement;
    if (video) {
      try { video.pause(); } catch {}
      video.srcObject = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = undefined;
    }
    this.isCameraActive = false;
  }

  private async scanFrame() {
    if (!this.isBrowser || !this.isCameraActive) return;
    const video = this.videoEl?.nativeElement;
    const canvas = this.canvasEl?.nativeElement;
    if (!video || !canvas) return;
    if (video.readyState < 2) return; // HAVE_CURRENT_DATA

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (width === 0 || height === 0) return;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);

    // Convert to blob and send to QR API
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      this.isScanning = true;
      const formData = new FormData();
      formData.append('file', blob, 'frame.png');
      formData.append('outputformat', 'json');
      const apiUrl = 'https://api.qrserver.com/v1/read-qr-code/';
      try {
        const resp = await this.http.post<QRCodeResponse[]>(apiUrl, formData).toPromise();
        if (resp) {
          this.handleQRResponse(resp);
          // If a valid ticket is found, stop camera to prevent further scans
          if (this.isValidTicket || this.scanResult) {
            this.stopCamera();
          }
        }
      } catch (e: any) {
        this.handleScanError('Failed to scan camera frame: ' + (e?.message || e));
      }
    }, 'image/png');
  }

  async refreshCameras() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.cameras = devices.filter(d => d.kind === 'videoinput');
      // Auto-pick a back camera when available
      if (!this.selectedDeviceId && this.cameras.length > 0) {
        const back = this.cameras.find(c => /back|rear/i.test(c.label));
        this.selectedDeviceId = (back || this.cameras[0]).deviceId;
      }
    } catch (e) {
      // ignore
    }
  }

  onCameraChange(deviceId: string) {
    this.selectedDeviceId = deviceId || null;
    if (this.isCameraActive) {
      this.startCamera();
    }
  }

  private validateTicket(qrData: string) {
    try {
      // Try to parse the QR data as JSON (assuming it contains ticket information)
      const ticketData = JSON.parse(qrData);
      
      if (this.isValidTicketData(ticketData)) {
        this.ticketData = ticketData;
        this.isValidTicket = true;
        
        // Check if ticket is already checked in
        if (this.checkedInTickets.includes(ticketData.ticketId)) {
          this.errorMessage = 'This ticket has already been checked in!';
          this.isValidTicket = false;
        } else {
          this.successMessage = 'Valid ticket found! Ready for check-in.';
        }
      } else {
        this.handleScanError('Invalid ticket format or missing required data');
      }
    } catch (error) {
      // If it's not JSON, treat it as a simple ticket ID or data
      this.ticketData = {
        ticketId: qrData,
        eventName: 'Unknown Event',
        eventDate: 'Unknown Date',
        eventTime: 'Unknown Time',
        eventLocation: 'Unknown Location',
        organizerName: 'Unknown Organizer',
        organizerEmail: 'Unknown Email',
        ticketType: 'General',
        ticketPrice: '0',
        generatedAt: new Date().toISOString()
      };
      
      if (this.checkedInTickets.includes(qrData)) {
        this.errorMessage = 'This ticket has already been checked in!';
        this.isValidTicket = false;
      } else {
        this.isValidTicket = true;
        this.successMessage = 'Ticket scanned successfully! Ready for check-in.';
      }
    }
  }

  private isValidTicketData(data: any): boolean {
    return data && 
           typeof data === 'object' && 
           data.ticketId && 
           data.eventName;
  }

  private handleScanError(message: string) {
    this.isScanning = false;
    this.errorMessage = message;
    this.isValidTicket = false;
    this.ticketData = null;
  }

  checkInTicket() {
    if (!this.ticketData || !this.isValidTicket) {
      this.errorMessage = 'No valid ticket to check in';
      return;
    }

    // Add ticket to checked-in list
    this.checkedInTickets.push(this.ticketData.ticketId);
    this.saveCheckedInTickets();

    this.successMessage = `Ticket ${this.ticketData.ticketId} has been successfully checked in!`;
    this.isValidTicket = false; // Prevent double check-in

    // Reset form after successful check-in
    setTimeout(() => {
      this.resetForm();
    }, 3000);
  }

  resetForm() {
    this.checkinForm.reset();
    this.scanResult = null;
    this.ticketData = null;
    this.isValidTicket = false;
    this.errorMessage = '';
    this.successMessage = '';
  }

  clearCheckedInHistory() {
    this.checkedInTickets = [];
    this.saveCheckedInTickets();
    this.successMessage = 'Check-in history cleared successfully!';
  }

  exportCheckedInList() {
    if (this.checkedInTickets.length === 0) {
      this.errorMessage = 'No checked-in tickets to export';
      return;
    }

    const data = {
      exportDate: new Date().toISOString(),
      totalCheckedIn: this.checkedInTickets.length,
      tickets: this.checkedInTickets
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `checkin-report-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    window.URL.revokeObjectURL(url);

    this.successMessage = 'Check-in report exported successfully!';
  }
}
