import {
  Component, ChangeDetectorRef, NgZone, OnDestroy, ViewChild, ElementRef, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import html2canvas from 'html2canvas';

// Interfaces para modelar los datos
interface Employee { 
  id: string; 
  name: string; 
  image: string; 
  status: 'available' | 'busy' | 'on-leave'; // Estado del empleado
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
  imports: [CommonModule],
  templateUrl: './tablero.component.html',
  styleUrls: ['./tablero.component.scss']
})
export class TableroComponent implements OnDestroy, OnInit {
  @ViewChild('boardRef') boardRef!: ElementRef;

  // Título del horario
  title = '';

  // Estado del tablero
  boardState: BoardState;

  // Datos del elemento que se está arrastrando
  private dragData: DragData | null = null;

  // Catálogo de empleados
  private readonly employees: Record<string, Employee> = {
    '1': { id: '1', name: 'Daniel Picuasi',    image: 'assets/person.png', status: 'available' },
    '2': { id: '2', name: 'Danilo Cadena',   image: 'assets/person.png', status: 'available' },
    '3': { id: '3', name: 'Angelo Andy', image: 'assets/person.png', status: 'available' },
    '4': { id: '4', name: 'Darwin Aldas', image: 'assets/person.png', status: 'available' },
    '5': { id: '5', name: 'Roberto Guizado',   image: 'assets/person.png', status: 'available' },
    '6': { id: '6', name: 'Jorge Reyes',  image: 'assets/person.png', status: 'available' },
    '7': { id: '7', name: 'Rosa Llumigusin',  image: 'assets/person.png', status: 'available' },
    '8': { id: '8', name: 'Jorge Lucas',  image: 'assets/person.png', status: 'available' },
    '9': { id: '9', name: 'Kevin Suarez',  image: 'assets/person.png', status: 'available' },
    '10': { id: '10', name: 'Marlene Rivera',  image: 'assets/person.png', status: 'available' },
    '11': { id: '11', name: 'Laura Llangari',  image: 'assets/person.png', status: 'available' },
    '12': { id: '12', name: 'Diego Ramirez',  image: 'assets/person.png', status: 'available' },
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
    columnMap['Lunes'].items.push(this.employees['11'], this.employees['12']);
    columnMap['Martes'].items.push(this.employees['10']);
    columnMap['Miercoles'].items.push(this.employees['5'], this.employees['1'], this.employees['6'], this.employees['8'], this.employees['7'], this.employees['2'], this.employees['9']);
    columnMap['Jueves'].items.push(this.employees['4']);
    columnMap['Viernes'].items.push(this.employees['3']);

    this.boardState = {
      columnMap,
      orderedColumnIds: weekDays,
      lastOperation: null
    };
  }

  ngOnInit() {
    this.updateTitle();
  }

  /**
   * Actualiza el título con el rango de fechas de la próxima semana laboral (lunes a viernes)
   */
  updateTitle(): void {
    // Obtener la fecha actual
    const today = new Date();
    
    // Calcular el próximo lunes
    const nextMonday = new Date(today);
    const dayOfWeek = today.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
    
    // Ajustar para que el primer día sea lunes (no domingo como es por defecto en JS)
    const daysUntilNextMonday = (dayOfWeek === 0) ? 1 : (8 - dayOfWeek);
    nextMonday.setDate(today.getDate() + daysUntilNextMonday);
    
    // Calcular el próximo viernes (4 días después del lunes)
    const nextFriday = new Date(nextMonday);
    nextFriday.setDate(nextMonday.getDate() + 4);
    
    // Formatear las fechas en español
    const mondayFormatted = this.formatDateInSpanish(nextMonday);
    const fridayFormatted = this.formatDateInSpanish(nextFriday);
    
    // Actualizar el título
    this.title = `HORARIO DE DESARROLLO DEL ${mondayFormatted} AL ${fridayFormatted}`;
  }

  /**
   * Formatea una fecha en español con el formato "DD DE MES"
   */
  private formatDateInSpanish(date: Date): string {
    const day = date.getDate();
    const monthNames = [
      'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
      'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
    ];
    const month = monthNames[date.getMonth()];
    
    return `${day} DE ${month}`;
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

  // Captura el tablero como imagen y lo comparte por WhatsApp
  async captureAndShareBoard(): Promise<void> {
    try {
      // Mostrar un indicador de carga
      const loadingElement = document.createElement('div');
      loadingElement.className = 'loading-indicator';
      loadingElement.textContent = 'Capturando imagen...';
      document.body.appendChild(loadingElement);

      // Capturar el tablero como imagen
      const boardElement = this.boardRef.nativeElement;
      const canvas = await html2canvas(boardElement, {
        scale: 2, // Mayor calidad
        useCORS: true, // Permitir imágenes de otros dominios
        backgroundColor: '#f4f5f7' // Fondo del tablero
      });
      
      // Convertir el canvas a una imagen
      const imageData = canvas.toDataURL('image/png');
      
      // Crear un título para la imagen (fecha actual)
      const now = new Date();
      const dateStr = now.toLocaleDateString('es-ES');
      const timeStr = now.toLocaleTimeString('es-ES');
      const title = `Horario_${dateStr.replace(/\//g, '-')}_${timeStr.replace(/:/g, '-')}`;
      
      // Eliminar el indicador de carga
      document.body.removeChild(loadingElement);
      
      // Mostrar mensaje de éxito
      const successElement = document.createElement('div');
      successElement.className = 'success-message';
      successElement.textContent = 'Imagen capturada. Abriendo opciones de compartir...';
      document.body.appendChild(successElement);
      
      // Método 1: Intentar usar la API de compartir nativa si está disponible
      if (navigator.share && navigator.canShare) {
        try {
          // Convertir la imagen a un archivo
          const blob = this.dataURItoBlob(imageData);
          const file = new File([blob], `${title}.png`, { type: 'image/png' });
          
          // Verificar si podemos compartir archivos
          const shareData = {
            title: this.title,
            text: `${this.title}`,
            files: [file]
          };
          
          if (navigator.canShare(shareData)) {
            await navigator.share(shareData);
            document.body.removeChild(successElement);
            return;
          }
        } catch (shareError) {
          console.log('Error al usar la API de compartir:', shareError);
          // Continuar con el método alternativo
        }
      }
      
      // Método 2: Descargar la imagen y abrir WhatsApp con un mensaje
      const link = document.createElement('a');
      link.href = imageData;
      link.download = `${title}.png`;
      link.click();
      
      // Crear mensaje para compartir por WhatsApp
      const message = `${this.title}. Por favor, adjunta la imagen que acabo de descargar.`;
      
      // Número de teléfono para WhatsApp (vacío para abrir chat general)
      const phoneNumber = ''; // Puedes especificar un número aquí si lo deseas
      
      // Abrir WhatsApp
      const whatsappUrl = phoneNumber 
        ? `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`
        : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
      
      // Abrir WhatsApp en una nueva pestaña
      window.open(whatsappUrl, '_blank');
      
      // Eliminar el mensaje de éxito después de un breve retraso
      setTimeout(() => {
        document.body.removeChild(successElement);
      }, 2000);
      
    } catch (error) {
      console.error('Error al capturar el tablero:', error);
      alert('Hubo un error al capturar el tablero. Por favor, inténtalo de nuevo.');
    }
  }
  
  // Función auxiliar para convertir Data URI a Blob
  private dataURItoBlob(dataURI: string): Blob {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    
    return new Blob([ab], { type: mimeString });
  }
}
