

import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { InstallPromptComponent } from './components/install-prompt/install-prompt.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, InstallPromptComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Eventun';
}
