import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./tablero/tablero.component').then(m => m.TableroComponent) }
];
