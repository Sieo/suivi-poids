import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'planning-semaine' },
  {
    path: 'planning-semaine',
    loadComponent: () =>
      import('./pages/meal-planning/meal-planning-page.component').then(
        (module) => module.MealPlanningPageComponent,
      ),
  },
  {
    path: 'reperes-portions',
    loadComponent: () =>
      import('./pages/portion-guides/portion-guides-page.component').then(
        (module) => module.PortionGuidesPageComponent,
      ),
  },
  {
    path: 'liste-de-courses',
    loadComponent: () =>
      import('./pages/shopping-list/shopping-list-page.component').then(
        (module) => module.ShoppingListPageComponent,
      ),
  },
  {
    path: 'suivi-quotidien',
    loadComponent: () =>
      import('./pages/daily-tracking/daily-tracking-page.component').then(
        (module) => module.DailyTrackingPageComponent,
      ),
  },
  {
    path: 'a-lire',
    loadComponent: () =>
      import('./pages/reading/reading-page.component').then(
        (module) => module.ReadingPageComponent,
      ),
  },
  { path: '**', redirectTo: 'planning-semaine' },
];
