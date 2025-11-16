import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { PLATFORM_ID } from '@angular/core';

import { QrCheckinComponent } from './qr-checkin.component';

describe('QrCheckinComponent', () => {
  let component: QrCheckinComponent;
  let fixture: ComponentFixture<QrCheckinComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QrCheckinComponent, HttpClientTestingModule, ReactiveFormsModule],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QrCheckinComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty values', () => {
    expect(component.checkinForm.get('qrCodeUrl')?.value).toBe('');
    expect(component.checkinForm.get('qrCodeFile')?.value).toBeNull();
  });

  it('should validate URL format', () => {
    const urlControl = component.checkinForm.get('qrCodeUrl');
    
    // Invalid URL
    urlControl?.setValue('invalid-url');
    expect(urlControl?.invalid).toBeTruthy();
    
    // Valid URL
    urlControl?.setValue('https://example.com/qr.png');
    expect(urlControl?.valid).toBeTruthy();
  });

  it('should handle successful QR code scan', () => {
    const mockResponse = [{
      type: 'qrcode',
      symbol: [{
        seq: 0,
        data: '{"ticketId":"TEST123","eventName":"Test Event","eventDate":"2025-08-13","eventTime":"19:00","eventLocation":"Test Location","organizerName":"Test Organizer","organizerEmail":"test@example.com","ticketType":"general","ticketPrice":"25","generatedAt":"2025-08-13T19:00:00.000Z"}',
        error: null
      }]
    }];

    component.checkinForm.patchValue({ qrCodeUrl: 'https://example.com/qr.png' });
    component.scanQRCodeFromUrl();

    const req = httpMock.expectOne(req => req.url.includes('api.qrserver.com'));
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);

    expect(component.isScanning).toBeFalsy();
    expect(component.ticketData).toBeTruthy();
    expect(component.isValidTicket).toBeTruthy();
    expect(component.ticketData?.ticketId).toBe('TEST123');
  });

  it('should handle QR scan error', () => {
    const mockResponse = [{
      type: 'qrcode',
      symbol: [{
        seq: 0,
        data: null,
        error: 'No QR code found'
      }]
    }];

    component.checkinForm.patchValue({ qrCodeUrl: 'https://example.com/qr.png' });
    component.scanQRCodeFromUrl();

    const req = httpMock.expectOne(req => req.url.includes('api.qrserver.com'));
    req.flush(mockResponse);

    expect(component.isScanning).toBeFalsy();
    expect(component.errorMessage).toContain('No QR code found');
    expect(component.isValidTicket).toBeFalsy();
  });

  it('should prevent double check-in', () => {
    // Set up a valid ticket
    component.ticketData = {
      ticketId: 'TEST123',
      eventName: 'Test Event',
      eventDate: '2025-08-13',
      eventTime: '19:00',
      eventLocation: 'Test Location',
      organizerName: 'Test Organizer',
      organizerEmail: 'test@example.com',
      ticketType: 'general',
      ticketPrice: '25',
      generatedAt: '2025-08-13T19:00:00.000Z'
    };
    component.isValidTicket = true;

    // First check-in should succeed
    component.checkInTicket();
    expect(component.checkedInTickets).toContain('TEST123');

    // Set up the same ticket again
    component.isValidTicket = true;
    
    // Simulate validation that should detect duplicate
    component['validateTicket'](JSON.stringify(component.ticketData));
    expect(component.isValidTicket).toBeFalsy();
    expect(component.errorMessage).toContain('already been checked in');
  });

  it('should reset form correctly', () => {
    // Set some values
    component.checkinForm.patchValue({ qrCodeUrl: 'https://example.com/test.png' });
    component.scanResult = 'test data';
    component.errorMessage = 'test error';
    component.successMessage = 'test success';

    component.resetForm();

    expect(component.checkinForm.get('qrCodeUrl')?.value).toBe('');
    expect(component.scanResult).toBeNull();
    expect(component.errorMessage).toBe('');
    expect(component.successMessage).toBe('');
  });

  it('should export checked-in list', () => {
    // Mock URL.createObjectURL and document.createElement
    const mockCreateObjectURL = jasmine.createSpy('createObjectURL').and.returnValue('mock-url');
    const mockRevokeObjectURL = jasmine.createSpy('revokeObjectURL');
    const mockClick = jasmine.createSpy('click');
    const mockLink = {
      href: '',
      download: '',
      click: mockClick
    };

    spyOn(window.URL, 'createObjectURL').and.callFake(mockCreateObjectURL);
    spyOn(window.URL, 'revokeObjectURL').and.callFake(mockRevokeObjectURL);
    spyOn(document, 'createElement').and.returnValue(mockLink as any);

    // Add some checked-in tickets
    component.checkedInTickets = ['TICKET1', 'TICKET2'];

    component.exportCheckedInList();

    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalled();
    expect(component.successMessage).toContain('exported successfully');
  });

  it('should clear checked-in history', () => {
    component.checkedInTickets = ['TICKET1', 'TICKET2'];
    
    component.clearCheckedInHistory();
    
    expect(component.checkedInTickets.length).toBe(0);
    expect(component.successMessage).toContain('cleared successfully');
  });

  it('should handle file selection', () => {
    const mockFile = new File([''], 'test.png', { type: 'image/png' });
    const mockEvent = {
      target: {
        files: [mockFile]
      }
    };

    spyOn(component, 'scanQRCodeFromFile');

    component.onFileSelected(mockEvent);

    expect(component.checkinForm.get('qrCodeFile')?.value).toBe(mockFile);
    expect(component.scanQRCodeFromFile).toHaveBeenCalledWith(mockFile);
  });

  it('should validate ticket data format', () => {
    const validData = {
      ticketId: 'TEST123',
      eventName: 'Test Event'
    };

    const invalidData = {
      ticketId: 'TEST123'
      // missing eventName
    };

    expect(component['isValidTicketData'](validData)).toBeTruthy();
    expect(component['isValidTicketData'](invalidData)).toBeFalsy();
    expect(component['isValidTicketData'](null)).toBeFalsy();
    expect(component['isValidTicketData']('string')).toBeFalsy();
  });
});
