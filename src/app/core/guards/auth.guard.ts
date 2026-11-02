import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { WorkbookDataService } from '../services/workbook-data.service';

export const requireAuth: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const workbook = inject(WorkbookDataService);
  await auth.ready;

  const user = auth.user();
  if (!user) {
    return router.createUrlTree(['/connexion'], { queryParams: { returnUrl: state.url } });
  }

  const loaded = await workbook.loadForUser(user.id);
  if (!loaded) {
    return router.createUrlTree(['/connexion'], { queryParams: { returnUrl: state.url } });
  }
  return true;
};

export const requireGuest: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ready;
  return auth.user() ? router.parseUrl('/planning-semaine') : true;
};
