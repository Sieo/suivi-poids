import { ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { routes } from './app.routes';
import { SupabaseWorkbookStorage } from './core/storage/supabase-workbook.storage';
import { SUPABASE_CLIENT } from './core/supabase/supabase-client';
import { supabaseConfig } from './core/supabase/supabase.config';
import { WORKBOOK_STORAGE } from './core/storage/workbook-storage';
import { provideServiceWorker } from '@angular/service-worker';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withHashLocation()),
    {
      provide: SUPABASE_CLIENT,
      useFactory: () =>
        import('@supabase/supabase-js').then(({ createClient }) =>
          createClient(supabaseConfig.url, supabaseConfig.publishableKey),
        ),
    },
    {
      provide: WORKBOOK_STORAGE,
      useExisting: SupabaseWorkbookStorage,
    },
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
