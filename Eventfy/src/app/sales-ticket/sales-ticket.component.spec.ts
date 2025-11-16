import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalesTicketComponent } from './sales-ticket.component';

describe('SalesTicketComponent', () => {
  let component: SalesTicketComponent;
  let fixture: ComponentFixture<SalesTicketComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalesTicketComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SalesTicketComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
