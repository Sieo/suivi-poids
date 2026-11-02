import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { WorkbookDataService } from '../../../core/services/workbook-data.service';
import { XlsxExportService } from '../../../core/services/xlsx-export.service';

@Component({
  selector: 'app-workbook-toolbar',
  styleUrl: './workbook-toolbar.component.scss',
  templateUrl: './workbook-toolbar.component.html',
})
export class WorkbookToolbarComponent {
  protected readonly auth = inject(AuthService);
  protected readonly workbook = inject(WorkbookDataService);
  protected readonly importing = signal(false);
  protected readonly exporting = signal(false);
  protected readonly signingOut = signal(false);
  private readonly router = inject(Router);
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

  protected async retryLoading(): Promise<void> {
    const user = this.auth.user();
    if (user) {
      await this.workbook.loadForUser(user.id);
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

  protected async onSignOut(): Promise<void> {
    this.signingOut.set(true);
    try {
      if (!(await this.workbook.prepareForSignOut())) {
        return;
      }
      await this.auth.signOut();
      this.workbook.clearForSignedOutUser();
      await this.router.navigateByUrl('/connexion');
    } catch {
      // The authentication service exposes the Supabase error in the toolbar.
      this.workbook.cancelSignOut();
    } finally {
      this.signingOut.set(false);
    }
  }
}
