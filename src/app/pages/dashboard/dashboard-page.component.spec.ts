import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { createDemoWorkbookData } from '../../core/data/demo-workbook-data';
import { WorkbookDataService } from '../../core/services/workbook-data.service';
import { WORKBOOK_STORAGE } from '../../core/storage/workbook-storage';
import { DashboardPageComponent } from './dashboard-page.component';

describe('DashboardPageComponent', () => {
  beforeEach(async () => {
    const data = createDemoWorkbookData();
    data.sourceFileName = 'suivi.xlsx';
    data.dailyLogs[0].weightKg = 80;
    data.dailyLogs[0].waterGlasses = 7;
    data.dailyLogs[0].sleepHours = 6;
    data.dailyLogs[1].weightKg = 79;
    data.dailyLogs[1].waterGlasses = 9;
    data.dailyLogs[1].sleepHours = 8;
    data.mealPlans[0].breakfast.status = 'respected';
    data.mealPlans[0].lunch.status = 'not-respected';

    await TestBed.configureTestingModule({
      imports: [DashboardPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: WORKBOOK_STORAGE,
          useValue: { load: async () => data, save: async () => undefined },
        },
      ],
    }).compileComponents();
    await TestBed.inject(WorkbookDataService).loadForUser('test-user');
  });

  it('summarizes weight, hydration, sleep, and recorded meals', async () => {
    const fixture = TestBed.createComponent(DashboardPageComponent);
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain('Votre rythme');
    expect(element.querySelector('.weight-overview strong')?.textContent).toContain('79.0');
    expect(element.querySelector('.weight-overview .metric-detail')?.textContent).toContain(
      '−1.0 kg',
    );
    expect(element.querySelector('.hydration-overview strong')?.textContent).toContain('8.0');
    expect(element.querySelector('.meals-overview strong')?.textContent).toContain('50');
    expect(element.querySelectorAll('.weight-point')).toHaveLength(2);
    expect(element.querySelectorAll('.insight')).toHaveLength(3);
  });
});
