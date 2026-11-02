import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { SUPABASE_CLIENT } from './core/supabase/supabase-client';
import { WORKBOOK_STORAGE } from './core/storage/workbook-storage';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        {
          provide: SUPABASE_CLIENT,
          useValue: Promise.resolve({
            auth: {
              getSession: async () => ({ data: { session: null }, error: null }),
              onAuthStateChange: () => ({
                data: { subscription: { unsubscribe: () => undefined } },
              }),
            },
          }),
        },
        {
          provide: WORKBOOK_STORAGE,
          useValue: { load: async () => null, save: async () => undefined },
        },
      ],
    }).compileComponents();
  });

  it('does not render the private workspace before authentication', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-sidebar')).toBeFalsy();
  });
});
