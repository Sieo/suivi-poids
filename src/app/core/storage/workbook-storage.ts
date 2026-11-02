import { InjectionToken } from '@angular/core';
import { WorkbookData } from '../models/workbook-data.model';

export interface WorkbookStorage {
  load(): WorkbookData | null;
  save(data: WorkbookData): void;
}

export const WORKBOOK_STORAGE = new InjectionToken<WorkbookStorage>('WORKBOOK_STORAGE');
