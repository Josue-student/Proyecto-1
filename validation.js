/* =====================================================================
   VALIDACIONES — window.Validador
   Devuelve listas de { campo, mensaje } en lenguaje claro.
   Distingue tres exigencias: crítico bloquea, requerido debe
   completarse, informativo nunca detiene el permiso.
   ===================================================================== */
(function () {
  'use strict';

  var C = window.PETAR_CONFIG;

  var Validador = {

    validarPaso: function (p, pasoId) {
      var e = [];

      if (pasoId === 'identificacion') {
        var i = p.identificacion;
        if (!i.fecha) e.push({ mensaje: 'Indica la fecha del permiso.' });
        if (!i.area) e.push({ mensaje: 'Selecciona el área donde se ejecutará el trabajo.' });
        if (!i.subarea) e.push({ mensaje: 'Selecciona la subárea.' });
        if (!i.ubicacion || i.ubicacion.trim().length < 3) e.push({ mensaje: 'Describe la ubicación exacta del punto de trabajo.' });
        if (!i.responsableTrabajo) e.push({ mensaje: 'Debes indicar el responsable del trabajo.' });
        if (!i.solicitante) e.push({ mensaje: 'Indica quién solicita el permiso.' });
      }

      if (pasoId === 'trabajo') {
        var t = p.trabajo;
        if (!t.tipos.length) e.push({ mensaje: 'Selecciona al menos un tipo de trabajo en caliente.' });
        if (t.tipos.indexOf('otro') >= 0 && !t.otroTipo) e.push({ mensaje: 'Especifica en qué consiste el trabajo marcado como "Otro".' });
        if (!t.descripcion || t.descripcion.trim().length < 10) e.push({ mensaje: 'Describe el trabajo con al menos una frase.' });
        if (!t.equipos.length) e.push({ mensaje: 'Indica el equipo o herramienta que se utilizará.' });
        if (t.equipos.indexOf('Otro') >= 0 && !t.otroEquipo) e.push({ mensaje: 'Especifica el equipo marcado como "Otro".' });
        if (!t.elemento) e.push({ mensaje: 'Indica sobre qué elemento se realizará el trabajo.' });
        if (t.elemento === 'Otro' && !t.otroElemento) e.push({ mensaje: 'Especifica el elemento marcado como "Otro".' });
      }

      if (pasoId === 'personal') {
        var pe = p.personal;
        if (!pe.trabajadores.length) e.push({ mensaje: 'Registra al menos un trabajador que ejecutará la tarea.' });
        if (!pe.supervisor) e.push({ mensaje: 'Indica el supervisor a cargo.' });
        if (!pe.vigia.requiere) e.push({ mensaje: 'Indica si la tarea requiere vigía o personal de apoyo.' });
        if (pe.vigia.requiere === 'si' && !pe.vigia.nombre) e.push({ mensaje: 'Escribe el nombre del vigía o personal de apoyo.' });
        if (!pe.confirmacion) e.push({ mensaje: 'Confirma que el personal conoce los riesgos y controles de la tarea.' });
      }

      if (pasoId === 'condiciones') {
        window.Petar.condicionesVisibles(p).forEach(function (q) {
          if (q.nivel === 'informativo') return;
          var v = p.condiciones[q.id];
          var vacio = (q.tipo === 'multiple') ? !(v && v.length) : !v;
          if (vacio) e.push({ mensaje: 'Falta responder: ' + q.pregunta });
        });
      }

      if (pasoId === 'controles') {
        window.Petar.controlesAplicables(p).forEach(function (bloque) {
          var faltan = bloque.items.filter(function (it) {
            return it.nivel !== 'informativo' && !(p.controles[bloque.clave] || {})[it.id];
          }).length;
          if (faltan) e.push({ mensaje: 'Faltan ' + faltan + ' respuesta(s) en "' + bloque.titulo + '".' });
        });
      }

      if (pasoId === 'epp') {
        var sugerido = window.Petar.eppSugerido(p);
        var faltanEpp = C.epp.filter(function (it) {
          return it.nivel !== 'informativo' && sugerido.indexOf(it.id) >= 0 && !p.epp[it.id];
        }).length;
        if (faltanEpp) e.push({ mensaje: 'Faltan ' + faltanEpp + ' respuesta(s) en el EPP requerido para esta tarea.' });
        if (p.epp.otro_epp === 'si' && !p.otroEppDetalle) e.push({ mensaje: 'Especifica el otro EPP que se utilizará.' });
      }

      if (pasoId === 'exposicion') {
        if (!p.exposicion.evaluacion) e.push({ mensaje: 'Indica si existe evaluación higiénica aplicable a la tarea.' });
        if (p.exposicion.agentes.indexOf('Otros') >= 0 && !p.exposicion.otroAgente) {
          e.push({ mensaje: 'Especifica el otro agente de exposición.' });
        }
        if (!p.especiales.recipiente) e.push({ mensaje: 'Indica si se trabajará sobre un recipiente.' });
        if (p.especiales.recipiente === 'si' && !p.especiales.recipienteInflamables) {
          e.push({ mensaje: 'Indica si el recipiente contuvo sustancias inflamables o explosivas.' });
        }
        if (!p.especiales.confinado) e.push({ mensaje: 'Indica si el trabajo será en espacio confinado.' });

        window.Petar.especialesActivos(p).forEach(function (bloque) {
          var faltan = bloque.items.filter(function (it) {
            return it.nivel !== 'informativo' && !(p.especiales[bloque.clave] || {})[it.id];
          }).length;
          if (faltan) e.push({ mensaje: 'Faltan ' + faltan + ' control(es) en "' + bloque.titulo + '".' });
        });
      }

      if (pasoId === 'evidencias') {
        var r = window.Petar.resumenConformidad(p);
        if (r.requeridosNo > 0 && (!p.observaciones || p.observaciones.trim().length < 5)) {
          e.push({ mensaje: 'Hay controles requeridos sin cumplir: describe en observaciones la medida adoptada.' });
        }
      }

      if (pasoId === 'vigencia') {
        var v = p.vigencia;
        if (!v.inicioFecha || !v.inicioHora) e.push({ mensaje: 'Indica la fecha y hora de inicio de la vigencia.' });
        if (!v.finFecha || !v.finHora) e.push({ mensaje: 'Indica la fecha y hora de término de la vigencia.' });
        var ini = window.Petar.inicioVigencia(p), fin = window.Petar.finVigencia(p);
        if (ini && fin && fin <= ini) e.push({ mensaje: 'El término de la vigencia debe ser posterior al inicio.' });

        C.firmas.filter(function (f) { return f.activa && f.requerida; }).forEach(function (f) {
          var d = p.autorizacion[f.clave] || {};
          if (!d.nombre) e.push({ mensaje: 'Falta el nombre en "' + f.titulo + '".' });
          if (!d.cargo) e.push({ mensaje: 'Falta el cargo en "' + f.titulo + '".' });
          if (!d.firma) e.push({ mensaje: 'Falta la firma de "' + f.titulo + '".' });
        });
      }

      return e;
    },

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

    /* Bloqueos duros: controles críticos incumplidos */
    bloqueosParaAutorizar: function (p) {
      var r = window.Petar.resumenConformidad(p);
      var b = [];
      if (r.criticasNo > 0) {
        b.push({
          mensaje: 'Hay ' + r.criticasNo + ' control(es) crítico(s) sin cumplir. El permiso no puede autorizarse hasta corregirlos en campo y actualizar la respuesta.',
          detalle: r.detalleCriticas
        });
      }
      if (window.Petar.estaVencido(p)) {
        b.push({ mensaje: 'La vigencia indicada ya venció. Ajusta el horario antes de autorizar.', detalle: [] });
      }
      return b;
    },

    /* Cierre del permiso */
    validarCierre: function (p) {
      var e = [];
      window.Petar.cierrePendiente(p).forEach(function (it) {
        e.push({ mensaje: 'Falta confirmar: ' + it.label });
      });
      if (!p.cierre.responsable) e.push({ mensaje: 'Indica quién entrega el área.' });
      if (!p.cierre.firma) e.push({ mensaje: 'Falta la firma de cierre.' });
      return e;
    }
  };

  window.Validador = Validador;
})();
