const test = require('node:test');
const assert = require('node:assert/strict');
const { App, fakeStorage } = require('./helpers');

const Store = App.Store;

function armar() {
  Store.init(fakeStorage());
  const [a, b, c] = Store.state.students;
  Store.saveClass({
    date: '2026-11-01',
    title: 'Clase 1',
    offering: 10,
    records: {
      [a.id]: { present: true, points: 20 },
      [b.id]: { present: true, points: 10 },
      [c.id]: { present: false, points: 0 }
    }
  });
  Store.saveClass({
    date: '2026-11-08',
    title: 'Clase 2',
    offering: 7.5,
    records: {
      [a.id]: { present: true, points: 15 },
      [b.id]: { present: false, points: 0 },
      [c.id]: { present: true, points: 5 }
    }
  });
  return { a, b, c };
}

test('acumula puntos, asistencias y ofrenda', () => {
  const { a, b, c } = armar();
  const s = App.Stats.summarize(Store.state);
  const row = (id) => s.rows.find((r) => r.student.id === id);
  assert.equal(s.classCount, 2);
  assert.equal(row(a.id).points, 35);
  assert.equal(row(a.id).attended, 2);
  assert.equal(row(b.id).attended, 1);
  assert.equal(row(c.id).points, 5);
  assert.equal(s.totals.points, 50);
  assert.equal(s.totals.offering, 17.5);
});

test('el promedio de asistencia usa solo a los alumnos registrados en cada clase', () => {
  armar();
  const s = App.Stats.summarize(Store.state);
  // 2 + 2 presentes de 3 + 3 registros
  assert.equal(Math.round(s.totals.attendanceRate * 100), 67);
});

test('ordena por puntos de mayor a menor', () => {
  const { a } = armar();
  const s = App.Stats.summarize(Store.state);
  assert.equal(s.rows[0].student.id, a.id);
});

test('un alumno nuevo no baja su porcentaje por clases anteriores a su ingreso', () => {
  armar();
  const nuevo = Store.addStudent('Camila');
  Store.saveClass({
    date: '2026-11-15',
    title: 'Clase 3',
    offering: 0,
    records: { [nuevo.id]: { present: true, points: 10 } }
  });
  const row = App.Stats.summarize(Store.state).rows.find((r) => r.student.id === nuevo.id);
  assert.equal(row.total, 1);
  assert.equal(row.pct, 1);
});

test('un alumno archivado con historial sigue en el acumulado; sin historial, no', () => {
  const { a } = armar();
  const sinHistorial = Store.addStudent('Sin clases');
  Store.setActive(sinHistorial.id, false);
  Store.setActive(a.id, false);
  const ids = App.Stats.summarize(Store.state).rows.map((r) => r.student.id);
  assert.ok(ids.includes(a.id));
  assert.ok(!ids.includes(sinHistorial.id));
});

test('sin clases todo está en cero', () => {
  Store.init(fakeStorage());
  const s = App.Stats.summarize(Store.state);
  assert.equal(s.classCount, 0);
  assert.equal(s.totals.attendanceRate, 0);
  assert.equal(s.totals.offering, 0);
});
