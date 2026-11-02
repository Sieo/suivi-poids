import { TestBed } from '@angular/core/testing';
import { createDemoWorkbookData } from '../data/demo-workbook-data';
import { WORKBOOK_STORAGE } from '../storage/workbook-storage';
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
