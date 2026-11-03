/**
 * Exportación a Excel (.xlsx) o, si la librería no carga, a CSV.
 */
(function (root) {
  'use strict';
  var App = (root.App = root.App || {});
  var U = App.utils;
  var C = App.config;

  var Exp = (App.Export = {});

  /** Arma las tablas que se exportan. Cada tabla es una lista de filas (objetos). */
  Exp.tables = function (state) {
    var S = App.Stats.summarize(state);
    var registro = [];
    var clases = [];
    var matriz = [];

    S.dates.forEach(function (d) {
      var c = state.classes[d];
      var row = { Fecha: d, Maestro: c.teacher || '', Clase: c.title };
      var present = 0;
      var total = 0;
      S.shown.forEach(function (s) {
        var r = c.records[s.id];
        if (!r) {
          row[s.name] = '';
          return;
        }
        total++;
        if (r.present) present++;
        registro.push({
          Fecha: d,
          Clase: c.title,
          Alumno: s.name,
          'Asistió': r.present ? 'Sí' : 'No',
          Puntos: r.points
        });
        row[s.name] = r.present ? r.points : 'Faltó';
      });
      row['Ofrenda del día (' + C.currency + ')'] = c.offering;
      matriz.push(row);
      clases.push({
        Fecha: d,
        Clase: c.title,
        Asistieron: present,
        'Total de alumnos': total,
        ['Ofrenda del día (' + C.currency + ')']: c.offering
      });
    });

    var acumulado = S.rows.map(function (r) {
      return {
        Alumno: r.student.name,
        'Clases asistidas': r.attended,
        'Clases registradas': r.total,
        '% asistencia': Math.round(r.pct * 100),
        'Puntos acumulados': r.points
      };
    });

    return { Registro: registro, Clases: clases, Acumulado: acumulado, 'Puntos por clase': matriz };
  };

  Exp.toCsv = function (rows) {
    if (!rows.length) return '';
    var cols = Object.keys(rows[0]);
    var q = function (v) {
      v = String(v == null ? '' : v);
      return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    };
    var lines = [cols.map(q).join(',')].concat(
      rows.map(function (r) {
        return cols.map(function (c) { return q(r[c]); }).join(',');
      })
    );
    return '﻿' + lines.join('\r\n'); // BOM para que Excel lea bien las tildes
  };

  /** Descarga la librería de Excel solo cuando hace falta. */
  Exp.loadXlsx = function () {
    if (root.XLSX) return Promise.resolve(root.XLSX);
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = C.xlsxUrl;
      s.onload = function () {
        root.XLSX ? resolve(root.XLSX) : reject(new Error('xlsx'));
      };
      s.onerror = function () {
        reject(new Error('xlsx'));
      };
      document.head.appendChild(s);
    });
  };

  /** Descarga el archivo. Devuelve una promesa con 'xlsx' o 'csv' según lo que se pudo generar. */
  Exp.download = function (state) {
    var tables = Exp.tables(state);
    var base = 'asistencia-ofrendas-' + C.year;
    return Exp.loadXlsx().then(
      function (XLSX) {
        var wb = XLSX.utils.book_new();
        Object.keys(tables).forEach(function (name) {
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tables[name]), name);
        });
        var buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
        U.download(
          base + '.xlsx',
          new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        );
        return 'xlsx';
      },
      function () {
        U.download(base + '.csv', Exp.toCsv(tables.Registro), 'text/csv;charset=utf-8');
        return 'csv';
      }
    );
  };
})(typeof window !== 'undefined' ? window : globalThis);
