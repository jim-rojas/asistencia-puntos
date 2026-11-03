/**
 * Sigue el modo claro/oscuro del dispositivo. Se carga en <head> para evitar un parpadeo al abrir.
 */
(function () {
  'use strict';
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  function apply() {
    document.documentElement.setAttribute('data-bs-theme', mq.matches ? 'dark' : 'light');
  }
  apply();
  if (mq.addEventListener) mq.addEventListener('change', apply);
  else if (mq.addListener) mq.addListener(apply);
})();
