import { Routes } from '@angular/router';
import { requireAuth, requireGuest } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'recapitulatif' },
  {
    path: 'connexion',
    canActivate: [requireGuest],
    loadComponent: () =>
      import('./pages/auth/auth-page.component').then((module) => module.AuthPageComponent),
  },
  {
    path: 'recapitulatif',
    canActivate: [requireAuth],
    loadComponent: () =>
      import('./pages/dashboard/dashboard-page.component').then(
        (module) => module.DashboardPageComponent,
      ),
  },
  {
    path: 'planning-semaine',
    canActivate: [requireAuth],
    loadComponent: () =>
      import('./pages/meal-planning/meal-planning-page.component').then(
        (module) => module.MealPlanningPageComponent,
      ),
  },
  {
    path: 'reperes-portions',
    canActivate: [requireAuth],
    loadComponent: () =>
      import('./pages/portion-guides/portion-guides-page.component').then(
        (module) => module.PortionGuidesPageComponent,
      ),
  },
  {
    path: 'liste-de-courses',
    canActivate: [requireAuth],
    loadComponent: () =>
      import('./pages/shopping-list/shopping-list-page.component').then(
        (module) => module.ShoppingListPageComponent,
      ),
  },
  {
    path: 'suivi-quotidien',
    canActivate: [requireAuth],
    loadComponent: () =>
      import('./pages/daily-tracking/daily-tracking-page.component').then(
        (module) => module.DailyTrackingPageComponent,
      ),
  },
  {
    path: 'a-lire',
    canActivate: [requireAuth],
    loadComponent: () =>
      import('./pages/reading/reading-page.component').then(
        (module) => module.ReadingPageComponent,
      ),
  },
  { path: '**', redirectTo: 'planning-semaine' },
];
