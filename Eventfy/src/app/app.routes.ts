import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { SalesTicketComponent } from './sales-ticket/sales-ticket.component';
import { QrTicketComponent } from './qr-ticket/qr-ticket.component';
import { QrCheckinComponent } from './qr-checkin/qr-checkin.component';
import { PaymentComponent } from './payment/payment.component';
import { SignInComponent } from './auth/sign-in/sign-in.component';
import { SignUpComponent } from './auth/sign-up/sign-up.component';
import { CallbackComponent } from './auth/callback/callback.component';
import { UserProfileComponent } from './components/user-profile/user-profile.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },
  {
    path: 'store',
    component: SalesTicketComponent,
    data: { standalone: true }
  },
  {
    path: 'tickets',
    component: SalesTicketComponent,
    data: { standalone: true }
  },
  {
    path: 'ticket-store',
    component: SalesTicketComponent,
    data: { standalone: true }
  },
  {
    path: 'qr-ticket',
    component: QrTicketComponent,
    data: { standalone: true }
  },
  {
    path: 'qr-checkin',
    component: QrCheckinComponent,
    data: { standalone: true }
  },
  {
    path: 'payement',
    component: PaymentComponent,
    data: { standalone: true }
  },
  {
    path: 'sign-in',
    component: SignInComponent,
    data: { standalone: true }
  },
  {
    path: 'sign-up',
    component: SignUpComponent,
    data: { standalone: true }
  },
  {
    path: 'callback',
    component: CallbackComponent,
    data: { standalone: true }
  },
  {
    path: 'profile',
    component: UserProfileComponent,
    data: { standalone: true }
  },
  // Auxiliary modal routes
  {
    path: 'sign-in',
    component: SignInComponent,
    outlet: 'modal'
  },
  {
    path: 'sign-up',
    component: SignUpComponent,
    outlet: 'modal'
  },
  { path: '**', redirectTo: '/home' }
];
