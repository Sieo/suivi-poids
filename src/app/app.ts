import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { WorkbookDataService } from './core/services/workbook-data.service';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { WorkbookToolbarComponent } from './shared/components/workbook-toolbar/workbook-toolbar.component';

@Component({
  imports: [RouterOutlet, SidebarComponent, WorkbookToolbarComponent],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly workbook = inject(WorkbookDataService);
}
