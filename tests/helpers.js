// Carga los módulos en el mismo orden que index.html. Se ejecutan en Node sin navegador.
require('../js/config.js');
require('../js/utils.js');
require('../js/storage.js');
require('../js/stats.js');
require('../js/export.js');

function fakeStorage() {
  const d = {};
  return {
    getItem: (k) => (k in d ? d[k] : null),
    setItem: (k, v) => {
      d[k] = String(v);
    },
    removeItem: (k) => {
      delete d[k];
    },
    dump: () => d
  };
}

module.exports = { App: globalThis.App, fakeStorage };
