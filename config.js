/* =====================================================================
   CONFIGURACIÓN DEL APLICATIVO — PETAR TRABAJOS EN CALIENTE
   ---------------------------------------------------------------------
   TODO el contenido editable del PETAR vive en este archivo.
   Cuando se entregue el formato físico actual de Grupo Pana, SOLO se
   modifica este archivo: preguntas, orden, catálogos y criticidad.
   Ni la interfaz ni el PDF necesitan reescribirse.
   ===================================================================== */

window.PETAR_CONFIG = {

  /* --- Identidad del documento ------------------------------------- */
  empresa: 'Grupo Pana',
  sistema: 'Gestión Digital SST',
  modulo: 'PETAR — Trabajo en Caliente',
  codigoFormato: 'SST-FOR-PETAR-01',   // código del formato físico
  version: 'Rev. 01',
  prefijoCorrelativo: 'PETAR',          // PETAR-2026-0001
  vigenciaHoras: 12,                    // referencia para la vigencia del permiso

  /* --- Catálogos (futuro: directorio corporativo / maestro SST) ----- */
  responsables: [
    { nombre: 'Juan Pérez',      cargo: 'Jefe de Taller' },
    { nombre: 'Carlos Ramírez',  cargo: 'Supervisor de Mantenimiento' },
    { nombre: 'Luis Torres',     cargo: 'Jefe de Operaciones' }
  ],

  autorizantes: [
    { nombre: 'Ana Quispe',   cargo: 'Supervisora SST' },
    { nombre: 'Diego Falcón', cargo: 'Jefe SST' }
  ],

  areas: [
    { nombre: 'Taller',        subareas: ['Bahía 1', 'Bahía 2', 'Planchado y pintura', 'Almacén de repuestos'] },
    { nombre: 'Mantenimiento', subareas: ['Sala de máquinas', 'Azotea', 'Patio de maniobras', 'Zona eléctrica'] },
    { nombre: 'Operaciones',   subareas: ['Playa de estacionamiento', 'Rampa de descarga', 'Depósito'] }
  ],

  tiposTrabajo: [
    'Soldadura',
    'Corte con esmeril',
    'Esmerilado',
    'Oxicorte',
    'Uso de soplete',
    'Corte de estructura metálica',
    'Otros'
  ],

  empresasContratistas: [
    'Personal propio',
    'Metalmecánica del Sur S.A.C.',
    'Servicios Industriales Lima E.I.R.L.',
    'Otro'
  ],

  /* --- Checklist de verificación -----------------------------------
     critica: true  -> si se responde NO, el PETAR no puede autorizarse
     critica: false -> si se responde NO, solo se advierte
     SST puede cambiar la criticidad aquí sin tocar el código.
  ------------------------------------------------------------------- */
  checklist: [
    {
      id: 'condiciones_area',
      titulo: 'Condiciones del área',
      resumen: 'Estado del entorno antes de iniciar el trabajo',
      items: [
        { id: 'ca1', texto: '¿El área de trabajo se encuentra delimitada y señalizada?', critica: true },
        { id: 'ca2', texto: '¿Se retiraron los materiales combustibles del área?', critica: true },
        { id: 'ca3', texto: '¿Se verificó que no existan sustancias inflamables cercanas?', critica: true },
        { id: 'ca4', texto: '¿Se protegieron las áreas y materiales que no pueden retirarse?', critica: false },
        { id: 'ca5', texto: '¿El área cuenta con ventilación adecuada?', critica: false },
        { id: 'ca6', texto: '¿Se comunicó el trabajo al personal de las áreas contiguas?', critica: false }
      ]
    },
    {
      id: 'incendio',
      titulo: 'Prevención y respuesta ante incendios',
      resumen: 'Controles obligatorios para trabajo en caliente',
      items: [
        { id: 'in1', texto: '¿Se cuenta con extintor adecuado y operativo?', critica: true },
        { id: 'in2', texto: '¿El extintor se encuentra disponible y accesible en el punto de trabajo?', critica: true },
        { id: 'in3', texto: '¿Se identificaron las posibles fuentes de ignición?', critica: false },
        { id: 'in4', texto: '¿Se cuenta con medios para controlar chispas y proyecciones (mantas, biombos)?', critica: true },
        { id: 'in5', texto: '¿El área se encuentra libre de materiales combustibles en un radio de 10 m?', critica: false },
        { id: 'in6', texto: '¿Se verificó el entorno superior e inferior del punto de trabajo?', critica: false },
        { id: 'in7', texto: '¿Se conoce la ubicación del punto de reunión y de la alarma más cercana?', critica: false }
      ]
    }
  ],

  /* --- Equipos de protección personal ------------------------------- */
  epp: [
    { id: 'epp1', texto: 'Casco de seguridad',                      critica: true },
    { id: 'epp2', texto: 'Protección ocular (lentes)',              critica: true },
    { id: 'epp3', texto: 'Protección facial (careta)',              critica: false },
    { id: 'epp4', texto: 'Guantes adecuados para la tarea',         critica: true },
    { id: 'epp5', texto: 'Ropa de trabajo ignífuga',                critica: false },
    { id: 'epp6', texto: 'Calzado de seguridad',                    critica: true },
    { id: 'epp7', texto: 'Protección auditiva',                     critica: false },
    { id: 'epp8', texto: 'Protección respiratoria',                 critica: false },
    { id: 'epp9', texto: 'Mandil, escarpines y polainas de soldador', critica: false }
  ],

  /* --- Equipos y herramientas (Conforme / No conforme / N/A) -------- */
  equipos: [
    { id: 'eq1', texto: 'Equipo de soldadura',            critica: false },
    { id: 'eq2', texto: 'Esmeril angular con guarda',     critica: true },
    { id: 'eq3', texto: 'Extensiones eléctricas',         critica: false },
    { id: 'eq4', texto: 'Cables y conexiones',            critica: true },
    { id: 'eq5', texto: 'Herramientas eléctricas',        critica: false },
    { id: 'eq6', texto: 'Equipo de oxicorte',             critica: false },
    { id: 'eq7', texto: 'Cilindros asegurados y con manómetro', critica: false },
    { id: 'eq8', texto: 'Válvulas antirretroceso',        critica: false }
  ],

  /* --- Escalas de respuesta ----------------------------------------- */
  escalas: {
    sino: [
      { valor: 'si', etiqueta: 'Sí',  tono: 'ok' },
      { valor: 'no', etiqueta: 'No',  tono: 'mal' },
      { valor: 'na', etiqueta: 'N/A', tono: 'neutro' }
    ],
    conformidad: [
      { valor: 'si', etiqueta: 'Conforme',    tono: 'ok' },
      { valor: 'no', etiqueta: 'No conforme', tono: 'mal' },
      { valor: 'na', etiqueta: 'N/A',         tono: 'neutro' }
    ]
  },

  /* --- Estados del PETAR -------------------------------------------- */
  estados: {
    BORRADOR:      { etiqueta: 'Borrador',      tono: 'neutro' },
    PENDIENTE:     { etiqueta: 'Pendiente',     tono: 'aviso'  },
    AUTORIZADO:    { etiqueta: 'Autorizado',    tono: 'ok'     },
    CERRADO:       { etiqueta: 'Cerrado',       tono: 'frio'   },
    NO_AUTORIZADO: { etiqueta: 'No autorizado', tono: 'mal'    }
  },

  /* --- Fotografías --------------------------------------------------- */
  fotos: {
    maxPorPetar: 6,
    anchoMaximoPx: 1280,   // se redimensiona antes de guardar
    calidadJpeg: 0.72
  },

  /* --- Pasos del formulario ------------------------------------------ */
  pasos: [
    { id: 'generales',  titulo: 'Datos generales' },
    { id: 'trabajo',    titulo: 'Trabajo a realizar' },
    { id: 'seguridad',  titulo: 'Verificación de seguridad' },
    { id: 'controles',  titulo: 'EPP, equipos y vigía' },
    { id: 'evidencias', titulo: 'Observaciones y fotos' },
    { id: 'firmas',     titulo: 'Autorización y firmas' }
  ]
};
