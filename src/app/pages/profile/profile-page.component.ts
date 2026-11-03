import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { WorkbookDataService } from '../../core/services/workbook-data.service';
import { WorkbookFileActionsComponent } from '../../shared/components/workbook-file-actions/workbook-file-actions.component';

@Component({
  imports: [FormsModule, RouterLink, WorkbookFileActionsComponent],
  selector: 'app-profile-page',
  styleUrl: './profile-page.component.scss',
  templateUrl: './profile-page.component.html',
})
export class ProfilePageComponent {
  protected readonly auth = inject(AuthService);
  protected readonly workbook = inject(WorkbookDataService);
  protected readonly signingOut = signal(false);
  protected readonly editingName = signal(false);
  protected readonly savingName = signal(false);
  protected readonly nameDraft = signal('');
  protected readonly nameError = signal<string | null>(null);
  protected readonly nameNotice = signal<string | null>(null);
  protected readonly displayName = computed(() => {
    const user = this.auth.user();
    const fullName = user?.user_metadata?.['full_name'];
    return typeof fullName === 'string' && fullName.trim()
      ? fullName.trim()
      : (user?.email ?? 'Mon compte');
  });
  private readonly router = inject(Router);

  protected beginNameEdit(): void {
    const fullName = this.auth.user()?.user_metadata?.['full_name'];
    this.nameDraft.set(typeof fullName === 'string' ? fullName : '');
    this.nameError.set(null);
    this.nameNotice.set(null);
    this.editingName.set(true);
  }

  protected cancelNameEdit(): void {
    this.editingName.set(false);
    this.nameError.set(null);
  }

  protected async saveName(): Promise<void> {
    const name = this.nameDraft().trim();
    if (!name) {
      this.nameError.set('Saisissez un nom avant d’enregistrer.');
      return;
    }

    this.savingName.set(true);
    this.nameError.set(null);
    this.nameNotice.set(null);
    try {
      await this.auth.updateDisplayName(name);
      this.editingName.set(false);
      this.nameNotice.set('Votre nom a été mis à jour.');
    } catch (error) {
      this.nameError.set(
        error instanceof Error ? error.message : 'Votre nom n’a pas pu être mis à jour.',
      );
    } finally {
      this.savingName.set(false);
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
      this.workbook.cancelSignOut();
    } finally {
      this.signingOut.set(false);
    }
  }
}
