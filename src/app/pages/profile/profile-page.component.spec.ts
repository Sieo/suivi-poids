import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { createEmptyWorkbookData } from '../../core/data/empty-workbook-data';
import { AuthService } from '../../core/services/auth.service';
import { WorkbookDataService } from '../../core/services/workbook-data.service';
import { WORKBOOK_STORAGE } from '../../core/storage/workbook-storage';
import { ProfilePageComponent } from './profile-page.component';

describe('ProfilePageComponent', () => {
  const user = signal<{ email: string; user_metadata: { full_name: string } }>({
    email: 'ana@example.com',
    user_metadata: { full_name: 'Ana Martin' },
  });
  const auth = {
    error: signal<string | null>(null),
    signOut: vi.fn(),
    updateDisplayName: vi.fn(async (name: string) => {
      user.set({ ...user(), user_metadata: { full_name: name } });
    }),
    user,
  };

  beforeEach(async () => {
    user.set({ email: 'ana@example.com', user_metadata: { full_name: 'Ana Martin' } });
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [ProfilePageComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        {
          provide: WORKBOOK_STORAGE,
          useValue: {
            load: async () => createEmptyWorkbookData('test-user'),
            save: async () => undefined,
          },
        },
      ],
    }).compileComponents();
    await TestBed.inject(WorkbookDataService).loadForUser('test-user');
  });

  it('updates and displays the account name', async () => {
    const fixture = TestBed.createComponent(ProfilePageComponent);
    await fixture.whenStable();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.identity-summary button') as HTMLButtonElement).click();
    fixture.detectChanges();
    fixture.debugElement
      .query(By.css('#profile-name'))
      .triggerEventHandler('ngModelChange', 'Camille');
    fixture.detectChanges();
    await fixture.whenStable();
    (fixture.nativeElement.querySelector('form button[type="submit"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(auth.updateDisplayName).toHaveBeenCalledWith('Camille');
    expect(fixture.nativeElement.querySelector('.profile-heading h1')?.textContent).toContain(
      'Camille',
    );
  });
});
