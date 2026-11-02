import { TestBed } from '@angular/core/testing';
import { createDemoWorkbookData } from '../data/demo-workbook-data';
import { WORKBOOK_STORAGE } from '../storage/workbook-storage';
import { XlsxImportService } from './xlsx-import.service';
import { WorkbookDataService } from './workbook-data.service';

describe('WorkbookDataService', () => {
  it('loads and saves workbook data under the authenticated account id', async () => {
    const accountA = createDemoWorkbookData();
    accountA.sourceFileName = 'account-a.xlsx';
    const accountB = createDemoWorkbookData();
    accountB.sourceFileName = 'account-b.xlsx';
    const save = vi.fn(async () => undefined);

    await TestBed.configureTestingModule({
      providers: [
        {
          provide: WORKBOOK_STORAGE,
          useValue: {
            load: async (userId: string) => (userId === 'account-a' ? accountA : accountB),
            save,
          },
        },
      ],
    }).compileComponents();

    const workbook = TestBed.inject(WorkbookDataService);
    await workbook.loadForUser('account-a');
    expect(workbook.data().sourceFileName).toBe('account-a.xlsx');

    await workbook.loadForUser('account-b');
    expect(workbook.data().sourceFileName).toBe('account-b.xlsx');

    const plan = workbook.data().mealPlans[0];
    workbook.updateMealNote(plan.id, 'Note du compte B');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(save).toHaveBeenCalledWith(
      'account-b',
      expect.objectContaining({
        mealPlans: expect.arrayContaining([expect.objectContaining({ notes: 'Note du compte B' })]),
      }),
    );
  });

  it('preserves daily history and only replaces same-date values supplied by an import', async () => {
    const existingData = createDemoWorkbookData();
    const importedData = createDemoWorkbookData();
    const overlapDate = importedData.dailyLogs[0].loggedOn;
    const previousLog = {
      ...existingData.dailyLogs[0],
      id: 'previous-week-log',
      loggedOn: '2024-01-01',
      weightKg: 84,
    };
    const existingOverlapLog = {
      ...existingData.dailyLogs[0],
      id: 'existing-overlap-log',
      loggedOn: overlapDate,
      weightKg: 80,
      hungerLevel: 3,
      waterGlasses: 8,
      activity: 'Marche',
      mealsFollowed: 'Repas suivis',
      emotionalHunger: false,
      sleepHours: 7,
      notes: 'Note conservée',
    };
    existingData.dailyLogs = [previousLog, existingOverlapLog];

    const importedOverlapLog = importedData.dailyLogs[0];
    importedOverlapLog.weightKg = 79;
    importedOverlapLog.waterGlasses = 10;

    const save = vi.fn(async () => undefined);
    await TestBed.configureTestingModule({
      providers: [
        {
          provide: WORKBOOK_STORAGE,
          useValue: { load: async () => existingData, save },
        },
        {
          provide: XlsxImportService,
          useValue: { parse: async () => importedData },
        },
      ],
    }).compileComponents();

    const workbook = TestBed.inject(WorkbookDataService);
    await workbook.loadForUser('test-user');
    expect(await workbook.importFile(new File(['workbook'], 'new-week.xlsx'))).toBe(true);

    const logs = workbook.data().dailyLogs;
    expect(logs).toHaveLength(8);
    expect(logs.find((log) => log.loggedOn === '2024-01-01')).toMatchObject({
      weightKg: 84,
      profileId: 'test-user',
    });
    expect(logs.find((log) => log.loggedOn === overlapDate)).toMatchObject({
      id: 'existing-overlap-log',
      weightKg: 79,
      hungerLevel: 3,
      waterGlasses: 10,
      activity: 'Marche',
      mealsFollowed: 'Repas suivis',
      emotionalHunger: false,
      sleepHours: 7,
      notes: 'Note conservée',
      profileId: 'test-user',
    });
    expect(save).toHaveBeenCalledWith(
      'test-user',
      expect.objectContaining({
        dailyLogs: expect.arrayContaining([
          expect.objectContaining({ id: 'previous-week-log', loggedOn: '2024-01-01' }),
        ]),
      }),
    );
  });

  it('waits for pending workbook saves before allowing sign-out', async () => {
    let resolveSave: (() => void) | undefined;
    await TestBed.configureTestingModule({
      providers: [
        {
          provide: WORKBOOK_STORAGE,
          useValue: {
            load: async () => createDemoWorkbookData(),
            save: () =>
              new Promise<void>((resolve) => {
                resolveSave = resolve;
              }),
          },
        },
      ],
    }).compileComponents();

    const workbook = TestBed.inject(WorkbookDataService);
    await workbook.loadForUser('test-user');
    workbook.updateMealNote(workbook.data().mealPlans[0].id, 'À enregistrer');

    const signOutAllowed = workbook.prepareForSignOut();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(workbook.signingOut()).toBe(true);

    resolveSave?.();
    expect(await signOutAllowed).toBe(true);
    expect(workbook.hasUnsavedChanges()).toBe(false);
  });
});
