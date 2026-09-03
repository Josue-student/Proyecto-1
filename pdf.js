/* =====================================================================
   DOCUMENTO DEL PERMISO — window.PetarPDF
   ---------------------------------------------------------------------
   Construye el PDF A4 en el navegador con jsPDF (incluido en
   assets/vendor). Sigue el orden del permiso: identificación, trabajo,
   personal, condiciones, controles, EPP, exposición, condiciones
   especiales, observaciones, vigencia, autorización y cierre.
   ===================================================================== */
(function () {
  'use strict';

  var C = window.PETAR_CONFIG;

  var TINTA = [16, 20, 26];
  var GRIS = [110, 118, 128];
  var LINEA = [178, 184, 191];
  var BANDA = [27, 34, 43];
  var OK = [30, 122, 75];
  var MAL = [194, 38, 27];

  var M = 12;
  var ANCHO = 210, ALTO = 297;
  var UTIL = ANCHO - M * 2;
  var LIMITE = ALTO - 20;

  function crearDoc() {
    var jsPDF = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
    if (!jsPDF) throw new Error('No se encontró la librería de PDF (assets/vendor/jspdf.umd.min.js).');
    return new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  }

  function generar(p) {
    var doc = crearDoc();
    cabecera(doc, p, true);
    var y = 44;

    y = identificacion(doc, p, y);
    y = trabajo(doc, p, y);
    y = personal(doc, p, y);
    y = condiciones(doc, p, y);

    window.Petar.controlesAplicables(p).forEach(function (b) {
      y = tablaControles(doc, p, y, b.titulo, b.items, p.controles[b.clave] || {});
    });

    y = epp(doc, p, y);
    y = exposicion(doc, p, y);

    window.Petar.especialesActivos(p).forEach(function (b) {
      y = tablaControles(doc, p, y, b.titulo, b.items, p.especiales[b.clave] || {});
    });

    y = observaciones(doc, p, y);
    y = fotografias(doc, p, y);
    y = vigencia(doc, p, y);
    y = autorizacion(doc, p, y);
    y = suspensionYcierre(doc, p, y);

    marcaAgua(doc, p);
    pies(doc, p);
    return doc;
  }

  /* ------------------------------------------------------------------ */
  function salto(doc, p, y, alto) {
    if (y + alto > LIMITE) { doc.addPage(); cabecera(doc, p, false); return 32; }
    return y;
  }

  function cabecera(doc, p, portada) {
    var h = portada ? 30 : 18;
    doc.setDrawColor.apply(doc, LINEA);
    doc.setLineWidth(0.3);
    doc.rect(M, M, UTIL, h);
    doc.line(M + 34, M, M + 34, M + h);

    if (C.logoDataUrl) {
      try { doc.addImage(C.logoDataUrl, 'PNG', M + 3, M + 3, 28, h - 6); } catch (e) { /* logo opcional */ }
    } else {
      var partes = C.empresa.toUpperCase().split(' ');
      doc.setTextColor.apply(doc, BANDA);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(portada ? 13 : 10);
      doc.text(partes[0], M + 17, M + h / 2 - (portada ? 3 : 1.5), { align: 'center' });
      doc.text(partes.slice(1).join(' '), M + 17, M + h / 2 + (portada ? 3 : 2.5), { align: 'center' });
      if (portada) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(5.6);
        doc.setTextColor.apply(doc, GRIS);
        doc.text('Espacio reservado al logotipo', M + 17, M + h - 4, { align: 'center' });
      }
    }

    var xT = M + 34, anchoT = UTIL - 34 - 42;
    doc.setTextColor.apply(doc, TINTA);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(portada ? 10.5 : 8.5);
    doc.text('PERMISO DE EJECUCIÓN DE TRABAJO EN CALIENTE', xT + anchoT / 2, M + (portada ? 11 : 7), { align: 'center' });
    doc.setFontSize(portada ? 8.5 : 7.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Trabajo de alto riesgo — PETAR', xT + anchoT / 2, M + (portada ? 17 : 12.5), { align: 'center' });
    if (portada) {
      doc.setFontSize(7.5); doc.setTextColor.apply(doc, GRIS);
      doc.text(C.sistema + ' — ' + C.empresa, xT + anchoT / 2, M + 24, { align: 'center' });
    }

    var xI = M + UTIL - 42;
    doc.setTextColor.apply(doc, TINTA);
    doc.line(xI, M, xI, M + h);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
    doc.text('Código: ' + C.codigoFormato, xI + 3, M + 5);
    doc.text('Versión: ' + C.version, xI + 3, M + 9);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(portada ? 10 : 8);
    doc.text(p.numero, xI + 3, M + (portada ? 16 : 14.5));
    if (portada) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
      doc.text('Estado: ' + window.Petar.etiquetaEstado(window.Petar.estadoVisible(p)), xI + 3, M + 22);
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

  /* Rejilla etiqueta/valor en una o dos columnas */
  function rejilla(doc, campos, y) {
    var colW = UTIL / 2, filaH = 8;
    doc.setDrawColor.apply(doc, LINEA); doc.setLineWidth(0.2);
    for (var i = 0; i < campos.length; i += 2) {
      var fila = campos.slice(i, i + 2);
      fila.forEach(function (c, j) {
        var anchoCampo = (c[2] === 'ancho' || fila.length === 1) ? UTIL : colW;
        var x = M + j * colW;
        doc.rect(x, y, anchoCampo, filaH);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(6.6);
        doc.setTextColor.apply(doc, GRIS);
        doc.text(c[0], x + 2, y + 3.2);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8.2);
        doc.setTextColor.apply(doc, TINTA);
        doc.text(doc.splitTextToSize(String(c[1] || '—'), anchoCampo - 4)[0], x + 2, y + 6.6);
      });
      y += filaH;
    }
    return y;
  }

  function bloqueTexto(doc, etiqueta, texto, y, p) {
    var lineas = doc.splitTextToSize(texto || '—', UTIL - 4);
    var h = Math.max(13, lineas.length * 3.6 + 6);
    y = salto(doc, p, y, h);
    doc.setDrawColor.apply(doc, LINEA);
    doc.rect(M, y, UTIL, h);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.6); doc.setTextColor.apply(doc, GRIS);
    doc.text(etiqueta, M + 2, y + 3.2);
    doc.setFontSize(8); doc.setTextColor.apply(doc, TINTA);
    doc.text(lineas, M + 2, y + 7);
    return y + h;
  }

  /* ---------------------------- Secciones --------------------------- */

  function identificacion(doc, p, y) {
    var i = p.identificacion;
    y = tituloSeccion(doc, '1. IDENTIFICACIÓN DEL PERMISO', y);
    y = rejilla(doc, [
      ['Fecha', window.UI.fechaLarga(i.fecha)],
      ['Área', i.area],
      ['Subárea', i.subarea],
      ['Ubicación exacta', i.ubicacion],
      ['Empresa ejecutante', i.empresa === 'Otro' ? (i.empresaOtra || 'Otro') : i.empresa],
      ['Responsable del trabajo', i.responsableTrabajo],
      ['Solicita el permiso', i.solicitante],
      ['Emitido por', p.usuario.nombre + ' — ' + window.UI.fechaHora(p.creadoEn)]
    ], y);
    return y + 3;
  }

  function trabajo(doc, p, y) {
    y = salto(doc, p, y, 40);
    y = tituloSeccion(doc, '2. DESCRIPCIÓN DEL TRABAJO', y);
    y = rejilla(doc, [
      ['Tipo de trabajo en caliente', window.Petar.tipoTrabajoTexto(p), 'ancho'],
      ['Equipo o herramienta', window.Petar.equiposTexto(p)],
      ['Elemento intervenido', window.Petar.elementoTexto(p)]
    ], y);
    y = bloqueTexto(doc, 'Descripción de la actividad', p.trabajo.descripcion, y, p);
    return y + 3;
  }

  function personal(doc, p, y) {
    y = salto(doc, p, y, 34);
    y = tituloSeccion(doc, '3. PERSONAL AUTORIZADO', y);
    y = rejilla(doc, [
      ['Trabajadores autorizados (' + p.personal.trabajadores.length + ')', window.Petar.personalTexto(p), 'ancho'],
      ['Supervisor', p.personal.supervisor],
      ['Vigía o personal de apoyo', p.personal.vigia.requiere === 'si' ? p.personal.vigia.nombre : 'No requiere']
    ], y);
    doc.setDrawColor.apply(doc, LINEA);
    doc.rect(M, y, UTIL, 7);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.6);
    doc.setTextColor.apply(doc, p.personal.confirmacion ? OK : MAL);
    doc.text((p.personal.confirmacion ? '[X] ' : '[ ] ') + C.confirmacionPersonal, M + 2, y + 4.6);
    doc.setTextColor.apply(doc, TINTA);
    return y + 10;
  }

  function condiciones(doc, p, y) {
    y = salto(doc, p, y, 24);
    y = tituloSeccion(doc, '4. CONDICIONES DEL ÁREA', y);
    doc.setDrawColor.apply(doc, LINEA); doc.setLineWidth(0.2);

    var xValor = M + UTIL - 46;
    window.Petar.condicionesVisibles(p).forEach(function (q) {
      var v = p.condiciones[q.id];
      var texto, color = TINTA;
      if (q.tipo === 'opciones') {
        var op = q.opciones.find(function (o) { return o.valor === v; });
        texto = op ? op.etiqueta : 'Sin responder';
        color = op ? (op.tono === 'mal' ? MAL : OK) : GRIS;
      } else if (q.tipo === 'multiple') {
        texto = (v && v.length) ? v.join(', ') : 'Sin definir';
        color = (v && v.length) ? OK : GRIS;
      } else {
        texto = v === 'si' ? 'Sí' : (v === 'no' ? 'No' : (v === 'na' ? 'N/A' : 'Sin responder'));
        color = v === 'si' ? OK : (v === 'no' ? MAL : GRIS);
      }

      var preg = doc.splitTextToSize((q.nivel === 'critico' ? '• ' : '') + q.pregunta, xValor - M - 4);
      var val = doc.splitTextToSize(texto, 44);
      var h = Math.max(6.5, Math.max(preg.length, val.length) * 3.4 + 3);
      y = salto(doc, p, y, h);

      doc.rect(M, y, UTIL, h);
      doc.line(xValor, y, xValor, y + h);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.4); doc.setTextColor.apply(doc, TINTA);
      doc.text(preg, M + 2, y + 4);
      doc.setFont('helvetica', 'bold'); doc.setTextColor.apply(doc, color);
      doc.text(val, xValor + 2, y + 4);
      doc.setTextColor.apply(doc, TINTA);
      y += h;
    });
    return y + 3;
  }

  /* Tabla de controles con columnas Sí / No / N/A */
  function tablaControles(doc, p, y, titulo, items, valores) {
    y = salto(doc, p, y, 20);
    y = tituloSeccion(doc, titulo.toUpperCase(), y);

    var colResp = 13, colNivel = 20;
    var xNivel = M + UTIL - colResp * 3 - colNivel;
    var xResp = M + UTIL - colResp * 3;
    doc.setDrawColor.apply(doc, LINEA); doc.setLineWidth(0.2);

    function encabezado(yy) {
      doc.setFillColor(238, 240, 242);
      doc.rect(M, yy, UTIL, 5.5, 'F');
      doc.rect(M, yy, UTIL, 5.5);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.6); doc.setTextColor.apply(doc, GRIS);
      doc.text('Control verificado', M + 2, yy + 3.7);
      doc.text('Exigencia', xNivel + colNivel / 2, yy + 3.7, { align: 'center' });
      doc.line(xNivel, yy, xNivel, yy + 5.5);
      ['Sí', 'No', 'N/A'].forEach(function (h, i) {
        doc.text(h, xResp + colResp * i + colResp / 2, yy + 3.7, { align: 'center' });
        doc.line(xResp + colResp * i, yy, xResp + colResp * i, yy + 5.5);
      });
      return yy + 5.5;
    }

    y = encabezado(y);

    items.forEach(function (it) {
      var lineas = doc.splitTextToSize(it.label, xNivel - M - 4);
      var h = Math.max(6.5, lineas.length * 3.4 + 3);
      if (y + h > LIMITE) { doc.addPage(); cabecera(doc, p, false); y = encabezado(32); }

      doc.rect(M, y, UTIL, h);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.4); doc.setTextColor.apply(doc, TINTA);
      doc.text(lineas, M + 2, y + 4);

      doc.line(xNivel, y, xNivel, y + h);
      doc.setFontSize(6); doc.setTextColor.apply(doc, it.nivel === 'critico' ? MAL : GRIS);
      var nivelTxt = C.niveles[it.nivel].etiqueta + (it.origen ? ' · ' + (it.origen === 'interno' ? 'Interno' : it.origen) : '');
      doc.text(doc.splitTextToSize(nivelTxt, colNivel - 2), xNivel + colNivel / 2, y + h / 2 + 0.6, { align: 'center' });
      doc.setTextColor.apply(doc, TINTA);

      var valor = valores[it.id] || '';
      ['si', 'no', 'na'].forEach(function (v, i) {
        doc.line(xResp + colResp * i, y, xResp + colResp * i, y + h);
        if (valor === v) {
          doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
          doc.setTextColor.apply(doc, v === 'si' ? OK : (v === 'no' ? MAL : GRIS));
          doc.text('X', xResp + colResp * i + colResp / 2, y + h / 2 + 1.4, { align: 'center' });
          doc.setTextColor.apply(doc, TINTA);
        }
      });
      y += h;
    });

    doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor.apply(doc, GRIS);
    doc.text('Crítico: un "No" impide autorizar el permiso. Requerido: exige registrar la medida adoptada.', M + 1, y + 3.2);
    doc.setTextColor.apply(doc, TINTA);
    return y + 6;
  }

  function epp(doc, p, y) {
    var sugerido = window.Petar.eppSugerido(p);
    var items = C.epp.filter(function (e) { return sugerido.indexOf(e.id) >= 0 || p.epp[e.id]; });
    y = tablaControles(doc, p, y, 'EPP requerido para la tarea', items, p.epp);
    if (p.epp.otro_epp === 'si' && p.otroEppDetalle) {
      y = bloqueTexto(doc, 'Otro EPP', p.otroEppDetalle, y, p) + 3;
    }
    return y;
  }

  function exposicion(doc, p, y) {
    var x = p.exposicion, s = p.especiales;
    y = salto(doc, p, y, 34);
    y = tituloSeccion(doc, 'CONDICIONES DE EXPOSICIÓN Y CONDICIONES ESPECIALES', y);
    var agentes = (x.agentes || []).slice();
    var i = agentes.indexOf('Otros');
    if (i >= 0 && x.otroAgente) agentes[i] = 'Otros: ' + x.otroAgente;
    var evalTxt = (C.evaluacionHigienica.find(function (o) { return o.valor === x.evaluacion; }) || {}).etiqueta;

    y = rejilla(doc, [
      ['Agentes potencialmente presentes', agentes.join(', ') || 'Ninguno identificado', 'ancho'],
      ['Evaluación higiénica aplicable', evalTxt],
      ['Fecha de la evaluación', x.evaluacion === 'si' ? window.UI.fechaLarga(x.fechaEvaluacion) : 'No aplica'],
      ['Resultado', x.resultado],
      ['Control relacionado', x.control],
      ['Trabajo sobre recipiente', s.recipiente === 'si'
        ? (s.recipienteInflamables === 'si' ? 'Sí, contuvo inflamables' : 'Sí') : 'No'],
      ['Espacio confinado', s.confinado === 'si' ? 'Sí' : 'No']
    ], y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor.apply(doc, GRIS);
    doc.text('El permiso registra la exposición previsible; la evaluación ocupacional se gestiona en el SGSST.', M + 1, y + 3.2);
    doc.setTextColor.apply(doc, TINTA);
    return y + 6;
  }

  function observaciones(doc, p, y) {
    y = salto(doc, p, y, 26);
    y = tituloSeccion(doc, 'OBSERVACIONES Y MEDIDAS ADICIONALES', y);
    return bloqueTexto(doc, 'Registrado por el responsable del trabajo', p.observaciones || 'Sin observaciones registradas.', y, p) + 3;
  }

  function fotografias(doc, p, y) {
    if (!p.fotos || !p.fotos.length) return y;
    y = salto(doc, p, y, 50);
    y = tituloSeccion(doc, 'REGISTRO FOTOGRÁFICO', y);
    var cols = 3, gap = 4;
    var w = (UTIL - gap * (cols - 1)) / cols, h = w * 0.72;
    p.fotos.forEach(function (f, i) {
      var col = i % cols;
      if (col === 0 && i > 0) y += h + 6;
      if (col === 0 && y + h + 6 > LIMITE) { doc.addPage(); cabecera(doc, p, false); y = 32; }
      var x = M + col * (w + gap);
      try { doc.addImage(f.dataUrl, 'JPEG', x, y, w, h); } catch (e) { /* imagen no legible */ }
      doc.setDrawColor.apply(doc, LINEA);
      doc.rect(x, y, w, h);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.4); doc.setTextColor.apply(doc, GRIS);
      doc.text('Foto ' + (i + 1), x, y + h + 3.2);
      doc.setTextColor.apply(doc, TINTA);
    });
    return y + h + 8;
  }

  function vigencia(doc, p, y) {
    y = salto(doc, p, y, 34);
    y = tituloSeccion(doc, 'VIGENCIA DEL PERMISO', y);
    var v = p.vigencia;
    y = rejilla(doc, [
      ['Inicio', window.UI.fechaLarga(v.inicioFecha) + '  ' + v.inicioHora],
      ['Término', window.UI.fechaLarga(v.finFecha) + '  ' + v.finHora]
    ], y);

    var causales = C.causalesPerdidaVigencia.map(function (c) { return '· ' + c; });
    var lineas = doc.splitTextToSize('El permiso pierde vigencia cuando:  ' + causales.join('   '), UTIL - 4);
    var h = lineas.length * 3.4 + 5;
    doc.setDrawColor.apply(doc, LINEA);
    doc.rect(M, y, UTIL, h);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor.apply(doc, GRIS);
    doc.text(lineas, M + 2, y + 4);
    doc.setTextColor.apply(doc, TINTA);
    return y + h + 3;
  }

  function autorizacion(doc, p, y) {
    var activas = C.firmas.filter(function (f) { return f.activa; });
    var alto = 40;
    y = salto(doc, p, y, alto + 20);
    y = tituloSeccion(doc, 'AUTORIZACIÓN', y);

    var lineasTxt = doc.splitTextToSize(C.textoAutorizacion, UTIL - 4);
    doc.setDrawColor.apply(doc, LINEA);
    doc.rect(M, y, UTIL, lineasTxt.length * 3.6 + 4);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.6);
    doc.text(lineasTxt, M + 2, y + 4.2);
    y += lineasTxt.length * 3.6 + 4;

    var w = UTIL / activas.length;
    activas.forEach(function (f, i) {
      var d = p.autorizacion[f.clave] || {};
      var x = M + i * w;
      doc.rect(x, y, w, alto);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor.apply(doc, GRIS);
      doc.text(f.titulo, x + 2, y + 4);
      if (d.firma) {
        try { doc.addImage(d.firma, 'PNG', x + 6, y + 6, w - 12, 18); } catch (e) { /* firma no legible */ }
      }
      doc.setDrawColor.apply(doc, TINTA);
      doc.line(x + 6, y + 26, x + w - 6, y + 26);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.4); doc.setTextColor.apply(doc, TINTA);
      doc.text(d.nombre || '—', x + w / 2, y + 30.5, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor.apply(doc, GRIS);
      doc.text(d.cargo || '—', x + w / 2, y + 34, { align: 'center' });
      if (d.fechaHora) doc.text('Firmado: ' + window.UI.fechaHora(d.fechaHora), x + w / 2, y + 37.5, { align: 'center' });
      doc.setTextColor.apply(doc, TINTA);
      doc.setDrawColor.apply(doc, LINEA);
    });
    return y + alto + 3;
  }

  function suspensionYcierre(doc, p, y) {
    if (p.suspension) {
      y = salto(doc, p, y, 22);
      y = tituloSeccion(doc, 'SUSPENSIÓN DEL PERMISO', y);
      y = rejilla(doc, [
        ['Motivo', p.suspension.motivo],
        ['Fecha y hora', window.UI.fechaHora(p.suspension.fechaHora)],
        ['Registrado por', p.suspension.usuario],
        ['Detalle', p.suspension.detalle]
      ], y) + 3;
    }

    y = salto(doc, p, y, 60);
    y = tituloSeccion(doc, 'CIERRE DEL PERMISO', y);

    var colX = M + UTIL - 24;
    doc.setDrawColor.apply(doc, LINEA); doc.setLineWidth(0.2);
    C.cierre.forEach(function (it) {
      var lineas = doc.splitTextToSize(it.label, colX - M - 4);
      var h = Math.max(6, lineas.length * 3.4 + 2.6);
      y = salto(doc, p, y, h);
      doc.rect(M, y, UTIL, h);
      doc.line(colX, y, colX, y + h);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.4); doc.setTextColor.apply(doc, TINTA);
      doc.text(lineas, M + 2, y + 3.8);
      var marcado = !!p.cierre.checklist[it.id];
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
      doc.setTextColor.apply(doc, marcado ? OK : GRIS);
      doc.text(marcado ? 'X' : '', colX + 12, y + h / 2 + 1.3, { align: 'center' });
      doc.setTextColor.apply(doc, TINTA);
      y += h;
    });

    var altoFirma = 32;
    y = salto(doc, p, y, altoFirma);
    doc.rect(M, y, UTIL, altoFirma);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.6); doc.setTextColor.apply(doc, GRIS);
    doc.text('Responsable que entrega el área', M + 2, y + 4);
    doc.text('Fecha y hora de cierre', M + UTIL / 2 + 2, y + 4);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.2); doc.setTextColor.apply(doc, TINTA);
    doc.text(p.cierre.responsable || '________________________', M + 2, y + 9);
    doc.text(p.cierre.fechaHora ? window.UI.fechaHora(p.cierre.fechaHora) : '________________________', M + UTIL / 2 + 2, y + 9);

    if (p.cierre.firma) {
      try { doc.addImage(p.cierre.firma, 'PNG', M + 6, y + 11, 60, 15); } catch (e) { /* firma no legible */ }
    }
    doc.setDrawColor.apply(doc, TINTA);
    doc.line(M + 6, y + 27, M + 70, y + 27);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.6); doc.setTextColor.apply(doc, GRIS);
    doc.text('Firma de cierre', M + 6, y + 30);
    if (p.cierre.comentario) {
      doc.setFontSize(7.4); doc.setTextColor.apply(doc, TINTA);
      doc.text(doc.splitTextToSize(p.cierre.comentario, UTIL / 2 - 8), M + UTIL / 2 + 2, y + 15);
    }
    doc.setTextColor.apply(doc, TINTA);
    doc.setDrawColor.apply(doc, LINEA);
    return y + altoFirma + 3;
  }

  function marcaAgua(doc, p) {
    var visible = window.Petar.estadoVisible(p);
    var textos = {
      BORRADOR: 'BORRADOR', PENDIENTE: 'BORRADOR',
      NO_AUTORIZADO: 'NO AUTORIZADO', SUSPENDIDO: 'SUSPENDIDO', VENCIDO: 'VENCIDO'
    };
    var texto = textos[visible];
    if (!texto) return;
    var n = doc.getNumberOfPages();
    for (var i = 1; i <= n; i++) {
      doc.setPage(i);
      doc.setTextColor(212, 216, 220);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(texto.length > 10 ? 46 : 58);
      doc.text(texto, ANCHO / 2, ALTO / 2, { align: 'center', angle: 38 });
    }
    doc.setTextColor.apply(doc, TINTA);
  }

  function pies(doc, p) {
    var n = doc.getNumberOfPages();
    var sello = 'Generado digitalmente el ' + window.UI.fechaHora(new Date().toISOString()) +
      ' — ' + C.empresa + ' · ' + C.sistema;
    for (var i = 1; i <= n; i++) {
      doc.setPage(i);
      doc.setDrawColor.apply(doc, LINEA); doc.setLineWidth(0.2);
      doc.line(M, ALTO - 14, ANCHO - M, ALTO - 14);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.4); doc.setTextColor.apply(doc, GRIS);
      doc.text(sello, M, ALTO - 10);
      doc.text(p.numero + ' · Página ' + i + ' de ' + n, ANCHO - M, ALTO - 10, { align: 'right' });
      if (i === n) {
        doc.setFontSize(5.8);
        doc.text('Requisitos marcados "Interno" son estándar propio de ' + C.empresa + ', no exigencia textual de la norma citada.', M, ALTO - 6.5);
      }
    }
    doc.setTextColor.apply(doc, TINTA);
  }

  window.PetarPDF = {
    generar: generar,
    nombreArchivo: function (p) { return p.numero + '.pdf'; },
    descargar: function (p) { generar(p).save(p.numero + '.pdf'); },
    blobUrl: function (p) { return URL.createObjectURL(generar(p).output('blob')); }
  };
})();
