/* =====================================================================
   GENERACIÓN DEL DOCUMENTO PETAR — window.PetarPDF
   ---------------------------------------------------------------------
   Construye el PDF A4 en el propio navegador con jsPDF (vendorizado en
   assets/vendor). No requiere servidor ni conexión.
   El documento respeta el orden del formato físico: cabecera con código
   y correlativo, datos generales, trabajo, verificaciones, EPP, equipos,
   vigía, observaciones, fotografías y firmas.
   ===================================================================== */
(function () {
  'use strict';

  var C = window.PETAR_CONFIG;

  /* Paleta del documento (escala sobria para impresión) */
  var TINTA = [16, 20, 26];
  var GRIS = [110, 118, 128];
  var LINEA = [178, 184, 191];
  var BANDA = [27, 34, 43];
  var OK = [30, 122, 75];
  var MAL = [194, 38, 27];

  var M = 12;          // margen
  var ANCHO = 210, ALTO = 297;
  var UTIL = ANCHO - M * 2;

  function crearDoc() {
    var jsPDF = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
    if (!jsPDF) throw new Error('No se encontró la librería de PDF (assets/vendor/jspdf.umd.min.js).');
    return new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  }

  function generar(p) {
    var doc = crearDoc();
    var y = { v: 0 };

    cabecera(doc, p, true);
    y.v = 44;

    y.v = datosGenerales(doc, p, y.v);
    y.v = trabajo(doc, p, y.v);

    C.checklist.forEach(function (sec) {
      y.v = tablaRespuestas(doc, p, y.v, sec.titulo, sec.items, (p.checklist[sec.id] || {}), ['Sí', 'No', 'N/A']);
    });

    y.v = tablaRespuestas(doc, p, y.v, 'Equipos de protección personal', C.epp, p.epp, ['Sí', 'No', 'N/A']);
    y.v = tablaRespuestas(doc, p, y.v, 'Equipos y herramientas', C.equipos, p.equipos, ['Conf.', 'No conf.', 'N/A']);

    y.v = vigia(doc, p, y.v);
    y.v = observaciones(doc, p, y.v);
    y.v = fotografias(doc, p, y.v);
    y.v = firmas(doc, p, y.v);

    marcaAgua(doc, p);
    pies(doc, p);
    return doc;
  }

  /* ------------------------------------------------------------------ */
  function nuevaPagina(doc, p, alto) {
    if (alto === undefined) alto = 0;
    return function (yActual) {
      if (yActual + alto <= ALTO - 20) return yActual;
      doc.addPage();
      cabecera(doc, p, false);
      return 32;
    };
  }

  function cabecera(doc, p, portada) {
    var h = portada ? 30 : 18;
    doc.setDrawColor.apply(doc, LINEA);
    doc.setLineWidth(0.3);
    doc.rect(M, M, UTIL, h);

    /* Casilla del logo */
    doc.line(M + 34, M, M + 34, M + h);
    if (C.logoDataUrl) {
      try { doc.addImage(C.logoDataUrl, 'PNG', M + 3, M + 3, 28, h - 6); } catch (e) { /* logo opcional */ }
    } else {
      var partes = C.empresa.toUpperCase().split(' ');
      doc.setTextColor.apply(doc, BANDA);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(portada ? 13 : 10);
      if (partes.length > 1) {
        doc.text(partes[0], M + 17, M + h / 2 - (portada ? 3 : 1.5), { align: 'center' });
        doc.text(partes.slice(1).join(' '), M + 17, M + h / 2 + (portada ? 3 : 2.5), { align: 'center' });
      } else {
        doc.text(partes[0], M + 17, M + h / 2 + 1, { align: 'center' });
      }
      if (portada) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(5.6);
        doc.setTextColor.apply(doc, GRIS);
        doc.text('Espacio reservado al logotipo', M + 17, M + h - 4, { align: 'center' });
      }
    }

    /* Título */
    var xT = M + 34, anchoT = UTIL - 34 - 42;
    doc.setTextColor.apply(doc, TINTA);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(portada ? 10.5 : 8.5);
    doc.text('PERMISO ESCRITO DE TRABAJO DE ALTO RIESGO', xT + anchoT / 2, M + (portada ? 11 : 7), { align: 'center' });
    doc.setFontSize(portada ? 12 : 9);
    doc.text('TRABAJO EN CALIENTE', xT + anchoT / 2, M + (portada ? 19 : 13), { align: 'center' });
    if (portada) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
      doc.setTextColor.apply(doc, GRIS);
      doc.text(C.sistema + ' — ' + C.empresa, xT + anchoT / 2, M + 25, { align: 'center' });
    }

    /* Casilla de identificación */
    var xI = M + UTIL - 42;
    doc.line(xI, M, xI, M + h);
    doc.setTextColor.apply(doc, TINTA);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
    doc.text('Código: ' + C.codigoFormato, xI + 3, M + 5);
    doc.text('Versión: ' + C.version, xI + 3, M + 9);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(portada ? 10 : 8);
    doc.text(p.numero, xI + 3, M + (portada ? 16 : 14.5));
    if (portada) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
      doc.text('Estado: ' + window.Petar.etiquetaEstado(p.estado), xI + 3, M + 22);
    }
  }

  function tituloSeccion(doc, texto, y) {
    doc.setFillColor.apply(doc, BANDA);
    doc.rect(M, y, UTIL, 6.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
    doc.text(texto, M + 3, y + 4.5);
    doc.setTextColor.apply(doc, TINTA);
    return y + 6.5;
  }

  /* Rejilla de campos etiqueta/valor en dos columnas */
  function rejilla(doc, campos, y) {
    var colW = UTIL / 2, filaH = 8;
    doc.setDrawColor.apply(doc, LINEA);
    doc.setLineWidth(0.2);
    for (var i = 0; i < campos.length; i += 2) {
      var fila = campos.slice(i, i + 2);
      fila.forEach(function (c, j) {
        var x = M + j * colW;
        var w = (fila.length === 1) ? UTIL : colW;
        doc.rect(x, y, w, filaH);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(6.6);
        doc.setTextColor.apply(doc, GRIS);
        doc.text(c[0], x + 2, y + 3.2);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8.2);
        doc.setTextColor.apply(doc, TINTA);
        var txt = doc.splitTextToSize(String(c[1] || '—'), w - 4)[0];
        doc.text(txt, x + 2, y + 6.6);
      });
      y += filaH;
    }
    return y;
  }

  function datosGenerales(doc, p, y) {
    var g = p.generales;
    y = tituloSeccion(doc, '1. DATOS GENERALES', y);
    y = rejilla(doc, [
      ['Fecha', window.UI.fechaLarga(g.fecha)],
      ['Horario autorizado', (g.horaInicio || '—') + ' a ' + (g.horaTermino || '—')],
      ['Área', g.area],
      ['Subárea / ubicación', g.subarea],
      ['Responsable del trabajo', g.responsableTrabajo],
      ['Empresa / contratista', g.empresa],
      ['N.º de trabajadores', g.nTrabajadores],
      ['Emitido por', p.usuario.nombre + ' — ' + p.usuario.cargo]
    ], y);
    return y + 3;
  }

  function trabajo(doc, p, y) {
    y = tituloSeccion(doc, '2. DESCRIPCIÓN DEL TRABAJO', y);
    doc.setDrawColor.apply(doc, LINEA);

    doc.rect(M, y, UTIL, 8);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.6); doc.setTextColor.apply(doc, GRIS);
    doc.text('Tipo de trabajo en caliente', M + 2, y + 3.2);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.2); doc.setTextColor.apply(doc, TINTA);
    doc.text(doc.splitTextToSize(window.Petar.tipoTrabajoTexto(p) || '—', UTIL - 4)[0], M + 2, y + 6.6);
    y += 8;

    var texto = doc.splitTextToSize(p.generales.descripcion || '—', UTIL - 4);
    var h = Math.max(14, texto.length * 3.6 + 6);
    doc.rect(M, y, UTIL, h);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.6); doc.setTextColor.apply(doc, GRIS);
    doc.text('Descripción de la actividad', M + 2, y + 3.2);
    doc.setFontSize(8); doc.setTextColor.apply(doc, TINTA);
    doc.text(texto, M + 2, y + 7);
    return y + h + 3;
  }

  /* Tabla de preguntas con marca en Sí / No / N/A */
  function tablaRespuestas(doc, p, y, titulo, items, valores, encabezados) {
    var salto = nuevaPagina(doc, p, 20);
    y = salto(y);
    y = tituloSeccion(doc, titulo.toUpperCase(), y);

    var colResp = 14;
    var xResp = M + UTIL - colResp * 3;
    doc.setDrawColor.apply(doc, LINEA); doc.setLineWidth(0.2);

    /* Encabezado de columnas (se repite en cada página) */
    function encabezadoCols(yy) {
      doc.setFillColor(238, 240, 242);
      doc.rect(M, yy, UTIL, 5.5, 'F');
      doc.rect(M, yy, UTIL, 5.5);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.6); doc.setTextColor.apply(doc, GRIS);
      doc.text('Condición verificada', M + 2, yy + 3.7);
      encabezados.forEach(function (h, i) {
        doc.text(h, xResp + colResp * i + colResp / 2, yy + 3.7, { align: 'center' });
        doc.line(xResp + colResp * i, yy, xResp + colResp * i, yy + 5.5);
      });
      return yy + 5.5;
    }
    y = encabezadoCols(y);

    items.forEach(function (it) {
      var lineas = doc.splitTextToSize((it.critica ? '• ' : '') + it.texto, xResp - M - 4);
      var h = Math.max(6.5, lineas.length * 3.4 + 3);
      if (y + h > ALTO - 20) {
        doc.addPage(); cabecera(doc, p, false);
        y = encabezadoCols(32);
      }

      doc.rect(M, y, UTIL, h);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.4); doc.setTextColor.apply(doc, TINTA);
      doc.text(lineas, M + 2, y + 4);

      var valor = valores[it.id] || '';
      ['si', 'no', 'na'].forEach(function (v, i) {
        var cx = xResp + colResp * i + colResp / 2;
        doc.line(xResp + colResp * i, y, xResp + colResp * i, y + h);
        if (valor === v) {
          doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
          if (v === 'si') doc.setTextColor.apply(doc, OK);
          else if (v === 'no') doc.setTextColor.apply(doc, MAL);
          else doc.setTextColor.apply(doc, GRIS);
          doc.text('X', cx, y + h / 2 + 1.4, { align: 'center' });
          doc.setTextColor.apply(doc, TINTA);
        }
      });
      y += h;
    });

    doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor.apply(doc, GRIS);
    doc.text('• Condición crítica: una respuesta "No" impide autorizar el permiso.', M + 1, y + 3.2);
    doc.setTextColor.apply(doc, TINTA);
    return y + 6;
  }

  function vigia(doc, p, y) {
    if (y + 24 > ALTO - 20) { doc.addPage(); cabecera(doc, p, false); y = 32; }
    y = tituloSeccion(doc, 'VIGÍA DE FUEGO', y);
    var v = p.vigia;
    if (v.aplica !== 'si') {
      doc.setDrawColor.apply(doc, LINEA);
      doc.rect(M, y, UTIL, 8);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.2);
      doc.text('No se requiere vigía de fuego para esta actividad.', M + 2, y + 5.2);
      return y + 11;
    }
    y = rejilla(doc, [
      ['Nombre del vigía', v.nombre],
      ['Permanencia', (v.horaInicio || '—') + ' a ' + (v.horaTermino || '—')],
      ['Conoce sus funciones', v.conoceFunciones === 'si' ? 'Sí, confirmado' : 'No confirmado'],
      ['Permanencia posterior', 'Mínimo 30 minutos tras finalizar el trabajo']
    ], y);
    return y + 3;
  }

  function observaciones(doc, p, y) {
    if (y + 26 > ALTO - 20) { doc.addPage(); cabecera(doc, p, false); y = 32; }
    y = tituloSeccion(doc, 'OBSERVACIONES Y MEDIDAS ADICIONALES', y);
    var texto = doc.splitTextToSize(p.observaciones || 'Sin observaciones registradas.', UTIL - 4);
    var h = Math.max(16, texto.length * 3.6 + 5);
    doc.setDrawColor.apply(doc, LINEA);
    doc.rect(M, y, UTIL, h);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor.apply(doc, TINTA);
    doc.text(texto, M + 2, y + 5);
    return y + h + 3;
  }

  function fotografias(doc, p, y) {
    if (!p.fotos || !p.fotos.length) return y;
    if (y + 45 > ALTO - 20) { doc.addPage(); cabecera(doc, p, false); y = 32; }
    y = tituloSeccion(doc, 'REGISTRO FOTOGRÁFICO', y);

    var cols = 3, gap = 4;
    var w = (UTIL - gap * (cols - 1)) / cols, h = w * 0.72;
    p.fotos.forEach(function (f, i) {
      var col = i % cols;
      if (col === 0 && i > 0) y += h + 6;
      if (col === 0 && y + h + 6 > ALTO - 20) { doc.addPage(); cabecera(doc, p, false); y = 32; }
      var x = M + col * (w + gap);
      try { doc.addImage(f.dataUrl, 'JPEG', x, y, w, h); } catch (e) { /* imagen no legible */ }
      doc.setDrawColor.apply(doc, LINEA);
      doc.rect(x, y, w, h);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.4); doc.setTextColor.apply(doc, GRIS);
      doc.text('Foto ' + (i + 1) + (f.nota ? ' — ' + f.nota : ''), x, y + h + 3.2);
      doc.setTextColor.apply(doc, TINTA);
    });
    return y + h + 8;
  }

  function firmas(doc, p, y) {
    var alto = 40;
    if (y + alto + 12 > ALTO - 20) { doc.addPage(); cabecera(doc, p, false); y = 32; }
    y = tituloSeccion(doc, 'AUTORIZACIÓN', y);

    var w = UTIL / 2;
    [['Responsable del trabajo', p.firmas.responsable], ['Autorizante / responsable SST', p.firmas.autorizante]]
      .forEach(function (par, i) {
        var x = M + i * w;
        doc.setDrawColor.apply(doc, LINEA); doc.setLineWidth(0.2);
        doc.rect(x, y, w, alto);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor.apply(doc, GRIS);
        doc.text(par[0], x + 2, y + 4);

        if (par[1].firma) {
          try { doc.addImage(par[1].firma, 'PNG', x + 6, y + 6, w - 12, 18); } catch (e) { /* firma no legible */ }
        }
        doc.setDrawColor.apply(doc, TINTA);
        doc.line(x + 6, y + 26, x + w - 6, y + 26);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8.4); doc.setTextColor.apply(doc, TINTA);
        doc.text(par[1].nombre || '—', x + w / 2, y + 30.5, { align: 'center' });
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor.apply(doc, GRIS);
        doc.text(par[1].cargo || '—', x + w / 2, y + 34, { align: 'center' });
        if (par[1].fechaHora) doc.text('Firmado: ' + window.UI.fechaHora(par[1].fechaHora), x + w / 2, y + 37.5, { align: 'center' });
        doc.setTextColor.apply(doc, TINTA);
      });

    y += alto;

    /* Franja de cierre del permiso */
    doc.setDrawColor.apply(doc, LINEA);
    doc.rect(M, y, UTIL, 12);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.6); doc.setTextColor.apply(doc, GRIS);
    doc.text('Cierre del permiso (al finalizar el trabajo)', M + 2, y + 3.5);
    doc.setFontSize(8); doc.setTextColor.apply(doc, TINTA);
    if (p.cierre && p.cierre.fechaHora) {
      doc.text('Cerrado el ' + window.UI.fechaHora(p.cierre.fechaHora) + ' por ' + (p.cierre.responsable || '—') +
        (p.cierre.comentario ? '. ' + p.cierre.comentario : ''), M + 2, y + 8);
    } else {
      doc.text('Hora de término real: ____________    Área verificada y sin fuentes de ignición: ____________    Firma: ____________', M + 2, y + 8);
    }
    return y + 15;
  }

  function marcaAgua(doc, p) {
    var texto = null;
    if (p.estado === 'BORRADOR' || p.estado === 'PENDIENTE') texto = 'BORRADOR';
    if (p.estado === 'NO_AUTORIZADO') texto = 'NO AUTORIZADO';
    if (!texto) return;
    var n = doc.getNumberOfPages();
    for (var i = 1; i <= n; i++) {
      doc.setPage(i);
      doc.setTextColor(212, 216, 220);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(58);
      doc.text(texto, ANCHO / 2, ALTO / 2, { align: 'center', angle: 38 });
    }
    doc.setTextColor.apply(doc, TINTA);
  }

  function pies(doc, p) {
    var n = doc.getNumberOfPages();
    var sello = 'Documento generado digitalmente el ' + window.UI.fechaHora(new Date().toISOString()) +
      ' — ' + C.empresa + ' · ' + C.sistema;
    for (var i = 1; i <= n; i++) {
      doc.setPage(i);
      doc.setDrawColor.apply(doc, LINEA); doc.setLineWidth(0.2);
      doc.line(M, ALTO - 14, ANCHO - M, ALTO - 14);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.4); doc.setTextColor.apply(doc, GRIS);
      doc.text(sello, M, ALTO - 10);
      doc.text(p.numero + ' · Página ' + i + ' de ' + n, ANCHO - M, ALTO - 10, { align: 'right' });
    }
    doc.setTextColor.apply(doc, TINTA);
  }

  window.PetarPDF = {
    generar: generar,
    nombreArchivo: function (p) { return p.numero + '.pdf'; },
    descargar: function (p) {
      var doc = generar(p);
      doc.save(p.numero + '.pdf');
    },
    blobUrl: function (p) {
      var doc = generar(p);
      return URL.createObjectURL(doc.output('blob'));
    }
  };
})();
