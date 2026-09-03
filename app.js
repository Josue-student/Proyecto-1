/* =====================================================================
   APLICACIÓN — window.App
   Ciclo de vida del permiso: identificación, descripción, personal,
   condiciones, controles, EPP, exposición, evidencias, vigencia y
   autorización; después verificación, ejecución, suspensión y cierre.
   ===================================================================== */
(function () {
  'use strict';

  var C = window.PETAR_CONFIG;
  var esc = window.UI.esc;
  var $ = window.UI.$;

  var estado = {
    usuario: null,
    pantalla: 'usuario',
    petar: null,
    paso: 0,
    erroresPaso: [],
    erroresCierre: [],
    filtros: { texto: '', estado: '', responsable: '', fecha: '' },
    lista: [],
    firmas: {}
  };

  var app, tituloApp, subApp, btnAtras;
  var guardadoPendiente = null;
  var filtroPendiente = null;

  /* ============================ Utilidades ========================= */

  function setPath(obj, ruta, valor) {
    var p = ruta.split('.'), o = obj;
    for (var i = 0; i < p.length - 1; i++) {
      if (o[p[i]] === undefined) o[p[i]] = {};
      o = o[p[i]];
    }
    o[p[p.length - 1]] = valor;
  }

  function autoguardar() {
    if (!estado.petar) return;
    clearTimeout(guardadoPendiente);
    guardadoPendiente = setTimeout(function () {
      window.Store.savePetar(estado.petar).then(function () { window.UI.marcarGuardado(); });
    }, 350);
  }

  function renderQuieto() {
    var y = window.scrollY;
    render();
    window.scrollTo(0, y);
  }

  function pastilla(p) {
    var e = window.Petar.estadoVisible(p);
    var tono = (C.estados[e] || {}).tono || 'neutro';
    return '<span class="pastilla pastilla--' + tono + '">' + esc(window.Petar.etiquetaEstado(e)) + '</span>';
  }

  var TEXTO_SEMAFORO = {
    conforme: ['ok', 'Condiciones conformes'],
    observado: ['aviso', 'Con observaciones'],
    pendiente: ['neutro', 'Pendiente de completar'],
    no_conforme: ['mal', 'Control crítico sin cumplir']
  };

  /* Marca de exigencia y de origen del requisito */
  function marcas(item) {
    var m = '';
    if (item.nivel === 'critico') m += '<span class="marca marca--critico">Crítico</span>';
    else if (item.nivel === 'requerido') m += '<span class="marca marca--requerido">Requerido</span>';
    if (item.origen === 'DS 42-F') m += '<span class="marca marca--norma">D.S. 42-F</span>';
    else if (item.origen === 'interno') m += '<span class="marca marca--interno">Estándar interno</span>';
    return m;
  }

  function escalaDe(item) {
    return item.nivel === 'critico' ? C.escalas.sino : C.escalas.sinona;
  }

  /* Marca como VENCIDO lo que ya pasó su plazo */
  function revisarVigencia(p) {
    if (p.estado === 'AUTORIZADO' && window.Petar.estaVencido(p)) {
      window.Petar.cambiarEstado(p, 'VENCIDO', 'sistema', 'Venció el plazo autorizado');
      window.Store.savePetar(p);
    }
    return p;
  }

  /* ============================ Navegación ========================= */

  function ir(pantalla, opts) {
    opts = opts || {};
    estado.pantalla = pantalla;
    if (opts.paso !== undefined) estado.paso = opts.paso;
    estado.erroresPaso = [];
    estado.erroresCierre = [];
    window.scrollTo(0, 0);
    render();
  }

  function render() {
    var vistas = {
      usuario: vistaUsuario,
      inicio: vistaInicio,
      formulario: vistaFormulario,
      resumen: vistaVerificacion,
      historial: vistaHistorial,
      detalle: vistaDetalle,
      cierre: vistaCierre
    };
    (vistas[estado.pantalla] || vistaInicio)();
    pintarCabecera();
  }

  function pintarCabecera() {
    var p = estado.petar;
    var mapa = {
      usuario: ['¿Quién registra el permiso?', 'Selecciona tu nombre para empezar'],
      inicio: [C.empresa, C.sistema],
      formulario: [p ? p.numero : 'Nuevo permiso', C.pasos[estado.paso].titulo],
      resumen: ['Verificación', p ? p.numero : ''],
      historial: ['Historial', 'Permisos registrados'],
      detalle: [p ? p.numero : '', 'Ficha del permiso'],
      cierre: ['Cierre del permiso', p ? p.numero : '']
    };
    var t = mapa[estado.pantalla] || mapa.inicio;
    tituloApp.textContent = t[0];
    subApp.textContent = t[1];
    btnAtras.hidden = (estado.pantalla === 'inicio' || estado.pantalla === 'usuario');
  }

  /* ==================== Pantalla: elegir responsable =============== */

  function vistaUsuario() {
    app.innerHTML =
      '<section class="bloque">' +
        '<p class="intro">El nombre que elijas quedará registrado como emisor de cada permiso.</p>' +
        '<div class="lista-personas">' +
          C.responsables.map(function (r, i) {
            return '<button class="persona" data-accion="elegir-usuario" data-i="' + i + '">' +
              '<span class="persona__inicial">' + esc(r.nombre.charAt(0)) + '</span>' +
              '<span class="persona__datos"><strong>' + esc(r.nombre) + '</strong><small>' + esc(r.cargo) + '</small></span>' +
            '</button>';
          }).join('') +
        '</div>' +
        '<details class="otro">' +
          '<summary>Otro responsable</summary>' +
          '<div class="campo"><label for="oNombre">Nombre y apellidos</label>' +
            '<input id="oNombre" type="text" autocomplete="name" placeholder="Ej. María Salazar"></div>' +
          '<div class="campo"><label for="oCargo">Cargo</label>' +
            '<input id="oCargo" type="text" placeholder="Ej. Supervisor de planta"></div>' +
          '<button class="btn btn--principal btn--ancho" data-accion="usuario-otro">Continuar</button>' +
        '</details>' +
        '<p class="nota">Más adelante estos usuarios pueden provenir del directorio corporativo.</p>' +
      '</section>';
  }

  /* ========================= Pantalla: inicio ====================== */

  function vistaInicio() {
    app.innerHTML = '<section class="bloque"><p class="intro">Cargando permisos…</p></section>';

    window.Store.getAllPetar().then(function (lista) {
      estado.lista = lista.map(window.Petar.normalizar).map(revisarVigencia);
      var l = estado.lista;
      var activos = l.filter(function (p) { return window.Petar.estadoVisible(p) === 'AUTORIZADO'; });
      var suspendidos = l.filter(function (p) { return p.estado === 'SUSPENDIDO'; });
      var vencidos = l.filter(function (p) { return window.Petar.estadoVisible(p) === 'VENCIDO'; });
      var proceso = l.filter(function (p) { return p.estado === 'BORRADOR' || p.estado === 'PENDIENTE'; });
      var ultimos = l.slice(0, 5);

      app.innerHTML =
        '<section class="bloque">' +
          '<div class="saludo">' +
            '<div><strong>' + esc(estado.usuario.nombre) + '</strong><small>' + esc(estado.usuario.cargo) + '</small></div>' +
            '<button class="enlace" data-accion="cambiar-usuario">Cambiar</button>' +
          '</div>' +

          '<button class="btn-nuevo" data-accion="nuevo-petar">' +
            '<span class="btn-nuevo__signo">+</span>' +
            '<span class="btn-nuevo__txt"><strong>Nuevo permiso</strong><small>Trabajo en caliente</small></span>' +
          '</button>' +

          (proceso.length
            ? '<div class="retomar"><div><strong>' + esc(proceso[0].numero) + ' sin terminar</strong>' +
              '<small>' + esc(proceso[0].identificacion.area || 'Sin área') + ' · ' + window.UI.fechaHora(proceso[0].actualizadoEn) + '</small></div>' +
              '<button class="btn btn--principal" data-accion="retomar" data-id="' + esc(proceso[0].id) + '">Continuar</button></div>'
            : '') +

          (vencidos.length
            ? '<div class="alerta alerta--mal">' + vencidos.length + ' permiso(s) superaron su plazo autorizado sin registrar el cierre.</div>'
            : '') +

          '<div class="cifras">' +
            cifra(activos.length, 'Vigentes') +
            cifra(suspendidos.length, 'Suspendidos') +
            cifra(proceso.length, 'En proceso') +
          '</div>' +

          '<div class="titulo-fila"><h2>Últimos permisos</h2>' +
            '<button class="enlace" data-accion="ir-historial">Ver historial</button></div>' +
          (ultimos.length ? ultimos.map(tarjetaPetar).join('') : vacio('Aún no hay permisos registrados. Empieza creando el primero.')) +
        '</section>';
    });
  }

  function cifra(n, txt) {
    return '<div class="cifra"><strong>' + n + '</strong><span>' + esc(txt) + '</span></div>';
  }

  function vacio(txt) { return '<p class="vacio">' + esc(txt) + '</p>'; }

  function tarjetaPetar(p) {
    var sem = TEXTO_SEMAFORO[window.Petar.semaforo(p)];
    return '<button class="tarjeta tarjeta--' + sem[0] + '" data-accion="abrir" data-id="' + esc(p.id) + '">' +
      '<div class="tarjeta__fila"><strong>' + esc(p.numero) + '</strong>' + pastilla(p) + '</div>' +
      '<div class="tarjeta__meta">' + esc(window.UI.fechaLarga(p.identificacion.fecha)) + ' · ' +
        esc(p.identificacion.area || 'Sin área') + ' · ' + esc(p.identificacion.ubicacion || 'Sin ubicación') + '</div>' +
      '<div class="tarjeta__meta">' + esc(p.identificacion.responsableTrabajo || '') +
        (window.Petar.tipoTrabajoTexto(p) ? ' · ' + esc(window.Petar.tipoTrabajoTexto(p)) : '') + '</div>' +
    '</button>';
  }

  /* ======================= Pantalla: formulario ==================== */

  function vistaFormulario() {
    var p = estado.petar;
    var pasoId = C.pasos[estado.paso].id;
    var cuerpos = {
      identificacion: pasoIdentificacion,
      trabajo: pasoTrabajo,
      personal: pasoPersonal,
      condiciones: pasoCondiciones,
      controles: pasoControles,
      epp: pasoEpp,
      exposicion: pasoExposicion,
      evidencias: pasoEvidencias,
      vigencia: pasoVigencia
    };

    app.innerHTML =
      '<div class="progreso">' +
        '<div class="progreso__puntos">' +
          C.pasos.map(function (s, i) {
            var cls = i < estado.paso ? 'hecho' : (i === estado.paso ? 'actual' : '');
            return '<span class="punto ' + cls + '" title="' + esc(s.titulo) + '"></span>';
          }).join('') +
        '</div>' +
        '<div class="progreso__txt">Paso ' + (estado.paso + 1) + ' de ' + C.pasos.length + ' · ' + esc(C.pasos[estado.paso].titulo) + '</div>' +
      '</div>' +
      window.UI.listaErrores(estado.erroresPaso) +
      '<section class="bloque">' + cuerpos[pasoId](p) + '</section>' +
      '<div class="barra-pie">' +
        '<button class="btn btn--fantasma" data-accion="paso-atras">' + (estado.paso === 0 ? 'Guardar y salir' : 'Atrás') + '</button>' +
        '<button class="btn btn--principal" data-accion="paso-siguiente">' +
          (estado.paso === C.pasos.length - 1 ? 'Ir a verificación' : 'Siguiente') + '</button>' +
      '</div>';

    if (pasoId === 'vigencia') montarFirmas();
  }

  /* --- Paso 1: identificación del permiso --- */
  function pasoIdentificacion(p) {
    var i = p.identificacion;
    var area = C.areas.find(function (a) { return a.nombre === i.area; });
    return '' +
      '<div class="campo campo--fijo"><label>Número de permiso</label>' +
        '<output class="valor-fijo">' + esc(p.numero) + '</output>' +
        '<small class="ayuda">Correlativo automático. Creado el ' + esc(window.UI.fechaHora(p.creadoEn)) + ' por ' + esc(p.usuario.nombre) + '.</small></div>' +

      campo('Fecha *', '<input type="date" data-campo="identificacion.fecha" value="' + esc(i.fecha) + '">') +
      campo('Área *', select('identificacion.area', C.areas.map(function (a) { return a.nombre; }), i.area, 'Selecciona el área')) +
      campo('Subárea *', select('identificacion.subarea', area ? area.subareas : [], i.subarea,
        area ? 'Selecciona la subárea' : 'Elige primero un área')) +
      campo('Ubicación exacta *', '<input type="text" data-campo="identificacion.ubicacion" value="' + esc(i.ubicacion) + '" placeholder="Ej. rampa de acceso, lado sur">' +
        '<small class="ayuda">Dónde exactamente se ejecutará: el permiso pierde vigencia si el trabajo cambia de lugar.</small>') +

      campo('Empresa ejecutante', select('identificacion.empresa', C.empresasContratistas, i.empresa, 'Personal propio') +
        (i.empresa === 'Otro'
          ? '<input type="text" class="mt" data-campo="identificacion.empresaOtra" placeholder="Nombre de la empresa" value="' + esc(i.empresaOtra || '') + '">'
          : '')) +

      campo('Responsable del trabajo *',
        '<input type="text" list="lstResp" data-campo="identificacion.responsableTrabajo" value="' + esc(i.responsableTrabajo) + '" placeholder="Quién dirige la ejecución">' +
        listaNombres('lstResp', C.responsables.map(function (r) { return r.nombre; }))) +

      campo('Supervisor que solicita el permiso *',
        '<input type="text" list="lstSol" data-campo="identificacion.solicitante" value="' + esc(i.solicitante) + '" placeholder="Quién solicita el permiso">' +
        listaNombres('lstSol', C.responsables.concat(C.autorizantes).map(function (r) { return r.nombre; })));
  }

  /* --- Paso 2: descripción del trabajo --- */
  function pasoTrabajo(p) {
    var t = p.trabajo;
    return '' +
      '<h2 class="h-seccion">¿Qué trabajo se va a realizar?</h2>' +
      '<p class="intro">El tipo de trabajo define qué controles se verificarán en el paso 5.</p>' +

      '<label class="etiqueta">Tipo de trabajo en caliente *</label>' +
      '<div class="fichas">' +
        C.tiposTrabajo.map(function (x) {
          return '<button type="button" class="ficha' + (t.tipos.indexOf(x.id) >= 0 ? ' es-activo' : '') +
            '" data-accion="tipo" data-valor="' + esc(x.id) + '">' + esc(x.nombre) + '</button>';
        }).join('') +
      '</div>' +
      (t.tipos.indexOf('otro') >= 0
        ? campo('Especifica el trabajo *', '<input type="text" data-campo="trabajo.otroTipo" value="' + esc(t.otroTipo) + '" placeholder="Ej. termofusión de tubería">')
        : '') +

      campo('Descripción del trabajo *',
        '<textarea rows="4" data-campo="trabajo.descripcion" placeholder="Ej. reparación mediante soldadura de soporte metálico.">' + esc(t.descripcion) + '</textarea>') +

      '<label class="etiqueta">Equipo o herramienta *</label>' +
      '<div class="fichas">' +
        C.equiposHerramienta.map(function (x) {
          return '<button type="button" class="ficha' + (t.equipos.indexOf(x) >= 0 ? ' es-activo' : '') +
            '" data-accion="equipo" data-valor="' + esc(x) + '">' + esc(x) + '</button>';
        }).join('') +
      '</div>' +
      (t.equipos.indexOf('Otro') >= 0
        ? campo('Especifica el equipo *', '<input type="text" data-campo="trabajo.otroEquipo" value="' + esc(t.otroEquipo) + '" placeholder="Ej. cortadora de plasma">')
        : '') +

      campo('Elemento sobre el que se trabajará *', select('trabajo.elemento', C.elementosTrabajo, t.elemento, 'Selecciona el elemento')) +
      (t.elemento === 'Otro'
        ? campo('Especifica el elemento *', '<input type="text" data-campo="trabajo.otroElemento" value="' + esc(t.otroElemento) + '" placeholder="Ej. tanque de almacenamiento">')
        : '');
  }

  /* --- Paso 3: personal autorizado --- */
  function pasoPersonal(p) {
    var pe = p.personal;
    return '' +
      '<h2 class="h-seccion">Personal que participará en el trabajo</h2>' +
      '<p class="intro">Solo el personal registrado aquí queda autorizado a ejecutar la tarea.</p>' +

      campo('Responsable del trabajo', '<input type="text" value="' + esc(p.identificacion.responsableTrabajo) + '" disabled>' +
        '<small class="ayuda">Se toma del paso 1.</small>') +

      '<label class="etiqueta">Trabajadores *</label>' +
      '<div class="agregar">' +
        '<input type="text" id="nuevoTrabajador" list="lstTrab" placeholder="Nombre del trabajador">' +
        listaNombres('lstTrab', C.trabajadores) +
        '<button class="btn btn--secundario" data-accion="agregar-trabajador">Agregar</button>' +
      '</div>' +
      (pe.trabajadores.length
        ? '<div class="chips">' + pe.trabajadores.map(function (n, i) {
            return '<span class="chip">' + esc(n) +
              '<button data-accion="quitar-trabajador" data-i="' + i + '" aria-label="Quitar a ' + esc(n) + '">×</button></span>';
          }).join('') + '</div>'
        : '<p class="vacio">Todavía no has registrado trabajadores.</p>') +

      campo('Supervisor *', '<input type="text" list="lstSup" data-campo="personal.supervisor" value="' + esc(pe.supervisor) + '" placeholder="Supervisor a cargo">' +
        listaNombres('lstSup', C.responsables.concat(C.autorizantes).map(function (r) { return r.nombre; }))) +

      '<div class="preg"><p class="preg__texto">¿La tarea requiere vigía o personal de apoyo?</p>' +
        segmento('personal.vigia', 'requiere', pe.vigia.requiere, C.escalas.sino) + '</div>' +
      (pe.vigia.requiere === 'si'
        ? '<div class="sub-bloque">' +
            campo('Nombre del vigía o apoyo *', '<input type="text" list="lstVig" data-campo="personal.vigia.nombre" value="' + esc(pe.vigia.nombre) + '" placeholder="Nombre y apellidos">' +
              listaNombres('lstVig', C.trabajadores)) +
          '</div>'
        : '') +

      '<label class="confirmacion">' +
        '<input type="checkbox" data-accion="confirmacion"' + (pe.confirmacion ? ' checked' : '') + '>' +
        '<span>' + esc(C.confirmacionPersonal) + '</span>' +
      '</label>';
  }

  /* --- Paso 4: condiciones del área --- */
  function pasoCondiciones(p) {
    return '<h2 class="h-seccion">Condiciones para la ejecución</h2>' +
      '<p class="intro">Describe el escenario real del área antes de definir controles.</p>' +
      C.condicionesArea.map(function (q) {
        var v = p.condiciones[q.id];
        var html = '<article class="cond">' +
          '<header class="cond__cab"><h3>' + esc(q.titulo) + '</h3>' + marcas(q) + '</header>' +
          '<p class="cond__preg">' + esc(q.pregunta) + '</p>' +
          controlRespuesta(q, v, 'condiciones');

        if (q.ayuda) html += '<p class="cond__ayuda">' + esc(q.ayuda) + '</p>';
        if (q.tipo === 'opciones' && v && (q.bloqueaSi || []).indexOf(v) >= 0) {
          html += '<div class="alerta alerta--mal">Condición sin resolver. El permiso no puede autorizarse mientras se mantenga.</div>';
        }

        (q.hijos || []).forEach(function (h) {
          if (p.condiciones[q.id] !== h.muestraSi) return;
          var vh = p.condiciones[h.id];
          html += '<div class="cond__hijo">' +
            '<p class="cond__preg">' + esc(h.pregunta) + ' ' + marcas(h) + '</p>' +
            controlRespuesta(h, vh, 'condiciones') +
            (h.tipo === 'si_no' && vh === 'no'
              ? '<div class="alerta alerta--mal">Control crítico sin implementar. Corrige en campo antes de autorizar.</div>' : '') +
            ((h.id === 'chispas_medida' && (p.condiciones.chispas_medida || []).indexOf('Otra') >= 0)
              ? campo('Describe la otra medida', '<input type="text" data-campo="condiciones.chispas_otra" value="' + esc(p.condiciones.chispas_otra || '') + '" placeholder="Medida implementada">')
              : '') +
          '</div>';
        });

        return html + '</article>';
      }).join('');
  }

  /* Dibuja el control adecuado al tipo de pregunta */
  function controlRespuesta(q, valor, grupo) {
    if (q.tipo === 'opciones') {
      return '<div class="opciones">' + q.opciones.map(function (o) {
        return '<button type="button" class="opcion opcion--' + o.tono + (valor === o.valor ? ' es-activo' : '') + '" ' +
          'data-accion="resp" data-grupo="' + grupo + '" data-item="' + esc(q.id) + '" data-valor="' + esc(o.valor) + '">' +
          esc(o.etiqueta) + '</button>';
      }).join('') + '</div>';
    }
    if (q.tipo === 'multiple') {
      var sel = valor || [];
      return '<div class="fichas">' + q.opciones.map(function (o) {
        return '<button type="button" class="ficha' + (sel.indexOf(o) >= 0 ? ' es-activo' : '') + '" ' +
          'data-accion="multiple" data-grupo="' + grupo + '" data-item="' + esc(q.id) + '" data-valor="' + esc(o) + '">' +
          esc(o) + '</button>';
      }).join('') + '</div>';
    }
    var escala = q.tipo === 'si_no_na' ? C.escalas.sinona : C.escalas.sino;
    return segmento(grupo, q.id, valor, escala);
  }

  /* --- Paso 5: controles del trabajo --- */
  function pasoControles(p) {
    var bloques = window.Petar.controlesAplicables(p);
    return '<p class="intro">Se muestran los controles del trabajo seleccionado: ' +
        esc(window.Petar.tipoTrabajoTexto(p) || 'sin tipo definido') + '.</p>' +
      leyendaNiveles() +
      bloques.map(function (b) {
        return '<h2 class="h-seccion">' + esc(b.titulo) + '</h2>' +
          '<p class="intro">' + esc(b.resumen) + '</p>' +
          b.items.map(function (it) {
            return itemControl('controles.' + b.clave, it, (p.controles[b.clave] || {})[it.id]);
          }).join('');
      }).join('');
  }

  function leyendaNiveles() {
    return '<div class="leyenda">' +
      '<span><i class="pt pt--critico"></i>Crítico: bloquea la autorización</span>' +
      '<span><i class="pt pt--requerido"></i>Requerido: exige registrar la medida</span>' +
      '<span><i class="pt pt--info"></i>Informativo</span>' +
    '</div>';
  }

  function itemControl(grupo, it, valor) {
    var alerta = '';
    if (valor === 'no') {
      alerta = '<div class="alerta alerta--' + (it.nivel === 'critico' ? 'mal' : 'aviso') + '">' +
        (it.nivel === 'critico'
          ? 'Control crítico sin cumplir. El permiso no puede autorizarse hasta corregirlo.'
          : 'Control requerido sin cumplir. Registra la medida adoptada en observaciones.') + '</div>';
    }
    return '<div class="preg" data-preg="' + esc(grupo + '.' + it.id) + '">' +
      '<p class="preg__texto">' + esc(it.label) + ' ' + marcas(it) + '</p>' +
      segmento(grupo, it.id, valor, escalaDe(it)) +
      '<div class="preg__alerta">' + alerta + '</div>' +
    '</div>';
  }

  /* --- Paso 6: EPP --- */
  function pasoEpp(p) {
    var sugerido = window.Petar.eppSugerido(p);
    return '<h2 class="h-seccion">EPP requerido para esta tarea</h2>' +
      '<p class="intro">El aplicativo sugiere el EPP según el trabajo elegido; el responsable confirma qué se usará realmente.</p>' +
      '<div class="alerta alerta--aviso">El EPP es la última barrera de la jerarquía de controles. No reemplaza a los controles colectivos verificados en los pasos 4 y 5.</div>' +
      C.epp.map(function (it) {
        var esSugerido = sugerido.indexOf(it.id) >= 0;
        return '<div class="preg' + (esSugerido ? ' preg--sugerida' : '') + '" data-preg="epp.' + esc(it.id) + '">' +
          '<p class="preg__texto">' + esc(it.label) + ' ' + marcas(it) +
            (esSugerido ? '<span class="marca marca--sugerido">Sugerido</span>' : '') + '</p>' +
          segmento('epp', it.id, p.epp[it.id], esSugerido ? escalaDe(it) : C.escalas.sinona) +
        '</div>';
      }).join('') +
      (p.epp.otro_epp === 'si'
        ? campo('Especifica el otro EPP *', '<input type="text" data-campo="otroEppDetalle" value="' + esc(p.otroEppDetalle) + '" placeholder="Ej. arnés, mandil de cuero">')
        : '');
  }

  /* --- Paso 7: exposición y condiciones especiales --- */
  function pasoExposicion(p) {
    var x = p.exposicion, s = p.especiales;
    return '' +
      '<h2 class="h-seccion">Condiciones de exposición</h2>' +
      '<p class="intro">Registro de los agentes que pueden estar presentes durante la tarea.</p>' +
      '<label class="etiqueta">Agentes potencialmente presentes</label>' +
      '<div class="fichas">' +
        C.agentesExposicion.map(function (a) {
          return '<button type="button" class="ficha' + (x.agentes.indexOf(a) >= 0 ? ' es-activo' : '') +
            '" data-accion="agente" data-valor="' + esc(a) + '">' + esc(a) + '</button>';
        }).join('') +
      '</div>' +
      (x.agentes.indexOf('Otros') >= 0
        ? campo('Especifica el otro agente *', '<input type="text" data-campo="exposicion.otroAgente" value="' + esc(x.otroAgente) + '" placeholder="Agente identificado">')
        : '') +

      '<div class="preg"><p class="preg__texto">¿Existe evaluación higiénica u ocupacional aplicable al puesto o tarea?</p>' +
        '<div class="opciones">' + C.evaluacionHigienica.map(function (o) {
          return '<button type="button" class="opcion' + (x.evaluacion === o.valor ? ' es-activo' : '') + '" ' +
            'data-accion="resp" data-grupo="exposicion" data-item="evaluacion" data-valor="' + o.valor + '">' + esc(o.etiqueta) + '</button>';
        }).join('') + '</div></div>' +

      (x.evaluacion === 'si'
        ? '<div class="sub-bloque">' +
            campo('Fecha de la última evaluación', '<input type="date" data-campo="exposicion.fechaEvaluacion" value="' + esc(x.fechaEvaluacion) + '">') +
            campo('Resultado', '<input type="text" data-campo="exposicion.resultado" value="' + esc(x.resultado) + '" placeholder="Ej. dentro de límites permisibles">') +
            campo('Control relacionado', '<input type="text" data-campo="exposicion.control" value="' + esc(x.control) + '" placeholder="Ej. extracción localizada">') +
          '</div>'
        : '') +

      '<p class="nota">Este bloque no sustituye al monitoreo ocupacional: la evaluación de exposición se gestiona dentro del SGSST, no antes de cada permiso.</p>' +

      '<h2 class="h-seccion">Condiciones especiales</h2>' +
      '<div class="preg"><p class="preg__texto">' + esc(C.especiales.recipiente.pregunta) + '</p>' +
        segmento('especiales', 'recipiente', s.recipiente, C.escalas.sino) + '</div>' +
      (s.recipiente === 'si'
        ? '<div class="sub-bloque">' +
            '<div class="preg"><p class="preg__texto">' + esc(C.especiales.recipiente.hijoPregunta) +
              ' <span class="marca marca--norma">D.S. 42-F</span></p>' +
              segmento('especiales', 'recipienteInflamables', s.recipienteInflamables, C.escalas.sino) + '</div>' +
            (s.recipienteInflamables === 'si'
              ? C.especiales.recipiente.controles.map(function (it) {
                  return itemControl('especiales.recipienteControles', it, s.recipienteControles[it.id]);
                }).join('')
              : '') +
          '</div>'
        : '') +

      '<div class="preg"><p class="preg__texto">' + esc(C.especiales.confinado.pregunta) + '</p>' +
        segmento('especiales', 'confinado', s.confinado, C.escalas.sino) + '</div>' +
      (s.confinado === 'si'
        ? '<div class="sub-bloque">' +
            '<div class="alerta alerta--aviso">' + esc(C.especiales.confinado.advertencia) + '</div>' +
            C.especiales.confinado.controles.map(function (it) {
              return itemControl('especiales.confinadoControles', it, s.confinadoControles[it.id]);
            }).join('') +
          '</div>'
        : '');
  }

  /* --- Paso 8: observaciones y evidencias --- */
  function pasoEvidencias(p) {
    var r = window.Petar.resumenConformidad(p);
    return '' +
      (r.requeridosNo > 0
        ? '<div class="alerta alerta--aviso">Hay ' + r.requeridosNo + ' control(es) requerido(s) sin cumplir. Describe la medida adoptada.</div>'
        : '') +
      campo('Observaciones y medidas adicionales',
        '<textarea rows="5" data-campo="observaciones" placeholder="Restricciones, medidas complementarias, acuerdos con el área.">' + esc(p.observaciones) + '</textarea>') +

      '<h2 class="h-seccion">Fotografías</h2>' +
      '<p class="intro">Hasta ' + C.fotos.maxPorPetar + ' imágenes del área, los controles o la señalización.</p>' +
      '<div class="galeria">' + galeriaHTML(p) + '</div>' +
      (p.fotos.length < C.fotos.maxPorPetar
        ? '<label class="btn btn--fantasma btn--ancho">Agregar fotografía' +
            '<input type="file" accept="image/*" capture="environment" hidden data-accion="foto"></label>'
        : '<p class="nota">Alcanzaste el máximo de fotografías.</p>');
  }

  function galeriaHTML(p) {
    if (!p.fotos.length) return '<p class="vacio">Sin fotografías adjuntas.</p>';
    return p.fotos.map(function (f, i) {
      return '<figure class="foto">' +
        '<img src="' + f.dataUrl + '" alt="Fotografía ' + (i + 1) + '">' +
        '<button class="foto__quitar" data-accion="quitar-foto" data-id="' + esc(f.id) + '" aria-label="Quitar fotografía ' + (i + 1) + '">×</button>' +
      '</figure>';
    }).join('');
  }

  /* --- Paso 9: vigencia y autorización --- */
  function pasoVigencia(p) {
    var v = p.vigencia;
    return '' +
      '<h2 class="h-seccion">Vigencia del permiso</h2>' +
      '<p class="intro">La duración la define el responsable según el trabajo; el aplicativo no impone un plazo fijo.</p>' +
      '<div class="par">' +
        campo('Inicio — fecha *', '<input type="date" data-campo="vigencia.inicioFecha" value="' + esc(v.inicioFecha) + '">') +
        campo('Inicio — hora *', '<input type="time" data-campo="vigencia.inicioHora" value="' + esc(v.inicioHora) + '">') +
      '</div>' +
      '<div class="par">' +
        campo('Término — fecha *', '<input type="date" data-campo="vigencia.finFecha" value="' + esc(v.finFecha) + '">') +
        campo('Término — hora *', '<input type="time" data-campo="vigencia.finHora" value="' + esc(v.finHora) + '">') +
      '</div>' +
      '<div class="caja-info"><strong>El permiso pierde vigencia cuando:</strong><ul>' +
        C.causalesPerdidaVigencia.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') +
      '</ul></div>' +

      '<h2 class="h-seccion">Autorización</h2>' +
      '<p class="intro">' + esc(C.textoAutorizacion) + '</p>' +
      C.firmas.filter(function (f) { return f.activa; }).map(function (f) {
        return bloqueFirma(f, p.autorizacion[f.clave]);
      }).join('') +
      (C.firmas.some(function (f) { return !f.activa; })
        ? '<p class="nota">La firma de SST está preparada en la configuración y desactivada: se habilitará cuando Grupo Pana defina si SST firma cada permiso.</p>'
        : '');
  }

  function bloqueFirma(cfg, datos) {
    var catalogo = cfg.clave === 'ejecutor' ? C.responsables : C.autorizantes;
    return '<h3 class="h-sub">' + esc(cfg.titulo) + (cfg.requerida ? ' *' : '') + '</h3>' +
      campo('Nombre', '<input type="text" list="lstF' + cfg.clave + '" data-campo="autorizacion.' + cfg.clave + '.nombre" value="' + esc(datos.nombre) + '" placeholder="Nombre y apellidos">' +
        listaNombres('lstF' + cfg.clave, catalogo.map(function (r) { return r.nombre; }))) +
      campo('Cargo', '<input type="text" data-campo="autorizacion.' + cfg.clave + '.cargo" value="' + esc(datos.cargo) + '" placeholder="Ej. Supervisor SST">') +
      '<div class="firma">' +
        '<canvas class="firma__lienzo" data-firma="' + cfg.clave + '" aria-label="Área de firma de ' + esc(cfg.titulo) + '"></canvas>' +
        '<div class="firma__pie"><span>Firma con el dedo dentro del recuadro</span>' +
          '<button class="enlace" data-accion="borrar-firma" data-firma="' + cfg.clave + '">Borrar firma</button></div>' +
      '</div>';
  }

  function montarFirmas() {
    estado.firmas = {};
    window.UI.$$('canvas[data-firma]').forEach(function (canvas) {
      var clave = canvas.dataset.firma;
      var pad = window.UI.FirmaPad(canvas);
      estado.firmas[clave] = pad;
      var destino = (clave === 'cierre') ? { firma: estado.petar.cierre.firma } : estado.petar.autorizacion[clave];
      setTimeout(function () { pad.cargar(destino.firma); }, 60);
      pad.alTerminar = function (data) {
        if (clave === 'cierre') {
          estado.petar.cierre.firma = data;
        } else {
          estado.petar.autorizacion[clave].firma = data;
          estado.petar.autorizacion[clave].fechaHora = data ? new Date().toISOString() : '';
        }
        autoguardar();
      };
    });
  }

  /* --- Piezas de formulario --- */
  function campo(etiqueta, control) {
    var id = 'c' + Math.random().toString(36).slice(2, 7);
    return '<div class="campo"><label for="' + id + '">' + esc(etiqueta) + '</label>' +
      control.replace(/<(input|select|textarea)/, '<$1 id="' + id + '"') + '</div>';
  }

  function select(ruta, opciones, valor, placeholder) {
    return '<select data-campo="' + ruta + '">' +
      '<option value="">' + esc(placeholder || 'Selecciona') + '</option>' +
      opciones.map(function (o) {
        return '<option value="' + esc(o) + '"' + (o === valor ? ' selected' : '') + '>' + esc(o) + '</option>';
      }).join('') + '</select>';
  }

  function listaNombres(id, nombres) {
    return '<datalist id="' + id + '">' + nombres.map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist>';
  }

  function segmento(grupo, itemId, valor, escala) {
    return '<div class="seg" role="group">' + escala.map(function (op) {
      return '<button type="button" class="seg__btn seg__btn--' + op.tono + (valor === op.valor ? ' es-activo' : '') + '" ' +
        'data-accion="resp" data-grupo="' + grupo + '" data-item="' + itemId + '" data-valor="' + op.valor + '">' +
        esc(op.etiqueta) + '</button>';
    }).join('') + '</div>';
  }

  /* ===================== Pantalla: verificación ===================== */

  function vistaVerificacion() {
    var p = estado.petar;
    var errores = window.Validador.validarTodo(p);
    var bloqueos = window.Validador.bloqueosParaAutorizar(p);

    app.innerHTML =
      resumenHTML(p, true) +
      (errores.length
        ? '<div class="alerta alerta--aviso"><strong>Falta información para autorizar</strong><ul>' +
            errores.slice(0, 8).map(function (e) { return '<li>' + esc(e.pasoTitulo + ': ' + e.mensaje) + '</li>'; }).join('') +
          '</ul></div>'
        : '') +
      bloqueos.map(function (b) {
        return '<div class="alerta alerta--mal"><strong>' + esc(b.mensaje) + '</strong>' +
          (b.detalle.length ? '<ul>' + b.detalle.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ul>' : '') + '</div>';
      }).join('') +
      '<section class="bloque acciones-finales">' +
        '<button class="btn btn--fantasma btn--ancho" data-accion="editar" data-paso="0">Editar el permiso</button>' +
        '<button class="btn btn--secundario btn--ancho" data-accion="guardar-salir">Guardar y salir</button>' +
        (bloqueos.length
          ? '<button class="btn btn--peligro btn--ancho" data-accion="no-autorizar">Registrar como no autorizado</button>'
          : '<button class="btn btn--principal btn--ancho" data-accion="autorizar"' + (errores.length ? ' disabled' : '') + '>' +
              'Autorizar permiso</button>') +
      '</section>';
  }

  function resumenHTML(p, editable) {
    var sem = TEXTO_SEMAFORO[window.Petar.semaforo(p)];
    var r = window.Petar.resumenConformidad(p);
    var i = p.identificacion;

    function fila(k, v) {
      return '<div class="dato"><span>' + esc(k) + '</span><strong>' + esc(v || '—') + '</strong></div>';
    }
    function editar(paso) {
      return editable ? '<button class="enlace" data-accion="editar" data-paso="' + paso + '">Editar</button>' : '';
    }

    /* Lista compacta de respuestas de un bloque de control */
    function listaItems(items, valores, prefijo) {
      return '<ul class="lista-check">' + items.map(function (it) {
        var v = (valores || {})[it.id];
        var tono = v === 'si' ? 'ok' : (v === 'no' ? 'mal' : (v === 'na' ? 'neutro' : 'vacio'));
        var txt = v === 'si' ? 'Sí' : (v === 'no' ? 'No' : (v === 'na' ? 'N/A' : 'Sin responder'));
        return '<li class="check check--' + tono + '"><span>' + esc((prefijo || '') + it.label) + '</span><b>' + txt + '</b></li>';
      }).join('') + '</ul>';
    }

    var vigenciaTxt = window.Petar.vigenciaTexto(p);
    var minutos = window.Petar.minutosRestantes(p);

    return '<section class="bloque">' +
      '<div class="cabecera-resumen">' +
        '<div><strong class="numero">' + esc(p.numero) + '</strong>' + pastilla(p) + '</div>' +
        '<span class="semaforo semaforo--' + sem[0] + '">' + esc(sem[1]) + '</span>' +
      '</div>' +

      '<div class="banda-vigencia' + (window.Petar.estaVencido(p) ? ' banda-vigencia--vencida' : '') + '">' +
        '<span>Vigencia</span><strong>' + esc(vigenciaTxt) + '</strong>' +
        (minutos !== null
          ? '<small>' + (minutos > 0 ? 'Quedan ' + Math.floor(minutos / 60) + ' h ' + (minutos % 60) + ' min' : 'Plazo cumplido') + '</small>'
          : '<small>Sin plazo definido</small>') +
      '</div>' +

      '<div class="conteo">' +
        '<span class="conteo__ok">' + r.si + ' cumplidos</span>' +
        '<span class="conteo__mal">' + r.no + ' sin cumplir</span>' +
        '<span class="conteo__neutro">' + r.na + ' N/A</span>' +
        (r.sinResponder ? '<span class="conteo__aviso">' + r.sinResponder + ' sin responder</span>' : '') +
      '</div>' +

      '<div class="titulo-fila"><h2>Identificación</h2>' + editar(0) + '</div>' +
      '<div class="datos">' +
        fila('Fecha', window.UI.fechaLarga(i.fecha)) +
        fila('Área', i.area) +
        fila('Subárea', i.subarea) +
        fila('Ubicación exacta', i.ubicacion) +
        fila('Empresa ejecutante', i.empresa === 'Otro' ? (i.empresaOtra || 'Otro') : i.empresa) +
        fila('Responsable del trabajo', i.responsableTrabajo) +
        fila('Solicita el permiso', i.solicitante) +
      '</div>' +

      '<div class="titulo-fila"><h2>Trabajo</h2>' + editar(1) + '</div>' +
      '<div class="datos">' +
        fila('Tipo', window.Petar.tipoTrabajoTexto(p)) +
        fila('Equipo o herramienta', window.Petar.equiposTexto(p)) +
        fila('Elemento', window.Petar.elementoTexto(p)) +
      '</div>' +
      '<p class="parrafo">' + esc(p.trabajo.descripcion || 'Sin descripción.') + '</p>' +

      '<div class="titulo-fila"><h2>Personal autorizado</h2>' + editar(2) + '</div>' +
      '<div class="datos">' +
        fila('Trabajadores', window.Petar.personalTexto(p)) +
        fila('Supervisor', p.personal.supervisor) +
        fila('Vigía o apoyo', p.personal.vigia.requiere === 'si' ? p.personal.vigia.nombre : 'No requiere') +
        fila('Conocen riesgos y controles', p.personal.confirmacion ? 'Confirmado' : 'Sin confirmar') +
      '</div>' +

      '<div class="titulo-fila"><h2>Condiciones del área</h2>' + editar(3) + '</div>' +
      '<ul class="lista-check">' +
        window.Petar.condicionesVisibles(p).map(function (q) {
          var v = p.condiciones[q.id];
          var txt, tono;
          if (q.tipo === 'opciones') {
            var op = q.opciones.find(function (o) { return o.valor === v; });
            txt = op ? op.etiqueta : 'Sin responder';
            tono = op ? op.tono : 'vacio';
          } else if (q.tipo === 'multiple') {
            txt = (v && v.length) ? v.join(', ') : 'Sin definir';
            tono = (v && v.length) ? 'ok' : 'vacio';
          } else {
            txt = v === 'si' ? 'Sí' : (v === 'no' ? 'No' : (v === 'na' ? 'N/A' : 'Sin responder'));
            tono = v === 'si' ? 'ok' : (v === 'no' ? (q.nivel === 'critico' ? 'mal' : 'aviso') : (v ? 'neutro' : 'vacio'));
          }
          return '<li class="check check--' + tono + '"><span>' + esc(q.pregunta) + '</span><b>' + esc(txt) + '</b></li>';
        }).join('') +
      '</ul>' +

      window.Petar.controlesAplicables(p).map(function (b) {
        return '<div class="titulo-fila"><h2>' + esc(b.titulo) + '</h2>' + editar(4) + '</div>' +
          listaItems(b.items, p.controles[b.clave]);
      }).join('') +

      '<div class="titulo-fila"><h2>EPP</h2>' + editar(5) + '</div>' +
      listaItems(C.epp.filter(function (e) {
        return window.Petar.eppSugerido(p).indexOf(e.id) >= 0 || p.epp[e.id];
      }), p.epp) +

      '<div class="titulo-fila"><h2>Exposición y condiciones especiales</h2>' + editar(6) + '</div>' +
      '<div class="datos">' +
        fila('Agentes presentes', (p.exposicion.agentes || []).join(', ')) +
        fila('Evaluación higiénica', (C.evaluacionHigienica.find(function (o) { return o.valor === p.exposicion.evaluacion; }) || {}).etiqueta) +
        fila('Trabajo sobre recipiente', p.especiales.recipiente === 'si'
          ? (p.especiales.recipienteInflamables === 'si' ? 'Sí, contuvo inflamables' : 'Sí') : 'No') +
        fila('Espacio confinado', p.especiales.confinado === 'si' ? 'Sí' : 'No') +
      '</div>' +
      window.Petar.especialesActivos(p).map(function (b) {
        return '<div class="titulo-fila"><h2>' + esc(b.titulo) + '</h2>' + editar(6) + '</div>' +
          listaItems(b.items, p.especiales[b.clave]);
      }).join('') +

      '<div class="titulo-fila"><h2>Observaciones</h2>' + editar(7) + '</div>' +
      '<p class="parrafo">' + esc(p.observaciones || 'Sin observaciones.') + '</p>' +
      '<div class="galeria">' + galeriaResumen(p) + '</div>' +

      '<div class="titulo-fila"><h2>Autorización</h2>' + editar(8) + '</div>' +
      '<div class="firmas-resumen">' +
        C.firmas.filter(function (f) { return f.activa; }).map(function (f) {
          var d = p.autorizacion[f.clave];
          return '<div class="firma-mini">' +
            (d.firma ? '<img src="' + d.firma + '" alt="Firma de ' + esc(d.nombre) + '">' : '<span class="firma-mini__falta">Sin firma</span>') +
            '<strong>' + esc(d.nombre || '—') + '</strong><small>' + esc(d.cargo || f.titulo) + '</small></div>';
        }).join('') +
      '</div>' +
    '</section>';
  }

  function galeriaResumen(p) {
    if (!p.fotos.length) return '<p class="vacio">Sin fotografías.</p>';
    return p.fotos.map(function (f, i) {
      return '<figure class="foto foto--solo"><img src="' + f.dataUrl + '" alt="Fotografía ' + (i + 1) + '"></figure>';
    }).join('');
  }

  /* ========================= Historial ============================= */

  function vistaHistorial() {
    app.innerHTML = '<section class="bloque"><p class="intro">Cargando…</p></section>';

    window.Store.getAllPetar().then(function (lista) {
      estado.lista = lista.map(window.Petar.normalizar).map(revisarVigencia);
      var responsables = [];
      estado.lista.forEach(function (p) {
        var r = p.identificacion.responsableTrabajo;
        if (r && responsables.indexOf(r) < 0) responsables.push(r);
      });
      var f = estado.filtros;

      app.innerHTML =
        '<section class="bloque">' +
          '<div class="campo"><label for="buscar">Buscar</label>' +
            '<input id="buscar" type="search" data-filtro="texto" value="' + esc(f.texto) + '" placeholder="Número, área, responsable o trabajo"></div>' +
          '<div class="par">' +
            campo('Estado', '<select data-filtro="estado"><option value="">Todos</option>' +
              Object.keys(C.estados).map(function (k) {
                return '<option value="' + k + '"' + (f.estado === k ? ' selected' : '') + '>' + esc(C.estados[k].etiqueta) + '</option>';
              }).join('') + '</select>') +
            campo('Fecha', '<input type="date" data-filtro="fecha" value="' + esc(f.fecha) + '">') +
          '</div>' +
          campo('Responsable', '<select data-filtro="responsable"><option value="">Todos</option>' +
            responsables.map(function (r) {
              return '<option value="' + esc(r) + '"' + (f.responsable === r ? ' selected' : '') + '>' + esc(r) + '</option>';
            }).join('') + '</select>') +
          '<div id="listaHist"></div>' +
        '</section>';

      pintarLista();
    });
  }

  function pintarLista() {
    var cont = document.getElementById('listaHist');
    if (!cont) return;
    var f = estado.filtros;
    var filtrada = (estado.lista || []).filter(function (p) {
      var texto = (p.numero + ' ' + p.identificacion.area + ' ' + p.identificacion.subarea + ' ' + p.identificacion.ubicacion + ' ' +
        p.identificacion.responsableTrabajo + ' ' + window.Petar.tipoTrabajoTexto(p) + ' ' + p.trabajo.descripcion).toLowerCase();
      if (f.texto && texto.indexOf(f.texto.toLowerCase()) < 0) return false;
      if (f.estado && window.Petar.estadoVisible(p) !== f.estado) return false;
      if (f.responsable && p.identificacion.responsableTrabajo !== f.responsable) return false;
      if (f.fecha && p.identificacion.fecha !== f.fecha) return false;
      return true;
    });

    cont.innerHTML =
      '<div class="titulo-fila"><h2>' + filtrada.length + ' permiso(s)</h2>' +
        (filtrada.length ? '<button class="enlace" data-accion="exportar">Exportar CSV</button>' : '') + '</div>' +
      (filtrada.length ? filtrada.map(filaHistorial).join('') : vacio('Ningún permiso coincide con los filtros.'));
  }

  function filaHistorial(p) {
    return '<div class="hist">' +
      '<button class="hist__cuerpo" data-accion="abrir" data-id="' + esc(p.id) + '">' +
        '<div class="tarjeta__fila"><strong>' + esc(p.numero) + '</strong>' + pastilla(p) + '</div>' +
        '<div class="tarjeta__meta">' + esc(window.UI.fechaLarga(p.identificacion.fecha)) + ' · ' +
          esc(p.vigencia.inicioHora || '--:--') + ' a ' + esc(p.vigencia.finHora || '--:--') +
          ' · ' + esc(p.identificacion.area || 'Sin área') + '</div>' +
        '<div class="tarjeta__meta">' + esc(p.identificacion.responsableTrabajo || '') + ' · ' +
          esc(window.Petar.tipoTrabajoTexto(p) || 'Sin tipo') + '</div>' +
      '</button>' +
      '<button class="hist__pdf" data-accion="pdf" data-id="' + esc(p.id) + '">PDF</button>' +
    '</div>';
  }

  /* ====================== Ficha del permiso ======================== */

  function vistaDetalle() {
    var p = estado.petar;
    var visible = window.Petar.estadoVisible(p);
    var editable = ['BORRADOR', 'PENDIENTE', 'NO_AUTORIZADO'].indexOf(p.estado) >= 0;
    var enEjecucion = (visible === 'AUTORIZADO');
    var suspendido = (p.estado === 'SUSPENDIDO');

    app.innerHTML =
      resumenHTML(p, false) +

      (p.suspension
        ? '<section class="bloque"><div class="alerta alerta--aviso"><strong>Permiso suspendido</strong>' +
            '<div>' + esc(p.suspension.motivo) + (p.suspension.detalle ? ' — ' + esc(p.suspension.detalle) : '') + '</div>' +
            '<div>' + esc(window.UI.fechaHora(p.suspension.fechaHora)) + ' · ' + esc(p.suspension.usuario) + '</div>' +
          '</div></section>'
        : '') +

      (p.cierre.fechaHora
        ? '<section class="bloque"><div class="caja-info"><strong>Cierre registrado</strong>' +
            '<div>' + esc(window.UI.fechaHora(p.cierre.fechaHora)) + ' · ' + esc(p.cierre.responsable) + '</div>' +
            (p.cierre.comentario ? '<div>' + esc(p.cierre.comentario) + '</div>' : '') +
          '</div></section>'
        : '') +

      '<section class="bloque">' +
        '<h2 class="h-seccion">Acciones</h2>' +
        '<button class="btn btn--principal btn--ancho" data-accion="pdf" data-id="' + esc(p.id) + '">Generar documento PDF</button>' +
        (enEjecucion ? '<button class="btn btn--fantasma btn--ancho" data-accion="suspender">Suspender permiso</button>' : '') +
        (enEjecucion || suspendido || visible === 'VENCIDO'
          ? '<button class="btn btn--secundario btn--ancho" data-accion="ir-cierre">Cerrar permiso</button>' : '') +
        (suspendido && window.Petar.puedeReanudarse(p)
          ? '<button class="btn btn--principal btn--ancho" data-accion="reanudar">Reanudar permiso</button>' : '') +
        (editable ? '<button class="btn btn--fantasma btn--ancho" data-accion="editar" data-paso="0">Continuar edición</button>' : '') +
        '<button class="btn btn--peligro btn--ancho" data-accion="eliminar" data-id="' + esc(p.id) + '">Eliminar permiso</button>' +

        '<h2 class="h-seccion">Trazabilidad</h2>' +
        '<div class="historial-estados">' +
          p.historialEstados.slice().reverse().map(function (h) {
            return '<div class="he"><span>' + esc(window.Petar.etiquetaEstado(h.estado)) + '</span>' +
              '<small>' + esc(window.UI.fechaHora(h.fechaHora)) + ' · ' + esc(h.usuario || '') +
              (h.comentario ? ' · ' + esc(h.comentario) : '') + '</small></div>';
          }).join('') +
        '</div>' +
      '</section>';
  }

  /* ====================== Pantalla: cierre ========================= */

  function vistaCierre() {
    var p = estado.petar;
    app.innerHTML =
      '<section class="bloque">' +
        '<p class="intro">El cierre confirma que el trabajo terminó y que el área quedó en condiciones seguras.</p>' +
        window.UI.listaErrores(estado.erroresCierre) +
        '<h2 class="h-seccion">Verificación de cierre</h2>' +
        C.cierre.map(function (it) {
          var marcado = !!p.cierre.checklist[it.id];
          return '<button type="button" class="cierre-item' + (marcado ? ' es-activo' : '') + '" ' +
            'data-accion="cierre-item" data-item="' + esc(it.id) + '">' +
            '<span class="cierre-item__caja">' + (marcado ? '✓' : '') + '</span>' +
            '<span class="cierre-item__txt">' + esc(it.label) + ' ' + marcas(it) + '</span></button>';
        }).join('') +

        campo('Responsable que entrega el área *',
          '<input type="text" list="lstCierre" data-campo="cierre.responsable" value="' + esc(p.cierre.responsable) + '" placeholder="Nombre y apellidos">' +
          listaNombres('lstCierre', C.responsables.concat(C.autorizantes).map(function (r) { return r.nombre; }))) +
        campo('Comentario de cierre',
          '<textarea rows="3" data-campo="cierre.comentario" placeholder="Condiciones en las que se entrega el área.">' + esc(p.cierre.comentario) + '</textarea>') +

        '<h3 class="h-sub">Firma de cierre *</h3>' +
        '<div class="firma">' +
          '<canvas class="firma__lienzo" data-firma="cierre" aria-label="Área de firma de cierre"></canvas>' +
          '<div class="firma__pie"><span>Firma con el dedo dentro del recuadro</span>' +
            '<button class="enlace" data-accion="borrar-firma" data-firma="cierre">Borrar firma</button></div>' +
        '</div>' +
      '</section>' +
      '<div class="barra-pie">' +
        '<button class="btn btn--fantasma" data-accion="volver-detalle">Cancelar</button>' +
        '<button class="btn btn--principal" data-accion="registrar-cierre">Registrar cierre</button>' +
      '</div>';

    montarFirmas();
  }

  /* ====================== Vista previa del PDF ===================== */

  function abrirPDF(p) {
    var url;
    try { url = window.PetarPDF.blobUrl(p); }
    catch (e) { window.UI.aviso('No se pudo generar el documento: ' + e.message, 'mal'); return; }

    var fondo = document.createElement('div');
    fondo.className = 'modal modal--pdf';
    fondo.innerHTML =
      '<div class="visor">' +
        '<div class="visor__barra"><strong>' + esc(p.numero) + '</strong>' +
          '<button class="enlace" data-cerrar>Cerrar</button></div>' +
        '<iframe class="visor__marco" src="' + url + '" title="Documento del permiso"></iframe>' +
        '<div class="visor__acciones">' +
          '<button class="btn btn--fantasma" data-nueva>Abrir en otra pestaña</button>' +
          '<button class="btn btn--principal" data-descargar>Descargar PDF</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(fondo);

    fondo.addEventListener('click', function (ev) {
      if (ev.target.hasAttribute('data-descargar')) window.PetarPDF.descargar(p);
      else if (ev.target.hasAttribute('data-nueva')) window.open(url, '_blank');
      else if (ev.target.hasAttribute('data-cerrar') || ev.target === fondo) {
        URL.revokeObjectURL(url);
        fondo.remove();
      }
    });
  }

  /* ==================== Diálogo de suspensión ====================== */

  function dialogoSuspension() {
    var p = estado.petar;
    var fondo = document.createElement('div');
    fondo.className = 'modal';
    fondo.innerHTML =
      '<div class="modal__caja" role="dialog" aria-modal="true">' +
        '<h3 class="modal__titulo">Suspender el permiso</h3>' +
        '<p class="modal__texto">El trabajo debe detenerse hasta que la condición se resuelva.</p>' +
        '<div class="campo"><label for="motivoSusp">Motivo *</label>' +
          '<select id="motivoSusp">' + C.motivosSuspension.map(function (m) {
            return '<option value="' + esc(m) + '">' + esc(m) + '</option>';
          }).join('') + '</select></div>' +
        '<div class="campo"><label for="detalleSusp">Detalle</label>' +
          '<textarea id="detalleSusp" rows="3" placeholder="Qué ocurrió y qué se necesita para reanudar."></textarea></div>' +
        '<div class="modal__acciones">' +
          '<button class="btn btn--fantasma" data-r="0">Cancelar</button>' +
          '<button class="btn btn--peligro" data-r="1">Suspender</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(fondo);

    fondo.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-r]');
      if (!b && ev.target !== fondo) return;
      var confirmar = b && b.dataset.r === '1';
      var motivo = fondo.querySelector('#motivoSusp').value;
      var detalle = fondo.querySelector('#detalleSusp').value.trim();
      fondo.remove();
      if (!confirmar) return;
      window.Petar.suspender(p, estado.usuario.nombre, motivo, detalle);
      window.Store.savePetar(p).then(function () {
        window.UI.aviso('Permiso suspendido');
        render();
      });
    });
  }

  /* ========================== Acciones ============================= */

  function crearPetar() {
    window.Store.nextCorrelativo().then(function (numero) {
      estado.petar = window.Petar.nuevo(numero, estado.usuario);
      return window.Store.savePetar(estado.petar).then(function () {
        return window.Store.setBorradorActivo(estado.petar.id);
      });
    }).then(function () {
      ir('formulario', { paso: 0 });
      window.UI.aviso('Permiso ' + estado.petar.numero + ' creado');
    });
  }

  function abrirPetar(id, pantalla, paso) {
    return window.Store.getPetar(id).then(function (p) {
      if (!p) { window.UI.aviso('El permiso ya no existe.', 'mal'); return; }
      estado.petar = revisarVigencia(window.Petar.normalizar(p));
      ir(pantalla || 'detalle', { paso: paso || 0 });
    });
  }

  function siguientePaso() {
    var pasoId = C.pasos[estado.paso].id;
    var errores = window.Validador.validarPaso(estado.petar, pasoId);
    if (errores.length) {
      estado.erroresPaso = errores;
      render();
      window.scrollTo(0, 0);
      return;
    }
    estado.erroresPaso = [];
    if (estado.paso === C.pasos.length - 1) {
      if (estado.petar.estado === 'BORRADOR') {
        window.Petar.cambiarEstado(estado.petar, 'PENDIENTE', estado.usuario.nombre, 'Enviado a verificación');
        window.Store.savePetar(estado.petar);
      }
      ir('resumen');
    } else {
      ir('formulario', { paso: estado.paso + 1 });
    }
  }

  function manejarClic(ev) {
    var b = ev.target.closest('[data-accion]');
    if (!b) return;
    var a = b.dataset.accion;
    var p = estado.petar;

    if (a === 'elegir-usuario') {
      estado.usuario = C.responsables[Number(b.dataset.i)];
      window.Store.setPreferencia('usuario', estado.usuario);
      ir('inicio');
    }

    if (a === 'usuario-otro') {
      var n = $('#oNombre').value.trim(), c = $('#oCargo').value.trim();
      if (!n) { window.UI.aviso('Escribe el nombre del responsable.', 'mal'); return; }
      estado.usuario = { nombre: n, cargo: c || 'Responsable' };
      window.Store.setPreferencia('usuario', estado.usuario);
      ir('inicio');
    }

    if (a === 'cambiar-usuario') ir('usuario');
    if (a === 'nuevo-petar') crearPetar();
    if (a === 'retomar') abrirPetar(b.dataset.id, 'formulario', 0);
    if (a === 'abrir') abrirPetar(b.dataset.id, 'detalle');
    if (a === 'ir-historial') ir('historial');
    if (a === 'volver-detalle') ir('detalle');

    if (a === 'paso-atras') {
      if (estado.paso === 0) window.Store.savePetar(p).then(function () { ir('inicio'); });
      else ir('formulario', { paso: estado.paso - 1 });
    }
    if (a === 'paso-siguiente') siguientePaso();
    if (a === 'editar') ir('formulario', { paso: Number(b.dataset.paso) });

    /* Respuesta de un botón Sí / No / N/A o de una opción */
    if (a === 'resp') {
      var grupo = b.dataset.grupo, item = b.dataset.item, valor = b.dataset.valor;
      var destino = grupo.split('.').reduce(function (o, k) {
        if (o[k] === undefined) o[k] = {};
        return o[k];
      }, p);
      destino[item] = (destino[item] === valor) ? '' : valor;
      autoguardar();
      renderQuieto();
    }

    /* Selección múltiple dentro de condiciones */
    if (a === 'multiple') {
      var g = b.dataset.grupo, it = b.dataset.item, val = b.dataset.valor;
      var cont = g.split('.').reduce(function (o, k) { if (o[k] === undefined) o[k] = {}; return o[k]; }, p);
      var arr = cont[it] || [];
      var idx = arr.indexOf(val);
      if (idx >= 0) arr.splice(idx, 1); else arr.push(val);
      cont[it] = arr;
      autoguardar();
      renderQuieto();
    }

    if (a === 'tipo') {
      var t = b.dataset.valor;
      var i1 = p.trabajo.tipos.indexOf(t);
      if (i1 >= 0) p.trabajo.tipos.splice(i1, 1); else p.trabajo.tipos.push(t);
      autoguardar();
      renderQuieto();
    }

    if (a === 'equipo') {
      var e1 = b.dataset.valor;
      var i2 = p.trabajo.equipos.indexOf(e1);
      if (i2 >= 0) p.trabajo.equipos.splice(i2, 1); else p.trabajo.equipos.push(e1);
      autoguardar();
      renderQuieto();
    }

    if (a === 'agente') {
      var ag = b.dataset.valor;
      var i3 = p.exposicion.agentes.indexOf(ag);
      if (i3 >= 0) p.exposicion.agentes.splice(i3, 1); else p.exposicion.agentes.push(ag);
      autoguardar();
      renderQuieto();
    }

    if (a === 'agregar-trabajador') {
      var campoT = $('#nuevoTrabajador');
      var nombre = campoT.value.trim();
      if (!nombre) { window.UI.aviso('Escribe el nombre del trabajador.', 'mal'); return; }
      if (p.personal.trabajadores.indexOf(nombre) >= 0) { window.UI.aviso('Ese trabajador ya está registrado.', 'mal'); return; }
      p.personal.trabajadores.push(nombre);
      autoguardar();
      renderQuieto();
    }

    if (a === 'quitar-trabajador') {
      p.personal.trabajadores.splice(Number(b.dataset.i), 1);
      autoguardar();
      renderQuieto();
    }

    if (a === 'confirmacion') {
      p.personal.confirmacion = b.checked;
      autoguardar();
    }

    if (a === 'quitar-foto') {
      p.fotos = p.fotos.filter(function (f) { return f.id !== b.dataset.id; });
      autoguardar();
      renderQuieto();
    }

    if (a === 'borrar-firma') {
      var pad = estado.firmas[b.dataset.firma];
      if (pad) pad.limpiar();
      window.UI.aviso('Firma borrada');
    }

    if (a === 'guardar-salir') {
      window.Store.savePetar(p).then(function () {
        window.UI.aviso('Permiso guardado');
        ir('inicio');
      });
    }

    if (a === 'autorizar') {
      var errores = window.Validador.validarTodo(p);
      var bloqueos = window.Validador.bloqueosParaAutorizar(p);
      if (errores.length || bloqueos.length) { render(); return; }
      window.UI.confirmar({
        titulo: 'Autorizar el permiso',
        texto: C.textoAutorizacion + ' Vigencia: ' + window.Petar.vigenciaTexto(p) + '.',
        aceptar: 'Autorizar'
      }).then(function (ok) {
        if (!ok) return;
        window.Petar.cambiarEstado(p, 'AUTORIZADO', estado.usuario.nombre, 'Autorizado por ' + p.autorizacion.autorizante.nombre);
        window.Store.savePetar(p).then(function () {
          window.UI.aviso('Permiso autorizado');
          abrirPDF(p);
          ir('detalle');
        });
      });
    }

    if (a === 'no-autorizar') {
      window.UI.confirmar({
        titulo: 'Registrar como no autorizado',
        texto: 'Quedará constancia de los controles críticos sin cumplir y el trabajo no podrá iniciar.',
        aceptar: 'Registrar', peligro: true
      }).then(function (ok) {
        if (!ok) return;
        window.Petar.cambiarEstado(p, 'NO_AUTORIZADO', estado.usuario.nombre, 'Controles críticos sin cumplir');
        window.Store.savePetar(p).then(function () { ir('detalle'); });
      });
    }

    if (a === 'suspender') dialogoSuspension();

    if (a === 'reanudar') {
      window.UI.confirmar({
        titulo: 'Reanudar el permiso',
        texto: 'Confirma que la condición que motivó la suspensión fue resuelta y verificada en campo.',
        aceptar: 'Reanudar'
      }).then(function (ok) {
        if (!ok) return;
        window.Petar.cambiarEstado(p, 'AUTORIZADO', estado.usuario.nombre, 'Reanudado tras verificar la condición');
        window.Store.savePetar(p).then(function () {
          window.UI.aviso('Permiso reanudado');
          render();
        });
      });
    }

    if (a === 'ir-cierre') ir('cierre');

    if (a === 'cierre-item') {
      var id = b.dataset.item;
      p.cierre.checklist[id] = !p.cierre.checklist[id];
      autoguardar();
      renderQuieto();
    }

    if (a === 'registrar-cierre') {
      var errC = window.Validador.validarCierre(p);
      if (errC.length) {
        estado.erroresCierre = errC;
        render();
        window.scrollTo(0, 0);
        return;
      }
      window.Petar.cerrar(p, estado.usuario.nombre);
      window.Store.savePetar(p).then(function () {
        window.UI.aviso('Permiso cerrado');
        ir('detalle');
      });
    }

    if (a === 'pdf') {
      window.Store.getPetar(b.dataset.id).then(function (doc) {
        abrirPDF(window.Petar.normalizar(doc));
      });
    }

    if (a === 'eliminar') {
      window.UI.confirmar({
        titulo: 'Eliminar el permiso',
        texto: 'Se borrará ' + p.numero + ' de este dispositivo. Esta acción no se puede deshacer.',
        aceptar: 'Eliminar', peligro: true
      }).then(function (ok) {
        if (!ok) return;
        window.Store.deletePetar(p.id).then(function () {
          estado.petar = null;
          window.UI.aviso('Permiso eliminado');
          ir('historial');
        });
      });
    }

    if (a === 'exportar') {
      window.Store.getAllPetar().then(function (lista) {
        var csv = window.Store.exportarCSV(lista.map(window.Petar.normalizar));
        window.UI.descargar('permisos_trabajo_caliente.csv', '\ufeff' + csv, 'text/csv;charset=utf-8');
        window.UI.aviso('Historial exportado');
      });
    }
  }

  function manejarEntrada(ev) {
    var el = ev.target;

    if (el.dataset && el.dataset.filtro) {
      estado.filtros[el.dataset.filtro] = el.value;
      clearTimeout(filtroPendiente);
      filtroPendiente = setTimeout(pintarLista, 220);
      return;
    }

    if (!el.dataset || !el.dataset.campo || !estado.petar) return;
    setPath(estado.petar, el.dataset.campo, el.value);
    autoguardar();

    if (el.dataset.campo === 'identificacion.area') { estado.petar.identificacion.subarea = ''; renderQuieto(); }
    if (el.dataset.campo === 'identificacion.empresa' && el.value === 'Otro') renderQuieto();
    if (el.dataset.campo === 'trabajo.elemento' && el.value === 'Otro') renderQuieto();
  }

  function manejarArchivo(ev) {
    var el = ev.target;
    if (!el.dataset || el.dataset.accion !== 'foto') return;
    var file = el.files && el.files[0];
    if (!file) return;
    window.UI.leerFoto(file).then(function (foto) {
      estado.petar.fotos.push(foto);
      return window.Store.savePetar(estado.petar);
    }).then(function () {
      window.UI.aviso('Fotografía agregada');
      render();
    }).catch(function (err) {
      window.UI.aviso(err.message, 'mal');
    });
  }

  /* ============================ Arranque =========================== */

  function iniciar() {
    app = $('#app');
    tituloApp = $('#tituloApp');
    subApp = $('#subApp');
    btnAtras = $('#btnAtras');

    app.addEventListener('click', manejarClic);
    app.addEventListener('input', function (ev) {
      if (ev.target.tagName === 'SELECT') return;
      manejarEntrada(ev);
    });
    app.addEventListener('change', function (ev) {
      if (ev.target.tagName === 'SELECT') manejarEntrada(ev);
      if (ev.target.type === 'checkbox') manejarClic(ev);
      manejarArchivo(ev);
    });

    btnAtras.addEventListener('click', function () {
      if (estado.pantalla === 'formulario') {
        if (estado.paso > 0) return ir('formulario', { paso: estado.paso - 1 });
        return window.Store.savePetar(estado.petar).then(function () { ir('inicio'); });
      }
      if (estado.pantalla === 'resumen') return ir('formulario', { paso: C.pasos.length - 1 });
      if (estado.pantalla === 'cierre') return ir('detalle');
      ir('inicio');
    });

    window.addEventListener('beforeunload', function () {
      if (estado.petar) window.Store.savePetar(estado.petar);
    });

    window.Store.init().then(function (motor) {
      $('#motor').textContent = 'Datos en este dispositivo · ' + motor;
      return window.Store.getPreferencia('usuario');
    }).then(function (u) {
      estado.usuario = u || null;
      ir(estado.usuario ? 'inicio' : 'usuario');
    });

    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.register('sw.js').catch(function () { /* opcional */ });
    }
  }

  window.App = { iniciar: iniciar, estado: estado };
  document.addEventListener('DOMContentLoaded', iniciar);
})();
