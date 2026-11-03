import { Component, DestroyRef, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { WorkbookDataService } from '../../../core/services/workbook-data.service';
import { WorkbookFileActionsComponent } from '../workbook-file-actions/workbook-file-actions.component';

const pageTitles: Record<string, string> = {
  '/': 'Accueil',
  '/planning-semaine': 'Planning',
  '/liste-de-courses': 'Courses',
  '/recapitulatif': 'Progrès',
  '/profil': 'Mon espace',
  '/suivi-quotidien': 'Mon suivi',
  '/reperes-portions': 'Repères',
  '/a-lire': 'À lire',
};

@Component({
  imports: [RouterLink, WorkbookFileActionsComponent],
  selector: 'app-workbook-toolbar',
  styleUrl: './workbook-toolbar.component.scss',
  templateUrl: './workbook-toolbar.component.html',
})
export class WorkbookToolbarComponent {
  protected readonly auth = inject(AuthService);
  protected readonly workbook = inject(WorkbookDataService);
  protected readonly signingOut = signal(false);
  protected readonly pageTitle = signal('Accueil');
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.updatePageTitle(this.router.url);
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => this.updatePageTitle(event.urlAfterRedirects));
  }

  private updatePageTitle(url: string): void {
    const path = url.split(/[?#]/u, 1)[0];
    this.pageTitle.set(pageTitles[path] ?? 'Tempo');
  }

  protected async retryLoading(): Promise<void> {
    const user = this.auth.user();
    if (user) {
      await this.workbook.loadForUser(user.id);
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
