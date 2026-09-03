/* =====================================================================
   MODELO DEL PERMISO — window.Petar
   Crea, evalúa y describe un permiso de ejecución de trabajo en
   caliente. Lógica pura: no toca la interfaz ni el almacenamiento.
   ===================================================================== */
(function () {
  'use strict';

  var C = window.PETAR_CONFIG;

  function hoyISO() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function ahoraHora(minutosExtra) {
    var d = new Date();
    if (minutosExtra) d = new Date(d.getTime() + minutosExtra * 60000);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function aFecha(fecha, hora) {
    if (!fecha || !hora) return null;
    var f = fecha.split('-'), h = hora.split(':');
    return new Date(+f[0], +f[1] - 1, +f[2], +h[0], +h[1]);
  }

  var Petar = {

    /* ---------------------------------------------------------------
       Estructura completa del permiso
       --------------------------------------------------------------- */
    nuevo: function (numero, usuario) {
      var fin = C.duracionSugeridaHoras ? ahoraHora(C.duracionSugeridaHoras * 60) : '';
      return {
        id: 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        numero: numero,
        estado: 'BORRADOR',
        creadoEn: new Date().toISOString(),
        actualizadoEn: new Date().toISOString(),
        usuario: { nombre: usuario.nombre, cargo: usuario.cargo },

        /* Paso 1 — ¿dónde y quién? */
        identificacion: {
          fecha: hoyISO(),
          area: '',
          subarea: '',
          ubicacion: '',
          empresa: '',
          responsableTrabajo: usuario.nombre,
          solicitante: usuario.nombre
        },

        /* Paso 2 — ¿qué? */
        trabajo: {
          tipos: [], otroTipo: '',
          descripcion: '',
          equipos: [], otroEquipo: '',
          elemento: '', otroElemento: ''
        },

        /* Paso 3 — ¿quién ejecuta? */
        personal: {
          trabajadores: [],
          supervisor: '',
          vigia: { requiere: '', nombre: '' },
          confirmacion: false
        },

        /* Paso 4 — ¿bajo qué condiciones? */
        condiciones: {},          // { combustibles: 'retirados', chispas: 'si', chispas_medida: ['Pantalla'] }

        /* Paso 5 — ¿con qué controles? */
        controles: {},            // { incendio: { ext_disponible: 'si' }, oxigas: {...} }

        /* Paso 6 */
        epp: {}, otroEppDetalle: '',

        /* Paso 7 */
        exposicion: {
          agentes: [], otroAgente: '',
          evaluacion: '', fechaEvaluacion: '', resultado: '', control: ''
        },

        /* Paso 8 */
        especiales: {
          recipiente: '', recipienteInflamables: '', recipienteControles: {},
          confinado: '', confinadoControles: {}
        },

        /* Paso 9 */
        observaciones: '',
        fotos: [],

        vigencia: { inicioFecha: hoyISO(), inicioHora: ahoraHora(), finFecha: hoyISO(), finHora: fin },

        autorizacion: {
          ejecutor:    { nombre: usuario.nombre, cargo: usuario.cargo, firma: '', fechaHora: '' },
          autorizante: { nombre: '', cargo: '', firma: '', fechaHora: '' },
          sst:         { nombre: '', cargo: '', firma: '', fechaHora: '' }
        },

        suspension: null,         // { fechaHora, usuario, motivo, detalle }
        cierre: { checklist: {}, fechaHora: '', responsable: '', firma: '', comentario: '' },

        historialEstados: [{ estado: 'BORRADOR', fechaHora: new Date().toISOString(), usuario: usuario.nombre }]
      };
    },

    /* Repara permisos guardados con versiones anteriores del modelo */
    normalizar: function (p) {
      var base = Petar.nuevo(p.numero, p.usuario || { nombre: '', cargo: '' });
      base.id = p.id; base.creadoEn = p.creadoEn || base.creadoEn;
      ['identificacion', 'trabajo', 'personal', 'exposicion', 'especiales', 'vigencia', 'cierre']
        .forEach(function (k) { p[k] = Object.assign({}, base[k], p[k] || {}); });
      p.personal.vigia = Object.assign({}, base.personal.vigia, p.personal.vigia || {});
      p.autorizacion = Object.assign({}, base.autorizacion, p.autorizacion || {});
      ['ejecutor', 'autorizante', 'sst'].forEach(function (k) {
        p.autorizacion[k] = Object.assign({}, base.autorizacion[k], p.autorizacion[k] || {});
      });
      p.condiciones = p.condiciones || {};
      p.controles = p.controles || {};
      p.epp = p.epp || {};
      p.fotos = p.fotos || [];
      p.cierre.checklist = p.cierre.checklist || {};
      p.especiales.recipienteControles = p.especiales.recipienteControles || {};
      p.especiales.confinadoControles = p.especiales.confinadoControles || {};
      p.historialEstados = p.historialEstados || [];
      p.estado = p.estado || 'BORRADOR';
      return p;
    },

    /* ---------------------------------------------------------------
       Bloques de control aplicables según el tipo de trabajo elegido
       --------------------------------------------------------------- */
    controlesAplicables: function (p) {
      var claves = [];
      Object.keys(C.controles).forEach(function (k) { if (C.controles[k].siempre) claves.push(k); });
      (p.trabajo.tipos || []).forEach(function (idTipo) {
        var t = C.tiposTrabajo.find(function (x) { return x.id === idTipo; });
        if (!t) return;
        t.controles.forEach(function (k) { if (claves.indexOf(k) < 0) claves.push(k); });
      });
      return claves.map(function (k) {
        return { clave: k, titulo: C.controles[k].titulo, resumen: C.controles[k].resumen, items: C.controles[k].items };
      });
    },

    /* EPP que el aplicativo sugiere para los tipos de trabajo elegidos */
    eppSugerido: function (p) {
      var tipos = p.trabajo.tipos || [];
      return C.epp.filter(function (e) {
        return e.sugeridoPor.indexOf('*') >= 0 || e.sugeridoPor.some(function (t) { return tipos.indexOf(t) >= 0; });
      }).map(function (e) { return e.id; });
    },

    /* Preguntas de condiciones del área visibles (con sus hijas) */
    condicionesVisibles: function (p) {
      var lista = [];
      C.condicionesArea.forEach(function (q) {
        lista.push(q);
        (q.hijos || []).forEach(function (h) {
          if (p.condiciones[q.id] === h.muestraSi) lista.push(Object.assign({ padre: q.id }, h));
        });
      });
      return lista;
    },

    /* Controles de condiciones especiales activos */
    especialesActivos: function (p) {
      var bloques = [];
      if (p.especiales.recipiente === 'si' && p.especiales.recipienteInflamables === 'si') {
        bloques.push({ clave: 'recipienteControles', titulo: 'Trabajo sobre recipiente que contuvo inflamables', items: C.especiales.recipiente.controles });
      }
      if (p.especiales.confinado === 'si') {
        bloques.push({ clave: 'confinadoControles', titulo: 'Espacio confinado', items: C.especiales.confinado.controles });
      }
      return bloques;
    },

    /* ---------------------------------------------------------------
       Evaluación de conformidad
       Recorre condiciones, controles aplicables, EPP y especiales.
       --------------------------------------------------------------- */
    resumenConformidad: function (p) {
      var r = { si: 0, no: 0, na: 0, sinResponder: 0, total: 0, criticasNo: 0, requeridosNo: 0, detalleCriticas: [], detalleRequeridos: [] };

      function registrar(nivel, texto, estadoResp) {
        r.total++;
        if (estadoResp === 'si') r.si++;
        else if (estadoResp === 'na') r.na++;
        else if (estadoResp === 'no') {
          r.no++;
          if (nivel === 'critico') { r.criticasNo++; r.detalleCriticas.push(texto); }
          else if (nivel === 'requerido') { r.requeridosNo++; r.detalleRequeridos.push(texto); }
        } else if (nivel !== 'informativo') r.sinResponder++;
      }

      /* Condiciones del área */
      Petar.condicionesVisibles(p).forEach(function (q) {
        var v = p.condiciones[q.id];
        if (q.tipo === 'opciones') {
          var falla = v && (q.bloqueaSi || []).indexOf(v) >= 0;
          registrar(q.nivel, q.pregunta, !v ? '' : (falla ? 'no' : 'si'));
        } else if (q.tipo === 'multiple') {
          registrar(q.nivel, q.pregunta, (v && v.length) ? 'si' : '');
        } else if (q.id === 'inflamables' || q.id === 'personas' || q.id === 'chispas') {
          /* Detectar la condición no es un incumplimiento: lo que importa
             es la respuesta de su control asociado. Solo cuenta como
             respondida. */
          registrar('informativo', q.pregunta, v ? 'si' : '');
        } else {
          registrar(q.nivel, q.pregunta, v || '');
        }
      });

      /* Controles del trabajo */
      Petar.controlesAplicables(p).forEach(function (bloque) {
        bloque.items.forEach(function (it) {
          registrar(it.nivel, it.label, (p.controles[bloque.clave] || {})[it.id] || '');
        });
      });

      /* EPP: solo el sugerido para esta tarea entra en el conteo */
      var sugerido = Petar.eppSugerido(p);
      C.epp.forEach(function (e) {
        if (sugerido.indexOf(e.id) < 0 && !p.epp[e.id]) return;
        registrar(e.nivel, 'EPP: ' + e.label, p.epp[e.id] || '');
      });

      /* Condiciones especiales activas */
      Petar.especialesActivos(p).forEach(function (bloque) {
        bloque.items.forEach(function (it) {
          registrar(it.nivel, it.label, (p.especiales[bloque.clave] || {})[it.id] || '');
        });
      });

      return r;
    },

    semaforo: function (p) {
      var r = Petar.resumenConformidad(p);
      if (r.criticasNo > 0) return 'no_conforme';
      if (r.sinResponder > 0) return 'pendiente';
      if (r.no > 0) return 'observado';
      return 'conforme';
    },

    puedeAutorizarse: function (p) {
      return Petar.resumenConformidad(p).criticasNo === 0;
    },

    /* ---------------------------------------------------------------
       Vigencia
       --------------------------------------------------------------- */
    inicioVigencia: function (p) { return aFecha(p.vigencia.inicioFecha, p.vigencia.inicioHora); },
    finVigencia: function (p) { return aFecha(p.vigencia.finFecha, p.vigencia.finHora); },

    estaVencido: function (p, ahora) {
      var fin = Petar.finVigencia(p);
      if (!fin) return false;
      return (ahora || new Date()) > fin;
    },

    /* Estado a mostrar: un permiso autorizado cuyo plazo terminó se
       presenta como vencido aunque nadie haya tocado el aplicativo. */
    estadoVisible: function (p) {
      if (p.estado === 'AUTORIZADO' && Petar.estaVencido(p)) return 'VENCIDO';
      return p.estado;
    },

    minutosRestantes: function (p) {
      var fin = Petar.finVigencia(p);
      if (!fin) return null;
      return Math.round((fin - new Date()) / 60000);
    },

    /* ---------------------------------------------------------------
       Transiciones de estado
       --------------------------------------------------------------- */
    cambiarEstado: function (p, estado, usuario, comentario) {
      p.estado = estado;
      p.historialEstados.push({
        estado: estado,
        fechaHora: new Date().toISOString(),
        usuario: usuario || (p.usuario && p.usuario.nombre) || '',
        comentario: comentario || ''
      });
      return p;
    },

    suspender: function (p, usuario, motivo, detalle) {
      p.suspension = { fechaHora: new Date().toISOString(), usuario: usuario, motivo: motivo, detalle: detalle || '' };
      return Petar.cambiarEstado(p, 'SUSPENDIDO', usuario, motivo + (detalle ? ' — ' + detalle : ''));
    },

    /* Reanudación: preparada para un flujo controlado posterior
       (hoy exige que no haya críticas incumplidas ni plazo vencido). */
    puedeReanudarse: function (p) {
      return p.estado === 'SUSPENDIDO' && Petar.puedeAutorizarse(p) && !Petar.estaVencido(p);
    },

    cerrar: function (p, usuario) {
      p.cierre.fechaHora = new Date().toISOString();
      p.cierre.responsable = p.cierre.responsable || usuario;
      return Petar.cambiarEstado(p, 'CERRADO', usuario, 'Cierre del permiso');
    },

    cierrePendiente: function (p) {
      return C.cierre.filter(function (it) { return it.nivel !== 'informativo' && !p.cierre.checklist[it.id]; });
    },

    /* ---------------------------------------------------------------
       Textos derivados
       --------------------------------------------------------------- */
    tipoTrabajoTexto: function (p) {
      var nombres = (p.trabajo.tipos || []).map(function (id) {
        var t = C.tiposTrabajo.find(function (x) { return x.id === id; });
        if (!t) return id;
        return (t.id === 'otro' && p.trabajo.otroTipo) ? 'Otro: ' + p.trabajo.otroTipo : t.nombre;
      });
      return nombres.join(', ');
    },

    equiposTexto: function (p) {
      var e = (p.trabajo.equipos || []).slice();
      var i = e.indexOf('Otro');
      if (i >= 0 && p.trabajo.otroEquipo) e[i] = 'Otro: ' + p.trabajo.otroEquipo;
      return e.join(', ');
    },

    elementoTexto: function (p) {
      if (p.trabajo.elemento === 'Otro' && p.trabajo.otroElemento) return 'Otro: ' + p.trabajo.otroElemento;
      return p.trabajo.elemento;
    },

    personalTexto: function (p) {
      return (p.personal.trabajadores || []).join(', ');
    },

    vigenciaTexto: function (p) {
      var v = p.vigencia;
      var f = window.UI ? window.UI.fechaLarga : function (x) { return x; };
      if (!v.inicioHora || !v.finHora) return '—';
      var mismoDia = v.inicioFecha === v.finFecha;
      return f(v.inicioFecha) + ' ' + v.inicioHora + ' a ' + (mismoDia ? '' : f(v.finFecha) + ' ') + v.finHora;
    },

    etiquetaEstado: function (estado) {
      return (C.estados[estado] || { etiqueta: estado }).etiqueta;
    },

    hoyISO: hoyISO,
    ahoraHora: ahoraHora,
    aFecha: aFecha
  };

  window.Petar = Petar;
})();
