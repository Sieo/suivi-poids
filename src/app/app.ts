import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { WorkbookToolbarComponent } from './shared/components/workbook-toolbar/workbook-toolbar.component';

@Component({
  imports: [RouterOutlet, SidebarComponent, WorkbookToolbarComponent],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {}
