/* =====================================================================
   MODELO DEL PETAR — window.Petar
   Crea, evalúa y describe un permiso. Sin acceso a la interfaz ni al
   almacenamiento: es lógica pura y por eso es fácil de probar.
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

  var Petar = {

    /* Estructura completa de un PETAR. Todo campo nuevo se declara aquí. */
    nuevo: function (numero, usuario) {
      return {
        id: 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        numero: numero,
        estado: 'BORRADOR',
        creadoEn: new Date().toISOString(),
        actualizadoEn: new Date().toISOString(),
        usuario: { nombre: usuario.nombre, cargo: usuario.cargo },

        generales: {
          fecha: hoyISO(),
          horaInicio: ahoraHora(),
          horaTermino: ahoraHora(C.vigenciaHoras * 60),
          area: '',
          subarea: '',
          responsableTrabajo: usuario.nombre,
          empresa: '',
          nTrabajadores: '',
          descripcion: ''
        },

        trabajo: { tipos: [], otroDetalle: '' },

        // { condiciones_area: {ca1:'si'}, incendio: {...} }
        checklist: {},
        epp: {},
        equipos: {},

        vigia: { aplica: '', nombre: '', horaInicio: '', horaTermino: '', conoceFunciones: '' },

        observaciones: '',
        fotos: [],   // { id, dataUrl, nota }

        firmas: {
          responsable: { nombre: usuario.nombre, cargo: usuario.cargo, firma: '', fechaHora: '' },
          autorizante: { nombre: '', cargo: '', firma: '', fechaHora: '' }
        },

        cierre: { fechaHora: '', responsable: '', comentario: '' },
        historialEstados: [{ estado: 'BORRADOR', fechaHora: new Date().toISOString(), usuario: usuario.nombre }]
      };
    },

    /* Repara PETAR guardados con versiones anteriores del modelo. */
    normalizar: function (p) {
      var base = Petar.nuevo(p.numero, p.usuario || { nombre: '', cargo: '' });
      ['generales', 'trabajo', 'vigia', 'firmas', 'cierre'].forEach(function (k) {
        p[k] = Object.assign({}, base[k], p[k] || {});
      });
      p.firmas.responsable = Object.assign({}, base.firmas.responsable, p.firmas.responsable || {});
      p.firmas.autorizante = Object.assign({}, base.firmas.autorizante, p.firmas.autorizante || {});
      p.checklist = p.checklist || {};
      p.epp = p.epp || {};
      p.equipos = p.equipos || {};
      p.fotos = p.fotos || [];
      p.historialEstados = p.historialEstados || [];
      return p;
    },

    /* --- Conformidad -------------------------------------------------
       Recorre checklist + EPP + equipos y cuenta respuestas.
       criticasNo = respuestas NO en preguntas marcadas como críticas.
    ------------------------------------------------------------------ */
    resumenConformidad: function (p) {
      var r = { si: 0, no: 0, na: 0, sinResponder: 0, total: 0, criticasNo: 0, detalleCriticas: [] };

      function evaluar(item, valor) {
        r.total++;
        if (valor === 'si') r.si++;
        else if (valor === 'no') {
          r.no++;
          if (item.critica) { r.criticasNo++; r.detalleCriticas.push(item.texto); }
        } else if (valor === 'na') r.na++;
        else r.sinResponder++;
      }

      C.checklist.forEach(function (sec) {
        sec.items.forEach(function (it) { evaluar(it, (p.checklist[sec.id] || {})[it.id]); });
      });
      C.epp.forEach(function (it) { evaluar(it, p.epp[it.id]); });
      C.equipos.forEach(function (it) { evaluar(it, p.equipos[it.id]); });

      return r;
    },

    /* Semáforo global: conforme / pendiente / no_conforme */
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

    cambiarEstado: function (p, estado, usuario, comentario) {
      p.estado = estado;
      p.historialEstados.push({
        estado: estado,
        fechaHora: new Date().toISOString(),
        usuario: usuario || (p.usuario && p.usuario.nombre) || '',
        comentario: comentario || ''
      });
      if (estado === 'CERRADO') {
        p.cierre.fechaHora = new Date().toISOString();
        p.cierre.responsable = usuario || '';
        p.cierre.comentario = comentario || '';
      }
      return p;
    },

    /* Texto del tipo de trabajo, listo para mostrar o imprimir */
    tipoTrabajoTexto: function (p) {
      var tipos = (p.trabajo.tipos || []).slice();
      var i = tipos.indexOf('Otros');
      if (i >= 0 && p.trabajo.otroDetalle) tipos[i] = 'Otros: ' + p.trabajo.otroDetalle;
      return tipos.join(', ');
    },

    /* Avance del formulario por paso (para la barra de progreso) */
    avancePaso: function (p, pasoId) {
      var v = window.Validador.validarPaso(p, pasoId);
      return v.length === 0;
    },

    etiquetaEstado: function (estado) {
      return (C.estados[estado] || { etiqueta: estado }).etiqueta;
    },

    hoyISO: hoyISO,
    ahoraHora: ahoraHora
  };

  window.Petar = Petar;
})();
