# Grupo Pana — Gestión Digital SST
## MVP: PETAR de trabajos en caliente

Aplicativo web para registrar el Permiso Escrito de Trabajo de Alto Riesgo desde el celular, con checklist de seguridad, firmas en pantalla, fotografías, generación del documento en PDF e historial consultable. Funciona sin conexión y sin servidor.

---

## 1. Cómo ejecutarlo

### Opción A — abrir el archivo directamente (la más rápida)

1. Copia toda la carpeta `petar-pana` a la computadora.
2. Haz doble clic en `index.html`.

Funciona para la demostración completa. En Chrome, IndexedDB no está disponible bajo `file://`, por lo que el aplicativo cambia solo a `localStorage`; el pie de página indica qué motor está usando. La instalación como aplicación (PWA) no funciona en este modo.

### Opción B — servidor local (recomendada para la demostración)

Desde la carpeta del proyecto:

```bash
python -m http.server 8080
```

y abre `http://localhost:8080`. Con Node instalado, `npx serve .` hace lo mismo.

Para probar desde el celular en la misma red, usa la IP de la computadora (`http://192.168.x.x:8080`).

### Opción C — publicarlo para uso real en piso

Sube la carpeta a cualquier hosting estático con HTTPS (SharePoint no hace falta): GitHub Pages, Netlify, Cloudflare Pages o un IIS/Apache interno. Con HTTPS, el navegador ofrece **Agregar a la pantalla de inicio** y el aplicativo se abre como una app, sin barra de navegador y sin conexión.

**Dependencias a instalar: ninguna.** La librería de PDF (jsPDF 2.5.2, licencia MIT) está incluida en `assets/vendor/` para que todo funcione sin internet.

---

## 2. Arquitectura

```
INTERFAZ (index.html + css/styles.css + js/app.js + js/ui.js)
        │  pantallas, formulario por pasos, firma, cámara
        ↓
LÓGICA (js/petar.js + js/validation.js + data/config.js)
        │  modelo del permiso, conformidad, criticidad, validaciones
        ↓
ALMACENAMIENTO (js/storage.js)
        │  savePetar · getPetar · getAllPetar · updatePetar · deletePetar
        │  IndexedDB  →  respaldo automático en localStorage
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
/js/petar.js                 Modelo del PETAR y cálculo de conformidad
/js/validation.js            Reglas y mensajes de validación
/js/pdf.js                   Generación del documento oficial
/data/config.js              Preguntas, catálogos y criticidad (editable por SST)
/assets/vendor/              jsPDF
/assets/icons/               Iconos de la aplicación
```

### Dos decisiones que conviene conocer

**Todo el contenido del PETAR está en `data/config.js`.** Preguntas, secciones, EPP, equipos, áreas, responsables, tipos de trabajo y qué preguntas son críticas. Cambiar el formato no exige tocar la interfaz ni el PDF: se edita ese archivo y el aplicativo, las validaciones y el documento se actualizan solos.

**La interfaz nunca habla con el almacenamiento directamente.** Solo llama a las seis funciones de `Store`. Para migrar a Google Sheets, SharePoint o una base de datos se escribe un adaptador nuevo con esas mismas funciones y se cambia una línea en `storage.js`.

### Modelo de datos

```js
{
  id, numero: "PETAR-2026-0001", estado, creadoEn, actualizadoEn,
  usuario:    { nombre, cargo },
  generales:  { fecha, horaInicio, horaTermino, area, subarea,
                responsableTrabajo, empresa, nTrabajadores, descripcion },
  trabajo:    { tipos: [], otroDetalle },
  checklist:  { condiciones_area: { ca1: "si" }, incendio: { in1: "no" } },
  epp:        { epp1: "si" },
  equipos:    { eq1: "si" },
  vigia:      { aplica, nombre, horaInicio, horaTermino, conoceFunciones },
  observaciones, fotos: [{ id, dataUrl, nota }],
  firmas:     { responsable: { nombre, cargo, firma, fechaHora }, autorizante: {...} },
  cierre:     { fechaHora, responsable, comentario },
  historialEstados: [{ estado, fechaHora, usuario }]
}
```

### Integración futura

`Store.toRow(petar)` ya convierte cada permiso en un registro plano de 23 columnas; es exactamente la fila que consumiría una hoja de cálculo. El botón **Exportar CSV** del historial usa esa misma función, así que el puente ya está probado.

```
APLICATIVO WEB → API propia → GOOGLE SHEETS → registro histórico
APLICATIVO WEB → Power Automate / Graph → EXCEL / SHAREPOINT → documento PETAR
```

El envío debe hacerse desde un backend, nunca con credenciales en el navegador. En `storage.js` está marcado el punto exacto donde se conecta.

---

## 3. Funcionalidades implementadas

- Selección de responsable, con opción de registrar a otra persona; queda guardado entre sesiones.
- Dashboard con permisos activos, cerrados y en proceso, más acceso directo al borrador sin terminar.
- Correlativo automático anual (`PETAR-2026-0001`) con contador persistente.
- Formulario en seis pasos con barra de progreso, validación por paso y mensajes en lenguaje claro.
- Checklist de condiciones del área y prevención de incendios con botones grandes Sí / No / N/A.
- Marcado de preguntas críticas: una respuesta *No* en una crítica bloquea la autorización; en las demás solo advierte.
- EPP, equipos y herramientas (Conforme / No conforme / N/A) y sección de vigía de fuego con horario y confirmación de funciones.
- Observaciones obligatorias cuando hay condiciones no conformes.
- Fotografías desde la cámara del celular, redimensionadas antes de guardar, con miniatura y opción de quitarlas.
- Firma manuscrita en pantalla para el responsable y el autorizante SST, con fecha y hora de firma.
- Resumen previo con semáforo (conforme, con observaciones, pendiente, no conforme) y edición directa de cada sección.
- Generación del PDF A4: cabecera con código de formato y correlativo, todas las secciones, fotografías, firmas, franja de cierre, marca de agua en borradores y no autorizados, y numeración de páginas.
- Visor del documento dentro del aplicativo, con descarga y apertura en pestaña nueva.
- Historial con búsqueda, filtros por estado, fecha y responsable, regeneración del PDF y exportación CSV.
- Estados del permiso (borrador, pendiente, autorizado, cerrado, no autorizado) con bitácora de cambios.
- Autoguardado con aviso «Cambios guardados»; el permiso sobrevive al cierre accidental del navegador.
- Instalable como aplicación y operativo sin conexión.

## 4. Funcionalidades pendientes

- Autenticación corporativa y perfiles diferenciados (ejecutor / SST / auditoría).
- Sincronización con servidor: hoy los datos viven en el dispositivo que registró el permiso.
- Cierre del permiso mediante flujo controlado y verificación posterior del área.
- Firma digital certificada con valor probatorio.
- Notificaciones y vencimiento automático del permiso al superar el horario autorizado.
- Reportes agregados: permisos por área, condiciones no conformes recurrentes, cumplimiento por responsable.
- Otros PETAR: espacios confinados, trabajo en altura, eléctrico, izaje.
- Adjuntar documentos asociados (IPERC, ATS, certificados de equipos).

## 5. De MVP a producción

**Datos.** El paso indispensable es dejar de depender del dispositivo. La ruta más corta con las restricciones de TI actuales es una API mínima (Node o Python) con base de datos y un endpoint que reciba el registro de `Store.toRow`, más una cola local para reenviar lo capturado sin señal. Si se abre Microsoft 365, el mismo adaptador puede apuntar a una lista de SharePoint mediante Power Automate.

**Identidad.** Reemplazar la selección de responsable por inicio de sesión contra el directorio corporativo, y firmar el registro con el usuario autenticado, no con un nombre escrito.

**Documento.** El PDF se genera en el equipo. Para conservar valor documental conviene generarlo también en el servidor al momento de autorizar y archivarlo con un identificador inalterable.

**Formato oficial.** Cuando se entregue el PETAR físico vigente de Grupo Pana, se ajusta `data/config.js` a sus preguntas y orden reales, y `js/pdf.js` a su diagrama de bloques. Lo que no pueda replicarse tal cual (por ejemplo, sellos húmedos o campos manuscritos de terceros) se indicará de forma explícita con la alternativa propuesta.

**Seguridad.** No hay credenciales en el frontend y todo dato ingresado se escapa antes de mostrarse. Al agregar backend: HTTPS obligatorio, validación también del lado del servidor y control de acceso por rol.

**Antes de liberar.** Prueba en los celulares reales de los jefes de área, con guantes puestos y a contraluz en patio; ahí se decide el tamaño de los botones. Conviene un piloto de dos semanas en un área, con el formato físico en paralelo, antes de retirar el papel.
