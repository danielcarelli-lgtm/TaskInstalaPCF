# 📋 Manual de Usuario: Gestor Avanzado de Tareas y Recursos

Bienvenido al nuevo entorno interactivo para la gestión de proyectos y tareas. Esta herramienta ha sido diseñada para centralizar toda la operativa de tu proyecto: planificación temporal, estructuración de actividades, asignación de personal y gestión de materiales, todo desde una única pantalla, de forma visual, rápida y sin recargas innecesarias.

Este documento detalla todas las funcionalidades a tu disposición.

---

## 1. 👁️ Vistas Principales

La herramienta te permite alternar entre dos modos de visualización principales según el tipo de trabajo que estés realizando. En la esquina superior derecha encontrarás los botones **Lista** y **Gantt** para cambiar entre ellas al instante.

### 1.1 Vista de Lista (Grid)
Es la vista predeterminada. Actúa como un desglose tabular avanzado (WBS) y te permite ver el detalle de cada actividad.

* **Estructura Jerárquica y Ordenación (`#`):** Las tareas se ordenan automáticamente mediante un índice numérico (1.00, 1.01, 2.00...). Las tareas "padre" pueden expandirse (▶) o contraerse (▼) para mostrar u ocultar sus subtareas.
* **Visor Rápido de Materiales (📦):** Si el módulo de productos está activo, la columna con el icono de la caja te indicará cuántos materiales físicos están asignados a esa tarea. Al pasar el cursor sobre el número, se desplegará una tabla resumen detallando el modelo, el número de serie/ID y su estado (Pendiente, Instalado o Devuelto).
* **Columna de Equipo:** Visualiza rápidamente quién está trabajando en qué. Se muestran los avatares (Facepile) con las iniciales y colores únicos de cada técnico. Si el equipo es muy grande, se agrupará indicando un "+X más".
* **Ajuste de Dependencias:** Utiliza el menú desplegable en la columna "DEPENDENCIA" para establecer qué tarea debe completarse antes de empezar otra. El sistema filtrará automáticamente para evitar que selecciones la propia tarea o dependencias circulares obvias.
* **Control de Avance:**
  * Visualiza las horas de **Esfuerzo** frente a las **Imputadas**.
  * Revisa la barra visual de **Progreso**, que se llena de color en base al porcentaje de completitud.
  * Identifica bloqueos rápidamente mediante las píldoras de color en la columna **Estado**.

### 1.2 Vista Gantt
Ideal para la planificación temporal y la visión a largo plazo del proyecto.

* **Línea de Tiempo Interactiva:** Las tareas se dibujan como barras horizontales a lo largo de un calendario.
* **Niveles de Zoom Estratégico:** Utiliza los botones **Días**, **Semanas** o **Meses** para ajustar la escala del calendario. Útil para microgestión de instalaciones cortas o para vista de pájaro de proyectos de varios meses.
* **Ajuste de Fechas Visual:** Modifica el cronograma sin escribir números. Puedes hacer clic en el centro de una barra y moverla entera para desplazarla en el tiempo, o tirar de los bordes izquierdo/derecho para alargar o acortar su duración. Las fechas se guardarán automáticamente.
* **Actualización de Progreso Dinámica:** Dentro de cada barra verás un pequeño tirador triangular inferior. Arrástralo hacia la derecha para indicar visualmente el avance (%) de esa tarea.
* **Tooltips Informativos:** Al dejar el cursor quieto sobre la barra de una tarea, aparecerá una tarjeta flotante con el nombre completo, las fechas exactas de inicio/fin y su progreso actual.

---

## 2. 🖱️ Interacciones y "Drag & Drop" (Arrastrar y Soltar)

La pantalla entera está preparada para que trabajes arrastrando elementos de forma intuitiva.

* **Estructurar el Proyecto (Padres e Hijas):** 
  * Para convertir una tarea en subtarea, simplemente haz clic sobre ella en la vista de Lista, arrástrala y suéltala encima de la que quieras que sea su "Padre".
  * *Prevención de errores:* El sistema no permite jerarquías infinitas. Si intentas meter una tarea dentro de una subtarea (creando "nietos"), el sistema te bloqueará con una alerta para mantener el proyecto manejable a dos niveles.
* **Desvincular Tareas:** Si una tarea ya es una subtarea, verás una flecha gris (`↳`) justo antes de su nombre. Haciendo clic en esa flecha, la tarea se "liberará" de su padre y volverá a ser una tarea principal.
* **Apertura de Registros:** Si necesitas ver el detalle completo de una tarea (formularios, notas, adjuntos), haz doble clic sobre su barra en el Gantt, o haz clic en su nombre en color azul en la vista de Lista. Se abrirá una ventana superpuesta sin sacarte del planificador.

---

## 3. 🗂️ Paneles Laterales de Asignación de Recursos

Con los botones **👥 Equipo** y **📦 Productos** puedes abrir paneles laterales para distribuir tus recursos. Puedes tener uno abierto y seguir viendo tu Lista o tu Gantt.

### 3.1 Panel de Equipo (Usuarios)
Agiliza la creación de registros de "Miembros del Equipo".

* **Búsqueda Dinámica:** Dispone de un buscador en tiempo real. Empieza a escribir el nombre o correo de un técnico y la lista se filtrará instantáneamente.
* **Asignación Rápida:** Haz clic en la tarjeta de un usuario, arrástrala y suéltala sobre cualquier tarea. Verás que el avatar del usuario aparece inmediatamente en la fila de la tarea.
* **Validación Anti-Duplicados:** Si, por error, arrastras al mismo usuario dos veces a la misma tarea, la herramienta verificará la base de datos y te lanzará una alerta bloqueando la acción para evitar datos corruptos.

### 3.2 Panel de Productos (Materiales)
*Nota: Este panel solo aparecerá si el proyecto tiene el módulo de gestión de materiales activado.*

* **Filtros de Estado (Pendientes / Asignadas):** Usa los botones superiores del panel para ver qué materiales te faltan por ubicar ("Pendientes") y cuáles ya están bajo control en alguna actividad ("Asignadas").
* **Búsqueda Avanzada:** El buscador rastrea no solo por nombre de producto, sino también por el ID del fabricante o el Número de Serie del aparato físico.
* **Asignación Física:** Arrastra un material que esté "Pendiente" y suéltalo sobre la tarea en la que se vaya a montar. *(Aviso: No se pueden asignar productos a tareas "Padre" genéricas, debes asignarlos a las subtareas específicas que ejecutan el trabajo).*
* **Cambios de Estado con un Clic:** Dentro del panel, cada tarjeta de producto tiene botones de acción rápida:
  * **[Instalar]:** Cambia el estado del hardware de Pendiente a Instalado.
  * **[Liberar]:** Desvincula el material de la tarea y lo devuelve al cajón de "Pendientes" (útil si la pieza estaba defectuosa o hubo un error de planificación).

---

## 4. ⚙️ Acciones Generales y Automatizaciones

En la barra de herramientas superior tienes tres botones clave:

* **[+ Crear Tarea]:** Lanza un formulario rápido a la derecha de la pantalla. Rellena el nombre y las fechas, guárdalo, y la tarea aparecerá automáticamente en tu planificador.
* **[📊 Excel]:** Realiza un volcado instantáneo de tu pantalla. Descarga un archivo `.csv` con todas las tareas visibles, sus IDs, fechas, estados, dependencias y porcentajes de progreso. Perfecto para reportes rápidos a dirección.
* **[🔄 Refrescar]:** Recarga todos los datos del proyecto desde la base de datos principal, actualizando al mismo tiempo las tareas, los usuarios asignados y el stock de productos.

### 🤖 El "Cerebro" de la Herramienta (Cálculos Automáticos)
La herramienta incorpora una lógica de sincronización (Rollups) para ahorrarte trabajo de cálculo. Si una tarea principal contiene subtareas, la herramienta bloqueará la edición manual de la tarea principal y asumirá el control:
* **Márgenes de Fechas:** La fecha de "Inicio" del padre será siempre el día de inicio de su subtarea más temprana. La fecha de "Fin" será la de la subtarea que acabe más tarde.
* **Acumulación de Tiempos:** El "Esfuerzo" y las horas "Imputadas" del padre serán la suma exacta de todas sus hijas.
* **Progreso Real:** El "% de Progreso" de la tarea padre no es una media simple; es una media *ponderada* en base al esfuerzo. (Ej: Una subtarea completada al 100% que lleva 10 horas pesará mucho más en el avance general del proyecto que una completada al 100% que solo lleva 1 hora).

---

## 5. 🌍 Soporte Multi-Idioma
No necesitas configurar nada. La herramienta lee las preferencias de tu navegador y sesión de Dynamics 365, traduciendo instantáneamente todos los botones, fechas, títulos de columnas y alertas a **Español, Inglés o Portugués**, facilitando el trabajo en equipos internacionales.