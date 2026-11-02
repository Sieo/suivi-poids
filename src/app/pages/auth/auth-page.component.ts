import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  imports: [FormsModule, RouterLink],
  selector: 'app-auth-page',
  styleUrl: './auth-page.component.scss',
  templateUrl: './auth-page.component.html',
})
export class AuthPageComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly creatingAccount = signal(false);
  protected readonly submitting = signal(false);
  protected readonly message = signal<string | null>(null);

  protected async submit(): Promise<void> {
    this.submitting.set(true);
    this.message.set(null);
    this.auth.error.set(null);

    try {
      if (this.creatingAccount()) {
        const signedIn = await this.auth.signUp(this.email(), this.password());
        if (!signedIn) {
          this.message.set(
            'Votre compte a été créé. Consultez votre boîte mail pour confirmer votre adresse avant de vous connecter.',
          );
          return;
        }
      } else {
        await this.auth.signIn(this.email(), this.password());
      }

      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      const destination =
        returnUrl?.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/planning-semaine';
      await this.router.navigateByUrl(destination);
    } catch {
      // The authentication service exposes the Supabase error to the form.
    } finally {
      this.submitting.set(false);
    }
  }

  protected toggleMode(): void {
    this.creatingAccount.update((value) => !value);
    this.message.set(null);
    this.auth.error.set(null);
  }
}
