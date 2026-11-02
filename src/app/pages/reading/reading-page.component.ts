import { Component, inject } from '@angular/core';
import { WorkbookDataService } from '../../core/services/workbook-data.service';

@Component({
  selector: 'app-reading-page',
  styleUrl: './reading-page.component.scss',
  templateUrl: './reading-page.component.html',
})
export class ReadingPageComponent {
  protected readonly workbook = inject(WorkbookDataService);
}
