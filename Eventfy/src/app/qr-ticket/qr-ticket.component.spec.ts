import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QrTicketComponent } from './qr-ticket.component';

describe('QrTicketComponent', () => {
  let component: QrTicketComponent;
  let fixture: ComponentFixture<QrTicketComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QrTicketComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(QrTicketComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
