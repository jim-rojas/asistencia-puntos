/**
 * Cálculos del acumulado. Funciones puras: reciben el estado y devuelven números.
 */
(function (root) {
  'use strict';
  var App = (root.App = root.App || {});
  var U = App.utils;

  App.Stats = {
    summarize: function (state) {
      var dates = Object.keys(state.classes).sort();

      // Se muestran los alumnos activos y también los archivados que tengan historial.
      var shown = state.students.filter(function (s) {
        return (
          s.active !== false ||
          dates.some(function (d) {
            return state.classes[d].records[s.id];
          })
        );
      });

      var totalPoints = 0;
      var totalOffering = 0;
      var sumPresent = 0;
      var sumRecords = 0;

      var recent = dates.map(function (d) {
        var c = state.classes[d];
        var ids = Object.keys(c.records);
        var present = ids.filter(function (id) {
          return c.records[id].present;
        }).length;
        sumPresent += present;
        sumRecords += ids.length;
        totalOffering += c.offering;
        return { date: d, title: c.title, present: present, total: ids.length, offering: c.offering };
      });

      var rows = shown.map(function (s) {
        var attended = 0;
        var total = 0;
        var points = 0;
        dates.forEach(function (d) {
          var r = state.classes[d].records[s.id];
          if (!r) return;
          total++;
          if (r.present) attended++;
          points += r.points;
        });
        totalPoints += points;
        return { student: s, attended: attended, total: total, pct: total ? attended / total : 0, points: points };
      });

      rows.sort(function (a, b) {
        return b.points - a.points || a.student.name.localeCompare(b.student.name);
      });

      return {
        classCount: dates.length,
        dates: dates,
        shown: shown,
        rows: rows,
        recent: recent,
        totals: {
          points: totalPoints,
          offering: U.round2(totalOffering),
          attendanceRate: sumRecords ? sumPresent / sumRecords : 0
        }
      };
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
