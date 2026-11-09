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
    const selectedDay = compiled.querySelector<HTMLButtonElement>('.calendar-day.selected');
    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    expect(compiled.querySelector('.section-heading h2')?.textContent).toContain(
      'Planning semaine',
    );
    expect(selectedDay?.getAttribute('data-date')).toBe(todayIso);
    expect(selectedDay?.getAttribute('aria-current')).toBe('date');
    expect(compiled.querySelectorAll('.calendar-day')).toHaveLength(42);
    expect(compiled.querySelectorAll('.meal-row')).toHaveLength(3);
  });

  it('should navigate months while preserving the selected day of the month', async () => {
    const fixture = TestBed.createComponent(MealPlanningPageComponent);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const monthBefore = compiled.querySelector('.calendar-toolbar h3')?.textContent;

    (compiled.querySelector('[aria-label="Mois suivant"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const selectedDay = Math.min(
      now.getDate(),
      new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate(),
    );
    const expectedDay = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    expect(compiled.querySelector('.calendar-toolbar h3')?.textContent).not.toBe(monthBefore);
    expect(
      compiled
        .querySelector<HTMLButtonElement>('.calendar-day.selected')
        ?.getAttribute('data-date'),
    ).toBe(expectedDay);
    expect(compiled.querySelector('.empty-day')).not.toBeNull();
  });

  it('should show a selected date from the calendar', async () => {
    const fixture = TestBed.createComponent(MealPlanningPageComponent);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const day = createDemoWorkbookData().mealPlans[1].plannedOn;

    (compiled.querySelector(`[data-date="${day}"]`) as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(
      compiled
        .querySelector<HTMLButtonElement>('.calendar-day.selected')
        ?.getAttribute('data-date'),
    ).toBe(day);
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

  it('should save a replacement status and its description in the day comment', async () => {
    const fixture = TestBed.createComponent(MealPlanningPageComponent);
    fixture.detectChanges();

    const statusSelect = fixture.nativeElement.querySelector(
      '[aria-label="Suivi : Déjeuner"]',
    ) as HTMLSelectElement;
    statusSelect.value = 'replaced';
    statusSelect.dispatchEvent(new Event('change'));

    const notes = fixture.nativeElement.querySelector(
      '.notes-field textarea',
    ) as HTMLTextAreaElement;
    notes.value = 'Remplacé par une salade.';
    notes.dispatchEvent(new Event('change'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(
      (savedData as { mealPlans: Array<{ lunch: { status: string }; notes: string }> })
        .mealPlans[0],
    ).toMatchObject({
      lunch: { status: 'replaced' },
      notes: 'Remplacé par une salade.',
    });
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
