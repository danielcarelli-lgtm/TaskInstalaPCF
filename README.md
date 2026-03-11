# PCF Gantt Task Manager para Power Apps

Un control personalizado (PCF - Power Apps Component Framework) diseñado para revolucionar la gestión de proyectos dentro de Microsoft Dataverse / Power Apps. Proporciona una vista dual que combina una **Cuadrícula Interactiva** (Grid) y un **Diagrama de Gantt** dinámico.



## 🚀 Características Principales

* **Vista Dual (Lista / Gantt):** Alterna sin problemas entre una vista tabular detallada y un diagrama temporal interactivo.
* **Jerarquía de Tareas (Padre e Hijo):** Soporte nativo para subtareas. Visualización anidada con expansores (collapsible rows) y jerarquización visual mediante colores (padres en blanco, hijos en gris).
* **Rollups Dinámicos Automáticos:** Si activas la dependencia de fechas, las tareas "Padre" calculan automáticamente su información basándose en sus "Hijos":
  * **Fechas:** Adoptan la fecha de inicio mínima y la fecha de fin máxima.
  * **Horas:** Suman automáticamente el "Esfuerzo Estimado" y las "Horas Imputadas".
  * **Progreso Ponderado:** Calculan su porcentaje de progreso basándose en el esfuerzo real de cada subtarea, proporcionando métricas de avance 100% reales.
* **Gestión Drag & Drop (Arrastrar y Soltar):** Agrupa tareas simplemente arrastrando una fila sobre otra para convertirla en subtarea.
* **Dependencias Visuales:** Mapeo de dependencias entre tareas, representadas visualmente en el Gantt con líneas rojas punteadas.
* **Integración WebAPI (Facepile):** Consulta asíncrona a Dataverse para mostrar los avatares (iniciales con colores) de los miembros del equipo asignados a cada tarea.
* **Exportación a Excel:** Botón integrado para descargar la vista actual en formato CSV con un solo clic.

## 🛠 Arquitectura y Notas Técnicas

Este componente está construido utilizando React y la librería `gantt-task-react`. 

**Aislamiento de Hooks (Standard Control):**
A diferencia de muchos PCF modernos que usan el modo `virtual`, este control está explícitamente configurado como `standard` utilizando su propia instancia de `ReactDOM`. Esta decisión arquitectónica se tomó para evitar un conflicto conocido ("Invalid hook call") entre los Hooks nativos requeridos por la librería del diagrama de Gantt y el empaquetado interno de React que inyecta el entorno de ejecución de Dataverse. Gracias a esto, el componente es 100% estable y resistente a pantallas en blanco.

## 📦 Instalación y Despliegue

### Requisitos Previos
* [Node.js](https://nodejs.org/)
* [Microsoft Power Platform CLI](https://docs.microsoft.com/en-us/powerapps/developer/data-platform/powerapps-cli)

### Pasos
1. Clona el repositorio:
   ```bash
   git clone [https://github.com/tu-usuario/pcf-gantt-task.git](https://github.com/tu-usuario/pcf-gantt-task.git)
   cd pcf-gantt-task
