# WorkScheduleBoard

Un tablero de programación de horarios para múltiples equipos desarrollado con Angular. Permite gestionar y visualizar la distribución de empleados en diferentes días de la semana, con soporte para equipos de Desarrollo e Infraestructura.

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 18.2.11.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Funcionalidad Multi-Equipo

Esta aplicación permite gestionar horarios para múltiples equipos:

- **Selector de Equipos**: Botones circulares en la esquina inferior derecha (D para Desarrollo, I para Infraestructura)
- **Rutas Dinámicas**: Acceso a cada equipo mediante rutas específicas (`/team/dev` y `/team/infra`)
- **Datos Independientes**: Cada equipo mantiene su propio conjunto de empleados y distribución
- **Interfaz Unificada**: Mismo diseño y funcionalidad para todos los equipos
- **Modo Oscuro**: Compatible con el selector de equipos y toda la interfaz

## Despliegue con Docker

Para desplegar la aplicación usando Docker:

```bash
# Construir la aplicación
ng build

# Construir la imagen Docker
docker build -t work-schedule-board .

# Ejecutar el contenedor
docker run -p 8080:80 work-schedule-board
```

Luego accede a la aplicación en `http://localhost:8080`
