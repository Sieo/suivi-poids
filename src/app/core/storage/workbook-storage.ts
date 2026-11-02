import { InjectionToken } from '@angular/core';
import { WorkbookData } from '../models/workbook-data.model';

export interface WorkbookStorage {
  load(userId: string): Promise<WorkbookData | null>;
  save(userId: string, data: WorkbookData): Promise<void>;
}

export const WORKBOOK_STORAGE = new InjectionToken<WorkbookStorage>('WORKBOOK_STORAGE');
