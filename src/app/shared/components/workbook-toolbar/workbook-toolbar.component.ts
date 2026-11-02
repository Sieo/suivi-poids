import { Component, inject, signal } from '@angular/core';
import { WorkbookDataService } from '../../../core/services/workbook-data.service';

@Component({
  selector: 'app-workbook-toolbar',
  styleUrl: './workbook-toolbar.component.scss',
  templateUrl: './workbook-toolbar.component.html',
})
export class WorkbookToolbarComponent {
  protected readonly workbook = inject(WorkbookDataService);
  protected readonly importing = signal(false);

  protected async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    this.importing.set(true);
    await this.workbook.importFile(file);
    this.importing.set(false);
  }
}
