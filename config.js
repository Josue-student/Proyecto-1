/* =====================================================================
   CONFIGURACIÓN — PERMISO DE EJECUCIÓN DE TRABAJO EN CALIENTE
   ---------------------------------------------------------------------
   Grupo Pana · Gestión Digital SST

   Todo el contenido del permiso vive aquí: secciones, preguntas,
   controles, catálogos y nivel de exigencia de cada punto.

   NIVELES DE EXIGENCIA (campo "nivel"):
     critico     -> si la respuesta es "No", el permiso no puede autorizarse
     requerido   -> debe responderse; un "No" obliga a registrar la medida
     informativo -> no bloquea, queda como registro

   ORIGEN DE CADA REQUISITO (campo "origen"):
     'DS 42-F'   -> requisito recogido del Reglamento de Seguridad Industrial
     'interno'   -> estándar interno / provisional de Grupo Pana
   El origen se muestra en la interfaz y en el PDF para no presentar como
   obligación legal lo que todavía es una decisión interna por validar.
   ===================================================================== */

window.PETAR_CONFIG = {

  /* --- Identidad del documento ------------------------------------- */
  empresa: 'Grupo Pana',
  sistema: 'Gestión Digital SST',
  modulo: 'Permiso de ejecución de trabajo en caliente',
  codigoFormato: 'SST-FOR-PETAR-01',
  version: 'Rev. 02 (MVP)',
  prefijoCorrelativo: 'PETAR',

  /* Vigencia: sin duración fija impuesta. Grupo Pana define su criterio;
     mientras tanto la hora de término se ingresa a mano. Si más adelante
     se acuerda una duración por defecto, se indica aquí en horas. */
  duracionSugeridaHoras: null,

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

  trabajadores: [
    'Marco Ríos', 'Elder Castro', 'Yuri Bautista', 'Percy Aguilar', 'Néstor Vílchez'
  ],

  areas: [
    { nombre: 'Taller',        subareas: ['Bahía 1', 'Bahía 2', 'Planchado y pintura', 'Almacén de repuestos'] },
    { nombre: 'Mantenimiento', subareas: ['Sala de máquinas', 'Azotea', 'Patio de maniobras', 'Zona eléctrica'] },
    { nombre: 'Operaciones',   subareas: ['Playa de estacionamiento', 'Rampa de descarga', 'Depósito'] }
  ],

  empresasContratistas: [
    'Personal propio',
    'Metalmecánica del Sur S.A.C.',
    'Servicios Industriales Lima E.I.R.L.',
    'Otro'
  ],

  /* --- Tipos de trabajo -------------------------------------------
     "controles" indica qué bloques del paso 5 se muestran para ese tipo.
     Añadir un tipo nuevo es añadir una entrada aquí.
  ------------------------------------------------------------------ */
  tiposTrabajo: [
    { id: 'soldadura_electrica', nombre: 'Soldadura eléctrica / arco', controles: ['soldadura_electrica'] },
    { id: 'soldadura_oxi',       nombre: 'Soldadura oxiacetilénica',   controles: ['oxigas'] },
    { id: 'oxicorte',            nombre: 'Oxicorte',                   controles: ['oxigas'] },
    { id: 'corte',               nombre: 'Corte',                      controles: ['esmerilado'] },
    { id: 'esmerilado',          nombre: 'Esmerilado',                 controles: ['esmerilado'] },
    { id: 'otro',                nombre: 'Otro',                       controles: [] }
  ],

  equiposHerramienta: ['Soldadora', 'Esmeril', 'Soplete', 'Cortadora', 'Otro'],

  elementosTrabajo: ['Vehículo', 'Estructura', 'Componente', 'Equipo', 'Otro'],

  /* =================================================================
     PASO 4 — CONDICIONES DEL ÁREA
     Preguntas con opciones reales, no una lista plana de Sí/No.
     "hijos" encadena preguntas condicionales.
     ================================================================= */
  condicionesArea: [
    {
      id: 'combustibles',
      titulo: 'Materiales combustibles',
      pregunta: '¿Existen materiales combustibles próximos al área de trabajo?',
      tipo: 'opciones',
      nivel: 'critico',
      opciones: [
        { valor: 'no_existen', etiqueta: 'No existen',                      tono: 'ok' },
        { valor: 'retirados',  etiqueta: 'Fueron retirados',                tono: 'ok' },
        { valor: 'protegidos', etiqueta: 'Fueron protegidos o aislados',    tono: 'ok' },
        { valor: 'requiere',   etiqueta: 'Sí, requieren control adicional', tono: 'mal' }
      ],
      bloqueaSi: ['requiere'],
      ayuda: 'Si todavía requieren control, resuélvelo en campo y actualiza la respuesta antes de autorizar.'
    },
    {
      id: 'inflamables',
      titulo: 'Líquidos, gases o vapores inflamables',
      pregunta: '¿Existe posibilidad de presencia de líquidos, gases o vapores inflamables?',
      tipo: 'si_no',
      nivel: 'requerido',
      origen: 'DS 42-F',
      ayuda: 'El D.S. 42-F fija exigencias específicas para soldadura y corte cerca de líquidos combustibles o lugares de fácil combustión.',
      hijos: [
        {
          id: 'inflamables_control',
          muestraSi: 'si',
          pregunta: '¿Se eliminó, purgó o aisló la fuente antes de iniciar el trabajo?',
          tipo: 'si_no',
          nivel: 'critico'
        }
      ]
    },
    {
      id: 'personas',
      titulo: 'Personas próximas',
      pregunta: '¿Existen trabajadores o terceros que puedan verse afectados?',
      tipo: 'si_no',
      nivel: 'requerido',
      hijos: [
        {
          id: 'personas_proteccion',
          muestraSi: 'si',
          pregunta: '¿Se implementó protección mediante pantalla o barrera y control de acceso?',
          tipo: 'si_no',
          nivel: 'critico'
        }
      ]
    },
    {
      id: 'chispas',
      titulo: 'Proyección de chispas',
      pregunta: '¿Las chispas o partículas pueden alcanzar otras áreas?',
      tipo: 'si_no',
      nivel: 'requerido',
      hijos: [
        {
          id: 'chispas_medida',
          muestraSi: 'si',
          pregunta: 'Medida de protección implementada',
          tipo: 'multiple',
          nivel: 'critico',
          opciones: ['Pantalla', 'Mamparo', 'Manta o protección', 'Aislamiento del área', 'Otra']
        }
      ]
    },
    {
      id: 'ventilacion',
      titulo: 'Ventilación',
      pregunta: '¿La ventilación o extracción disponible es adecuada para la tarea?',
      tipo: 'si_no_na',
      nivel: 'requerido'
    }
  ],

  /* =================================================================
     PASO 5 — CONTROLES DEL TRABAJO
     "incendio" se muestra siempre; el resto según el tipo de trabajo.
     ================================================================= */
  controles: {
    incendio: {
      titulo: 'Protección contra incendios',
      resumen: 'Se verifica siempre, cualquiera sea la técnica empleada.',
      siempre: true,
      items: [
        { id: 'ext_disponible',  label: 'Extintor disponible en el punto de trabajo', nivel: 'critico', origen: 'interno' },
        { id: 'ext_accesible',   label: 'Extintor accesible y sin obstrucciones', nivel: 'critico', origen: 'interno' },
        { id: 'ext_tipo',        label: 'Tipo de extintor adecuado al riesgo presente', nivel: 'requerido', origen: 'interno' },
        { id: 'area_libre',      label: 'Área libre de materiales combustibles o correctamente protegida', nivel: 'critico', origen: 'DS 42-F' },
        { id: 'control_chispas', label: 'Control de proyección de chispas implementado', nivel: 'critico', origen: 'DS 42-F' },
        { id: 'medios_adic',     label: 'Medios adicionales de respuesta cuando corresponda (agua, arena, manta)', nivel: 'informativo', origen: 'interno' }
      ]
    },

    soldadura_electrica: {
      titulo: 'Soldadura eléctrica / arco',
      resumen: 'Condiciones del equipo de soldadura eléctrica.',
      items: [
        { id: 'maq_segura',     label: 'Máquina de soldar en condición segura de operación', nivel: 'critico', origen: 'DS 42-F' },
        { id: 'cables',         label: 'Cables y conexiones en buen estado', nivel: 'critico', origen: 'DS 42-F' },
        { id: 'partes_prot',    label: 'Partes eléctricas bajo tensión protegidas', nivel: 'critico', origen: 'DS 42-F' },
        { id: 'tierra',         label: 'Máquina conectada a tierra', nivel: 'critico', origen: 'DS 42-F' },
        { id: 'portaelec',      label: 'Portaelectrodo en condición segura y aislado', nivel: 'critico', origen: 'DS 42-F' },
        { id: 'contacto',       label: 'Protección frente al contacto accidental con elementos conductores', nivel: 'requerido', origen: 'DS 42-F' },
        { id: 'pantalla',       label: 'Pantalla para proteger del arco a las personas próximas', nivel: 'requerido', origen: 'DS 42-F' },
        { id: 'chispas_se',     label: 'Control de chispas en el punto de trabajo', nivel: 'requerido', origen: 'DS 42-F' },
        { id: 'ventilacion_se', label: 'Ventilación o extracción cuando corresponda', nivel: 'requerido', origen: 'interno' }
      ]
    },

    oxigas: {
      titulo: 'Oxicorte / equipo oxigás',
      resumen: 'Cilindros, mangueras y accesorios del equipo oxiacetilénico.',
      items: [
        { id: 'cil_posicion',  label: 'Cilindros en posición segura', nivel: 'critico', origen: 'DS 42-F' },
        { id: 'cil_sujetos',   label: 'Cilindros sujetos y asegurados contra caída', nivel: 'critico', origen: 'DS 42-F' },
        { id: 'cil_valvulas',  label: 'Válvulas protegidas y en buen estado', nivel: 'critico', origen: 'DS 42-F' },
        { id: 'cil_distancia', label: 'Distancia segura respecto de fuentes de calor o chispas', nivel: 'critico', origen: 'DS 42-F' },
        { id: 'mangueras',     label: 'Mangueras identificadas y sin deterioro', nivel: 'requerido', origen: 'DS 42-F' },
        { id: 'conexiones',    label: 'Conexiones adecuadas y sin fugas', nivel: 'critico', origen: 'DS 42-F' },
        { id: 'manipulacion',  label: 'Condiciones seguras de manipulación y traslado', nivel: 'requerido', origen: 'DS 42-F' },
        { id: 'soplete',       label: 'Soplete y regulador en condición segura', nivel: 'critico', origen: 'DS 42-F' }
      ]
    },

    esmerilado: {
      titulo: 'Esmerilado / corte',
      resumen: 'Condición de la herramienta y control de proyección de partículas.',
      items: [
        { id: 'equipo_adec', label: 'Equipo adecuado para la tarea', nivel: 'requerido', origen: 'interno' },
        { id: 'guarda',      label: 'Guarda instalada y en posición', nivel: 'critico', origen: 'DS 42-F' },
        { id: 'disco',       label: 'Disco o herramienta de corte adecuada y sin fisuras', nivel: 'critico', origen: 'interno' },
        { id: 'ocular',      label: 'Protección ocular en uso', nivel: 'critico', origen: 'interno' },
        { id: 'particulas',  label: 'Protección frente a proyección de partículas', nivel: 'requerido', origen: 'interno' },
        { id: 'proyeccion',  label: 'Control de proyección hacia otras áreas', nivel: 'requerido', origen: 'interno' },
        { id: 'condicion',   label: 'Condición general de la herramienta verificada', nivel: 'requerido', origen: 'interno' },
        { id: 'polvo',       label: 'Control de polvo o partículas cuando corresponda', nivel: 'informativo', origen: 'interno' }
      ]
    }
  },

  /* =================================================================
     PASO 6 — EPP requerido para la tarea
     "sugeridoPor" precarga la selección según el tipo de trabajo
     ('*' = se sugiere en cualquier trabajo en caliente).
     El EPP es parte de la jerarquía de controles: no reemplaza a los
     controles colectivos definidos en los pasos 4 y 5.
     ================================================================= */
  epp: [
    { id: 'casco',        label: 'Casco de seguridad',            nivel: 'requerido',   sugeridoPor: ['*'] },
    { id: 'ocular',       label: 'Protección ocular',             nivel: 'critico',     sugeridoPor: ['*'] },
    { id: 'facial',       label: 'Protección facial',             nivel: 'requerido',   sugeridoPor: ['esmerilado', 'corte', 'soldadura_electrica'] },
    { id: 'guantes',      label: 'Guantes adecuados a la tarea',  nivel: 'critico',     sugeridoPor: ['*'] },
    { id: 'corporal',     label: 'Ropa o protección corporal',    nivel: 'requerido',   sugeridoPor: ['*'] },
    { id: 'calzado',      label: 'Calzado de seguridad',          nivel: 'requerido',   sugeridoPor: ['*'] },
    { id: 'auditiva',     label: 'Protección auditiva',           nivel: 'informativo', sugeridoPor: ['esmerilado', 'corte'] },
    { id: 'respiratoria', label: 'Protección respiratoria',       nivel: 'informativo', sugeridoPor: ['soldadura_electrica', 'oxicorte'] },
    { id: 'soldadura',    label: 'Protección específica para soldadura (careta, mandil, escarpines)', nivel: 'critico', sugeridoPor: ['soldadura_electrica', 'soldadura_oxi'] },
    { id: 'otro_epp',     label: 'Otro EPP',                      nivel: 'informativo', sugeridoPor: [] }
  ],

  /* =================================================================
     PASO 7 — Condiciones de exposición
     El PETAR registra qué agentes pueden estar presentes; no sustituye
     al monitoreo ocupacional del SGSST ni obliga a medir antes de cada
     permiso. La R.M. 375-2008-TR fija criterios de evaluación; no exige
     una medición diaria previa a cada trabajo.
     ================================================================= */
  agentesExposicion: [
    'Ruido', 'Humos, gases o vapores', 'Radiación', 'Calor o estrés térmico',
    'Polvo o partículas', 'Vibración', 'Otros'
  ],

  evaluacionHigienica: [
    { valor: 'si',      etiqueta: 'Sí, existe' },
    { valor: 'no',      etiqueta: 'No existe' },
    { valor: 'na',      etiqueta: 'No aplica' },
    { valor: 'validar', etiqueta: 'Requiere validación' }
  ],

  /* =================================================================
     PASO 8 — Condiciones especiales
     ================================================================= */
  especiales: {
    recipiente: {
      pregunta: '¿Se trabajará sobre un recipiente, tanque o contenedor?',
      hijoPregunta: '¿El recipiente contuvo sustancias inflamables o explosivas?',
      controles: [
        { id: 'purgado',       label: 'Recipiente vaciado, purgado y ventilado', nivel: 'critico', origen: 'DS 42-F' },
        { id: 'limpieza',      label: 'Limpieza interior verificada', nivel: 'critico', origen: 'DS 42-F' },
        { id: 'aperturas',     label: 'Aperturas necesarias habilitadas durante el trabajo', nivel: 'requerido', origen: 'DS 42-F' },
        { id: 'atmosfera_rec', label: 'Ausencia de atmósfera inflamable verificada', nivel: 'critico', origen: 'DS 42-F' }
      ]
    },
    confinado: {
      pregunta: '¿Se trabajará en un espacio confinado?',
      advertencia: 'Esta condición requiere controles adicionales según el procedimiento aplicable. El aplicativo registra la condición y sus controles básicos; el procedimiento de espacios confinados se gestiona por separado.',
      controles: [
        { id: 'ventilacion_ec', label: 'Ventilación del espacio asegurada', nivel: 'critico', origen: 'interno' },
        { id: 'atmosfera',      label: 'Control atmosférico realizado cuando corresponda', nivel: 'critico', origen: 'interno' },
        { id: 'vigilancia',     label: 'Vigilancia exterior permanente', nivel: 'critico', origen: 'interno' },
        { id: 'otros_ec',       label: 'Otros controles establecidos por el procedimiento interno', nivel: 'requerido', origen: 'interno' }
      ]
    }
  },

  /* =================================================================
     PASO 9 — Firmas de autorización
     "activa" permite que Grupo Pana decida si SST firma cada permiso.
     Hoy queda preparada pero desactivada: no se asume esa exigencia.
     ================================================================= */
  firmas: [
    { clave: 'ejecutor',    titulo: 'Responsable de la ejecución', activa: true,  requerida: true },
    { clave: 'autorizante', titulo: 'Responsable que autoriza',    activa: true,  requerida: true },
    { clave: 'sst',         titulo: 'SST',                         activa: false, requerida: false }
  ],

  textoAutorizacion: 'Se autoriza la ejecución del trabajo descrito bajo las condiciones y controles establecidos en este permiso.',

  confirmacionPersonal: 'El personal asignado conoce los riesgos y controles asociados a la tarea.',

  /* --- Vigencia: causales de pérdida de validez ----------------------- */
  causalesPerdidaVigencia: [
    'Finaliza el tiempo autorizado',
    'Cambia significativamente el trabajo',
    'Cambia la ubicación',
    'Cambian las condiciones de seguridad',
    'Se presenta una condición que obliga a suspenderlo',
    'Ocurre una emergencia'
  ],

  /* --- Suspensión ------------------------------------------------------ */
  motivosSuspension: [
    'Condición insegura', 'Cambio de trabajo', 'Cambio de ubicación',
    'Falla de equipo', 'Emergencia', 'Cambio de condiciones', 'Otro'
  ],

  /* --- Cierre del permiso ---------------------------------------------- */
  cierre: [
    { id: 'finalizado', label: 'Trabajo finalizado', nivel: 'critico' },
    { id: 'equipos',    label: 'Equipos retirados o desconectados cuando corresponde', nivel: 'critico' },
    { id: 'ignicion',   label: 'Fuentes de ignición controladas', nivel: 'critico' },
    { id: 'residuos',   label: 'Residuos y materiales retirados', nivel: 'requerido' },
    { id: 'revision',   label: 'Área revisada tras finalizar el trabajo', nivel: 'critico' },
    { id: 'sin_riesgo', label: 'No quedan condiciones evidentes de incendio', nivel: 'critico' },
    { id: 'entrega',    label: 'Área entregada en condiciones seguras', nivel: 'critico' }
  ],

  /* --- Escalas de respuesta -------------------------------------------- */
  escalas: {
    sino: [
      { valor: 'si', etiqueta: 'Sí', tono: 'ok' },
      { valor: 'no', etiqueta: 'No', tono: 'mal' }
    ],
    sinona: [
      { valor: 'si', etiqueta: 'Sí',  tono: 'ok' },
      { valor: 'no', etiqueta: 'No',  tono: 'mal' },
      { valor: 'na', etiqueta: 'N/A', tono: 'neutro' }
    ]
  },

  niveles: {
    critico:     { etiqueta: 'Crítico',     descripcion: 'Si no se cumple, el permiso no puede autorizarse.' },
    requerido:   { etiqueta: 'Requerido',   descripcion: 'Debe completarse; un incumplimiento exige registrar la medida adoptada.' },
    informativo: { etiqueta: 'Informativo', descripcion: 'Queda como registro y no bloquea la autorización.' }
  },

  /* --- Estados del permiso ---------------------------------------------- */
  estados: {
    BORRADOR:      { etiqueta: 'Borrador',      tono: 'neutro' },
    PENDIENTE:     { etiqueta: 'Pendiente',     tono: 'aviso'  },
    AUTORIZADO:    { etiqueta: 'Autorizado',    tono: 'ok'     },
    SUSPENDIDO:    { etiqueta: 'Suspendido',    tono: 'aviso'  },
    VENCIDO:       { etiqueta: 'Vencido',       tono: 'mal'    },
    CERRADO:       { etiqueta: 'Cerrado',       tono: 'frio'   },
    NO_AUTORIZADO: { etiqueta: 'No autorizado', tono: 'mal'    }
  },

  /* --- Fotografías -------------------------------------------------------- */
  fotos: { maxPorPetar: 6, anchoMaximoPx: 1280, calidadJpeg: 0.72 },

  /* --- Pasos del permiso -------------------------------------------------- */
  pasos: [
    { id: 'identificacion', titulo: 'Identificación del permiso' },
    { id: 'trabajo',        titulo: 'Descripción del trabajo' },
    { id: 'personal',       titulo: 'Personal autorizado' },
    { id: 'condiciones',    titulo: 'Condiciones del área' },
    { id: 'controles',      titulo: 'Controles del trabajo' },
    { id: 'epp',            titulo: 'EPP requerido' },
    { id: 'exposicion',     titulo: 'Exposición y condiciones especiales' },
    { id: 'evidencias',     titulo: 'Observaciones y evidencias' },
    { id: 'vigencia',       titulo: 'Vigencia y autorización' }
  ]
};
