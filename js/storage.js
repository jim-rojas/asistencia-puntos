/**
 * Capa de datos. Guarda todo en localStorage con este formato:
 *
 * {
 *   version: 1,
 *   students: [{ id, name, active, order }],
 *   classes: {
 *     "2026-11-01": {
 *       date, title,
 *       offering,                         // ofrenda del día (una sola por clase)
 *       records: { <idAlumno>: { present, points } }
 *     }
 *   }
 * }
 */
(function (root) {
  'use strict';
  var App = (root.App = root.App || {});
  var U = App.utils;
  var C = App.config;

  function emptyState() {
    return { version: 1, students: [], classes: {} };
  }

  function memoryStorage() {
    var d = {};
    return {
      getItem: function (k) {
        return Object.prototype.hasOwnProperty.call(d, k) ? d[k] : null;
      },
      setItem: function (k, v) {
        d[k] = String(v);
      },
      removeItem: function (k) {
        delete d[k];
      }
    };
  }

  var Store = (App.Store = {
    state: emptyState(),
    /** false si el navegador no deja guardar (modo privado, datos bloqueados). */
    persistent: true,
    _ls: null
  });

  /** Limpia y valida cualquier objeto con la forma esperada. Nunca confía en el contenido. */
  Store.normalize = function (raw) {
    var st = emptyState();
    if (raw && Array.isArray(raw.students)) {
      raw.students.forEach(function (s, i) {
        if (!s || typeof s.id !== 'string' || !s.id || typeof s.name !== 'string' || !s.name.trim()) return;
        st.students.push({
          id: s.id,
          name: s.name.trim().slice(0, 60),
          active: s.active !== false,
          order: Number(s.order) || i + 1
        });
      });
    }
    st.students.sort(function (a, b) {
      return a.order - b.order || a.name.localeCompare(b.name);
    });
    if (raw && raw.classes && typeof raw.classes === 'object') {
      Object.keys(raw.classes).forEach(function (d) {
        var c = raw.classes[d];
        if (!U.isISODate(d) || !c || typeof c !== 'object') return;
        var src = c.records && typeof c.records === 'object' ? c.records : {};
        var records = {};
        Object.keys(src).forEach(function (id) {
          var r = src[id];
          if (!r || typeof r !== 'object') return;
          var present = !!r.present;
          records[id] = { present: present, points: present ? U.toInt(r.points) : 0 };
        });
        st.classes[d] = {
          date: d,
          title: String(c.title || '').trim().slice(0, 120),
          teacher: String(c.teacher || '').trim().slice(0, 60),
          offering: U.toMoney(c.offering),
          records: records
        };
      });
    }
    return st;
  };

  function persist() {
    try {
      Store._ls.setItem(C.storageKey, JSON.stringify(Store.state));
    } catch (e) {
      Store.persistent = false;
    }
  }

  /** Carga los datos. `storage` es opcional (se usa en las pruebas). */
  Store.init = function (storage) {
    try {
      var ls = storage || root.localStorage;
      ls.setItem('__test__', '1');
      ls.removeItem('__test__');
      Store._ls = ls;
      Store.persistent = true;
    } catch (e) {
      Store._ls = memoryStorage();
      Store.persistent = false;
    }
    var raw = null;
    try {
      raw = JSON.parse(Store._ls.getItem(C.storageKey) || 'null');
    } catch (e) {
      raw = null;
    }
    if (raw) {
      Store.state = Store.normalize(raw);
    } else {
      Store.state = emptyState();
      C.defaultStudents.forEach(function (name, i) {
        Store.state.students.push({ id: U.uid(), name: name, active: true, order: i + 1 });
      });
      persist();
    }
    return Store.state;
  };

  Store.addStudent = function (name) {
    name = String(name || '').trim().slice(0, 60);
    if (!name) return null;
    var order =
      Math.max.apply(
        null,
        Store.state.students
          .map(function (s) {
            return s.order;
          })
          .concat([0])
      ) + 1;
    var s = { id: U.uid(), name: name, active: true, order: order };
    Store.state.students.push(s);
    persist();
    return s;
  };

  Store.setActive = function (id, active) {
    Store.state.students.forEach(function (s) {
      if (s.id === id) s.active = !!active;
    });
    persist();
  };

  /** Crea o reemplaza la clase de esa fecha. */
  Store.saveClass = function (cls) {
    var clean = Store.normalize({ classes: (function () { var o = {}; o[cls.date] = cls; return o; })() });
    if (!clean.classes[cls.date]) throw new Error('Fecha inválida');
    Store.state.classes[cls.date] = clean.classes[cls.date];
    persist();
    return Store.state.classes[cls.date];
  };

  Store.deleteClass = function (date) {
    delete Store.state.classes[date];
    persist();
  };

  /** Texto JSON para la copia de seguridad. */
  Store.exportJSON = function () {
    return JSON.stringify(
      {
        app: 'asistencia-ofrendas',
        exportedAt: new Date().toISOString(),
        version: Store.state.version,
        students: Store.state.students,
        classes: Store.state.classes
      },
      null,
      2
    );
  };

  /** Lee y valida una copia sin aplicarla. Lanza Error con un mensaje claro si no sirve. */
  Store.parseBackup = function (text) {
    var raw;
    try {
      raw = JSON.parse(text);
    } catch (e) {
      throw new Error('El archivo no es una copia válida (no se puede leer).');
    }
    if (!raw || !Array.isArray(raw.students) || !raw.classes || typeof raw.classes !== 'object') {
      throw new Error('El archivo no tiene el formato de esta app.');
    }
    return Store.normalize(raw);
  };

  Store.replaceAll = function (state) {
    Store.state = state;
    persist();
  };

    // --- NUEVAS FUNCIONES DE SINCRONIZACIÓN ---
  
  Store.syncFromGoogle = function () {
    return fetch(C.googleScriptUrl + '?action=getData')
      .then(res => res.json())
      .then(json => {
        if (json.status === 'success') {
          // Guardamos en localStorage y en memoria
          Store.state = Store.normalize(json.data);
          persist(); 
          return Store.state;
        }
        throw new Error(json.message || 'Error al obtener datos');
      });
  };

  Store.saveToGoogle = function (action, payload) {
    const body = {
      action: action,
      ...payload
    };
    return fetch(C.googleScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // Google pide text/plain para evitar preflight CORS
      body: JSON.stringify(body)
    })
    .then(res => res.json())
    .then(json => {
      if (json.status !== 'success') throw new Error(json.message);
      return json;
    });
  };

})(typeof window !== 'undefined' ? window : globalThis);