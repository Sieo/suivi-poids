import { Component, inject } from '@angular/core';
import { WorkbookDataService } from '../../core/services/workbook-data.service';

@Component({
  selector: 'app-portion-guides-page',
  styleUrl: './portion-guides-page.component.scss',
  templateUrl: './portion-guides-page.component.html',
})
export class PortionGuidesPageComponent {
  protected readonly workbook = inject(WorkbookDataService);
}
