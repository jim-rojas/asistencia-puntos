const test = require('node:test');
const assert = require('node:assert/strict');
const { App, fakeStorage } = require('./helpers');

const Store = App.Store;

test('arma las cuatro tablas del Excel con la ofrenda por clase', () => {
  Store.init(fakeStorage());
  const [a, b] = Store.state.students;
  Store.saveClass({
    date: '2026-11-01',
    title: 'La creación',
    offering: 12.5,
    records: { [a.id]: { present: true, points: 20 }, [b.id]: { present: false, points: 0 } }
  });
  const t = App.Export.tables(Store.state);
  assert.deepEqual(Object.keys(t), ['Registro', 'Clases', 'Acumulado', 'Puntos por clase']);
  assert.equal(t.Registro.length, 2);
  assert.deepEqual(t.Registro[0], { Fecha: '2026-11-01', Clase: 'La creación', Alumno: a.name, 'Asistió': 'Sí', Puntos: 20 });
  assert.equal(t.Clases[0].Asistieron, 1);
  assert.equal(t.Clases[0]['Ofrenda del día (S/)'], 12.5);
  assert.equal(t.Acumulado[0]['Puntos acumulados'], 20);
  assert.equal(t['Puntos por clase'][0][b.name], 'Faltó');
});

test('el CSV escapa comas y comillas y lleva BOM', () => {
  const csv = App.Export.toCsv([{ A: 'hola, mundo', B: 'dice "hola"' }]);
  assert.ok(csv.startsWith('﻿A,B'));
  assert.ok(csv.includes('"hola, mundo","dice ""hola"""'));
});
