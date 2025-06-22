import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/work-schedule-board/browser/team/dev', pathMatch: 'full' },
  { path: '/work-schedule-board/browser/team/:teamId', loadComponent: () => import('./tablero/tablero.component').then(m => m.TableroComponent) }
];
