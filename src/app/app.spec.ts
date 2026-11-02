import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { WORKBOOK_STORAGE } from './core/storage/workbook-storage';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        {
          provide: WORKBOOK_STORAGE,
          useValue: { load: () => null, save: () => undefined },
        },
      ],
    }).compileComponents();
  });

  it('should create the application shell', () => {
    const fixture = TestBed.createComponent(App);

    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-sidebar')).toBeTruthy();
  });
});
