/**
 * Funciones de apoyo: números, fechas, creación segura de elementos y descargas.
 */
(function (root) {
  'use strict';
  var App = (root.App = root.App || {});
  var U = (App.utils = {});

  /** Redondea a 2 decimales. */
  U.round2 = function (x) {
    return Math.round((Number(x) || 0) * 100) / 100;
  };

  /** Entero mayor o igual a 0 (para puntos). */
  U.toInt = function (x) {
    var n = Math.round(Number(x));
    return isFinite(n) && n > 0 ? n : 0;
  };

  /** Monto mayor o igual a 0 con 2 decimales (para la ofrenda). */
  U.toMoney = function (x) {
    var n = Number(x);
    return isFinite(n) && n > 0 ? U.round2(n) : 0;
  };

  U.money = function (n) {
    return (
      App.config.currency +
      ' ' +
      Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
  };

  U.isISODate = function (s) {
    return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
  };

  /** Fecha de hoy en formato AAAA-MM-DD según la hora local del navegador. */
  U.todayISO = function () {
    var d = new Date();
    return (
      d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    );
  };

  U.fmtDate = function (iso, long) {
    var p = iso.split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return d.toLocaleDateString(
      'es-PE',
      long
        ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
        : { weekday: 'short', day: 'numeric', month: 'short' }
    );
  };

  U.uid = function () {
    return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  };

  /**
   * Crea un elemento DOM sin usar innerHTML (los nombres de alumnos nunca se interpretan como HTML).
   * props: class, text, on<evento>, atributos; true = atributo booleano, false/null = se omite.
   */
  U.el = function (tag, props) {
    var n = document.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k.indexOf('on') === 0) n.addEventListener(k.slice(2), v);
      else if (v === true) n.setAttribute(k, '');
      else if (v !== false && v != null) n.setAttribute(k, v);
    });
    for (var i = 2; i < arguments.length; i++) {
      [].concat(arguments[i]).forEach(function (c) {
        if (c == null || c === false) return;
        n.append(c.nodeType ? c : document.createTextNode(c));
      });
    }
    return n;
  };

  /** Descarga un archivo (string o Blob) en el navegador. */
  U.download = function (filename, data, mime) {
    var blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  };
})(typeof window !== 'undefined' ? window : globalThis);
