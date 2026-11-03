/**
 * Interfaz. Lee y escribe datos solo a través de App.Store y calcula con App.Stats.
 */
(function () {
  'use strict';
  var App = window.App;
  var U = App.utils;
  var Store = App.Store;
  var Stats = App.Stats;
  var Exp = App.Export;
  var el = U.el;

  var TABS = ['registro', 'acumulado', 'historial', 'alumnos', 'datos'];
  var ui = {
    draft: null,
    dirty: false,
    rows: {},
    confirmDel: null,
    pendingImport: null,
    importError: ''
  };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function activeStudents() {
    return Store.state.students.filter(function (s) { return s.active !== false; });
  }

  /* ---------- Avisos ---------- */
  var toastTimer;
  function toast(msg, isError) {
    var t = $('#toast');
    t.className = 'toast border-0 show ' + (isError ? 'text-bg-danger' : 'text-bg-dark');
    $('#toast-msg').textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 3500);
  }

  function updateNotice() {
    var n = $('#notice');
    if (Store.persistent) { n.classList.add('d-none'); return; }
    n.textContent = 'Este navegador no deja guardar datos (modo privado o datos bloqueados). Lo que registres se perderá al cerrar. Descarga una copia en la pestaña Datos antes de salir.';
    n.classList.remove('d-none');
  }

  function emptyBox(title, text, tab, label) {
    return el('div', { class: 'card card-body text-center py-5' },
      el('h2', { class: 'empty-title', text: title }),
      el('p', { class: 'text-body-secondary mx-auto', style: 'max-width:46ch', text: text }),
      el('div', null, el('button', { type: 'button', class: 'btn btn-primary', text: label, onclick: function () { showTab(tab); } }))
    );
  }

  /* ---------- Pestañas ---------- */
  function showTab(tab) {
    if (TABS.indexOf(tab) < 0) tab = 'registro';
    TABS.forEach(function (t) {
      var on = t === tab;
      $('#pane-' + t).classList.toggle('active', on);
      var b = $('#tab-' + t);
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    if (location.hash !== '#' + tab) {
      try { history.replaceState(null, '', '#' + tab); } catch (e) {}
    }
  }

  /* ---------- Borrador de la clase ---------- */
  function blank() { return { present: false, points: 0 }; }

  function loadDraft(date, carry) {
    var c = Store.state.classes[date];
    var prev = ui.draft;
    var rec = {};
    activeStudents().forEach(function (s) {
      var r = c && c.records[s.id];
      rec[s.id] = r ? { present: r.present, points: r.points } : (carry && prev && prev.rec[s.id] ? prev.rec[s.id] : blank());
    });
    ui.draft = {
      date: date,
      title: c ? c.title : carry && prev ? prev.title : '',
      teacher: c ? c.teacher : carry && prev ? prev.teacher : '',
      offering: c ? c.offering : carry && prev ? prev.offering : 0,
      rec: rec,
      saved: !!c
    };
    if (c || !carry) ui.dirty = false;
  }

  function ensureDraft() {
    if (!ui.draft) { loadDraft(U.todayISO()); return; }
    activeStudents().forEach(function (s) {
      if (!ui.draft.rec[s.id]) ui.draft.rec[s.id] = blank();
    });
  }

  /* ---------- Registrar clase ---------- */
  function renderRegistro() {
    var d = ui.draft;
    var fd = $('#f-date');
    var ft = $('#f-title');
    var fte = $('#f-teacher');
    var fo = $('#f-offering');
    if (document.activeElement !== fd) fd.value = d.date;
    if (document.activeElement !== ft) ft.value = d.title;
    if (document.activeElement !== fte) fte.value = d.teacher;
    if (document.activeElement !== fo) fo.value = d.offering ? d.offering : '';

    var hint = $('#class-hint');
    hint.replaceChildren();
    if (d.saved) {
      hint.append(el('strong', { class: 'text-success', text: 'Clase guardada. ' }), 'Puedes corregirla y volver a guardar.');
    } else if (U.isISODate(d.date)) {
      hint.append('Clase nueva del ' + U.fmtDate(d.date, true) + '. Marca a los que asistieron y anota sus puntos.');
    }

    var box = $('#roll');
    var list = activeStudents();
    ui.rows = {};
    if (!list.length) {
      box.replaceChildren(emptyBox('Aún no hay alumnos', 'Agrega a tus alumnos una sola vez. Después solo marcas asistencia y puntos en cada clase.', 'alumnos', 'Agregar alumnos'));
      return;
    }

    var card = el('div', { class: 'card' });
    card.append(el('div', { class: 'roll-head' }, el('span', { text: 'Marca a los que asistieron' }), el('span', { text: 'Puntos' })));

    list.forEach(function (s) {
      var r = d.rec[s.id];
      var cb = el('input', { type: 'checkbox', class: 'form-check-input check-lg', id: 'p-' + s.id, 'data-id': s.id });
      cb.checked = r.present;
      var inp = el('input', { type: 'number', class: 'form-control text-end', min: '0', step: '1', inputmode: 'numeric', id: 'pt-' + s.id, 'data-id': s.id, placeholder: '0', 'aria-label': 'Puntos de ' + s.name });
      inp.value = r.points ? r.points : '';
      inp.disabled = !r.present;
      var chips = [5, 10].map(function (n) {
        return el('button', { type: 'button', class: 'btn btn-outline-secondary', text: '+' + n, 'data-add': n, 'data-id': s.id, 'aria-label': 'Sumar ' + n + ' puntos a ' + s.name, disabled: !r.present });
      });
      var row = el('div', { class: 'srow' + (r.present ? '' : ' is-absent') },
        el('label', { class: 'srow-main', for: 'p-' + s.id }, cb, el('span', { class: 'name', text: s.name })),
        el('div', { class: 'input-group input-group-sm pts-group' }, inp, chips)
      );
      ui.rows[s.id] = { row: row, inp: inp, chips: chips };
      card.append(row);
    });

    card.append(el('div', { class: 'roll-foot' },
      el('div', { class: 'totals' },
        el('div', { class: 'tot is-present' }, el('small', { text: 'Asistieron' }), el('strong', { id: 't-att' })),
        el('div', { class: 'tot is-points' }, el('small', { text: 'Puntos del día' }), el('strong', { id: 't-pts' })),
        el('div', { class: 'tot' }, el('small', { text: 'Ofrenda' }), el('strong', { id: 't-off' }))
      ),
      el('div', { class: 'd-flex flex-wrap align-items-center gap-2' },
        el('span', { class: 'small fw-semibold text-warning-emphasis d-none', id: 'dirty', text: 'Cambios sin guardar' }),
        el('button', { type: 'button', class: 'btn btn-outline-secondary', id: 'btn-all', text: 'Todos asistieron' }),
        el('button', { type: 'button', class: 'btn btn-primary', id: 'btn-save', text: d.saved ? 'Guardar cambios' : 'Guardar clase' })
      )
    ));
    box.replaceChildren(card);
    updateTotals();
  }

  function updateTotals() {
    var d = ui.draft;
    if (!d || !$('#t-att')) return;
    var list = activeStudents();
    var att = 0, pts = 0;
    list.forEach(function (s) {
      var r = d.rec[s.id];
      if (r && r.present) { att++; pts += r.points; }
    });
    $('#t-att').textContent = att + ' de ' + list.length;
    $('#t-pts').textContent = pts;
    $('#t-off').textContent = U.money(d.offering);
    $('#dirty').classList.toggle('d-none', !ui.dirty);
  }

  function markDirty() { ui.dirty = true; updateTotals(); }

  function syncRow(id) {
    var r = ui.draft.rec[id];
    var o = ui.rows[id];
    o.row.classList.toggle('is-absent', !r.present);
    o.inp.disabled = !r.present;
    if (!r.present) o.inp.value = '';
    o.chips.forEach(function (b) { b.disabled = !r.present; });
  }

  $('#roll').addEventListener('change', function (e) {
    var t = e.target;
    if (t.type !== 'checkbox' || !ui.draft.rec[t.dataset.id]) return;
    var r = ui.draft.rec[t.dataset.id];
    r.present = t.checked;
    if (!r.present) r.points = 0;
    syncRow(t.dataset.id);
    markDirty();
  });

  $('#roll').addEventListener('input', function (e) {
    var t = e.target;
    if (t.type !== 'number' || !ui.draft.rec[t.dataset.id]) return;
    ui.draft.rec[t.dataset.id].points = U.toInt(t.value);
    markDirty();
  });

  $('#roll').addEventListener('click', function (e) {
    var chip = e.target.closest('[data-add]');
    if (chip) {
      var r = ui.draft.rec[chip.dataset.id];
      r.points += Number(chip.dataset.add);
      ui.rows[chip.dataset.id].inp.value = r.points;
      markDirty();
      return;
    }
    if (e.target.id === 'btn-all') {
      activeStudents().forEach(function (s) {
        ui.draft.rec[s.id].present = true;
        ui.rows[s.id].row.querySelector('input[type=checkbox]').checked = true;
        syncRow(s.id);
      });
      markDirty();
      return;
    }
    if (e.target.id === 'btn-save') saveDraft();
  });

  $('#f-title').addEventListener('input', function (e) { ui.draft.title = e.target.value; markDirty(); });
  $('#f-teacher').addEventListener('input', function (e) { ui.draft.teacher = e.target.value; markDirty(); });
  $('#f-offering').addEventListener('input', function (e) { ui.draft.offering = U.toMoney(e.target.value); markDirty(); });
  $('#f-date').addEventListener('change', function (e) {
    if (!U.isISODate(e.target.value)) return;
    loadDraft(e.target.value, ui.dirty);
    renderRegistro();
  });

  function saveDraft() {
    var d = ui.draft;
    if (!U.isISODate(d.date)) { toast('Elige la fecha de la clase.', true); return; }
    var prev = Store.state.classes[d.date];
    var records = {};
    if (prev) { Object.keys(prev.records).forEach(function (id) { records[id] = prev.records[id]; }); }
    activeStudents().forEach(function (s) {
      var r = d.rec[s.id];
      records[s.id] = { present: !!r.present, points: r.present ? U.toInt(r.points) : 0 };
    });
    
    var payload = { date: d.date, title: d.title, teacher: d.teacher, offering: d.offering, records: records };
    Store.saveClass(payload);
    ui.dirty = false;
    d.saved = true;
    refresh();
    
    toast('Guardando en Google...');
    Store.saveToGoogle('saveClass', { cls: payload })
      .then(function() { toast('Clase del ' + U.fmtDate(d.date) + ' guardada en Google.'); })
      .catch(function(err) {
        console.error('Error guardando en Google:', err);
        toast('Error al guardar en Google. Se guardó localmente.', true);
      });
  }

  /* ---------- Acumulado ---------- */
  function tile(label, value, sub) {
    return el('div', { class: 'col-6 col-lg-3' },
      el('div', { class: 'card tile' },
        el('div', { class: 'card-body' },
          el('div', { class: 'label', text: label }),
          el('div', { class: 'value', text: value }),
          sub ? el('div', { class: 'small text-body-secondary', text: sub }) : null
        )
      )
    );
  }

  function renderAcumulado() {
    var p = $('#pane-acumulado');
    var s = Stats.summarize(Store.state);
    if (!s.classCount) {
      p.replaceChildren(emptyBox('Todavía no hay clases guardadas', 'Cuando guardes tu primera clase verás aquí la asistencia, los puntos y las ofrendas acumuladas.', 'registro', 'Registrar una clase'));
      return;
    }

    var maxPts = Math.max.apply(null, s.rows.map(function (r) { return r.points; }).concat([1]));

    var body = s.rows.map(function (r) {
      var bar = el('div', { class: 'progress-bar is-points', role: 'presentation' });
      bar.style.width = Math.round((r.points / maxPts) * 100) + '%';
      return el('tr', null,
        el('td', { class: 'fw-semibold' }, r.student.name, r.student.active === false ? el('span', { class: 'badge text-bg-light border ms-2', text: 'archivado' }) : null),
        el('td', { class: 'num' }, r.attended + ' de ' + r.total, el('span', { class: 'text-body-secondary small', text: '  ' + Math.round(r.pct * 100) + '%' })),
        el('td', { class: 'points-cell' }, el('div', { class: 'd-flex align-items-center gap-2' }, el('div', { class: 'progress', role: 'presentation' }, bar), el('strong', { class: 'text-end', style: 'min-width:2.5rem', text: String(r.points) })))
      );
    });

    var recent = s.recent.slice(-8).map(function (c) {
      var att = el('div', { class: 'progress-bar bg-success', role: 'presentation' });
      att.style.width = (c.total ? Math.round((c.present / c.total) * 100) : 0) + '%';
      return el('div', { class: 'recent-row' },
        el('div', null, el('div', { class: 'fw-semibold', text: U.fmtDate(c.date) }), el('div', { class: 'small text-body-secondary text-truncate', text: c.title || 'Sin título' })),
        el('div', { class: 'progress', role: 'presentation', title: c.present + ' de ' + c.total + ' asistieron' }, att),
        el('div', { class: 'text-end' }, el('div', { class: 'fw-semibold', text: c.present + '/' + c.total }), el('div', { class: 'small text-body-secondary', text: U.money(c.offering) }))
      );
    });

    p.replaceChildren(
      el('div', { class: 'd-flex flex-wrap justify-content-between align-items-center gap-2 mb-3' },
        el('h2', { class: 'section-title', text: 'Acumulado del año' }),
        el('button', { type: 'button', class: 'btn btn-outline-secondary', text: 'Descargar Excel', onclick: exportExcel })
      ),
      el('div', { class: 'row g-3 mb-4' },
        tile('Clases dadas', String(s.classCount)),
        tile('Asistencia promedio', Math.round(s.totals.attendanceRate * 100) + '%'),
        tile('Puntos entregados', String(s.totals.points)),
        tile('Ofrendas del año', U.money(s.totals.offering))
      ),
      el('div', { class: 'card mb-4' }, el('div', { class: 'table-responsive' }, el('table', { class: 'table align-middle mb-0' },
        el('thead', null, el('tr', null, el('th', { text: 'Alumno' }), el('th', { class: 'num', text: 'Asistencias' }), el('th', { text: 'Puntos acumulados' }))),
        el('tbody', null, body)
      ))),
      el('h3', { class: 'section-title fs-5 mb-2', text: 'Últimas clases' }),
      el('div', { class: 'card' }, recent)
    );
  }

  function exportExcel() {
    if (!Object.keys(Store.state.classes).length) { toast('Guarda al menos una clase para descargar.', true); return; }
    Exp.download(Store.state).then(
      function (kind) { toast(kind === 'xlsx' ? 'Excel descargado.' : 'No se pudo cargar la librería de Excel. Se descargó un CSV.'); },
      function () { toast('No se pudo generar el archivo.', true); }
    );
  }

  /* ---------- Historial ---------- */
  function renderHistorial() {
    var p = $('#pane-historial');
    var dates = Object.keys(Store.state.classes).sort().reverse();
    $('#count-historial').textContent = dates.length;
    if (!dates.length) {
      p.replaceChildren(emptyBox('El historial está vacío', 'Cada clase que guardes aparecerá aquí con los puntos de cada alumno.', 'registro', 'Registrar una clase'));
      return;
    }
    var list = Stats.summarize(Store.state).shown;
    var head = el('tr', null,
      el('th', { text: 'Fecha' }), el('th', { text: 'Clase / Maestro' }),
      list.map(function (s) { return el('th', { class: 'text-center', text: s.name }); }),
      el('th', { class: 'num', text: 'Ofrenda' }), el('th')
    );
    var body = dates.map(function (d) {
      var c = Store.state.classes[d];
      var cells = list.map(function (s) {
        var r = c.records[s.id];
        if (!r) return el('td', { class: 'text-center text-body-secondary', text: '·' });
        if (!r.present) return el('td', { class: 'text-center text-body-secondary small', text: 'Faltó' });
        return el('td', { class: 'text-center' }, el('span', { class: 'cell-points' + (r.points ? '' : ' is-zero'), text: r.points ? String(r.points) : '✓' }));
      });
      var actions;
      if (ui.confirmDel === d) {
        actions = el('div', { class: 'd-flex gap-1 justify-content-end' },
          el('button', { type: 'button', class: 'btn btn-sm btn-danger', text: 'Sí, eliminar', onclick: function () { deleteClass(d); } }),
          el('button', { type: 'button', class: 'btn btn-sm btn-outline-secondary', text: 'Cancelar', onclick: function () { ui.confirmDel = null; renderHistorial(); } })
        );
      } else {
        actions = el('div', { class: 'd-flex gap-1 justify-content-end' },
          el('button', { type: 'button', class: 'btn btn-sm btn-outline-secondary', text: 'Editar', onclick: function () { editClass(d); } }),
          el('button', { type: 'button', class: 'btn btn-sm btn-link text-danger', text: 'Eliminar', onclick: function () { ui.confirmDel = d; renderHistorial(); } })
        );
      }
      return el('tr', null,
        el('td', { class: 'text-nowrap', text: U.fmtDate(d) }),
        el('td', null, el('div', { text: c.title || 'Sin título' }), el('div', { class: 'small text-body-secondary', text: c.teacher || '' })),
        cells,
        el('td', { class: 'num text-nowrap', text: U.money(c.offering) }),
        el('td', null, actions)
      );
    });

    p.replaceChildren(
      el('h2', { class: 'section-title mb-1', text: 'Historial de clases' }),
      el('p', { class: 'text-body-secondary mb-3', text: 'Los números son los puntos de cada alumno. “Faltó” es ausencia y ✓ es asistencia sin puntos.' }),
      el('div', { class: 'card' }, el('div', { class: 'table-responsive' }, el('table', { class: 'table align-middle mb-0' }, el('thead', null, head), el('tbody', null, body))))
    );
  }

  function editClass(date) {
    ui.dirty = false;
    loadDraft(date);
    renderRegistro();
    showTab('registro');
    window.scrollTo(0, 0);
  }

  function deleteClass(date) {
    Store.deleteClass(date);
    ui.confirmDel = null;
    if (ui.draft && ui.draft.date === date) { ui.dirty = false; loadDraft(date); }
    refresh();
    toast('Clase eliminada localmente. (No se borró de Google Sheets).');
  }

  /* ---------- Alumnos ---------- */
  function renderAlumnos() {
    var p = $('#pane-alumnos');
    var input = el('input', { type: 'text', class: 'form-control', id: 'f-new', maxlength: '60', placeholder: 'Nombre del alumno', 'aria-label': 'Nombre del alumno nuevo', autocomplete: 'off' });
    var form = el('form', { class: 'input-group mb-4', style: 'max-width:460px' }, input, el('button', { type: 'submit', class: 'btn btn-primary', text: 'Agregar' }));
    
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var s = Store.addStudent(input.value);
      if (!s) return;
      refresh();
      toast('Agregando a Google...');
      
      // 👇 SINCRONIZAR NUEVO ALUMNO CON GOOGLE
      Store.saveToGoogle('saveStudent', { student: s })
        .then(function() { toast(s.name + ' agregado y guardado en Google.'); })
        .catch(function(err) { console.error(err); toast('Error al guardar alumno en Google.', true); });
        
      $('#f-new').focus();
    });

    var items = Store.state.students.map(function (s) {
      var on = s.active !== false;
      return el('li', { class: 'list-group-item d-flex justify-content-between align-items-center gap-2' },
        el('span', { class: on ? 'fw-semibold' : 'text-body-secondary text-decoration-line-through', text: s.name }),
        el('button', {
          type: 'button',
          class: on ? 'btn btn-sm btn-link text-danger' : 'btn btn-sm btn-outline-secondary',
          text: on ? 'Quitar de la lista' : 'Volver a activar',
          onclick: function () {
            Store.setActive(s.id, !on);
            refresh();
            toast('Actualizando en Google...');
            
            // 👇 SINCRONIZAR ESTADO DEL ALUMNO CON GOOGLE
            Store.saveToGoogle('saveStudent', { student: s })
              .then(function() { toast('Estado actualizado en Google.'); })
              .catch(function(err) { console.error(err); toast('Error al actualizar en Google.', true); });
          }
        })
      );
    });

    p.replaceChildren(
      el('h2', { class: 'section-title mb-1', text: 'Alumnos' }),
      el('p', { class: 'text-body-secondary mb-3', text: 'Quitar a un alumno solo lo oculta de la lista de clase. Sus puntos y asistencias anteriores se conservan.' }),
      form,
      items.length ? el('ul', { class: 'list-group' }, items) : el('p', { class: 'text-body-secondary', text: 'Escribe el nombre del primer alumno y pulsa Agregar.' })
    );
  }

  /* ---------- Datos y copias ---------- */
  function renderDatos() {
    var p = $('#pane-datos');
    var nClases = Object.keys(Store.state.classes).length;

    var restore;
    if (ui.pendingImport) {
      var n = Object.keys(ui.pendingImport.classes).length;
      restore = el('div', { class: 'alert alert-warning mb-0' },
        el('p', { class: 'mb-2', text: 'La copia tiene ' + ui.pendingImport.students.length + ' alumnos y ' + n + ' clases. Al restaurarla se reemplazan todos los datos actuales.' }),
        el('div', { class: 'd-flex gap-2' },
          el('button', { type: 'button', class: 'btn btn-danger', text: 'Reemplazar mis datos', onclick: function () {
            Store.replaceAll(ui.pendingImport);
            toast('Restaurando en Google...');
            Store.saveToGoogle('saveAll', { state: ui.pendingImport })
              .then(function() {
                ui.pendingImport = null; ui.draft = null; ui.dirty = false; refresh();
                toast('Copia restaurada en Google.');
              })
              .catch(function(err) {
                toast('Error al restaurar en Google.', true);
                ui.pendingImport = null; refresh();
              });
          } }),
          el('button', { type: 'button', class: 'btn btn-outline-secondary', text: 'Cancelar', onclick: function () { ui.pendingImport = null; renderDatos(); } })
        )
      );
    } else {
      var file = el('input', { type: 'file', class: 'form-control', id: 'f-restore', accept: '.json,application/json', 'aria-label': 'Archivo de copia de seguridad' });
      file.addEventListener('change', function () {
        var f = file.files && file.files[0];
        if (!f) return;
        ui.importError = '';
        f.text().then(
          function (txt) {
            try { ui.pendingImport = Store.parseBackup(txt); } catch (err) { ui.importError = err.message; }
            renderDatos();
          },
          function () { ui.importError = 'No se pudo leer el archivo.'; renderDatos(); }
        );
      });
      restore = el('div', null, el('label', { class: 'form-label', for: 'f-restore', text: 'Archivo de copia (.json)' }), file, ui.importError ? el('div', { class: 'text-danger small mt-2', role: 'alert', text: ui.importError }) : null);
    }

    function block(title, text, body) {
      return el('div', { class: 'card mb-3' }, el('div', { class: 'card-body' }, el('h3', { class: 'section-title fs-5 mb-1', text: title }), el('p', { class: 'text-body-secondary', text: text }), body));
    }

    p.replaceChildren(
      el('h2', { class: 'section-title mb-1', text: 'Datos y copias' }),
      el('p', { class: 'text-body-secondary mb-3', text: 'Todo se guarda en este navegador, en este dispositivo. Descarga una copia de vez en cuando por seguridad.' }),
      block('Excel', 'Un archivo con el registro completo, el acumulado por alumno y la ofrenda de cada clase.', el('button', { type: 'button', class: 'btn btn-primary', text: 'Descargar Excel', onclick: exportExcel })),
      block('Copia de seguridad', 'Guarda todos tus datos (' + Store.state.students.length + ' alumnos, ' + nClases + ' clases) en un archivo para recuperarlos si borras el navegador o cambias de dispositivo.',
        el('button', { type: 'button', class: 'btn btn-outline-secondary', text: 'Descargar copia (.json)', onclick: function () { U.download('copia-asistencia-' + U.todayISO() + '.json', Store.exportJSON(), 'application/json'); toast('Copia descargada.'); } })
      ),
      block('Restaurar una copia', 'Carga un archivo .json descargado antes desde aquí.', restore)
    );
  }

  /* ---------- Arranque ---------- */
  function refresh() {
    ensureDraft();
    renderRegistro();
    renderAcumulado();
    renderHistorial();
    renderAlumnos();
    renderDatos();
    updateNotice();
  }

  $('#tabs').addEventListener('click', function (e) {
    var b = e.target.closest('[data-tab]');
    if (b) showTab(b.dataset.tab);
  });
  window.addEventListener('hashchange', function () { showTab(location.hash.slice(1)); });

  Store.init();
  refresh();
  showTab(location.hash.slice(1) || 'registro');

  // Sincronización inicial con Google
  Store.syncFromGoogle()
    .then(function() {
      refresh(); // Redibuja con los datos reales de Google
    })
    .catch(function(err) {
      console.error('Error sincronizando:', err);
      toast('No se pudo conectar con Google. Usando datos locales.', true);
    });
})();