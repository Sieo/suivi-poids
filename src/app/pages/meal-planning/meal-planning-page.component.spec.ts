import { TestBed } from '@angular/core/testing';
import { createDemoWorkbookData } from '../../core/data/demo-workbook-data';
import { WorkbookDataService } from '../../core/services/workbook-data.service';
import { WORKBOOK_STORAGE } from '../../core/storage/workbook-storage';
import { MealPlanningPageComponent } from './meal-planning-page.component';

describe('MealPlanningPageComponent', () => {
  let savedData: unknown;

  beforeEach(async () => {
    savedData = null;
    await TestBed.configureTestingModule({
      imports: [MealPlanningPageComponent],
      providers: [
        {
          provide: WORKBOOK_STORAGE,
          useValue: {
            load: async () => createDemoWorkbookData(),
            save: async (_userId: string, data: unknown) => {
              savedData = data;
            },
          },
        },
      ],
    }).compileComponents();
    await TestBed.inject(WorkbookDataService).loadForUser('test-user');
  });

  it('should render the weekly plan with three meals for the selected day', async () => {
    const fixture = TestBed.createComponent(MealPlanningPageComponent);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.section-heading h2')?.textContent).toContain(
      'Planning semaine',
    );
    expect(compiled.querySelectorAll('.meal-row')).toHaveLength(3);
  });

  it('should save a meal compliance status', async () => {
    const fixture = TestBed.createComponent(MealPlanningPageComponent);
    fixture.detectChanges();

    const statusSelect = fixture.nativeElement.querySelector(
      '[aria-label="Suivi : Petit-déjeuner"]',
    ) as HTMLSelectElement;
    statusSelect.value = 'respected';
    statusSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(
      (savedData as { mealPlans: Array<{ breakfast: { status: string } }> }).mealPlans[0].breakfast
        .status,
    ).toBe('respected');
  });

  it('should save notes for the selected day', async () => {
    const fixture = TestBed.createComponent(MealPlanningPageComponent);
    fixture.detectChanges();

    const notes = fixture.nativeElement.querySelector(
      '.notes-field textarea',
    ) as HTMLTextAreaElement;
    notes.value = 'Déjeuner pris plus tard.';
    notes.dispatchEvent(new Event('change'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect((savedData as { mealPlans: Array<{ notes: string }> }).mealPlans[0].notes).toBe(
      'Déjeuner pris plus tard.',
    );
  });
});
