import {
  AfterViewInit, ChangeDetectorRef, Component,
  ElementRef, NgZone, OnDestroy, ViewChild
} from '@angular/core';
import { createSwapy, type Swapy } from 'swapy';

interface Employee { id: string; name: string; image: string; }
const MAX_SLOTS_PER_DAY = 8;

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

  /** catálogo de empleados */
  private readonly employees: Record<string, Employee> = {
    '1': { id: '1', name: 'Ana',    image: 'assets/person.png' },
    '2': { id: '2', name: 'Luis',   image: 'assets/person.png' },
    '3': { id: '3', name: 'Carlos', image: 'assets/person.png' },
    '4': { id: '4', name: 'Daniel', image: 'assets/person.png' },
    '5': { id: '5', name: 'Jose',   image: 'assets/person.png' },
    '6': { id: '6', name: 'Kevin',  image: 'assets/person.png' },
    '7': { id: '7', name: 'Jorge',  image: 'assets/person.png' },
    '8': { id: '8', name: 'Lucas',  image: 'assets/person.png' },
  };

  /** slotId → empleado */
  slotMap: Record<string, Employee | null> = {};

  /** rango fijo para no crear arrays nuevos en cada CD */
  readonly slots = Array.from({ length: MAX_SLOTS_PER_DAY }, (_, i) => i);

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly zone: NgZone,
  ) {
    // -------- estado inicial ----------
    for (const d of this.weekDays) {
      for (let i = 0; i < MAX_SLOTS_PER_DAY; i++) {
        this.slotMap[`${d}-${i}`] = null;
      }
    }

    this.slotMap['Lunes-0']     = this.employees['1'];
    this.slotMap['Lunes-1']     = this.employees['2'];
    this.slotMap['Martes-0']    = this.employees['3'];
    this.slotMap['Miercoles-0'] = this.employees['4'];
    this.slotMap['Miercoles-1'] = this.employees['5'];
    this.slotMap['Jueves-0']    = this.employees['6'];
    this.slotMap['Viernes-0']   = this.employees['7'];
    this.slotMap['Viernes-1']   = this.employees['8'];
  }

  ngAfterViewInit(): void {
    this.swapy = createSwapy(this.boardContainer.nativeElement, {
      animation: 'dynamic',
      autoScrollOnDrag: true
    });

    // ► 1. usamos onSwapEnd
    this.swapy.onSwapEnd(({ slotItemMap, hasChanged }) => {
      if (!hasChanged) return;          // click sin mover

      // ► 2. diferimos la actualización un frame
      requestAnimationFrame(() => {
        const obj = slotItemMap.asObject as Record<string, string | undefined>;

        Object.keys(this.slotMap).forEach(slotId => {
          const empId = obj[slotId];
          this.slotMap[slotId] = empId ? this.employees[empId] : null;
        });

        // dentro de zona de Angular para que refresque vista
        this.zone.run(() => {
          this.cdr.detectChanges();
          // ► 3. pedimos a Swapy que re‑escanee
          this.swapy.update();
        });
      });
    });
  }

  ngOnDestroy(): void {
    this.swapy?.destroy();
  }

  /* helpers para la plantilla */
  empAt(slotId: string) { return this.slotMap[slotId]; }
}
