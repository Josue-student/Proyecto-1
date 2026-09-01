/* =====================================================================
   SERVICE WORKER — soporte offline del aplicativo
   Guarda los archivos de la aplicación para que el PETAR pueda
   registrarse sin señal. Los datos siguen en IndexedDB del equipo;
   la sincronización con un servidor corporativo se añadirá después
   (ver README, sección "De MVP a producción").
   ===================================================================== */
var CACHE = 'petar-pana-v1';
var ARCHIVOS = [
  './',
  './index.html',
  './css/styles.css',
  './data/config.js',
  './js/ui.js',
  './js/storage.js',
  './js/petar.js',
  './js/validation.js',
  './js/pdf.js',
  './js/app.js',
  './assets/vendor/jspdf.umd.min.js',
  './assets/icons/icono-192.png',
  './assets/icons/icono-512.png',
  './manifest.webmanifest'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ARCHIVOS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (llaves) {
    return Promise.all(llaves.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

/* Primero la red, con respaldo en caché: así se recibe cualquier
   actualización del aplicativo sin dejar de funcionar sin conexión. */
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(function (resp) {
      var copia = resp.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copia); });
      return resp;
    }).catch(function () {
      return caches.match(e.request).then(function (r) { return r || caches.match('./index.html'); });
    })
  );
});
