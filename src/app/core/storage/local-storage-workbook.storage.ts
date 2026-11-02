import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { WorkbookData } from '../models/workbook-data.model';
import { WorkbookStorage } from './workbook-storage';

const STORAGE_KEY = 'tempo.workbook.v1';

const isWorkbookData = (value: unknown): value is WorkbookData => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const data = value as Partial<WorkbookData>;
  return (
    data.version === 1 &&
    !!data.week &&
    Array.isArray(data.mealPlans) &&
    Array.isArray(data.portionGuides) &&
    Array.isArray(data.shoppingItems) &&
    Array.isArray(data.dailyLogs) &&
    Array.isArray(data.readingItems)
  );
};

@Injectable({ providedIn: 'root' })
export class LocalStorageWorkbookStorage implements WorkbookStorage {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  load(): WorkbookData | null {
    if (!this.isBrowser) {
      return null;
    }

    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) {
      return null;
    }

    let data: unknown;
    try {
      data = JSON.parse(serialized);
    } catch {
      throw new Error('Les données locales sont illisibles. Importez à nouveau votre classeur.');
    }

    if (!isWorkbookData(data)) {
      throw new Error(
        'Le format des données locales n’est pas reconnu. Importez à nouveau votre classeur.',
      );
    }

    return data;
  }

  save(data: WorkbookData): void {
    if (!this.isBrowser) {
      throw new Error('Le stockage local est indisponible sur cet appareil.');
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}
