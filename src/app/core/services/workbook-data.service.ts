import { inject, Injectable, signal } from '@angular/core';
import { DailyLog, MealStatus, WorkbookData } from '../models';
import { createDemoWorkbookData } from '../data/demo-workbook-data';
import { WORKBOOK_STORAGE } from '../storage/workbook-storage';
import { XlsxImportService } from './xlsx-import.service';

@Injectable({ providedIn: 'root' })
export class WorkbookDataService {
  private readonly storage = inject(WORKBOOK_STORAGE);
  private readonly xlsxImport = inject(XlsxImportService);

  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly data = signal(this.loadInitialData());

  async importFile(file: File): Promise<boolean> {
    this.error.set(null);
    this.notice.set(null);
    try {
      const importedData = await this.xlsxImport.parse(file);
      return this.commit(
        importedData,
        `Classeur « ${file.name} » importé. Les données sont enregistrées sur cet appareil.`,
      );
    } catch (error) {
      this.error.set(
        error instanceof Error
          ? error.message
          : 'Une erreur inattendue a empêché la lecture du classeur.',
      );
      return false;
    }
  }

  updateMealStatus(
    planId: string,
    period: 'breakfast' | 'lunch' | 'dinner',
    status: MealStatus,
  ): void {
    this.update((data) => ({
      ...data,
      mealPlans: data.mealPlans.map((plan) =>
        plan.id === planId ? { ...plan, [period]: { ...plan[period], status } } : plan,
      ),
    }));
  }

  updateMealNote(planId: string, notes: string): void {
    this.update((data) => ({
      ...data,
      mealPlans: data.mealPlans.map((plan) => (plan.id === planId ? { ...plan, notes } : plan)),
    }));
  }

  updateShoppingItem(itemId: string, isPurchased: boolean): void {
    this.update((data) => ({
      ...data,
      shoppingItems: data.shoppingItems.map((item) =>
        item.id === itemId ? { ...item, isPurchased } : item,
      ),
    }));
  }

  updateDailyLog(logId: string, changes: Partial<DailyLog>): void {
    this.update((data) => ({
      ...data,
      dailyLogs: data.dailyLogs.map((log) => (log.id === logId ? { ...log, ...changes } : log)),
    }));
  }

  private loadInitialData(): WorkbookData {
    try {
      return this.storage.load() ?? createDemoWorkbookData();
    } catch (error) {
      this.error.set(
        error instanceof Error
          ? error.message
          : 'Impossible de lire les données enregistrées localement.',
      );
      return createDemoWorkbookData();
    }
  }

  private update(updater: (data: WorkbookData) => WorkbookData): void {
    this.commit(updater(this.data()));
  }

  private commit(data: WorkbookData, notice?: string): boolean {
    try {
      this.storage.save(data);
      this.data.set(data);
      this.error.set(null);
      this.notice.set(notice ?? 'Modifications enregistrées sur cet appareil.');
      return true;
    } catch (error) {
      this.error.set(
        error instanceof Error
          ? `Les données n’ont pas pu être enregistrées : ${error.message}`
          : 'Les données n’ont pas pu être enregistrées dans le stockage local.',
      );
      this.notice.set(null);
      return false;
    }
  }
}
