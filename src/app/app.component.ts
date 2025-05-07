import { Component } from '@angular/core';
import { TableroComponent } from './tablero/tablero.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TableroComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  // El título ahora se maneja en el componente TableroComponent
}
