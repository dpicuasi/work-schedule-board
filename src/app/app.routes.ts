import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'team/dev', pathMatch: 'full' },
  { path: 'team/:teamId', loadComponent: () => import('./tablero/tablero.component').then(m => m.TableroComponent) }
];
