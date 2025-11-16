import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NavbarComponent } from '../navbar/navbar.component';
import { FooterComponent } from '../footer/footer.component';
import { TicketService } from '../services/ticket.service';
import { EventService } from '../services/event.service';
import { ApiService } from '../services/api.service';
import { Ticket, CreateTicketDto, GenerateTicketsDto } from '../models/ticket.model';
import { Event, CreateEventDto } from '../models/event.model';

// Import PDF libraries
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-qr-ticket',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NavbarComponent, FooterComponent],
  templateUrl: './qr-ticket.component.html',
  styleUrls: ['./qr-ticket.component.scss']
})
export class QrTicketComponent implements OnInit {
  ticketForm!: FormGroup;
  generatedTickets: any[] = [];
  showPreview: boolean = false;
  isGenerating: boolean = false;
  events: any[] = [];
  photoPreviewUrl: string | null = null;
  defaultImageUrl: string = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/axB2sQAAAAASUVORK5CYII=';
  private isBrowser: boolean;

  constructor(
    private fb: FormBuilder,
    @Inject(PLATFORM_ID) private platformId: Object,
    private ticketService: TicketService,
    private eventService: EventService,
    private apiService: ApiService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    this.initForm();
    // Skip loading events since we're creating new events, not selecting existing ones
  }

  initForm() {
    this.ticketForm = this.fb.group({
      // Event Details
      eventName: ['', [Validators.required, Validators.minLength(3)]],
      eventDescription: ['', [Validators.required, Validators.minLength(10)]],
      eventLocation: ['', [Validators.required]],
      eventCategory: ['Music', [Validators.required]],
      startDate: ['', [Validators.required]],
      endDate: ['', [Validators.required]],
      eventOwner: ['', [Validators.required]],
      eventPhotoUrl: ['', [Validators.maxLength(500)]],
      
      // Ticket Details
      ticketType: ['General', [Validators.required]],
      ticketPrice: ['0', [Validators.required, Validators.min(0)]],
      numberOfTickets: ['1', [Validators.required, Validators.min(1), Validators.max(100)]],
      includeQRCode: [true],
      customMessage: [''],
      qrCodeSize: ['200'],
      qrCodeColor: ['000000'],
      qrCodeBgColor: ['FFFFFF']
    });
  }

  createEventAndTickets() {
    if (this.ticketForm.valid) {
      this.isGenerating = true;
      this.showPreview = false;
      
      const formData = this.ticketForm.value;
      
      // First create the event
      const eventData: CreateEventDto = {
        titre: formData.eventName,
        description: formData.eventDescription,
        location: formData.eventLocation,
        category: formData.eventCategory,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        eventOwner: formData.eventOwner,
        picture: formData.eventPhotoUrl || '',
        ticketPrice: formData.ticketPrice.toString(),
        ticketQte: formData.numberOfTickets.toString()
      };

      // First ensure user has Owner role
      this.apiService.assignOwnerRole().subscribe({
        next: () => {
          // Now create the event
          this.eventService.createEvent(eventData).subscribe({
            next: (createdEvent) => {
              // Now generate tickets for the created event
              const generateDto: GenerateTicketsDto = {
                ticketType: formData.ticketType,
                price: parseFloat(formData.ticketPrice),
                quantity: parseInt(formData.numberOfTickets)
              };

              this.eventService.generateTicketsForEvent(createdEvent.tenantId, generateDto).subscribe({
                next: (tickets) => {
                  this.generatedTickets = tickets.map(ticket => ({
                    ...ticket,
                    eventName: createdEvent.titre,
                    eventDate: createdEvent.startDate,
                    eventTime: '00:00',
                    eventLocation: createdEvent.location || 'TBD',
                    eventDescription: createdEvent.description || '',
                    organizerName: createdEvent.eventOwner,
                    organizerEmail: createdEvent.userId,
                    qrCodeDataUrl: ticket.qrCode || undefined,
                    generatedAt: new Date().toISOString()
                  }));
                  
                  this.isGenerating = false;
                  this.showPreview = true;
                },
                error: (error) => {
                  console.error('Error generating tickets:', error);
                  alert('Error generating tickets. Please try again.');
                  this.isGenerating = false;
                }
              });
            },
            error: (error) => {
              console.error('Error creating event:', error);
              this.isGenerating = false;
            }
          });
        },
        error: (error) => {
          console.error('Error assigning owner role:', error);
          this.isGenerating = false;
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  generateTickets() {
    this.createEventAndTickets();
  }

  private generateQRCodeData(ticketNumber: number): string {
    const formData = this.ticketForm.value;
    const qrData = {
      ticketId: `TICKET-${Date.now()}-${ticketNumber}`,
      eventName: formData.eventName,
      eventDate: formData.startDate,
      eventLocation: formData.eventLocation,
      organizerName: formData.eventOwner,
      ticketType: formData.ticketType,
      price: formData.ticketPrice,
      generatedAt: new Date().toISOString()
    };
    
    return JSON.stringify(qrData);
  }

  private generateQRCodeUrl(ticketNumber: number, formData: any): string {
    const qrData = this.generateQRCodeData(ticketNumber);
    
    // Build QR code URL using the API
    const baseUrl = 'https://api.qrserver.com/v1/create-qr-code/';
    const params = new URLSearchParams({
      data: qrData,
      size: `${formData.qrCodeSize}x${formData.qrCodeSize}`,
      color: formData.qrCodeColor,
      bgcolor: formData.qrCodeBgColor,
      margin: '2',
      qzone: '1',
      format: 'png',
      ecc: 'M' // Medium error correction for better reliability
    });
    
    return `${baseUrl}?${params.toString()}`;
  }

  private async generateQRCodeDataUrl(ticketNumber: number, formData: any): Promise<string> {
    const qrData = this.generateQRCodeData(ticketNumber);
    
    // Build QR code URL using the API
    const baseUrl = 'https://api.qrserver.com/v1/create-qr-code/';
    const params = new URLSearchParams({
      data: qrData,
      size: `${formData.qrCodeSize}x${formData.qrCodeSize}`,
      color: formData.qrCodeColor,
      bgcolor: formData.qrCodeBgColor,
      margin: '2',
      qzone: '1',
      format: 'png',
      ecc: 'M'
    });
    
    const qrUrl = `${baseUrl}?${params.toString()}`;
    
    try {
      // For printing, we'll use the direct URL instead of converting to data URL
      // This is more reliable for print operations
      return qrUrl;
    } catch (error) {
      console.error('Error generating QR code URL:', error);
      return qrUrl; // Return the direct URL as fallback
    }
  }

  downloadTickets() {
    if (this.isBrowser) {
      // Check if all QR code data URLs are ready
      const formData = this.ticketForm.value;
      if (formData.includeQRCode) {
        const missingDataUrls = this.generatedTickets.filter(ticket => !ticket.qrCodeDataUrl);
        if (missingDataUrls.length > 0) {
          alert('Please wait for QR codes to finish generating before printing.');
          return;
        }
      }
      
      // Create a printable version of the tickets
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const htmlContent = this.generatePrintableHTML();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // The print will be triggered automatically by the onload script
        // No need to call print() here as it's handled in the HTML
      }
    }
  }

  async downloadAsPDF() {
    if (this.isBrowser) {
      try {
        // Check if all QR code data URLs are ready
        const formData = this.ticketForm.value;
        if (formData.includeQRCode) {
          const missingDataUrls = this.generatedTickets.filter(ticket => !ticket.qrCodeDataUrl);
          if (missingDataUrls.length > 0) {
            alert('Please wait for QR codes to finish generating before downloading PDF.');
            return;
          }
        }

        // Create a temporary container for PDF generation
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '0';
        tempContainer.style.width = '800px';
        tempContainer.style.backgroundColor = 'white';
        tempContainer.style.padding = '20px';
        tempContainer.style.fontFamily = 'Arial, sans-serif';
        
        // Generate HTML content for PDF
        tempContainer.innerHTML = this.generatePDFHTML();
        document.body.appendChild(tempContainer);

        // Wait for images to load
        await this.waitForImagesToLoad(tempContainer);

        // Generate PDF
        const pdf = new jsPDF('p', 'mm', 'a4');
        const canvas = await html2canvas(tempContainer, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 295; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;

        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        // Download the PDF
        const fileName = `${this.ticketForm.value.eventName.replace(/[^a-zA-Z0-9]/g, '_')}_tickets.pdf`;
        pdf.save(fileName);

        // Clean up
        document.body.removeChild(tempContainer);

      } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error generating PDF. Please try again.');
      }
    }
  }

  private async waitForImagesToLoad(container: HTMLElement): Promise<void> {
    const images = container.querySelectorAll('img');
    const imagePromises = Array.from(images).map(img => {
      return new Promise((resolve) => {
        if (img.complete) {
          resolve(null);
        } else {
          img.onload = () => resolve(null);
          img.onerror = () => resolve(null);
        }
      });
    });
    
    await Promise.all(imagePromises);
  }

  private generatePDFHTML(): string {
    let html = `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto;">
        <h1 style="text-align: center; color: #7c3aed; margin-bottom: 30px; font-size: 28px; font-weight: 800;">
          Event Tickets - ${this.ticketForm.value.eventName}
        </h1>
    `;

    this.generatedTickets.forEach((ticket, index) => {
      html += `
        <div style="margin: 20px 0; page-break-inside: avoid;">
          <!-- Modern Ticket Design for PDF - EvenTun Purple Theme -->
          <div style="position: relative; width: 100%; max-width: 400px; height: 180px; background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #a855f7 100%); border-radius: 12px; overflow: hidden; box-shadow: 0 8px 25px rgba(0,0,0,0.15); font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            
            <!-- Enhanced Diagonal Pattern -->
            <div style="position: absolute; bottom: 0; left: 0; width: 100%; height: 25px; background: repeating-linear-gradient(45deg, rgba(255,255,255,0.15), rgba(255,255,255,0.15) 2px, transparent 2px, transparent 4px); z-index: 2;"></div>
            
            <!-- Left Section (Purple Gradient) -->
            <div style="position: absolute; top: 0; left: 0; width: 66.67%; height: 100%; padding: 16px; z-index: 10; background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #a855f7 100%);">
              <h2 style="color: white; font-size: 20px; font-weight: 700; margin: 0 0 8px 0; text-shadow: 1px 1px 2px rgba(0,0,0,0.3); line-height: 1.1; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${ticket.eventName}</h2>
              <div style="color: white; font-size: 14px; line-height: 1.3; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <p style="font-weight: 500; margin: 2px 0; text-shadow: 1px 1px 1px rgba(0,0,0,0.3);"><strong>Date:</strong> ${ticket.eventDate}</p>
                <p style="font-weight: 500; margin: 2px 0; text-shadow: 1px 1px 1px rgba(0,0,0,0.3);"><strong>Time:</strong> ${ticket.eventTime}</p>
                <p style="font-weight: 500; margin: 2px 0; text-shadow: 1px 1px 1px rgba(0,0,0,0.3);"><strong>Location:</strong> ${ticket.eventLocation}</p>
                <p style="font-weight: 500; margin: 2px 0; text-shadow: 1px 1px 1px rgba(0,0,0,0.3);"><strong>Ticket Type:</strong> ${ticket.ticketType}</p>
                <p style="font-weight: 500; margin: 2px 0; text-shadow: 1px 1px 1px rgba(0,0,0,0.3);"><strong>Price:</strong> $${ticket.ticketPrice}</p>
              </div>
            </div>
            
            <!-- Right Section (White) -->
            <div style="position: absolute; top: 0; right: 0; width: 33.33%; height: 100%; padding: 12px; z-index: 10; background: white;">
              <p style="font-weight: 700; color: #7c3aed; font-size: 12px; margin: 0 0 8px 0; font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace; letter-spacing: 0.3px; line-height: 1.2;">${ticket.id}</p>
              <div style="color: #333; font-size: 12px; line-height: 1.3; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <p style="margin: 2px 0; font-weight: 500;"><strong>Organizer:</strong> ${ticket.organizerName}</p>
                <p style="margin: 2px 0; font-weight: 500;"><strong>Contact:</strong> ${ticket.organizerEmail}</p>
              </div>
              
              ${ticket.qrCodeDataUrl ? `
                <div style="text-align: center; margin-top: 8px;">
                  <img src="${ticket.qrCodeDataUrl}" alt="QR Code for ${ticket.eventName}" style="width: 50px; height: 50px; margin: 0 auto 4px auto; border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,0.1);" />
                  <p style="font-size: 10px; color: #666; margin: 0; font-weight: 500; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.2;">QR Code for Verify ticket authenticity</p>
                </div>
              ` : ''}
            </div>
            
            <!-- Enhanced Ticket Stub Circles -->
            <div style="position: absolute; left: -9px; top: 50%; transform: translateY(-50%); width: 18px; height: 18px; background: #f8fafc; border-radius: 50%; z-index: 3; box-shadow: 0 1px 3px rgba(0,0,0,0.1);"></div>
            <div style="position: absolute; right: -9px; top: 50%; transform: translateY(-50%); width: 18px; height: 18px; background: #f8fafc; border-radius: 50%; z-index: 3; box-shadow: 0 1px 3px rgba(0,0,0,0.1);"></div>
          </div>
          
          ${ticket.customMessage ? `
            <div style="margin-top: 16px; padding: 12px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 0 6px 6px 0;">
              <p style="font-size: 14px; color: #92400e; margin: 0; font-weight: 500; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;"><strong>Message:</strong> ${ticket.customMessage}</p>
            </div>
          ` : ''}
        </div>
      `;
    });

    html += '</div>';
    return html;
  }

  private generatePrintableHTML(): string {
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Event Tickets - ${this.ticketForm.value.eventName}</title>
        <style>
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; }
          .ticket { margin: 20px 0; page-break-inside: avoid; }
          .modern-ticket { position: relative; width: 100%; max-width: 400px; height: 180px; background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #a855f7 100%); border-radius: 12px; overflow: hidden; box-shadow: 0 8px 25px rgba(0,0,0,0.15); font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          .diagonal-pattern { position: absolute; bottom: 0; left: 0; width: 100%; height: 25px; background: repeating-linear-gradient(45deg, rgba(255,255,255,0.15), rgba(255,255,255,0.15) 2px, transparent 2px, transparent 4px); z-index: 2; }
          .ticket-left-section { position: absolute; top: 0; left: 0; width: 66.67%; height: 100%; padding: 16px; z-index: 10; background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #a855f7 100%); }
          .ticket-right-section { position: absolute; top: 0; right: 0; width: 33.33%; height: 100%; padding: 12px; z-index: 10; background: white; }
          .ticket-event-name { color: white; font-size: 20px; font-weight: 700; margin: 0 0 8px 0; text-shadow: 1px 1px 2px rgba(0,0,0,0.3); line-height: 1.1; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          .ticket-details-left { color: white; font-size: 14px; line-height: 1.3; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          .ticket-details-left p { font-weight: 500; margin: 2px 0; text-shadow: 1px 1px 1px rgba(0,0,0,0.3); }
          .ticket-details-right { color: #333; font-size: 12px; line-height: 1.3; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          .ticket-details-right p { margin: 2px 0; font-weight: 500; }
          .ticket-id { font-weight: 700; color: #7c3aed; font-size: 12px; margin: 0 0 8px 0; font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace; letter-spacing: 0.3px; line-height: 1.2; }
          .ticket-qr-section { text-align: center; margin-top: 8px; }
          .ticket-qr-code { width: 50px; height: 50px; margin: 0 auto 4px auto; border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
          .ticket-qr-text { font-size: 10px; color: #666; margin: 0; font-weight: 500; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.2; }
          .ticket-stub-circle { position: absolute; top: 50%; transform: translateY(-50%); width: 18px; height: 18px; background: #f8fafc; border-radius: 50%; z-index: 3; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .ticket-stub-left { left: -9px; }
          .ticket-stub-right { right: -9px; }
          @media print { 
            .ticket { page-break-inside: avoid; }
            .modern-ticket { max-width: 350px; height: 160px; }
            .ticket-event-name { font-size: 18px; }
            .ticket-details-left, .ticket-details-right { font-size: 12px; }
            .ticket-qr-code { width: 45px; height: 45px; }
            .ticket-left-section { padding: 12px; }
            .ticket-right-section { padding: 10px; }
          }
        </style>
        <script>
          // Preload QR code images to ensure they're available for printing
          function preloadImages() {
            const images = document.querySelectorAll('.ticket-qr-code');
            images.forEach(img => {
              if (img.src) {
                const newImg = new Image();
                newImg.src = img.src;
              }
            });
          }
          
          // Call preload when page loads
          window.onload = function() {
            preloadImages();
            // Wait a bit then enable printing
            setTimeout(() => {
              window.print();
            }, 1000);
          };
        </script>
      </head>
      <body>
    `;

    this.generatedTickets.forEach((ticket, index) => {
      html += `
        <div class="ticket">
          <!-- Modern Ticket Design for Print -->
          <div class="modern-ticket">
            <div class="diagonal-pattern"></div>
            
            <!-- Left Section -->
            <div class="ticket-left-section">
              <h2 class="ticket-event-name">${ticket.eventName}</h2>
              <div class="ticket-details-left">
                <p><strong>Date:</strong> ${ticket.eventDate}</p>
                <p><strong>Time:</strong> ${ticket.eventTime}</p>
                <p><strong>Location:</strong> ${ticket.eventLocation}</p>
                <p><strong>Ticket Type:</strong> ${ticket.ticketType}</p>
                <p><strong>Price:</strong> $${ticket.ticketPrice}</p>
              </div>
            </div>
            
            <!-- Right Section -->
            <div class="ticket-right-section">
              <p class="ticket-id">${ticket.id}</p>
              <div class="ticket-details-right">
                <p><strong>Organizer:</strong> ${ticket.organizerName}</p>
                <p><strong>Contact:</strong> ${ticket.organizerEmail}</p>
              </div>
              
              ${ticket.qrCodeDataUrl ? `
                <div class="ticket-qr-section">
                  <img src="${ticket.qrCodeDataUrl}" alt="QR Code for ${ticket.eventName}" class="ticket-qr-code" />
                  <p class="ticket-qr-text">QR Code for Verify ticket authenticity</p>
                </div>
              ` : ''}
            </div>
            
            <!-- Ticket Stub Circles -->
            <div class="ticket-stub-circle ticket-stub-left"></div>
            <div class="ticket-stub-circle ticket-stub-right"></div>
          </div>
          
          ${ticket.customMessage ? `
            <div style="margin-top: 16px; padding: 12px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 0 6px 6px 0;">
              <p style="font-size: 14px; color: #92400e; margin: 0; font-weight: 500; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;"><strong>Message:</strong> ${ticket.customMessage}</p>
            </div>
          ` : ''}
        </div>
      `;
    });

    html += '</body></html>';
    return html;
  }

  resetForm() {
    this.ticketForm.reset({
      eventName: '',
      eventDescription: '',
      eventLocation: '',
      eventCategory: 'Music',
      startDate: '',
      endDate: '',
      eventOwner: '',
      eventPhotoUrl: '',
      ticketType: 'General',
      ticketPrice: '0',
      numberOfTickets: '1',
      includeQRCode: true,
      customMessage: '',
      qrCodeSize: '200',
      qrCodeColor: '000000',
      qrCodeBgColor: 'FFFFFF'
    });
    this.generatedTickets = [];
    this.showPreview = false;
    this.photoPreviewUrl = null;
  }

  onQrCodeColorChange(event: any) {
    const value = event.target?.value || '';
    this.ticketForm.patchValue({ qrCodeColor: value });
  }

  onQrCodeBgColorChange(event: any) {
    const value = event.target?.value || '';
    this.ticketForm.patchValue({ qrCodeBgColor: value });
  }

  onPhotoUrlInput(event: any) {
    const value = event?.target?.value || '';
    this.ticketForm.patchValue({ eventPhotoUrl: value });
    this.photoPreviewUrl = value;
  }

  onPhotoError() {
    this.photoPreviewUrl = this.defaultImageUrl;
  }

  removePhoto() {
    this.photoPreviewUrl = null;
    this.ticketForm.patchValue({ eventPhotoUrl: '' });
  }

  areQRCodesReady(): boolean {
    const formData = this.ticketForm.value;
    if (!formData.includeQRCode || this.generatedTickets.length === 0) {
      return true; // No QR codes needed or no tickets generated
    }
    
    // Check if all tickets have QR code data URLs
    return this.generatedTickets.every(ticket => ticket.qrCodeDataUrl);
  }

  private markFormGroupTouched() {
    Object.keys(this.ticketForm.controls).forEach(key => {
      const control = this.ticketForm.get(key);
      control?.markAsTouched();
    });
  }
}
