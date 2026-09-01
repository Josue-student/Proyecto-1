/* =====================================================================
   VALIDACIONES — window.Validador
   Devuelve siempre una lista de { campo, mensaje } en lenguaje claro.
   Nunca mensajes técnicos.
   ===================================================================== */
(function () {
  'use strict';

  var C = window.PETAR_CONFIG;

  function horaAMinutos(h) {
    if (!h || h.indexOf(':') < 0) return null;
    var p = h.split(':');
    return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
  }

  var Validador = {

    validarPaso: function (p, pasoId) {
      var e = [];

      if (pasoId === 'generales') {
        var g = p.generales;
        if (!g.fecha) e.push({ campo: 'fecha', mensaje: 'Indica la fecha del permiso.' });
        if (!g.horaInicio) e.push({ campo: 'horaInicio', mensaje: 'Indica la hora de inicio.' });
        if (!g.horaTermino) e.push({ campo: 'horaTermino', mensaje: 'Indica la hora de término.' });
        var i = horaAMinutos(g.horaInicio), f = horaAMinutos(g.horaTermino);
        if (i !== null && f !== null && f <= i) {
          e.push({ campo: 'horaTermino', mensaje: 'La hora de término debe ser posterior a la de inicio. Si el trabajo cruza la medianoche, registra dos PETAR.' });
        }
        if (!g.area) e.push({ campo: 'area', mensaje: 'Selecciona el área donde se ejecutará el trabajo.' });
        if (!g.subarea) e.push({ campo: 'subarea', mensaje: 'Indica la subárea o ubicación exacta.' });
        if (!g.responsableTrabajo) e.push({ campo: 'responsableTrabajo', mensaje: 'Debes completar el responsable del trabajo.' });
        if (!g.nTrabajadores || Number(g.nTrabajadores) < 1) {
          e.push({ campo: 'nTrabajadores', mensaje: 'Indica cuántos trabajadores participarán (mínimo 1).' });
        }
      }

      if (pasoId === 'trabajo') {
        if (!p.trabajo.tipos || !p.trabajo.tipos.length) {
          e.push({ campo: 'tipos', mensaje: 'Selecciona al menos un tipo de trabajo en caliente.' });
        }
        if ((p.trabajo.tipos || []).indexOf('Otros') >= 0 && !p.trabajo.otroDetalle) {
          e.push({ campo: 'otroDetalle', mensaje: 'Especifica en qué consiste el trabajo marcado como "Otros".' });
        }
        if (!p.generales.descripcion || p.generales.descripcion.trim().length < 10) {
          e.push({ campo: 'descripcion', mensaje: 'Describe el trabajo con al menos una frase (10 caracteres).' });
        }
      }

      if (pasoId === 'seguridad') {
        C.checklist.forEach(function (sec) {
          var faltan = sec.items.filter(function (it) { return !(p.checklist[sec.id] || {})[it.id]; });
          if (faltan.length) {
            e.push({
              campo: sec.id,
              mensaje: 'Faltan ' + faltan.length + ' respuesta(s) en "' + sec.titulo + '".'
            });
          }
        });
      }

      if (pasoId === 'controles') {
        var eppFaltan = C.epp.filter(function (it) { return !p.epp[it.id]; }).length;
        if (eppFaltan) e.push({ campo: 'epp', mensaje: 'Faltan ' + eppFaltan + ' respuesta(s) en equipos de protección personal.' });

        var eqFaltan = C.equipos.filter(function (it) { return !p.equipos[it.id]; }).length;
        if (eqFaltan) e.push({ campo: 'equipos', mensaje: 'Faltan ' + eqFaltan + ' respuesta(s) en equipos y herramientas.' });

        if (!p.vigia.aplica) e.push({ campo: 'vigiaAplica', mensaje: 'Indica si el trabajo cuenta con vigía de fuego.' });
        if (p.vigia.aplica === 'si') {
          if (!p.vigia.nombre) e.push({ campo: 'vigiaNombre', mensaje: 'Escribe el nombre del vigía de fuego.' });
          if (!p.vigia.horaInicio || !p.vigia.horaTermino) {
            e.push({ campo: 'vigiaHoras', mensaje: 'Registra el horario de permanencia del vigía de fuego.' });
          }
          if (p.vigia.conoceFunciones !== 'si') {
            e.push({ campo: 'vigiaFunciones', mensaje: 'Confirma que el vigía conoce sus funciones antes de continuar.' });
          }
        }
      }

      if (pasoId === 'evidencias') {
        var r = window.Petar.resumenConformidad(p);
        if (r.no > 0 && (!p.observaciones || p.observaciones.trim().length < 5)) {
          e.push({ campo: 'observaciones', mensaje: 'Hay condiciones no conformes: describe en observaciones la medida adoptada.' });
        }
      }

      if (pasoId === 'firmas') {
        if (!p.firmas.responsable.nombre) e.push({ campo: 'respNombre', mensaje: 'Falta el nombre del responsable del trabajo.' });
        if (!p.firmas.responsable.cargo) e.push({ campo: 'respCargo', mensaje: 'Falta el cargo del responsable del trabajo.' });
        if (!p.firmas.responsable.firma) e.push({ campo: 'respFirma', mensaje: 'El responsable del trabajo debe firmar en pantalla.' });
        if (!p.firmas.autorizante.nombre) e.push({ campo: 'autNombre', mensaje: 'Falta el nombre de quien autoriza el permiso.' });
        if (!p.firmas.autorizante.cargo) e.push({ campo: 'autCargo', mensaje: 'Falta el cargo de quien autoriza el permiso.' });
        if (!p.firmas.autorizante.firma) e.push({ campo: 'autFirma', mensaje: 'El autorizante SST debe firmar en pantalla.' });
      }

      return e;
    },

    /* Validación completa: se usa antes de guardar y de autorizar */
    validarTodo: function (p) {
      var todos = [];
      C.pasos.forEach(function (paso) {
        Validador.validarPaso(p, paso.id).forEach(function (err) {
          err.paso = paso.id;
          err.pasoTitulo = paso.titulo;
          todos.push(err);
        });
      });
      return todos;
    },

    /* Bloqueos duros para autorizar (condiciones críticas en NO) */
    bloqueosParaAutorizar: function (p) {
      var r = window.Petar.resumenConformidad(p);
      var b = [];
      if (r.criticasNo > 0) {
        b.push({
          campo: 'criticas',
          mensaje: 'Hay ' + r.criticasNo + ' condición(es) crítica(s) no conforme(s). Corrige en campo y actualiza la respuesta antes de autorizar.',
          detalle: r.detalleCriticas
        });
      }
      return b;
    }
  };

  window.Validador = Validador;
})();
