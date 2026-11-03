/**
 * Configuración de la app. Es lo único que normalmente necesitas editar.
 */
(function (root) {
  'use strict';
  var App = (root.App = root.App || {});

  App.config = {
    year: 2026,
    currency: 'S/',
    // Clave donde se guardan los datos en el navegador (localStorage).
    storageKey: 'asistencia-ofrendas-2026',
    // Alumnos que se crean la primera vez que abres la app.
    defaultStudents: [],
    // Librería para generar el Excel. Se descarga solo cuando pulsas "Descargar Excel".
    xlsxUrl: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    // PEGA AQUÍ TU URL DE GOOGLE APPS SCRIPT
    googleScriptUrl: 'https://script.google.com/macros/s/AKfycbynMG3sBvA0fFEvxKtNv0RI6HEy2GuM7F5f049c7aD6dU4WXXDuaujbVcRkzbnG95Fi8A/exec'
  };
})(typeof window !== 'undefined' ? window : globalThis);
