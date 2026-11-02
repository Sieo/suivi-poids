import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-sidebar',
  styleUrl: './sidebar.component.scss',
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {}
