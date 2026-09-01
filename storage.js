/* =====================================================================
   CAPA DE ALMACENAMIENTO — window.Store
   ---------------------------------------------------------------------
   Toda la aplicación habla ÚNICAMENTE con estas funciones:

       Store.savePetar(petar)     Store.getPetar(id)
       Store.getAllPetar()        Store.updatePetar(id, cambios)
       Store.deletePetar(id)      Store.nextCorrelativo()

   Hoy el motor es IndexedDB (con respaldo en localStorage si el
   navegador la bloquea). Para migrar a Google Sheets, SharePoint/Excel
   o una base de datos SQL, se implementa un nuevo adaptador con estas
   mismas seis funciones y se cambia la línea marcada con ADAPTADOR
   al final del archivo. La interfaz no se toca.
   ===================================================================== */
(function () {
  'use strict';

  var DB_NAME = 'pana_sst';
  var DB_VERSION = 1;
  var STORE_PETAR = 'petar';
  var STORE_META = 'meta';
  var LS_KEY = 'pana_sst_petar_fallback';

  /* ---------------------------------------------------------------
     Adaptador 1: IndexedDB
     --------------------------------------------------------------- */
  var idb = (function () {
    var dbp = null;

    function open() {
      if (dbp) return dbp;
      dbp = new Promise(function (resolve, reject) {
        if (!('indexedDB' in window)) return reject(new Error('sin-indexeddb'));
        var req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = function (e) {
          var db = e.target.result;
          if (!db.objectStoreNames.contains(STORE_PETAR)) {
            var os = db.createObjectStore(STORE_PETAR, { keyPath: 'id' });
            os.createIndex('numero', 'numero', { unique: false });
            os.createIndex('estado', 'estado', { unique: false });
            os.createIndex('fecha', 'generales.fecha', { unique: false });
          }
          if (!db.objectStoreNames.contains(STORE_META)) {
            db.createObjectStore(STORE_META, { keyPath: 'clave' });
          }
        };
        req.onsuccess = function (e) { resolve(e.target.result); };
        req.onerror = function () { reject(req.error || new Error('idb-error')); };
      });
      return dbp;
    }

    function tx(store, modo, fn) {
      return open().then(function (db) {
        return new Promise(function (resolve, reject) {
          var t = db.transaction(store, modo);
          var os = t.objectStore(store);
          var res;
          try { res = fn(os); } catch (err) { reject(err); return; }
          t.oncomplete = function () { resolve(res && res.result !== undefined ? res.result : res); };
          t.onerror = function () { reject(t.error); };
          t.onabort = function () { reject(t.error); };
        });
      });
    }

    return {
      disponible: function () { return open().then(function () { return true; }); },
      put: function (p) { return tx(STORE_PETAR, 'readwrite', function (os) { return os.put(p); }).then(function () { return p; }); },
      get: function (id) { return tx(STORE_PETAR, 'readonly', function (os) { return os.get(id); }); },
      all: function () { return tx(STORE_PETAR, 'readonly', function (os) { return os.getAll(); }); },
      del: function (id) { return tx(STORE_PETAR, 'readwrite', function (os) { return os.delete(id); }); },
      meta: function (clave) { return tx(STORE_META, 'readonly', function (os) { return os.get(clave); }); },
      setMeta: function (clave, valor) {
        return tx(STORE_META, 'readwrite', function (os) { return os.put({ clave: clave, valor: valor }); });
      }
    };
  })();

  /* ---------------------------------------------------------------
     Adaptador 2: localStorage (respaldo)
     --------------------------------------------------------------- */
  var ls = (function () {
    function leer() {
      try { return JSON.parse(localStorage.getItem(LS_KEY) || '{"petar":[],"meta":{}}'); }
      catch (e) { return { petar: [], meta: {} }; }
    }
    function escribir(d) { localStorage.setItem(LS_KEY, JSON.stringify(d)); }
    return {
      disponible: function () {
        return new Promise(function (res, rej) {
          try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); res(true); }
          catch (e) { rej(e); }
        });
      },
      put: function (p) {
        var d = leer();
        var i = d.petar.findIndex(function (x) { return x.id === p.id; });
        if (i >= 0) d.petar[i] = p; else d.petar.push(p);
        escribir(d);
        return Promise.resolve(p);
      },
      get: function (id) {
        return Promise.resolve(leer().petar.find(function (x) { return x.id === id; }));
      },
      all: function () { return Promise.resolve(leer().petar); },
      del: function (id) {
        var d = leer();
        d.petar = d.petar.filter(function (x) { return x.id !== id; });
        escribir(d);
        return Promise.resolve();
      },
      meta: function (clave) {
        var v = leer().meta[clave];
        return Promise.resolve(v === undefined ? undefined : { clave: clave, valor: v });
      },
      setMeta: function (clave, valor) {
        var d = leer(); d.meta[clave] = valor; escribir(d);
        return Promise.resolve();
      }
    };
  })();

  /* ---------------------------------------------------------------
     ADAPTADOR ACTIVO
     --------------------------------------------------------------- */
  var motor = idb;
  var nombreMotor = 'IndexedDB';

  var listo = idb.disponible()
    .then(function () { motor = idb; nombreMotor = 'IndexedDB'; })
    .catch(function () {
      return ls.disponible().then(function () { motor = ls; nombreMotor = 'localStorage'; });
    })
    .catch(function () { motor = ls; nombreMotor = 'memoria'; });

  /* ---------------------------------------------------------------
     API pública
     --------------------------------------------------------------- */
  var Store = {

    init: function () { return listo.then(function () { return nombreMotor; }); },
    motor: function () { return nombreMotor; },

    savePetar: function (petar) {
      return listo.then(function () {
        petar.actualizadoEn = new Date().toISOString();
        return motor.put(petar);
      });
    },

    getPetar: function (id) {
      return listo.then(function () { return motor.get(id); });
    },

    getAllPetar: function () {
      return listo.then(function () { return motor.all(); }).then(function (lista) {
        lista = lista || [];
        lista.sort(function (a, b) { return (b.creadoEn || '').localeCompare(a.creadoEn || ''); });
        return lista;
      });
    },

    updatePetar: function (id, cambios) {
      return Store.getPetar(id).then(function (p) {
        if (!p) throw new Error('El PETAR no existe.');
        Object.keys(cambios).forEach(function (k) { p[k] = cambios[k]; });
        return Store.savePetar(p);
      });
    },

    deletePetar: function (id) {
      return listo.then(function () { return motor.del(id); });
    },

    /* Correlativo anual: PETAR-2026-0001 */
    nextCorrelativo: function () {
      var anio = new Date().getFullYear();
      var clave = 'correlativo_' + anio;
      return listo.then(function () { return motor.meta(clave); }).then(function (reg) {
        var n = (reg && reg.valor ? reg.valor : 0) + 1;
        return motor.setMeta(clave, n).then(function () {
          return window.PETAR_CONFIG.prefijoCorrelativo + '-' + anio + '-' + String(n).padStart(4, '0');
        });
      });
    },

    /* Preferencias del dispositivo (usuario elegido, ajustes locales) */
    setPreferencia: function (clave, valor) {
      return listo.then(function () { return motor.setMeta('pref_' + clave, valor); });
    },
    getPreferencia: function (clave) {
      return listo.then(function () { return motor.meta('pref_' + clave); })
        .then(function (r) { return r ? r.valor : null; });
    },

    /* Borrador en curso: permite retomar el PETAR tras cerrar el navegador */
    setBorradorActivo: function (id) { return listo.then(function () { return motor.setMeta('borrador_activo', id); }); },
    getBorradorActivo: function () {
      return listo.then(function () { return motor.meta('borrador_activo'); })
        .then(function (r) { return r ? r.valor : null; });
    },

    /* -------------------------------------------------------------
       PUNTO DE INTEGRACIÓN FUTURA
       -------------------------------------------------------------
       Cada PETAR se convierte en una fila. Esta función ya produce el
       registro plano que consumirían Google Sheets o Excel/SharePoint:

         APLICATIVO  ->  API  ->  GOOGLE SHEETS  ->  REGISTRO HISTÓRICO
         APLICATIVO  ->  POWER AUTOMATE / GRAPH  ->  EXCEL / SHAREPOINT

       El envío se haría desde un backend propio (nunca con la API key
       en el navegador). Ver README, sección "De MVP a producción".
    ------------------------------------------------------------- */
    toRow: function (p) {
      var r = window.Petar.resumenConformidad(p);
      return {
        numero: p.numero,
        estado: p.estado,
        fecha: p.generales.fecha,
        hora_inicio: p.generales.horaInicio,
        hora_termino: p.generales.horaTermino,
        area: p.generales.area,
        subarea: p.generales.subarea,
        responsable_trabajo: p.generales.responsableTrabajo,
        empresa: p.generales.empresa,
        trabajadores: p.generales.nTrabajadores,
        tipo_trabajo: (p.trabajo.tipos || []).join(' | '),
        descripcion: p.generales.descripcion,
        conformes: r.si,
        no_conformes: r.no,
        no_aplica: r.na,
        criticas_no_conformes: r.criticasNo,
        vigia: p.vigia.aplica === 'si' ? p.vigia.nombre : 'No aplica',
        observaciones: p.observaciones,
        fotos: (p.fotos || []).length,
        firma_responsable: p.firmas.responsable.nombre,
        firma_autorizante: p.firmas.autorizante.nombre,
        creado_en: p.creadoEn,
        actualizado_en: p.actualizadoEn
      };
    },

    exportarCSV: function (lista) {
      var filas = lista.map(Store.toRow);
      if (!filas.length) return '';
      var cols = Object.keys(filas[0]);
      var esc = function (v) {
        v = (v === null || v === undefined) ? '' : String(v);
        return '"' + v.replace(/"/g, '""').replace(/\r?\n/g, ' ') + '"';
      };
      return cols.join(';') + '\n' + filas.map(function (f) {
        return cols.map(function (c) { return esc(f[c]); }).join(';');
      }).join('\n');
    }
  };

  window.Store = Store;
})();
