import {
  Component, ChangeDetectorRef, NgZone, OnDestroy, ViewChild, ElementRef, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import html2canvas from 'html2canvas';

// Interfaces para modelar los datos
interface Employee { 
  id: string; 
  name: string; 
  image: string; 
  status: 'available' | 'on-leave'; // Estado del empleado (disponible o ausente)
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
  imports: [CommonModule, RouterModule],
  templateUrl: './tablero.component.html',
  styleUrls: ['./tablero.component.scss']
})
export class TableroComponent implements OnDestroy, OnInit {
  isDarkMode = false;

  @ViewChild('boardRef') boardRef!: ElementRef;

  // Título del horario
  title = '';

  // Estado del tablero
  boardState: BoardState;

  // ID del menú contextual activo
  activeMenuId: string | null = null;

  // Datos del elemento que se está arrastrando
  private dragData: DragData | null = null;

  // Nombre del equipo actual
  currentTeam: string = 'dev';
  teamTitle: string = 'Desarrollo';
  
  // Catálogo de empleados por equipo
  private readonly teamEmployees: Record<string, Record<string, Employee>> = {
    'dev': {
      '1': { id: '1', name: 'Daniel Picuasi',    image: 'assets/images/daniel.jpg', status: 'available' },
      '2': { id: '2', name: 'Danilo Cadena',   image: 'assets/images/danilo.jpg', status: 'available' },
      '3': { id: '3', name: 'Angelo Andy', image: 'assets/images/angelo.jpg', status: 'available' },
      '4': { id: '4', name: 'Darwin Aldas', image: 'assets/images/darwin.jpg', status: 'available' },
      '5': { id: '5', name: 'Roberto Guizado',   image: 'assets/images/roberto.jpg', status: 'available' },
      '6': { id: '6', name: 'Jorge Reyes',  image: 'assets/images/jorger.jpg', status: 'available' },
      '7': { id: '7', name: 'Rosa Llumigusin',  image: 'assets/images/rosita.jpg', status: 'available' },
      '8': { id: '8', name: 'Jorge Lucas',  image: 'assets/images/jorgel.jpg', status: 'available' },
      '9': { id: '9', name: 'Kevin Suarez',  image: 'assets/images/kevin.jpg', status: 'available' },
      '10': { id: '10', name: 'Marlene Rivera',  image: 'assets/images/marlene.jpg', status: 'available' },
      '11': { id: '11', name: 'Laura Llangari',  image: 'assets/images/laurita.jpg', status: 'available' },
      '12': { id: '12', name: 'Diego Ramirez',  image: 'assets/images/diego.jpg', status: 'available' },
    },
    'infra': {
      '101': { id: '101', name: 'Jacqueline Espinoza',    image: 'assets/images/infra/jacquita.jpg', status: 'available' },
      '102': { id: '102', name: 'Andres Garzón',   image: 'assets/images/infra/andres.jpg', status: 'available' },
      '103': { id: '103', name: 'Carlos Carbo', image: 'assets/images/infra/carlos.jpg', status: 'available' },
      '104': { id: '104', name: 'Haydee Rodriguez', image: 'assets/images/infra/haydee.jpg', status: 'available' },
      '105': { id: '105', name: 'Bryan Morales',   image: 'assets/images/infra/bryan.jpg', status: 'available' },
      '106': { id: '106', name: 'Roberto Freire',  image: 'assets/images/infra/robertof.jpg', status: 'available' },
      '107': { id: '107', name: 'Nestor Jaime',  image: 'assets/images/infra/nestor.jpg', status: 'available' },
      '108': { id: '108', name: 'Rolando Guaman',  image: 'assets/images/infra/rolando.jpg', status: 'available' },
      '109': { id: '109', name: 'Esteban Pérez',  image: 'assets/images/infra/esteban.jpg', status: 'available' },
      '110': { id: '110', name: 'Solansh Cornejo',  image: 'assets/images/default.jpg', status: 'available' },
      '111': { id: '111', name: 'Jessica Granizo',  image: 'assets/images/infra/jessy.jpg', status: 'available' },
    }
  };
  
  // Empleados del equipo actual
  private employees: Record<string, Employee> = {};

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly zone: NgZone,
    private readonly route: ActivatedRoute
  ) {
    // El estado del tablero se inicializará en ngOnInit cuando tengamos el parámetro de equipo
    this.boardState = {
      columnMap: {},
      orderedColumnIds: [],
      lastOperation: null
    };
  }

  ngOnInit(): void {
    // Detectar si ya hay un modo oscuro activo
    this.isDarkMode = document.body.classList.contains('dark-mode');
    
    // Obtener el parámetro de equipo de la URL y suscribirse a cambios
    this.route.paramMap.subscribe(params => {
      const teamId = params.get('teamId');
      
      // Verificar si el equipo existe, si no, usar 'dev' por defecto
      if (teamId && this.teamEmployees[teamId]) {
        this.currentTeam = teamId;
      } else {
        this.currentTeam = 'dev';
      }
      
      console.log('Equipo cambiado a:', this.currentTeam);
      
      // Establecer el título del equipo
      this.teamTitle = this.currentTeam === 'dev' ? 'Desarrollo' : 'Infraestructura';
      
      // Cargar los empleados del equipo seleccionado
      this.employees = {...this.teamEmployees[this.currentTeam]};
      
      // Inicializar el estado del tablero
      this.initializeBoardState();
      
      // Actualizar el título con el rango de fechas
      this.updateTitle();
      
      // Forzar la detección de cambios
      this.cdr.detectChanges();
    });
  }
  
  // Inicializar el estado del tablero con los empleados del equipo seleccionado
  private initializeBoardState(): void {
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

    // Distribución inicial de empleados para el equipo de desarrollo
    if (this.currentTeam === 'dev') {
      columnMap['Lunes'].items.push(this.employees['11'], this.employees['12']);
      columnMap['Martes'].items.push(this.employees['10']);
      columnMap['Miercoles'].items.push(this.employees['5'], this.employees['1'], this.employees['6'], 
                                      this.employees['8'], this.employees['7'], this.employees['2'], 
                                      this.employees['9']);
      columnMap['Jueves'].items.push(this.employees['4']);
      columnMap['Viernes'].items.push(this.employees['3']);
    } 
    // Distribución inicial de empleados para el equipo de infraestructura
    else if (this.currentTeam === 'infra') {
      columnMap['Lunes'].items.push(this.employees['101'], this.employees['102']);
      columnMap['Martes'].items.push(this.employees['103'], this.employees['104']);
      columnMap['Miercoles'].items.push(this.employees['105']);
      columnMap['Jueves'].items.push(this.employees['106'], this.employees['107'], this.employees['111']);
      columnMap['Viernes'].items.push(this.employees['108'],this.employees['109'],this.employees['110']);
    }

    this.boardState = {
      columnMap,
      orderedColumnIds: weekDays,
      lastOperation: null
    };
  }

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    if (this.isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }
  
  // Método para cambiar entre equipos
  switchTeam(teamId: string): void {
    if (this.currentTeam !== teamId && this.teamEmployees[teamId]) {
      console.log(`Cambiando de equipo: ${this.currentTeam} -> ${teamId}`);
      
      // Actualizar la URL sin recargar la página
      history.pushState({}, '', `/team/${teamId}`);
      
      // Actualizar el estado del componente
      this.currentTeam = teamId;
      this.teamTitle = this.currentTeam === 'dev' ? 'Desarrollo' : 'Infraestructura';
      
      // Crear una copia nueva del objeto de empleados para forzar la detección de cambios
      this.employees = {...this.teamEmployees[this.currentTeam]};
      
      // Reinicializar el estado del tablero con los nuevos empleados
      this.initializeBoardState();
      
      // Actualizar el título
      this.updateTitle();
      
      // Forzar la detección de cambios
      this.cdr.detectChanges();
      
      console.log('Empleados cargados:', Object.keys(this.employees).length);
    }
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
    
    // Actualizar el título con "HORARIO PRESENCIAL" y el rango de fechas
    this.title = `HORARIO PRESENCIAL DEL ${mondayFormatted} AL ${fridayFormatted}`;
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

  // Mostrar/ocultar el menú contextual
  toggleMenu(event: MouseEvent, employeeId: string, columnId: string): void {
    event.stopPropagation(); // Evitar que el evento se propague y active el drag
    event.preventDefault(); // Prevenir comportamiento por defecto
    
    console.log('Toggle menu clicked for employee:', employeeId);
    
    // Si el menú ya está abierto para este empleado, cerrarlo
    if (this.activeMenuId === employeeId) {
      console.log('Closing menu for employee:', employeeId);
      this.activeMenuId = null;
      // Eliminar cualquier menú flotante que pudiera existir
      const existingFloatingMenu = document.getElementById('floating-context-menu');
      if (existingFloatingMenu) {
        document.body.removeChild(existingFloatingMenu);
      }
    } else {
      // Si no, abrir el menú para este empleado
      console.log('Opening menu for employee:', employeeId);
      this.activeMenuId = employeeId;
      
      // Eliminar cualquier menú flotante existente
      const existingFloatingMenu = document.getElementById('floating-context-menu');
      if (existingFloatingMenu) {
        document.body.removeChild(existingFloatingMenu);
      }
      
      // Obtener el empleado y su estado
      const employee = this.findEmployeeById(employeeId, columnId);
      if (!employee) {
        console.error('Employee not found:', employeeId);
        return;
      }
      
      console.log('Employee found:', employee);
      const isAvailable = employee.status === 'available';
      
      // Crear un nuevo menú flotante
      const menuButton = event.currentTarget as HTMLElement;
      const buttonRect = menuButton.getBoundingClientRect();
      
      // Crear un nuevo elemento para el menú contextual
      const floatingMenu = document.createElement('div');
      floatingMenu.id = 'floating-context-menu';
      floatingMenu.setAttribute('data-employee-id', employeeId);
      
      // Aplicar estilos directamente al menú
      Object.assign(floatingMenu.style, {
        position: 'fixed',
        background: document.body.classList.contains('dark-mode') ? '#23272f' : 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
        minWidth: '180px',
        zIndex: '99999',
        display: 'block',
        overflow: 'hidden',
        pointerEvents: 'auto',
        fontFamily: '"Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        border: document.body.classList.contains('dark-mode') ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)'
      });
      
      // Crear el contenido del menú
      const menuItem = document.createElement('div');
      
      // Aplicar estilos directamente al elemento del menú
      Object.assign(menuItem.style, {
        padding: '10px 16px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap',
        fontSize: '14px',
        color: document.body.classList.contains('dark-mode') ? '#e0e0e0' : '#333',
        display: 'flex',
        alignItems: 'center',
        backgroundColor: document.body.classList.contains('dark-mode') ? '#23272f' : 'white'
      });
      
      // Agregar evento hover
      menuItem.addEventListener('mouseover', () => {
        menuItem.style.backgroundColor = document.body.classList.contains('dark-mode') ? '#2c313a' : '#f5f5f5';
      });
      
      menuItem.addEventListener('mouseout', () => {
        menuItem.style.backgroundColor = document.body.classList.contains('dark-mode') ? '#23272f' : 'white';
      });
      
      // Crear el texto directamente
      menuItem.textContent = isAvailable ? 'Marcar como Ausente' : 'Marcar como Disponible';
      
      // Agregar evento al elemento del menú
      menuItem.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('Menu item clicked, toggling status');
        this.toggleEmployeeStatus(employeeId, columnId);
      });
      
      // Agregar el elemento al menú
      floatingMenu.appendChild(menuItem);
      
      // Calcular la posición del menú
      const menuTop = buttonRect.bottom + window.scrollY;
      const menuLeft = Math.max(0, buttonRect.right - 180 + window.scrollX); // 180px es el ancho mínimo del menú
      
      // Aplicar estilos de posición
      floatingMenu.style.position = 'fixed';
      floatingMenu.style.top = `${menuTop}px`;
      floatingMenu.style.left = `${menuLeft}px`;
      floatingMenu.style.zIndex = '99999';
      floatingMenu.style.display = 'block'; // Asegurarse de que sea visible
      floatingMenu.style.padding = '4px 0'; // Agregar un poco de padding vertical
      
      // Agregar el menú al body del documento
      document.body.appendChild(floatingMenu);
      console.log('Menu added to body:', floatingMenu);
      
      // Agregar un listener para cerrar el menú cuando se haga clic en cualquier parte
      const closeMenu = (e: MouseEvent) => {
        const clickTarget = e.target as HTMLElement;
        const isMenuButton = menuButton.contains(clickTarget);
        const isMenuOrChild = floatingMenu.contains(clickTarget);
        
        console.log('Click detected, isMenuButton:', isMenuButton, 'isMenuOrChild:', isMenuOrChild);
        
        if (!isMenuOrChild && !isMenuButton) {
          console.log('Click outside menu, closing');
          this.activeMenuId = null;
          if (document.body.contains(floatingMenu)) {
            document.body.removeChild(floatingMenu);
          }
          document.removeEventListener('click', closeMenu);
          this.cdr.detectChanges();
        }
      };
      
      // Agregar el listener con un pequeño retraso para evitar que se active inmediatamente
      setTimeout(() => {
        document.addEventListener('click', closeMenu);
      }, 100);
    }
  }
  
  // Método auxiliar para encontrar un empleado por ID
  private findEmployeeById(employeeId: string, columnId: string): Employee | null {
    const column = this.boardState.columnMap[columnId];
    if (column) {
      const employee = column.items.find(item => item.id === employeeId);
      return employee || null;
    }
    return null;
  }

  // Cambiar el estado del empleado entre 'available' y 'on-leave'
  toggleEmployeeStatus(employeeId: string, columnId: string): void {
    // Encontrar el índice del empleado en la columna
    const columnItems = this.boardState.columnMap[columnId].items;
    const employeeIndex = columnItems.findIndex(emp => emp.id === employeeId);
    
    if (employeeIndex !== -1) {
      // Obtener el empleado
      const employee = columnItems[employeeIndex];
      
      // Cambiar el estado
      const newStatus = employee.status === 'available' ? 'on-leave' : 'available';
      
      // Actualizar el estado en la columna
      columnItems[employeeIndex] = {
        ...employee,
        status: newStatus
      };
      
      // Actualizar también en el catálogo de empleados
      if (this.employees[employeeId]) {
        this.employees[employeeId].status = newStatus;
      }
      
      // Cerrar el menú contextual
      this.activeMenuId = null;
      
      // Eliminar el menú flotante si existe
      const floatingMenu = document.getElementById('floating-context-menu');
      if (floatingMenu && document.body.contains(floatingMenu)) {
        document.body.removeChild(floatingMenu);
      }
      
      // Forzar la actualización de la vista
      this.cdr.detectChanges();
    }
  }
}
