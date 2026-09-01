/* =====================================================================
   COMPONENTES DE INTERFAZ — window.UI
   Piezas reutilizables: escape de texto, avisos, diálogos, firma en
   canvas y captura de fotografías con redimensionado.
   ===================================================================== */
(function () {
  'use strict';

  var UI = {

    /* Seguridad: todo dato ingresado por el usuario pasa por aquí antes
       de insertarse en el DOM. Nunca se inyecta HTML del usuario. */
    esc: function (v) {
      if (v === null || v === undefined) return '';
      return String(v)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },

    $: function (sel, ctx) { return (ctx || document).querySelector(sel); },
    $$: function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); },

    /* Aviso breve en la parte inferior */
    aviso: function (texto, tono) {
      var cont = UI.$('#avisos');
      var el = document.createElement('div');
      el.className = 'aviso aviso--' + (tono || 'ok');
      el.setAttribute('role', 'status');
      el.textContent = texto;
      cont.appendChild(el);
      setTimeout(function () { el.classList.add('aviso--sale'); }, 2400);
      setTimeout(function () { el.remove(); }, 2900);
    },

    /* Indicador discreto de guardado automático */
    marcarGuardado: function () {
      var el = UI.$('#guardado');
      if (!el) return;
      el.textContent = 'Cambios guardados';
      el.classList.add('guardado--visible');
      clearTimeout(UI._tg);
      UI._tg = setTimeout(function () { el.classList.remove('guardado--visible'); }, 1800);
    },

    /* Diálogo de confirmación (reemplaza confirm() nativo) */
    confirmar: function (opts) {
      return new Promise(function (resolve) {
        var fondo = document.createElement('div');
        fondo.className = 'modal';
        fondo.innerHTML =
          '<div class="modal__caja" role="dialog" aria-modal="true">' +
            '<h3 class="modal__titulo">' + UI.esc(opts.titulo) + '</h3>' +
            '<p class="modal__texto">' + UI.esc(opts.texto) + '</p>' +
            '<div class="modal__acciones">' +
              '<button class="btn btn--fantasma" data-r="0">' + UI.esc(opts.cancelar || 'Cancelar') + '</button>' +
              '<button class="btn ' + (opts.peligro ? 'btn--peligro' : 'btn--principal') + '" data-r="1">' + UI.esc(opts.aceptar || 'Continuar') + '</button>' +
            '</div>' +
          '</div>';
        document.body.appendChild(fondo);
        fondo.addEventListener('click', function (ev) {
          var b = ev.target.closest('[data-r]');
          if (!b && ev.target !== fondo) return;
          fondo.remove();
          resolve(b ? b.dataset.r === '1' : false);
        });
      });
    },

    /* Lista de errores de validación */
    listaErrores: function (errores) {
      if (!errores.length) return '';
      return '<div class="alerta alerta--mal" role="alert">' +
        '<strong>Faltan datos para continuar</strong><ul>' +
        errores.map(function (e) { return '<li>' + UI.esc(e.mensaje) + '</li>'; }).join('') +
        '</ul></div>';
    },

    /* -----------------------------------------------------------------
       Firma en canvas — funciona con dedo, lápiz táctil y mouse
    ----------------------------------------------------------------- */
    FirmaPad: function (canvas) {
      var ctx = canvas.getContext('2d');
      var pintando = false, huboTrazo = false, ultimo = null;

      function ajustar() {
        var r = canvas.getBoundingClientRect();
        var dpr = window.devicePixelRatio || 1;
        var datos = huboTrazo ? canvas.toDataURL() : null;
        canvas.width = r.width * dpr;
        canvas.height = r.height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#10141a';
        if (datos) {
          var img = new Image();
          img.onload = function () { ctx.drawImage(img, 0, 0, r.width, r.height); };
          img.src = datos;
        }
      }

      function punto(ev) {
        var r = canvas.getBoundingClientRect();
        var t = ev.touches ? ev.touches[0] : ev;
        return { x: t.clientX - r.left, y: t.clientY - r.top };
      }

      function inicio(ev) { ev.preventDefault(); pintando = true; ultimo = punto(ev); }
      function mover(ev) {
        if (!pintando) return;
        ev.preventDefault();
        var p = punto(ev);
        ctx.beginPath(); ctx.moveTo(ultimo.x, ultimo.y); ctx.lineTo(p.x, p.y); ctx.stroke();
        ultimo = p; huboTrazo = true;
      }
      function fin(ev) {
        if (!pintando) return;
        pintando = false;
        if (typeof api.alTerminar === 'function') api.alTerminar(api.dataURL());
      }

      canvas.addEventListener('mousedown', inicio);
      canvas.addEventListener('mousemove', mover);
      window.addEventListener('mouseup', fin);
      canvas.addEventListener('touchstart', inicio, { passive: false });
      canvas.addEventListener('touchmove', mover, { passive: false });
      canvas.addEventListener('touchend', fin);
      window.addEventListener('resize', ajustar);

      var api = {
        alTerminar: null,
        limpiar: function () {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          huboTrazo = false;
          if (typeof api.alTerminar === 'function') api.alTerminar('');
        },
        vacio: function () { return !huboTrazo; },
        dataURL: function () { return huboTrazo ? canvas.toDataURL('image/png') : ''; },
        cargar: function (data) {
          if (!data) return;
          var img = new Image();
          img.onload = function () {
            var r = canvas.getBoundingClientRect();
            ctx.drawImage(img, 0, 0, r.width, r.height);
            huboTrazo = true;
          };
          img.src = data;
        },
        ajustar: ajustar
      };

      setTimeout(ajustar, 30);
      return api;
    },

    /* -----------------------------------------------------------------
       Fotografía: abre la cámara del celular cuando el navegador lo
       permite y reduce la imagen antes de guardarla.
    ----------------------------------------------------------------- */
    leerFoto: function (file) {
      var cfg = window.PETAR_CONFIG.fotos;
      return new Promise(function (resolve, reject) {
        if (!file || !/^image\//.test(file.type)) return reject(new Error('Solo se admiten imágenes.'));
        var lector = new FileReader();
        lector.onload = function () {
          var img = new Image();
          img.onload = function () {
            var escala = Math.min(1, cfg.anchoMaximoPx / img.width);
            var w = Math.round(img.width * escala), h = Math.round(img.height * escala);
            var c = document.createElement('canvas');
            c.width = w; c.height = h;
            var cx = c.getContext('2d');
            cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h);
            cx.drawImage(img, 0, 0, w, h);
            resolve({
              id: 'f_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
              dataUrl: c.toDataURL('image/jpeg', cfg.calidadJpeg),
              ancho: w, alto: h,
              nota: ''
            });
          };
          img.onerror = function () { reject(new Error('No se pudo leer la imagen.')); };
          img.src = lector.result;
        };
        lector.onerror = function () { reject(new Error('No se pudo leer el archivo.')); };
        lector.readAsDataURL(file);
      });
    },

    descargar: function (nombre, contenido, tipo) {
      var blob = contenido instanceof Blob ? contenido : new Blob([contenido], { type: tipo || 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = nombre;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    },

    fechaLarga: function (iso) {
      if (!iso) return '';
      var p = iso.split('-');
      return p[2] + '/' + p[1] + '/' + p[0];
    },

    fechaHora: function (iso) {
      if (!iso) return '';
      var d = new Date(iso);
      return UI.fechaLarga(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')) +
        ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    }
  };

  window.UI = UI;
})();
