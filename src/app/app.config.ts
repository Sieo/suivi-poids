import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { LocalStorageWorkbookStorage } from './core/storage/local-storage-workbook.storage';
import { WORKBOOK_STORAGE } from './core/storage/workbook-storage';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    {
      provide: WORKBOOK_STORAGE,
      useExisting: LocalStorageWorkbookStorage,
    },
  ],
};
