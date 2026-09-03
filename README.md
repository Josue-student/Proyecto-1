# Grupo Pana — Gestión Digital SST
## Permiso de ejecución de trabajo en caliente (MVP, rev. 02)

Aplicativo web para gestionar el permiso desde el celular: identificación, descripción del trabajo, personal autorizado, condiciones del área, controles, EPP, exposición, autorización, vigencia, suspensión, cierre y documento digital. Funciona sin conexión y sin servidor.

---

## 1. Cómo ejecutarlo

### Opción A — abrir el archivo directamente

Copia la carpeta completa y haz doble clic en `index.html`. El HTML necesita sus carpetas hermanas (`css/`, `js/`, `data/`, `assets/`): si lo sacas de la carpeta, no carga nada.

En Chrome, IndexedDB no está disponible bajo `file://` y el aplicativo cambia solo a `localStorage`; el pie de página indica qué motor está usando. La instalación como aplicación no funciona en este modo.

### Opción B — servidor local (recomendada para la demostración)

```bash
python -m http.server 8080
```

y abre `http://localhost:8080`. Para probar desde el celular en la misma red, usa la IP de la computadora (`http://192.168.x.x:8080`).

### Opción C — publicarlo para uso en piso

Cualquier hosting estático con HTTPS: GitHub Pages, Netlify, Cloudflare Pages o un IIS/Apache interno. Con HTTPS el navegador ofrece **Agregar a la pantalla de inicio** y el permiso se registra sin conexión.

**Dependencias a instalar: ninguna.** jsPDF 2.5.2 (licencia MIT) está incluido en `assets/vendor/`.

---

## 2. Qué cambió respecto de la primera versión

La versión anterior era, en la práctica, datos → checklist → firma → PDF. Esta representa el ciclo de vida de un permiso:

```
IDENTIFICACIÓN → DESCRIPCIÓN → PERSONAL → CONDICIONES DEL ÁREA →
CONTROLES → VERIFICACIÓN → AUTORIZACIÓN → VIGENCIA →
(SUSPENSIÓN) → CIERRE → REGISTRO DIGITAL
```

La checklist sigue existiendo, pero como herramienta de verificación dentro del permiso, no como concepto central.

Se conservan sin cambios la arquitectura, el diseño visual, la navegación móvil, el almacenamiento abstracto, las firmas en canvas, las fotografías, el historial y la generación de PDF en el navegador.

Cambios de fondo:

- **Controles dinámicos.** El tipo de trabajo decide qué se verifica: soldadura eléctrica, oxigás o esmerilado. La protección contra incendios se verifica siempre. Ya no se muestra una lista universal.
- **Tres niveles de exigencia** en lugar de crítico/no crítico: crítico bloquea la autorización, requerido debe completarse y obliga a registrar la medida, informativo solo queda como registro.
- **Condiciones del área con respuestas reales.** Materiales combustibles se responde con cuatro estados (no existen, retirados, protegidos, requieren control adicional), y las preguntas encadenan su control: si hay personas próximas, aparece la pregunta por la pantalla o barrera.
- **Personal autorizado** como sección propia, con varios trabajadores, supervisor, vigía y confirmación de conocimiento de riesgos.
- **EPP contextual**, sugerido según el trabajo elegido, con la advertencia de que es la última barrera de la jerarquía de controles.
- **Exposición ocupacional** como registro breve: qué agentes pueden estar presentes y si existe evaluación aplicable. No es un formulario de monitoreo diario.
- **Condiciones especiales**: trabajo sobre recipiente que contuvo inflamables y espacio confinado, cada uno con sus controles y sin construir un procedimiento de espacios confinados dentro del MVP.
- **Vigencia explícita, sin plazo inventado.** La duración la define el responsable; el aplicativo no impone doce horas. Un permiso autorizado cuyo plazo terminó se muestra como vencido.
- **Suspensión y cierre** como parte del ciclo, con motivo, responsable, firma y bitácora de estados.

---

## 3. Postura frente a la norma

El permiso se estructuró tomando como contexto la Ley 29783, el D.S. 005-2012-TR, el D.S. 42-F y la R.M. 375-2008-TR. Tres decisiones deliberadas:

**Cada requisito declara su origen.** En la interfaz y en el PDF, los controles aparecen marcados como `D.S. 42-F` o `Estándar interno`. Los requisitos de soldadura eléctrica (puesta a tierra, portaelectrodo, protección de partes conductoras), los de cilindros y equipo oxigás, y los del trabajo sobre recipientes que contuvieron inflamables se recogen del D.S. 42-F. La disponibilidad del extintor en el punto de trabajo se trata como estándar interno de Grupo Pana, no como exigencia textual de la norma para todo trabajo en caliente.

**El PETAR no sustituye al monitoreo ocupacional.** El paso de exposición registra los agentes previsibles y si existe evaluación aplicable al puesto o tarea. La R.M. 375-2008-TR fija criterios de evaluación; no obliga a medir ruido o estrés térmico antes de cada permiso.

**No se importaron formatos de minería ni construcción.** Solo está lo que corresponde a un taller automotriz que ejecuta trabajos en caliente.

Todo lo marcado como interno es provisional: queda por validar con SST de Grupo Pana.

---

## 4. Reglas de bloqueo

| Nivel | Efecto |
|---|---|
| Crítico | Un "No" impide autorizar. El resumen muestra qué control falló y ofrece registrar el permiso como no autorizado. |
| Requerido | Debe responderse. Un "No" exige describir la medida adoptada en observaciones antes de avanzar. |
| Informativo | Queda como registro y nunca detiene el permiso. |

El nivel se declara por control en `data/config.js`:

```javascript
{ id: 'ext_disponible', label: 'Extintor disponible en el punto de trabajo',
  nivel: 'critico', origen: 'interno' }
```

Cambiar la exigencia de un control es cambiar esa palabra. La interfaz, las validaciones, el semáforo y el PDF se ajustan solos.

También bloquea la autorización una vigencia ya vencida.

---

## 5. Estados del permiso

`BORRADOR` → `PENDIENTE` → `AUTORIZADO` → `CERRADO`, con `SUSPENDIDO`, `VENCIDO` y `NO_AUTORIZADO` como desvíos. Cada cambio queda en la bitácora con fecha, hora, usuario y comentario.

El vencimiento no requiere que nadie abra el aplicativo: al listar o abrir un permiso autorizado cuyo plazo terminó, el sistema lo marca como vencido y lo registra en la bitácora. La reanudación tras una suspensión exige que no haya controles críticos incumplidos ni plazo vencido.

---

## 6. Arquitectura

```
INTERFAZ (index.html + css/styles.css + js/app.js + js/ui.js)
        │  pantallas, formulario por pasos, firma, cámara
        ↓
LÓGICA (js/petar.js + js/validation.js + data/config.js)
        │  ciclo de vida, controles aplicables, exigencia, vigencia
        ↓
ALMACENAMIENTO (js/storage.js)
        │  savePetar · getPetar · getAllPetar · updatePetar · deletePetar
        │  IndexedDB → respaldo automático en localStorage
        ↓
DOCUMENTO (js/pdf.js)
           PDF A4 generado en el navegador
```

### Estructura de archivos

```
/index.html                  Estructura y carga de scripts
/manifest.webmanifest        Instalación como aplicación
/sw.js                       Service worker (uso sin conexión)
/css/styles.css              Sistema visual completo
/js/app.js                   Pantallas, navegación, autoguardado
/js/ui.js                    Avisos, diálogos, firma en canvas, fotos
/js/storage.js               Capa de datos (única puerta a la persistencia)
/js/petar.js                 Modelo del permiso, conformidad, vigencia, estados
/js/validation.js            Reglas y mensajes por paso, bloqueos y cierre
/js/pdf.js                   Documento oficial
/data/config.js              Secciones, controles, catálogos y exigencia
/assets/vendor/              jsPDF
/assets/icons/               Iconos de la aplicación
```

### Modelo de datos

```js
{
  id, numero, estado, creadoEn, actualizadoEn, usuario,
  identificacion: { fecha, area, subarea, ubicacion, empresa,
                    responsableTrabajo, solicitante },
  trabajo:     { tipos: [], otroTipo, descripcion, equipos: [], elemento },
  personal:    { trabajadores: [], supervisor, vigia: { requiere, nombre },
                 confirmacion },
  condiciones: { combustibles: 'retirados', chispas: 'si',
                 chispas_medida: ['Pantalla'] },
  controles:   { incendio: { ext_disponible: 'si' }, oxigas: {...} },
  epp:         { ocular: 'si' },
  exposicion:  { agentes: [], evaluacion, fechaEvaluacion, resultado, control },
  especiales:  { recipiente, recipienteInflamables, recipienteControles,
                 confinado, confinadoControles },
  observaciones, fotos: [],
  vigencia:    { inicioFecha, inicioHora, finFecha, finHora },
  autorizacion:{ ejecutor: {...}, autorizante: {...}, sst: {...} },
  suspension:  { fechaHora, usuario, motivo, detalle },
  cierre:      { checklist, fechaHora, responsable, firma, comentario },
  historialEstados: []
}
```

### Firma de SST

`config.firmas` define quién firma. Hoy están activas la del responsable de la ejecución y la de quien autoriza; la de SST existe con `activa: false`, porque no se asume que SST deba firmar cada permiso hasta que Grupo Pana lo defina. Activarla es cambiar ese valor: la interfaz añade el bloque de firma, la validación lo exige si además se marca `requerida`, y el PDF reparte el espacio entre las firmas activas.

### Integración futura

`Store.toRow(petar)` convierte cada permiso en un registro plano de 35 columnas, y el botón **Exportar CSV** del historial usa esa misma función.

```
APLICATIVO WEB → API propia → GOOGLE SHEETS → registro histórico
APLICATIVO WEB → Power Automate / Graph → EXCEL / SHAREPOINT
```

El envío se hace desde un backend, nunca con credenciales en el navegador. El punto de conexión está marcado en `storage.js`.

---

## 7. Funcionalidades implementadas

- Selección de responsable, correlativo anual automático y autoguardado con aviso de cambios guardados.
- Formulario en nueve pasos con barra de progreso y validación por paso en lenguaje claro.
- Condiciones del área con respuestas de varios estados y preguntas encadenadas.
- Controles del trabajo que cambian según la técnica seleccionada, con nivel de exigencia y origen visibles.
- EPP contextual con marca de sugerido según el trabajo.
- Registro de exposición y de condiciones especiales (recipiente, espacio confinado) con sus controles.
- Observaciones obligatorias cuando hay controles requeridos sin cumplir.
- Fotografías desde la cámara, redimensionadas antes de guardar.
- Vigencia con fecha y hora de inicio y término, causales de pérdida de vigencia y marcado automático de vencimiento.
- Autorización con firmas manuscritas y texto de autorización configurable.
- Verificación previa con semáforo, conteo de controles y bloqueo cuando hay críticos sin cumplir.
- Suspensión con motivo, detalle, usuario y hora; reanudación controlada.
- Cierre con verificación de siete puntos, responsable, comentario y firma.
- Bitácora completa de estados.
- Documento PDF A4 con todas las secciones, marca de agua según estado y bloque de cierre.
- Historial con búsqueda, filtros, regeneración del PDF y exportación CSV.
- Instalable como aplicación y operativo sin conexión.

## 8. Funcionalidades pendientes

- Autenticación corporativa y perfiles diferenciados (ejecutor, SST, auditoría).
- Sincronización con servidor: los datos viven en el dispositivo que registró el permiso.
- Reanudación con verificación registrada punto por punto, no solo confirmación.
- Firma digital certificada.
- Notificaciones de vencimiento próximo y recordatorio de cierre pendiente.
- Reportes agregados: controles críticos que más fallan, permisos por área, cierres fuera de plazo.
- Otros permisos de alto riesgo: altura, espacios confinados, eléctrico, izaje.
- Adjuntar IPERC, ATS o certificados de equipos al permiso.

## 9. De MVP a producción

**Datos.** Una API mínima con base de datos y una cola local para reenviar lo capturado sin señal. El adaptador de `storage.js` se reemplaza sin tocar la interfaz.

**Identidad.** Inicio de sesión contra el directorio corporativo, y el permiso firmado por el usuario autenticado, no por un nombre escrito.

**Documento.** Generar también el PDF en el servidor al autorizar, y archivarlo con un identificador inalterable.

**Validación con SST.** Antes del piloto conviene revisar tres cosas con SST de Grupo Pana: qué controles son realmente críticos, si SST firma cada permiso, y qué duración máxima aceptan para un permiso de trabajo en caliente. Las tres se ajustan en `config.js`.

**Antes de liberar.** Prueba en los celulares reales de los jefes de área, con guantes y a contraluz en patio. Un piloto de dos semanas en un área, con el formato físico en paralelo, antes de retirar el papel.
