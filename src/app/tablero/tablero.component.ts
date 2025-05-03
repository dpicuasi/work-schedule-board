import {
  Component,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  ChangeDetectorRef
} from '@angular/core';
import { createSwapy, type Swapy } from 'swapy';

interface Employee {
  id: string;
  name: string;
  image: string;
}

const MAX_SLOTS_PER_DAY = 8;              // ← ajusta a tu gusto

@Component({
  selector: 'app-tablero',
  standalone: true,
  templateUrl: './tablero.component.html',
  styleUrls: ['./tablero.component.scss']
})
export class TableroComponent implements AfterViewInit, OnDestroy {

  @ViewChild('boardContainer', { static: true })
  boardContainer!: ElementRef<HTMLElement>;

  private swapy!: Swapy;

  weekDays = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'];

  /** listado plano de empleados → más fácil buscarlos por id */
  private readonly employees: Record<string, Employee> = {
    '1': { id: '1', name: 'Ana',    image: 'assets/person.png'    },
    '2': { id: '2', name: 'Luis',   image: 'assets/person.png' },
    '3': { id: '3', name: 'Carlos', image: 'assets/person.png' },
    '4': { id: '4', name: 'Daniel', image: 'assets/person.png' },
    '5': { id: '5', name: 'Jose', image: 'assets/person.png' },
    '6': { id: '6', name: 'Kevin', image: 'assets/person.png' },
    '7': { id: '7', name: 'Jorge', image: 'assets/person.png' },
    '8': { id: '8', name: 'Lucas', image: 'assets/person.png' },
  };

  /**
   * Mapa slotId → empleado o null.
   * slotId = `${day}-${index}`, p.e. "Lunes-0"
   */
  slotMap: Record<string, Employee | null> = {};

  constructor(private readonly cdr: ChangeDetectorRef) {
    // ---------- estado inicial ----------
    for (const day of this.weekDays) {
      for (let i = 0; i < MAX_SLOTS_PER_DAY; i++) {
        const slotId = `${day}-${i}`;
        this.slotMap[slotId] = null;                      // vacío por defecto
      }
    }
    // Colocamos a los 3 empleados iniciales
    this.slotMap['Lunes-0'] = this.employees['1'];
    this.slotMap['Lunes-1'] = this.employees['2'];
    this.slotMap['Martes-0'] = this.employees['3'];
    this.slotMap['Miercoles-0'] = this.employees['4'];
    this.slotMap['Miercoles-1'] = this.employees['5'];
    this.slotMap['Jueves-0'] = this.employees['6'];
    this.slotMap['Viernes-0'] = this.employees['7'];
    this.slotMap['Viernes-1'] = this.employees['8'];
  }

  ngAfterViewInit(): void {
    this.swapy = createSwapy(this.boardContainer.nativeElement, {
      animation: 'dynamic',
      autoScrollOnDrag: true
    });

    // Cuando Swapy termina un swap nos da el nuevo mapa slot→item (id):
    this.swapy.onSwap(evt => {
      const newObj = evt.newSlotItemMap.asObject as Record<string, string | undefined>;
      for (const slot of Object.keys(this.slotMap)) {
        const empId = newObj[slot];
        this.slotMap[slot] = empId ? this.employees[empId] : null;
      }
      // Angular OnPush / ChangeDetection
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy() {
    this.swapy?.destroy();
  }

  /** helper para el template */
  empAt(slotId: string) {
    return this.slotMap[slotId];
  }

  range(n = MAX_SLOTS_PER_DAY) {
    return Array.from({ length: n }, (_, i) => i);
  }
}
