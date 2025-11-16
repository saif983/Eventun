import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EventService } from '../../services/event.service';
import { AuthService } from '../../services/auth.service';
import { Event, CreateEventDto, UpdateEventDto } from '../../models/event.model';

@Component({
  selector: 'app-event-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './event-management.component.html',
  styleUrl: './event-management.component.scss'
})
export class EventManagementComponent implements OnInit {
  events: Event[] = [];
  showCreateForm = false;
  eventForm: FormGroup;
  editingEvent: Event | null = null;

  constructor(
    private eventService: EventService,
    public authService: AuthService,
    private fb: FormBuilder
  ) {
    this.eventForm = this.fb.group({
      titre: ['', Validators.required],
      eventOwner: ['', Validators.required],
      location: [''],
      category: [''],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      ticketPrice: ['0'],
      ticketQte: ['0'],
      description: [''],
      picture: ['']
    });
  }

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    if (this.authService.isOwner) {
      this.eventService.getMyEvents().subscribe({
        next: (events) => {
          this.events = events;
        },
        error: (error) => {
          console.error('Error loading events:', error);
        }
      });
    } else {
      this.eventService.getEvents().subscribe({
        next: (events) => {
          this.events = events;
        },
        error: (error) => {
          console.error('Error loading events:', error);
        }
      });
    }
  }

  createEvent(): void {
    if (this.eventForm.valid) {
      const eventData: CreateEventDto = this.eventForm.value;
      this.eventService.createEvent(eventData).subscribe({
        next: (newEvent) => {
          this.events.push(newEvent);
          this.eventForm.reset();
          this.showCreateForm = false;
        },
        error: (error) => {
          console.error('Error creating event:', error);
        }
      });
    }
  }

  editEvent(event: Event): void {
    this.editingEvent = event;
    this.eventForm.patchValue(event);
    this.showCreateForm = true;
  }

  deleteEvent(eventId: string): void {
    if (confirm('Are you sure you want to delete this event?')) {
      this.eventService.deleteEvent(eventId).subscribe({
        next: () => {
          this.events = this.events.filter(e => e.tenantId !== eventId);
        },
        error: (error) => {
          console.error('Error deleting event:', error);
        }
      });
    }
  }
}
