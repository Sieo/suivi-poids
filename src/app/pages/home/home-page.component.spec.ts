import { signal } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { createDemoWorkbookData } from '../../core/data/demo-workbook-data';
import { AuthService } from '../../core/services/auth.service';
import { WorkbookDataService } from '../../core/services/workbook-data.service';
import { WORKBOOK_STORAGE } from '../../core/storage/workbook-storage';
import { HomePageComponent } from './home-page.component';

describe('HomePageComponent', () => {
  registerLocaleData(localeFr);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePageComponent],
      providers: [
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'fr-FR' },
        {
          provide: WORKBOOK_STORAGE,
          useValue: {
            load: async () => createDemoWorkbookData(),
            save: async () => undefined,
          },
        },
        {
          provide: AuthService,
          useValue: {
            user: signal({ email: 'ana@example.com', user_metadata: { full_name: 'Ana Martin' } }),
          },
        },
      ],
    }).compileComponents();
    await TestBed.inject(WorkbookDataService).loadForUser('test-user');
  });

  it('shows a personalized welcome and the daily menu', async () => {
    const fixture = TestBed.createComponent(HomePageComponent);
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain('Bonjour, Ana');
    const frenchWeekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' })
      .format(new Date())
      .toLocaleUpperCase('fr-FR');
    expect(element.querySelector('.welcome-heading .eyebrow')?.textContent).toContain(
      frenchWeekday,
    );
    expect(element.querySelectorAll('.meal-card')).toHaveLength(3);
    expect(element.querySelector('.meal-card-copy p')?.textContent).toContain('Petit-déjeuner');
    expect(element.querySelectorAll('.water-dots span')).toHaveLength(8);
    expect(element.querySelector('.weight-highlight')).not.toBeNull();
  });
});
