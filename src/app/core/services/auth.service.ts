import { inject, Injectable, signal } from '@angular/core';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../supabase/supabase-client';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly client: Promise<SupabaseClient> = inject(SUPABASE_CLIENT);

  readonly user = signal<User | null>(null);
  readonly initialized = signal(false);
  readonly error = signal<string | null>(null);
  readonly ready: Promise<void>;

  constructor() {
    this.ready = this.client
      .then(async (client) => {
        client.auth.onAuthStateChange((_event, session: Session | null) => {
          this.user.set(session?.user ?? null);
        });

        const { data, error } = await client.auth.getSession();
        if (error) {
          throw error;
        }
        this.user.set(data.session?.user ?? null);
      })
      .catch((error: unknown) => {
        this.error.set(this.errorMessage(error));
      })
      .finally(() => this.initialized.set(true));
  }

  async signIn(email: string, password: string): Promise<void> {
    this.error.set(null);
    const client = await this.client;
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      this.error.set(error.message);
      throw error;
    }
    this.user.set(data.user);
  }

  async signUp(email: string, password: string): Promise<boolean> {
    this.error.set(null);
    const client = await this.client;
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: new URL(document.baseURI).toString(),
      },
    });
    if (error) {
      this.error.set(error.message);
      throw error;
    }
    if (data.session) {
      this.user.set(data.user);
      return true;
    }
    return false;
  }

  async signOut(): Promise<void> {
    this.error.set(null);
    const client = await this.client;
    const { error } = await client.auth.signOut();
    if (error) {
      this.error.set(error.message);
      throw error;
    }
    this.user.set(null);
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error
      ? error.message
      : 'Impossible de vérifier la session auprès de Supabase.';
  }
}
