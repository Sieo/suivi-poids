import { inject, Injectable, signal } from '@angular/core';
import { DailyLog, MealPlan, MealStatus, WorkbookData } from '../models';
import { createEmptyWorkbookData } from '../data/empty-workbook-data';
import { WORKBOOK_STORAGE } from '../storage/workbook-storage';
import { XlsxImportService } from './xlsx-import.service';

const mergeDailyLogs = (
  existingLogs: DailyLog[],
  importedLogs: DailyLog[],
  profileId: string,
): DailyLog[] => {
  const logsByDate = new Map(
    existingLogs.map((log) => [log.loggedOn, { ...log, profileId }]),
  );

  for (const importedLog of importedLogs) {
    const existingLog = logsByDate.get(importedLog.loggedOn);
    if (!existingLog) {
      logsByDate.set(importedLog.loggedOn, { ...importedLog, profileId });
      continue;
    }

    logsByDate.set(importedLog.loggedOn, {
      ...existingLog,
      weightKg: importedLog.weightKg ?? existingLog.weightKg,
      hungerLevel: importedLog.hungerLevel ?? existingLog.hungerLevel,
      waterGlasses: importedLog.waterGlasses ?? existingLog.waterGlasses,
      activity: importedLog.activity || existingLog.activity,
      mealsFollowed: importedLog.mealsFollowed || existingLog.mealsFollowed,
      snacksConsumed: importedLog.snacksConsumed || existingLog.snacksConsumed,
      emotionalHunger: importedLog.emotionalHunger ?? existingLog.emotionalHunger,
      sleepHours: importedLog.sleepHours ?? existingLog.sleepHours,
      notes: importedLog.notes || existingLog.notes,
    });
  }

  return [...logsByDate.values()].sort((a, b) => a.loggedOn.localeCompare(b.loggedOn));
};

const mergeMealPlans = (existingPlans: MealPlan[], importedPlans: MealPlan[]): MealPlan[] => {
  const plansByDate = new Map(existingPlans.map((plan) => [plan.plannedOn, plan]));

  for (const importedPlan of importedPlans) {
    const existingPlan = plansByDate.get(importedPlan.plannedOn);
    if (!existingPlan) {
      plansByDate.set(importedPlan.plannedOn, importedPlan);
      continue;
    }

    plansByDate.set(importedPlan.plannedOn, {
      ...importedPlan,
      breakfast: {
        ...importedPlan.breakfast,
        status:
          existingPlan.breakfast.status === 'planned'
            ? importedPlan.breakfast.status
            : existingPlan.breakfast.status,
      },
      lunch: {
        ...importedPlan.lunch,
        status:
          existingPlan.lunch.status === 'planned'
            ? importedPlan.lunch.status
            : existingPlan.lunch.status,
      },
      dinner: {
        ...importedPlan.dinner,
        status:
          existingPlan.dinner.status === 'planned'
            ? importedPlan.dinner.status
            : existingPlan.dinner.status,
      },
      notes: importedPlan.notes || existingPlan.notes,
    });
  }

  return [...plansByDate.values()].sort((a, b) => a.plannedOn.localeCompare(b.plannedOn));
};

@Injectable({ providedIn: 'root' })
export class WorkbookDataService {
  private readonly storage = inject(WORKBOOK_STORAGE);
  private readonly xlsxImport = inject(XlsxImportService);
  private loadedUserId: string | null = null;
  private loadRequest = 0;
  private revision = 0;
  private savedRevision = 0;
  private saveQueue: Promise<void> = Promise.resolve();
  private readonly pendingSaves = new Set<Promise<boolean>>();

  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly loading = signal(false);
  readonly ready = signal(false);
  readonly signingOut = signal(false);
  readonly hasUnsavedChanges = signal(false);
  readonly data = signal(createEmptyWorkbookData(''));

  async loadForUser(userId: string): Promise<boolean> {
    if (this.loadedUserId === userId && this.ready()) {
      return true;
    }

    const request = ++this.loadRequest;
    this.loadedUserId = null;
    this.ready.set(false);
    this.revision = 0;
    this.savedRevision = 0;
    this.hasUnsavedChanges.set(false);
    this.signingOut.set(false);
    this.loading.set(true);
    this.error.set(null);
    this.notice.set(null);
    this.data.set(createEmptyWorkbookData(userId));

    try {
      const savedData = await this.storage.load(userId);
      if (request !== this.loadRequest) {
        return false;
      }
      this.data.set(savedData ?? createEmptyWorkbookData(userId));
      this.loadedUserId = userId;
      this.ready.set(true);
      return true;
    } catch (error) {
      if (request !== this.loadRequest) {
        return false;
      }
      this.error.set(
        error instanceof Error ? error.message : 'Impossible de charger les données du compte.',
      );
      return false;
    } finally {
      if (request === this.loadRequest) {
        this.loading.set(false);
      }
    }
  }

  clearForSignedOutUser(): void {
    this.loadRequest += 1;
    this.loadedUserId = null;
    this.ready.set(false);
    this.revision = 0;
    this.savedRevision = 0;
    this.hasUnsavedChanges.set(false);
    this.signingOut.set(false);
    this.error.set(null);
    this.notice.set(null);
    this.data.set(createEmptyWorkbookData(''));
  }

  async prepareForSignOut(): Promise<boolean> {
    this.signingOut.set(true);
    while (this.pendingSaves.size > 0) {
      const results = await Promise.all([...this.pendingSaves]);
      if (results.some((saved) => !saved)) {
        this.signingOut.set(false);
        return false;
      }
    }

    if (this.hasUnsavedChanges()) {
      this.signingOut.set(false);
      return false;
    }
    return true;
  }

  cancelSignOut(): void {
    this.signingOut.set(false);
  }

  async importFile(file: File): Promise<boolean> {
    this.error.set(null);
    this.notice.set(null);
    try {
      const userId = this.loadedUserId;
      if (!userId) {
        throw new Error('Connectez-vous et chargez les données du compte avant de les modifier.');
      }

      const importedData = await this.xlsxImport.parse(file);
      if (this.loadedUserId !== userId) {
        throw new Error('La session a changé pendant l’import. Reconnectez-vous puis réessayez.');
      }
      const accountData = {
        ...importedData,
        week: { ...importedData.week, profileId: userId },
        mealPlans: mergeMealPlans(this.data().mealPlans, importedData.mealPlans),
        dailyLogs: mergeDailyLogs(this.data().dailyLogs, importedData.dailyLogs, userId),
      };
      return await this.commit(
        accountData,
        `Classeur « ${file.name} » importé et synchronisé avec votre compte.`,
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

  ensureDailyLog(loggedOn: string): void {
    if (this.data().dailyLogs.some((log) => log.loggedOn === loggedOn)) {
      return;
    }

    const profileId = this.loadedUserId;
    if (!profileId) {
      return;
    }

    const newLog: DailyLog = {
      id: `daily-${profileId}-${loggedOn}`,
      profileId,
      loggedOn,
      weightKg: null,
      hungerLevel: null,
      waterGlasses: null,
      activity: '',
      mealsFollowed: '',
      snacksConsumed: '',
      emotionalHunger: null,
      sleepHours: null,
      notes: null,
    };

    this.update((data) => ({
      ...data,
      dailyLogs: [...data.dailyLogs, newLog].sort((a, b) => a.loggedOn.localeCompare(b.loggedOn)),
    }));
  }

  addWaterGlass(loggedOn: string): void {
    const currentLog = this.data().dailyLogs.find((log) => log.loggedOn === loggedOn);
    if ((currentLog?.waterGlasses ?? 0) >= 100) {
      return;
    }

    this.update((data) => {
      const log = data.dailyLogs.find((entry) => entry.loggedOn === loggedOn);
      if (log) {
        return {
          ...data,
          dailyLogs: data.dailyLogs.map((entry) =>
            entry.id === log.id ? { ...entry, waterGlasses: (entry.waterGlasses ?? 0) + 1 } : entry,
          ),
        };
      }

      const profileId = this.loadedUserId;
      if (!profileId) {
        return data;
      }

      const newLog: DailyLog = {
        id: `daily-${profileId}-${loggedOn}`,
        profileId,
        loggedOn,
        weightKg: null,
        hungerLevel: null,
        waterGlasses: 1,
        activity: '',
        mealsFollowed: '',
        snacksConsumed: '',
        emotionalHunger: null,
        sleepHours: null,
        notes: null,
      };

      return {
        ...data,
        dailyLogs: [...data.dailyLogs, newLog].sort((a, b) => a.loggedOn.localeCompare(b.loggedOn)),
      };
    });
  }

  private update(updater: (data: WorkbookData) => WorkbookData): void {
    void this.commit(updater(this.data()));
  }

  private commit(data: WorkbookData, notice?: string): Promise<boolean> {
    const userId = this.loadedUserId;
    if (!userId || !this.ready()) {
      this.error.set('Les données ne sont pas chargées. Réessayez avant de les modifier.');
      this.notice.set(null);
      return Promise.resolve(false);
    }

    this.data.set(data);
    const revision = ++this.revision;
    const loadRequest = this.loadRequest;
    this.hasUnsavedChanges.set(true);
    const save = this.saveQueue.then(() => this.storage.save(userId, data));
    this.saveQueue = save.catch(() => undefined);

    const result = save
      .then(() => {
        if (this.loadedUserId === userId && this.loadRequest === loadRequest) {
          this.savedRevision = Math.max(this.savedRevision, revision);
          this.hasUnsavedChanges.set(this.savedRevision < this.revision);
          this.error.set(null);
          this.notice.set(notice ?? 'Modifications synchronisées avec votre compte.');
        }
        return true;
      })
      .catch((error: unknown) => {
        if (this.loadedUserId === userId && this.loadRequest === loadRequest) {
          this.error.set(
            error instanceof Error
              ? error.message
              : 'Les données n’ont pas pu être enregistrées dans Supabase.',
          );
          this.notice.set(null);
        }
        return false;
      });
    this.pendingSaves.add(result);
    void result.then(() => this.pendingSaves.delete(result));
    return result;
  }
}
