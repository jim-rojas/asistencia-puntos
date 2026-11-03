const test = require('node:test');
const assert = require('node:assert/strict');
const { App, fakeStorage } = require('./helpers');

const Store = App.Store;

test('la primera vez crea los alumnos por defecto y los guarda', () => {
  const ls = fakeStorage();
  Store.init(ls);
  assert.deepEqual(
    Store.state.students.map((s) => s.name),
    App.config.defaultStudents
  );
  assert.ok(ls.getItem(App.config.storageKey));
});

test('los datos sobreviven a una recarga', () => {
  const ls = fakeStorage();
  Store.init(ls);
  const id = Store.state.students[0].id;
  Store.saveClass({
    date: '2026-11-01',
    title: 'La creación',
    offering: 12.5,
    records: { [id]: { present: true, points: 20 } }
  });
  Store.init(ls); // simula abrir la página otra vez
  const c = Store.state.classes['2026-11-01'];
  assert.equal(c.title, 'La creación');
  assert.equal(c.offering, 12.5);
  assert.deepEqual(c.records[id], { present: true, points: 20 });
});

test('saveClass limpia valores inválidos', () => {
  Store.init(fakeStorage());
  const id = Store.state.students[0].id;
  const id2 = Store.state.students[1].id;
  const c = Store.saveClass({
    date: '2026-11-08',
    title: '  Noé  ',
    offering: -5,
    records: {
      [id]: { present: false, points: 30 }, // ausente: no puede tener puntos
      [id2]: { present: true, points: -3 } // puntos negativos pasan a 0
    }
  });
  assert.equal(c.title, 'Noé');
  assert.equal(c.offering, 0);
  assert.deepEqual(c.records[id], { present: false, points: 0 });
  assert.deepEqual(c.records[id2], { present: true, points: 0 });
});

test('saveClass rechaza una fecha inválida', () => {
  Store.init(fakeStorage());
  assert.throws(() => Store.saveClass({ date: '1/11/2026', title: '', offering: 0, records: {} }));
});

test('agregar y archivar alumnos', () => {
  Store.init(fakeStorage());
  const nuevo = Store.addStudent('  Camila ');
  assert.equal(nuevo.name, 'Camila');
  assert.equal(Store.addStudent('   '), null);
  Store.setActive(nuevo.id, false);
  assert.equal(Store.state.students.find((s) => s.id === nuevo.id).active, false);
});

test('eliminar una clase', () => {
  Store.init(fakeStorage());
  Store.saveClass({ date: '2026-11-01', title: 'a', offering: 1, records: {} });
  Store.deleteClass('2026-11-01');
  assert.equal(Object.keys(Store.state.classes).length, 0);
});

test('la copia de seguridad se puede exportar y restaurar', () => {
  Store.init(fakeStorage());
  const id = Store.state.students[0].id;
  Store.saveClass({ date: '2026-11-01', title: 'x', offering: 3, records: { [id]: { present: true, points: 10 } } });
  const json = Store.exportJSON();
  const restored = Store.parseBackup(json);
  assert.equal(restored.classes['2026-11-01'].records[id].points, 10);
  assert.equal(restored.students.length, 5);
});

test('una copia inválida lanza un error claro', () => {
  assert.throws(() => Store.parseBackup('esto no es json'), /no es una copia válida/);
  assert.throws(() => Store.parseBackup('{"hola":1}'), /formato/);
});

test('si el navegador no deja guardar, la app sigue funcionando en memoria', () => {
  const roto = {
    getItem: () => null,
    setItem: () => {
      throw new Error('bloqueado');
    },
    removeItem: () => {}
  };
  Store.init(roto);
  assert.equal(Store.persistent, false);
  assert.equal(Store.state.students.length, 5);
  assert.ok(Store.addStudent('Ana'));
});
