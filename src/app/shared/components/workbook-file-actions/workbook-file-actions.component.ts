import { Component, inject, input, signal } from '@angular/core';
import { WorkbookDataService } from '../../../core/services/workbook-data.service';
import { XlsxExportService } from '../../../core/services/xlsx-export.service';

@Component({
  selector: 'app-workbook-file-actions',
  styleUrl: './workbook-file-actions.component.scss',
  templateUrl: './workbook-file-actions.component.html',
})
export class WorkbookFileActionsComponent {
  readonly variant = input<'toolbar' | 'profile'>('toolbar');
  protected readonly workbook = inject(WorkbookDataService);
  protected readonly importing = signal(false);
  protected readonly exporting = signal(false);
  private readonly xlsxExport = inject(XlsxExportService);

  protected async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    this.importing.set(true);
    try {
      await this.workbook.importFile(file);
    } finally {
      this.importing.set(false);
    }
  }

  protected async onExport(): Promise<void> {
    this.exporting.set(true);
    this.workbook.error.set(null);
    this.workbook.notice.set(null);
    try {
      await this.xlsxExport.download(this.workbook.data());
      this.workbook.notice.set('Classeur Excel téléchargé.');
    } catch (error) {
      this.workbook.error.set(
        error instanceof Error
          ? `Le classeur Excel n’a pas pu être généré : ${error.message}`
          : 'Le classeur Excel n’a pas pu être généré.',
      );
    } finally {
      this.exporting.set(false);
    }
  }
}
