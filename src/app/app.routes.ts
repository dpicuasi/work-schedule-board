import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'tablero', pathMatch: 'full' },
  { path: 'tablero', loadComponent: () => import('./tablero/tablero.component').then(m => m.TableroComponent) }
];
