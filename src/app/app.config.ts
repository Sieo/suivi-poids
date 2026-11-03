import {
  ApplicationConfig,
  LOCALE_ID,
  isDevMode,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { provideRouter, withHashLocation } from '@angular/router';
import { routes } from './app.routes';
import { SupabaseWorkbookStorage } from './core/storage/supabase-workbook.storage';
import { SUPABASE_CLIENT } from './core/supabase/supabase-client';
import { supabaseConfig } from './core/supabase/supabase.config';
import { WORKBOOK_STORAGE } from './core/storage/workbook-storage';
import { provideServiceWorker } from '@angular/service-worker';

registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withHashLocation()),
    { provide: LOCALE_ID, useValue: 'fr-FR' },
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
