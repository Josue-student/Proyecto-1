/* =====================================================================
   APLICACIÓN — window.App
   Navegación entre pantallas, formulario por pasos, autoguardado,
   resumen, historial y ficha del PETAR.
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
    filtros: { texto: '', estado: '', responsable: '', fecha: '' },
    firmas: {}
  };

  var app, tituloApp, subApp, btnAtras;

  /* ============================ Utilidades ========================= */

  function setPath(obj, ruta, valor) {
    var p = ruta.split('.'), o = obj;
    for (var i = 0; i < p.length - 1; i++) o = o[p[i]];
    o[p[p.length - 1]] = valor;
  }

  function getPath(obj, ruta) {
    return ruta.split('.').reduce(function (o, k) { return (o || {})[k]; }, obj);
  }

  var guardadoPendiente = null;
  var filtroPendiente = null;
  function autoguardar() {
    if (!estado.petar) return;
    clearTimeout(guardadoPendiente);
    guardadoPendiente = setTimeout(function () {
      window.Store.savePetar(estado.petar).then(function () { window.UI.marcarGuardado(); });
    }, 350);
  }

  function tonoEstado(e) { return (C.estados[e] || {}).tono || 'neutro'; }

  function pastilla(estadoId) {
    return '<span class="pastilla pastilla--' + tonoEstado(estadoId) + '">' +
      esc(window.Petar.etiquetaEstado(estadoId)) + '</span>';
  }

  var TEXTO_SEMAFORO = {
    conforme: ['ok', 'Conforme'],
    observado: ['aviso', 'Con observaciones'],
    pendiente: ['neutro', 'Pendiente de completar'],
    no_conforme: ['mal', 'No conforme']
  };

  /* ============================ Navegación ========================= */

  function ir(pantalla, opts) {
    opts = opts || {};
    estado.pantalla = pantalla;
    if (opts.paso !== undefined) estado.paso = opts.paso;
    estado.erroresPaso = [];
    window.scrollTo(0, 0);
    render();
  }

  function render() {
    var vistas = {
      usuario: vistaUsuario,
      inicio: vistaInicio,
      formulario: vistaFormulario,
      resumen: vistaResumenPantalla,
      historial: vistaHistorial,
      detalle: vistaDetalle
    };
    (vistas[estado.pantalla] || vistaInicio)();
    pintarCabecera();
  }

  function pintarCabecera() {
    var mapa = {
      usuario: ['¿Quién registra el permiso?', 'Selecciona tu nombre para empezar'],
      inicio: [C.empresa, C.sistema],
      formulario: [estado.petar ? estado.petar.numero : 'Nuevo PETAR', C.pasos[estado.paso].titulo],
      resumen: ['Resumen del PETAR', estado.petar ? estado.petar.numero : ''],
      historial: ['Historial', 'Permisos registrados'],
      detalle: [estado.petar ? estado.petar.numero : '', 'Ficha del permiso']
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
        '<p class="intro">El nombre que elijas quedará registrado como emisor de cada PETAR.</p>' +
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
      lista = lista.map(window.Petar.normalizar);
      var activos = lista.filter(function (p) { return p.estado === 'AUTORIZADO'; });
      var cerrados = lista.filter(function (p) { return p.estado === 'CERRADO'; });
      var borradores = lista.filter(function (p) { return p.estado === 'BORRADOR' || p.estado === 'PENDIENTE'; });
      var ultimos = lista.slice(0, 5);

      app.innerHTML =
        '<section class="bloque">' +
          '<div class="saludo">' +
            '<div><strong>' + esc(estado.usuario.nombre) + '</strong><small>' + esc(estado.usuario.cargo) + '</small></div>' +
            '<button class="enlace" data-accion="cambiar-usuario">Cambiar</button>' +
          '</div>' +

          '<button class="btn-nuevo" data-accion="nuevo-petar">' +
            '<span class="btn-nuevo__signo">+</span>' +
            '<span class="btn-nuevo__txt"><strong>Nuevo PETAR</strong><small>Trabajo en caliente</small></span>' +
          '</button>' +

          (borradores.length
            ? '<div class="retomar"><div><strong>' + esc(borradores[0].numero) + ' sin terminar</strong>' +
              '<small>' + esc(borradores[0].generales.area || 'Sin área') + ' · ' + window.UI.fechaHora(borradores[0].actualizadoEn) + '</small></div>' +
              '<button class="btn btn--principal" data-accion="retomar" data-id="' + esc(borradores[0].id) + '">Continuar</button></div>'
            : '') +

          '<div class="cifras">' +
            cifra(activos.length, 'Activos') +
            cifra(cerrados.length, 'Cerrados') +
            cifra(borradores.length, 'En proceso') +
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

  function vacio(txt) {
    return '<p class="vacio">' + esc(txt) + '</p>';
  }

  function tarjetaPetar(p) {
    var sem = TEXTO_SEMAFORO[window.Petar.semaforo(p)];
    return '<button class="tarjeta tarjeta--' + sem[0] + '" data-accion="abrir" data-id="' + esc(p.id) + '">' +
      '<div class="tarjeta__fila"><strong>' + esc(p.numero) + '</strong>' + pastilla(p.estado) + '</div>' +
      '<div class="tarjeta__meta">' + esc(window.UI.fechaLarga(p.generales.fecha)) + ' · ' +
        esc(p.generales.area || 'Sin área') + ' · ' + esc(p.generales.horaInicio || '--:--') + '</div>' +
      '<div class="tarjeta__meta">' + esc(p.generales.responsableTrabajo || '') +
        (window.Petar.tipoTrabajoTexto(p) ? ' · ' + esc(window.Petar.tipoTrabajoTexto(p)) : '') + '</div>' +
    '</button>';
  }

  /* ======================= Pantalla: formulario ==================== */

  function vistaFormulario() {
    var p = estado.petar;
    var pasoId = C.pasos[estado.paso].id;
    var cuerpos = {
      generales: pasoGenerales,
      trabajo: pasoTrabajo,
      seguridad: pasoSeguridad,
      controles: pasoControles,
      evidencias: pasoEvidencias,
      firmas: pasoFirmas
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
          (estado.paso === C.pasos.length - 1 ? 'Revisar PETAR' : 'Siguiente') + '</button>' +
      '</div>';

    if (pasoId === 'firmas') montarFirmas();
  }

  /* --- Paso 1: datos generales --- */
  function pasoGenerales(p) {
    var g = p.generales;
    var area = C.areas.find(function (a) { return a.nombre === g.area; });
    return '' +
      '<div class="campo campo--fijo"><label>Número de PETAR</label>' +
        '<output class="valor-fijo">' + esc(p.numero) + '</output>' +
        '<small class="ayuda">Correlativo automático. Emitido por ' + esc(p.usuario.nombre) + '.</small></div>' +

      '<div class="par">' +
        campo('Fecha *', '<input type="date" data-campo="generales.fecha" value="' + esc(g.fecha) + '">') +
        campo('N.º de trabajadores *', '<input type="number" min="1" max="50" inputmode="numeric" data-campo="generales.nTrabajadores" value="' + esc(g.nTrabajadores) + '" placeholder="0">') +
      '</div>' +
      '<div class="par">' +
        campo('Hora de inicio *', '<input type="time" data-campo="generales.horaInicio" value="' + esc(g.horaInicio) + '">') +
        campo('Hora de término *', '<input type="time" data-campo="generales.horaTermino" value="' + esc(g.horaTermino) + '">') +
      '</div>' +

      campo('Área *', select('generales.area', C.areas.map(function (a) { return a.nombre; }), g.area, 'Selecciona el área')) +
      campo('Subárea o ubicación exacta *',
        select('generales.subarea', area ? area.subareas.concat(['Otra ubicación']) : [], g.subarea,
          area ? 'Selecciona la ubicación' : 'Elige primero un área') +
        (g.subarea === 'Otra ubicación'
          ? '<input type="text" class="mt" data-campo="generales.subareaOtra" placeholder="Describe la ubicación" value="' + esc(g.subareaOtra || '') + '">'
          : '')) +

      campo('Responsable del trabajo *',
        '<input type="text" list="lstResp" data-campo="generales.responsableTrabajo" value="' + esc(g.responsableTrabajo) + '" placeholder="Nombre y apellidos">' +
        '<datalist id="lstResp">' + C.responsables.map(function (r) { return '<option value="' + esc(r.nombre) + '">'; }).join('') + '</datalist>') +

      campo('Empresa o contratista', select('generales.empresa', C.empresasContratistas, g.empresa, 'Personal propio') +
        (g.empresa === 'Otro'
          ? '<input type="text" class="mt" data-campo="generales.empresaOtra" placeholder="Nombre de la empresa" value="' + esc(g.empresaOtra || '') + '">'
          : ''));
  }

  /* --- Paso 2: trabajo --- */
  function pasoTrabajo(p) {
    var sel = p.trabajo.tipos || [];
    return '' +
      '<h2 class="h-seccion">Tipo de trabajo en caliente *</h2>' +
      '<p class="intro">Marca todas las técnicas que se usarán.</p>' +
      '<div class="fichas">' +
        C.tiposTrabajo.map(function (t) {
          return '<button type="button" class="ficha' + (sel.indexOf(t) >= 0 ? ' es-activo' : '') + '" data-accion="tipo" data-valor="' + esc(t) + '">' + esc(t) + '</button>';
        }).join('') +
      '</div>' +
      (sel.indexOf('Otros') >= 0
        ? campo('Especifica el trabajo *', '<input type="text" data-campo="trabajo.otroDetalle" value="' + esc(p.trabajo.otroDetalle) + '" placeholder="Ej. Termofusión de tubería">')
        : '') +
      campo('Descripción de la actividad *',
        '<textarea rows="4" data-campo="generales.descripcion" placeholder="Qué se hará, sobre qué elemento y con qué equipo.">' + esc(p.generales.descripcion) + '</textarea>' +
        '<small class="ayuda">Esta descripción se imprime en el permiso.</small>');
  }

  /* --- Paso 3: verificación de seguridad --- */
  function pasoSeguridad(p) {
    return C.checklist.map(function (sec) {
      return '<h2 class="h-seccion">' + esc(sec.titulo) + '</h2>' +
        '<p class="intro">' + esc(sec.resumen) + '</p>' +
        sec.items.map(function (it) {
          return pregunta('checklist.' + sec.id, it, (p.checklist[sec.id] || {})[it.id], C.escalas.sino);
        }).join('');
    }).join('');
  }

  /* --- Paso 4: EPP, equipos, vigía --- */
  function pasoControles(p) {
    var v = p.vigia;
    return '' +
      '<h2 class="h-seccion">Equipos de protección personal</h2>' +
      '<p class="intro">Verifica que cada trabajador cuente con lo necesario.</p>' +
      C.epp.map(function (it) { return pregunta('epp', it, p.epp[it.id], C.escalas.sino); }).join('') +

      '<h2 class="h-seccion">Equipos y herramientas</h2>' +
      '<p class="intro">Revisa el estado antes de energizar o encender.</p>' +
      C.equipos.map(function (it) { return pregunta('equipos', it, p.equipos[it.id], C.escalas.conformidad); }).join('') +

      '<h2 class="h-seccion">Vigía de fuego</h2>' +
      '<div class="preg"><p class="preg__texto">¿El trabajo cuenta con vigía de fuego?</p>' +
        segmento('vigia', 'aplica', v.aplica, C.escalas.sino) + '</div>' +
      (v.aplica === 'si'
        ? '<div class="sub-bloque">' +
            campo('Nombre del vigía *', '<input type="text" data-campo="vigia.nombre" value="' + esc(v.nombre) + '" placeholder="Nombre y apellidos">') +
            '<div class="par">' +
              campo('Desde *', '<input type="time" data-campo="vigia.horaInicio" value="' + esc(v.horaInicio) + '">') +
              campo('Hasta *', '<input type="time" data-campo="vigia.horaTermino" value="' + esc(v.horaTermino) + '">') +
            '</div>' +
            '<div class="preg"><p class="preg__texto">¿El vigía conoce sus funciones y permanecerá 30 min después del trabajo?</p>' +
              segmento('vigia', 'conoceFunciones', v.conoceFunciones, C.escalas.sino) + '</div>' +
          '</div>'
        : '');
  }

  /* --- Paso 5: observaciones y fotos --- */
  function pasoEvidencias(p) {
    var r = window.Petar.resumenConformidad(p);
    return '' +
      (r.no > 0
        ? '<div class="alerta alerta--aviso">Hay ' + r.no + ' condición(es) respondida(s) como No. Describe la medida adoptada.</div>'
        : '') +
      campo('Observaciones y medidas adicionales',
        '<textarea rows="5" data-campo="observaciones" placeholder="Restricciones, medidas complementarias, acuerdos con el área.">' + esc(p.observaciones) + '</textarea>') +

      '<h2 class="h-seccion">Fotografías</h2>' +
      '<p class="intro">Hasta ' + C.fotos.maxPorPetar + ' imágenes del área, los controles o la señalización.</p>' +
      '<div id="galeria" class="galeria">' + galeriaHTML(p) + '</div>' +
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

  /* --- Paso 6: firmas --- */
  function pasoFirmas(p) {
    return bloqueFirma('responsable', 'Responsable del trabajo', p.firmas.responsable, C.responsables) +
      bloqueFirma('autorizante', 'Autorizante / responsable SST', p.firmas.autorizante, C.autorizantes) +
      '<p class="nota">La firma manuscrita capturada en pantalla acredita la conformidad en esta versión. La firma digital certificada se evaluará en la etapa de producción.</p>';
  }

  function bloqueFirma(clave, titulo, datos, catalogo) {
    var lista = 'lst_' + clave;
    return '<h2 class="h-seccion">' + esc(titulo) + '</h2>' +
      campo('Nombre *', '<input type="text" list="' + lista + '" data-campo="firmas.' + clave + '.nombre" value="' + esc(datos.nombre) + '" placeholder="Nombre y apellidos">' +
        '<datalist id="' + lista + '">' + catalogo.map(function (r) { return '<option value="' + esc(r.nombre) + '">'; }).join('') + '</datalist>') +
      campo('Cargo *', '<input type="text" data-campo="firmas.' + clave + '.cargo" value="' + esc(datos.cargo) + '" placeholder="Ej. Supervisor SST">') +
      '<div class="firma">' +
        '<canvas class="firma__lienzo" data-firma="' + clave + '" aria-label="Área de firma de ' + esc(titulo) + '"></canvas>' +
        '<div class="firma__pie"><span>Firma con el dedo dentro del recuadro</span>' +
          '<button class="enlace" data-accion="borrar-firma" data-firma="' + clave + '">Borrar firma</button></div>' +
      '</div>';
  }

  function montarFirmas() {
    ['responsable', 'autorizante'].forEach(function (clave) {
      var canvas = document.querySelector('canvas[data-firma="' + clave + '"]');
      if (!canvas) return;
      var pad = window.UI.FirmaPad(canvas);
      estado.firmas[clave] = pad;
      setTimeout(function () { pad.cargar(estado.petar.firmas[clave].firma); }, 60);
      pad.alTerminar = function (data) {
        estado.petar.firmas[clave].firma = data;
        estado.petar.firmas[clave].fechaHora = data ? new Date().toISOString() : '';
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

  function segmento(grupo, itemId, valor, escala) {
    return '<div class="seg" role="group">' + escala.map(function (op) {
      return '<button type="button" class="seg__btn seg__btn--' + op.tono + (valor === op.valor ? ' es-activo' : '') + '" ' +
        'data-accion="resp" data-grupo="' + grupo + '" data-item="' + itemId + '" data-valor="' + op.valor + '">' +
        esc(op.etiqueta) + '</button>';
    }).join('') + '</div>';
  }

  function pregunta(grupo, item, valor, escala) {
    var alerta = (valor === 'no')
      ? '<div class="alerta alerta--' + (item.critica ? 'mal' : 'aviso') + '">' +
        (item.critica
          ? 'Condición crítica no conforme. Debe corregirse antes de autorizar el PETAR.'
          : 'Condición no conforme. Verifica y corrige antes de autorizar el PETAR.') + '</div>'
      : '';
    return '<div class="preg" data-preg="' + esc(grupo + '.' + item.id) + '">' +
      '<p class="preg__texto">' + esc(item.texto) +
        (item.critica ? ' <span class="critica">Crítica</span>' : '') + '</p>' +
      segmento(grupo, item.id, valor, escala) +
      '<div class="preg__alerta">' + alerta + '</div>' +
    '</div>';
  }

  /* ========================= Resumen =============================== */

  function vistaResumenPantalla() {
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
      (bloqueos.length
        ? '<div class="alerta alerta--mal"><strong>' + esc(bloqueos[0].mensaje) + '</strong><ul>' +
            bloqueos[0].detalle.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ul></div>'
        : '') +
      '<section class="bloque acciones-finales">' +
        '<button class="btn btn--fantasma btn--ancho" data-accion="editar" data-paso="0">Editar el permiso</button>' +
        '<button class="btn btn--secundario btn--ancho" data-accion="guardar-salir">Guardar y salir</button>' +
        (bloqueos.length
          ? '<button class="btn btn--peligro btn--ancho" data-accion="no-autorizar">Registrar como no autorizado</button>'
          : '<button class="btn btn--principal btn--ancho" data-accion="autorizar"' + (errores.length ? ' disabled' : '') + '>' +
              'Autorizar y generar documento</button>') +
      '</section>';
  }

  function resumenHTML(p, editable) {
    var sem = TEXTO_SEMAFORO[window.Petar.semaforo(p)];
    var r = window.Petar.resumenConformidad(p);
    var g = p.generales;

    function fila(k, v) {
      return '<div class="dato"><span>' + esc(k) + '</span><strong>' + esc(v || '—') + '</strong></div>';
    }
    function editar(paso, txt) {
      return editable ? '<button class="enlace" data-accion="editar" data-paso="' + paso + '">' + esc(txt || 'Editar') + '</button>' : '';
    }
    function grupoRespuestas(titulo, items, valores, escala, paso) {
      return '<div class="titulo-fila"><h2>' + esc(titulo) + '</h2>' + editar(paso) + '</div>' +
        '<ul class="lista-check">' + items.map(function (it) {
          var v = valores[it.id];
          var op = escala.find(function (o) { return o.valor === v; });
          return '<li class="check check--' + (op ? op.tono : 'vacio') + '">' +
            '<span>' + esc(it.texto) + '</span><b>' + esc(op ? op.etiqueta : 'Sin responder') + '</b></li>';
        }).join('') + '</ul>';
    }

    return '<section class="bloque">' +
      '<div class="cabecera-resumen">' +
        '<div><strong class="numero">' + esc(p.numero) + '</strong>' + pastilla(p.estado) + '</div>' +
        '<span class="semaforo semaforo--' + sem[0] + '">' + esc(sem[1]) + '</span>' +
      '</div>' +
      '<div class="conteo">' +
        '<span class="conteo__ok">' + r.si + ' conformes</span>' +
        '<span class="conteo__mal">' + r.no + ' no conformes</span>' +
        '<span class="conteo__neutro">' + r.na + ' N/A</span>' +
        (r.sinResponder ? '<span class="conteo__aviso">' + r.sinResponder + ' sin responder</span>' : '') +
      '</div>' +

      '<div class="titulo-fila"><h2>Datos generales</h2>' + editar(0) + '</div>' +
      '<div class="datos">' +
        fila('Fecha', window.UI.fechaLarga(g.fecha)) +
        fila('Horario', (g.horaInicio || '—') + ' a ' + (g.horaTermino || '—')) +
        fila('Área', g.area) +
        fila('Ubicación', g.subarea === 'Otra ubicación' ? (g.subareaOtra || 'Otra ubicación') : g.subarea) +
        fila('Responsable', g.responsableTrabajo) +
        fila('Empresa', g.empresa === 'Otro' ? (g.empresaOtra || 'Otro') : g.empresa) +
        fila('Trabajadores', g.nTrabajadores) +
        fila('Emitido por', p.usuario.nombre) +
      '</div>' +

      '<div class="titulo-fila"><h2>Trabajo</h2>' + editar(1) + '</div>' +
      '<div class="datos">' +
        fila('Tipo', window.Petar.tipoTrabajoTexto(p)) +
      '</div>' +
      '<p class="parrafo">' + esc(g.descripcion || 'Sin descripción.') + '</p>' +

      C.checklist.map(function (sec, i) {
        return grupoRespuestas(sec.titulo, sec.items, p.checklist[sec.id] || {}, C.escalas.sino, 2);
      }).join('') +

      grupoRespuestas('Equipos de protección personal', C.epp, p.epp, C.escalas.sino, 3) +
      grupoRespuestas('Equipos y herramientas', C.equipos, p.equipos, C.escalas.conformidad, 3) +

      '<div class="titulo-fila"><h2>Vigía de fuego</h2>' + editar(3) + '</div>' +
      '<div class="datos">' +
        (p.vigia.aplica === 'si'
          ? fila('Vigía', p.vigia.nombre) + fila('Permanencia', (p.vigia.horaInicio || '—') + ' a ' + (p.vigia.horaTermino || '—'))
          : fila('Vigía', p.vigia.aplica === 'no' ? 'No se requiere' : 'Sin definir')) +
      '</div>' +

      '<div class="titulo-fila"><h2>Observaciones</h2>' + editar(4) + '</div>' +
      '<p class="parrafo">' + esc(p.observaciones || 'Sin observaciones.') + '</p>' +
      '<div class="galeria">' + galeriaResumen(p) + '</div>' +

      '<div class="titulo-fila"><h2>Firmas</h2>' + editar(5) + '</div>' +
      '<div class="firmas-resumen">' +
        [['Responsable del trabajo', p.firmas.responsable], ['Autorizante SST', p.firmas.autorizante]].map(function (par) {
          return '<div class="firma-mini">' +
            (par[1].firma ? '<img src="' + par[1].firma + '" alt="Firma de ' + esc(par[1].nombre) + '">' : '<span class="firma-mini__falta">Sin firma</span>') +
            '<strong>' + esc(par[1].nombre || '—') + '</strong><small>' + esc(par[1].cargo || '') + '</small></div>';
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
      estado.lista = lista.map(window.Petar.normalizar);
      var responsables = [];
      estado.lista.forEach(function (p) {
        var r = p.generales.responsableTrabajo;
        if (r && responsables.indexOf(r) < 0) responsables.push(r);
      });
      var f = estado.filtros;

      app.innerHTML =
        '<section class="bloque">' +
          '<div class="campo"><label for="buscar">Buscar</label>' +
            '<input id="buscar" type="search" data-filtro="texto" value="' + esc(f.texto) + '" placeholder="Número, área, responsable o trabajo"></div>' +
          '<div class="par">' +
            campo('Estado', '<select data-filtro="estado">' +
              '<option value="">Todos</option>' +
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

  /* Solo repinta el listado: los campos de filtro conservan el foco */
  function pintarLista() {
    var cont = document.getElementById('listaHist');
    if (!cont) return;
    var f = estado.filtros;
    var filtrada = (estado.lista || []).filter(function (p) {
      var texto = (p.numero + ' ' + p.generales.area + ' ' + p.generales.subarea + ' ' +
        p.generales.responsableTrabajo + ' ' + window.Petar.tipoTrabajoTexto(p) + ' ' + p.generales.descripcion).toLowerCase();
      if (f.texto && texto.indexOf(f.texto.toLowerCase()) < 0) return false;
      if (f.estado && p.estado !== f.estado) return false;
      if (f.responsable && p.generales.responsableTrabajo !== f.responsable) return false;
      if (f.fecha && p.generales.fecha !== f.fecha) return false;
      return true;
    });

    cont.innerHTML =
      '<div class="titulo-fila"><h2>' + filtrada.length + ' permiso(s)</h2>' +
        (filtrada.length ? '<button class="enlace" data-accion="exportar">Exportar CSV</button>' : '') + '</div>' +
      (filtrada.length ? filtrada.map(filaHistorial).join('') : vacio('Ningún PETAR coincide con los filtros.'));
  }

  function filaHistorial(p) {
    return '<div class="hist">' +
      '<button class="hist__cuerpo" data-accion="abrir" data-id="' + esc(p.id) + '">' +
        '<div class="tarjeta__fila"><strong>' + esc(p.numero) + '</strong>' + pastilla(p.estado) + '</div>' +
        '<div class="tarjeta__meta">' + esc(window.UI.fechaLarga(p.generales.fecha)) + ' · ' + esc(p.generales.horaInicio || '--:--') +
          ' · ' + esc(p.generales.area || 'Sin área') + '</div>' +
        '<div class="tarjeta__meta">' + esc(p.generales.responsableTrabajo || '') + ' · ' + esc(window.Petar.tipoTrabajoTexto(p) || 'Sin tipo') + '</div>' +
      '</button>' +
      '<button class="hist__pdf" data-accion="pdf" data-id="' + esc(p.id) + '">PDF</button>' +
    '</div>';
  }

  /* ====================== Ficha del PETAR ========================== */

  function vistaDetalle() {
    var p = estado.petar;
    var editable = (p.estado === 'BORRADOR' || p.estado === 'PENDIENTE');
    app.innerHTML =
      resumenHTML(p, false) +
      '<section class="bloque">' +
        '<h2 class="h-seccion">Estado del permiso</h2>' +
        '<div class="fichas">' +
          Object.keys(C.estados).map(function (k) {
            return '<button type="button" class="ficha' + (p.estado === k ? ' es-activo' : '') + '" data-accion="estado" data-valor="' + k + '">' +
              esc(C.estados[k].etiqueta) + '</button>';
          }).join('') +
        '</div>' +
        '<div class="historial-estados">' +
          p.historialEstados.map(function (h) {
            return '<div class="he"><span>' + esc(window.Petar.etiquetaEstado(h.estado)) + '</span>' +
              '<small>' + esc(window.UI.fechaHora(h.fechaHora)) + ' · ' + esc(h.usuario || '') + '</small></div>';
          }).join('') +
        '</div>' +
        '<button class="btn btn--principal btn--ancho" data-accion="pdf" data-id="' + esc(p.id) + '">Generar documento PDF</button>' +
        (editable ? '<button class="btn btn--fantasma btn--ancho" data-accion="editar" data-paso="0">Continuar edición</button>' : '') +
        '<button class="btn btn--peligro btn--ancho" data-accion="eliminar" data-id="' + esc(p.id) + '">Eliminar permiso</button>' +
      '</section>';
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
        '<div class="visor__barra">' +
          '<strong>' + esc(p.numero) + '</strong>' +
          '<button class="enlace" data-cerrar>Cerrar</button>' +
        '</div>' +
        '<iframe class="visor__marco" src="' + url + '" title="Documento PETAR"></iframe>' +
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

  /* ========================== Acciones ============================= */

  function crearPetar() {
    window.Store.nextCorrelativo().then(function (numero) {
      estado.petar = window.Petar.nuevo(numero, estado.usuario);
      return window.Store.savePetar(estado.petar).then(function () {
        return window.Store.setBorradorActivo(estado.petar.id);
      });
    }).then(function () {
      ir('formulario', { paso: 0 });
      window.UI.aviso('PETAR ' + estado.petar.numero + ' creado');
    });
  }

  function abrirPetar(id, pantalla, paso) {
    return window.Store.getPetar(id).then(function (p) {
      if (!p) { window.UI.aviso('El permiso ya no existe.', 'mal'); return; }
      estado.petar = window.Petar.normalizar(p);
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
      marcarPendienteSiCorresponde();
      ir('resumen');
    } else {
      ir('formulario', { paso: estado.paso + 1 });
    }
  }

  function marcarPendienteSiCorresponde() {
    var p = estado.petar;
    if (p.estado === 'BORRADOR') {
      window.Petar.cambiarEstado(p, 'PENDIENTE', estado.usuario.nombre);
      window.Store.savePetar(p);
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

    if (a === 'paso-atras') {
      if (estado.paso === 0) { window.Store.savePetar(p).then(function () { ir('inicio'); }); }
      else ir('formulario', { paso: estado.paso - 1 });
    }
    if (a === 'paso-siguiente') siguientePaso();
    if (a === 'editar') ir('formulario', { paso: Number(b.dataset.paso) });

    if (a === 'resp') {
      var grupo = b.dataset.grupo, item = b.dataset.item, valor = b.dataset.valor;
      var destino = grupo.split('.').reduce(function (o, k) {
        if (o[k] === undefined) o[k] = {};
        return o[k];
      }, p);
      destino[item] = (destino[item] === valor) ? '' : valor;

      var cont = b.closest('.preg');
      window.UI.$$('.seg__btn', cont).forEach(function (x) { x.classList.remove('es-activo'); });
      if (destino[item]) b.classList.add('es-activo');

      var zona = cont.querySelector('.preg__alerta');
      if (zona) {
        var cfgItem = buscarItem(grupo, item);
        zona.innerHTML = (destino[item] === 'no' && cfgItem)
          ? '<div class="alerta alerta--' + (cfgItem.critica ? 'mal' : 'aviso') + '">' +
            (cfgItem.critica
              ? 'Condición crítica no conforme. Debe corregirse antes de autorizar el PETAR.'
              : 'Condición no conforme. Verifica y corrige antes de autorizar el PETAR.') + '</div>'
          : '';
      }
      if (grupo === 'vigia') render();
      autoguardar();
    }

    if (a === 'tipo') {
      var t = b.dataset.valor;
      var i = p.trabajo.tipos.indexOf(t);
      if (i >= 0) p.trabajo.tipos.splice(i, 1); else p.trabajo.tipos.push(t);
      autoguardar();
      render();
    }

    if (a === 'quitar-foto') {
      p.fotos = p.fotos.filter(function (f) { return f.id !== b.dataset.id; });
      autoguardar();
      render();
    }

    if (a === 'borrar-firma') {
      var pad = estado.firmas[b.dataset.firma];
      if (pad) pad.limpiar();
      window.UI.aviso('Firma borrada');
    }

    if (a === 'guardar-salir') {
      window.Store.savePetar(p).then(function () {
        window.UI.aviso('PETAR guardado');
        ir('inicio');
      });
    }

    if (a === 'autorizar') {
      var errores = window.Validador.validarTodo(p);
      var bloqueos = window.Validador.bloqueosParaAutorizar(p);
      if (errores.length || bloqueos.length) { render(); return; }
      window.UI.confirmar({
        titulo: 'Autorizar el permiso',
        texto: 'El PETAR ' + p.numero + ' quedará autorizado y se generará el documento oficial.',
        aceptar: 'Autorizar'
      }).then(function (ok) {
        if (!ok) return;
        window.Petar.cambiarEstado(p, 'AUTORIZADO', estado.usuario.nombre);
        window.Store.savePetar(p).then(function () {
          window.UI.aviso('PETAR autorizado');
          abrirPDF(p);
          ir('detalle');
        });
      });
    }

    if (a === 'no-autorizar') {
      window.UI.confirmar({
        titulo: 'Registrar como no autorizado',
        texto: 'Quedará constancia de las condiciones críticas no conformes y el trabajo no podrá iniciar.',
        aceptar: 'Registrar',
        peligro: true
      }).then(function (ok) {
        if (!ok) return;
        window.Petar.cambiarEstado(p, 'NO_AUTORIZADO', estado.usuario.nombre);
        window.Store.savePetar(p).then(function () { ir('detalle'); });
      });
    }

    if (a === 'estado') {
      var nuevo = b.dataset.valor;
      if (nuevo === 'AUTORIZADO' && !window.Petar.puedeAutorizarse(p)) {
        window.UI.aviso('No se puede autorizar: hay condiciones críticas no conformes.', 'mal');
        return;
      }
      if (nuevo === 'AUTORIZADO' && window.Validador.validarTodo(p).length) {
        window.UI.aviso('Falta completar el permiso antes de autorizarlo.', 'mal');
        return;
      }
      window.Petar.cambiarEstado(p, nuevo, estado.usuario.nombre);
      window.Store.savePetar(p).then(function () {
        window.UI.aviso('Estado actualizado a ' + window.Petar.etiquetaEstado(nuevo));
        render();
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
        window.UI.descargar('petar_historial.csv', '\ufeff' + csv, 'text/csv;charset=utf-8');
        window.UI.aviso('Historial exportado');
      });
    }
  }

  function buscarItem(grupo, itemId) {
    if (grupo === 'epp') return C.epp.find(function (x) { return x.id === itemId; });
    if (grupo === 'equipos') return C.equipos.find(function (x) { return x.id === itemId; });
    if (grupo.indexOf('checklist.') === 0) {
      var sec = C.checklist.find(function (s) { return s.id === grupo.split('.')[1]; });
      return sec && sec.items.find(function (x) { return x.id === itemId; });
    }
    return null;
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

    /* Cambios que reconstruyen la pantalla */
    if (el.dataset.campo === 'generales.area') { estado.petar.generales.subarea = ''; render(); }
    if (el.dataset.campo === 'generales.subarea' && el.value === 'Otra ubicación') render();
    if (el.dataset.campo === 'generales.empresa' && el.value === 'Otro') render();
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
    /* 'input' para texto, fechas y horas; 'change' solo para listas y archivos.
       Así un mismo cambio no se procesa dos veces. */
    app.addEventListener('input', function (ev) {
      if (ev.target.tagName === 'SELECT') return;
      manejarEntrada(ev);
    });
    app.addEventListener('change', function (ev) {
      if (ev.target.tagName === 'SELECT') manejarEntrada(ev);
      manejarArchivo(ev);
    });

    btnAtras.addEventListener('click', function () {
      if (estado.pantalla === 'formulario') {
        if (estado.paso > 0) return ir('formulario', { paso: estado.paso - 1 });
        return window.Store.savePetar(estado.petar).then(function () { ir('inicio'); });
      }
      if (estado.pantalla === 'resumen') return ir('formulario', { paso: C.pasos.length - 1 });
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

    /* Instalación como aplicación (PWA). Requiere servirse por http/https. */
    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.register('sw.js').catch(function () { /* opcional */ });
    }
  }

  window.App = { iniciar: iniciar, estado: estado };
  document.addEventListener('DOMContentLoaded', iniciar);
})();
