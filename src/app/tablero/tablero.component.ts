import {
  Component, ChangeDetectorRef, NgZone, OnDestroy
} from '@angular/core';

// Interfaces para modelar los datos
interface Employee { 
  id: string; 
  name: string; 
  image: string; 
}

interface Column {
  id: string;
  title: string;
  items: Employee[];
}

interface ColumnMap {
  [key: string]: Column;
}

interface BoardState {
  columnMap: ColumnMap;
  orderedColumnIds: string[];
  lastOperation: Operation | null;
}

type Outcome =
  | {
      type: 'card-reorder';
      columnId: string;
      startIndex: number;
      finishIndex: number;
    }
  | {
      type: 'card-move';
      startColumnId: string;
      finishColumnId: string;
      itemIndexInStartColumn: number;
      itemIndexInFinishColumn: number;
    };

type Trigger = 'pointer' | 'keyboard';

interface Operation {
  trigger: Trigger;
  outcome: Outcome;
}

interface DragData {
  employeeId: string;
  sourceColumnId: string;
  sourceIndex: number;
}

@Component({
  selector: 'app-tablero',
  standalone: true,
  templateUrl: './tablero.component.html',
  styleUrls: ['./tablero.component.scss']
})
export class TableroComponent implements OnDestroy {
  // Estado del tablero
  boardState: BoardState;

  // Datos del elemento que se está arrastrando
  private dragData: DragData | null = null;

  // Catálogo de empleados
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

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly zone: NgZone,
  ) {
    // Inicializar el estado del tablero
    const columnMap: ColumnMap = {};
    const weekDays = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'];
    
    // Crear columnas para cada día de la semana
    weekDays.forEach(day => {
      columnMap[day] = {
        id: day,
        title: day,
        items: []
      };
    });

    // Asignar empleados a las columnas inicialmente
    columnMap['Lunes'].items.push(this.employees['1'], this.employees['2']);
    columnMap['Martes'].items.push(this.employees['3']);
    columnMap['Miercoles'].items.push(this.employees['4'], this.employees['5']);
    columnMap['Jueves'].items.push(this.employees['6']);
    columnMap['Viernes'].items.push(this.employees['7'], this.employees['8']);

    this.boardState = {
      columnMap,
      orderedColumnIds: weekDays,
      lastOperation: null
    };
  }

  ngOnDestroy(): void {
    // No hay nada que limpiar en esta implementación
  }

  // Evento que se dispara cuando se comienza a arrastrar un elemento
  onDragStart(event: DragEvent, employeeId: string, columnId: string, index: number): void {
    if (!event.dataTransfer) return;
    
    // Guardar información sobre el elemento que se está arrastrando
    this.dragData = {
      employeeId,
      sourceColumnId: columnId,
      sourceIndex: index
    };
    
    // Configurar el efecto de arrastre
    event.dataTransfer.effectAllowed = 'move';
    
    // Hacer que el elemento sea semitransparente durante el arrastre
    const target = event.target as HTMLElement;
    setTimeout(() => {
      target.style.opacity = '0.4';
    }, 0);
  }

  // Evento que se dispara cuando se termina de arrastrar un elemento
  onDragEnd(event: DragEvent): void {
    // Restaurar la opacidad del elemento
    const target = event.target as HTMLElement;
    target.style.opacity = '1';
  }

  // Evento que se dispara cuando se arrastra sobre un elemento
  onDragOver(event: DragEvent): void {
    // Prevenir el comportamiento predeterminado para permitir soltar
    event.preventDefault();
    
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  // Evento que se dispara cuando se suelta un elemento
  onDrop(event: DragEvent, targetColumnId: string): void {
    event.preventDefault();
    
    // Si no hay datos de arrastre, no hacer nada
    if (!this.dragData) return;
    
    const { employeeId, sourceColumnId, sourceIndex } = this.dragData;
    
    // Obtener el empleado que se está moviendo
    const employee = this.employees[employeeId];
    if (!employee) return;
    
    // Si es la misma columna, reordenar
    if (sourceColumnId === targetColumnId) {
      this.reorderCard(sourceColumnId, sourceIndex, this.boardState.columnMap[targetColumnId].items.length);
    } else {
      // Si es una columna diferente, mover
      this.moveCard(
        sourceColumnId, 
        targetColumnId, 
        sourceIndex, 
        this.boardState.columnMap[targetColumnId].items.length
      );
    }
    
    // Limpiar los datos de arrastre
    this.dragData = null;
  }

  // Reordena una tarjeta dentro de una columna
  reorderCard(columnId: string, startIndex: number, finishIndex: number, trigger: Trigger = 'pointer'): void {
    const column = this.boardState.columnMap[columnId];
    const items = [...column.items];
    const [removed] = items.splice(startIndex, 1);
    items.splice(finishIndex, 0, removed);

    this.boardState.columnMap[columnId].items = items;
    this.boardState.lastOperation = {
      trigger,
      outcome: {
        type: 'card-reorder',
        columnId,
        startIndex,
        finishIndex
      }
    };

    this.cdr.detectChanges();
  }

  // Mueve una tarjeta de una columna a otra
  moveCard(
    startColumnId: string, 
    finishColumnId: string, 
    itemIndexInStartColumn: number, 
    itemIndexInFinishColumn: number, 
    trigger: Trigger = 'pointer'
  ): void {
    const sourceColumn = this.boardState.columnMap[startColumnId];
    const destinationColumn = this.boardState.columnMap[finishColumnId];
    
    // No hacer nada si es la misma columna
    if (startColumnId === finishColumnId) return;

    // Obtener el elemento a mover
    const item = sourceColumn.items[itemIndexInStartColumn];
    
    // Eliminar de la columna de origen
    sourceColumn.items = sourceColumn.items.filter((_, i) => i !== itemIndexInStartColumn);
    
    // Añadir a la columna de destino
    const destinationItems = [...destinationColumn.items];
    destinationItems.splice(itemIndexInFinishColumn, 0, item);
    destinationColumn.items = destinationItems;

    this.boardState.lastOperation = {
      trigger,
      outcome: {
        type: 'card-move',
        startColumnId,
        finishColumnId,
        itemIndexInStartColumn,
        itemIndexInFinishColumn
      }
    };

    this.cdr.detectChanges();
  }

  // Helpers para la plantilla
  getColumns(): Column[] {
    return this.boardState.orderedColumnIds.map(id => this.boardState.columnMap[id]);
  }
}
