import { Component } from '@angular/core';
import { TableroComponent } from './tablero/tablero.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TableroComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'HORARIO DE DESARROLLO DEL 28 DE ABRL AL 01 DE MAYO';
}
