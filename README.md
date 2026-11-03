# Asistencia y ofrendas 2026

Página personal para llevar la asistencia, los puntos de cada alumno y la ofrenda del día.
Es un sitio estático (HTML, CSS y JavaScript). No necesita servidor ni base de datos.

## Cómo se usa

1. **Registrar clase:** elige la fecha, escribe el título y la ofrenda del día. Marca con un check a los niños que asistieron y anota sus puntos (el botón **Todos asistieron** y los atajos **+5** y **+10** aceleran el proceso). Pulsa **Guardar clase**.
2. **Acumulado:** resumen del año con clases dadas, asistencia promedio, puntos por alumno y ofrendas.
3. **Historial:** una fila por clase. Desde ahí puedes editarla o eliminarla.
4. **Alumnos:** agrega alumnos o quítalos de la lista (sus datos anteriores se conservan).
5. **Datos:** descarga el Excel, guarda una copia de seguridad o restáurala.

## Dónde se guardan los datos

En el navegador donde usas la página (`localStorage`). Eso significa:

- Cada navegador y cada dispositivo tiene sus propios datos.
- Si borras los datos del navegador, se pierden. Descarga una copia desde **Datos** cada cierto tiempo.
- Para pasar los datos a otro dispositivo: descarga la copia `.json` y restáurala allá.

## Publicar en GitHub Pages

1. Crea un repositorio en GitHub y sube el contenido de esta carpeta:
   ```bash
   git init
   git add .
   git commit -m "Primera versión"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/asistencia-ofrendas.git
   git push -u origin main
   ```
2. En GitHub: **Settings → Pages → Build and deployment**.
3. En **Source** elige **Deploy from a branch**, rama **main**, carpeta **/ (root)**, y guarda.
4. En uno o dos minutos la página queda en `https://TU-USUARIO.github.io/asistencia-ofrendas/`.

Si el repositorio es público, cualquiera con el enlace puede abrir la página, pero **no ve tus datos**: viven solo en tu navegador.

## Probar en tu computadora

Abre `index.html` con doble clic. También puedes usar un servidor local:

```bash
python3 -m http.server 8000
# y abre http://localhost:8000
```

## Estructura

```
index.html        Estructura de la página
css/styles.css    Ajustes de estilo sobre Bootstrap
js/config.js      Año, moneda y alumnos iniciales (lo que más vas a editar)
js/utils.js       Fechas, dinero, creación segura de elementos, descargas
js/storage.js     Guardado, validación y copias de seguridad
js/stats.js       Cálculos del acumulado
js/export.js      Exportar a Excel o CSV
js/theme.js       Modo claro u oscuro según el dispositivo
js/app.js         Interfaz
tests/            Pruebas de la lógica
```

Los archivos JS se cargan como scripts normales (sin módulos) para que la página también funcione al abrirla con doble clic.

## Personalizar

- **Moneda, año o alumnos iniciales:** edita `js/config.js`. Los alumnos iniciales solo se crean la primera vez; después se administran desde la pestaña **Alumnos**.
- **Colores:** variables al inicio de `css/styles.css`.

## Pruebas

Requiere Node 20 o superior:

```bash
node --test
```

## Dependencias externas

- [Bootstrap 5.3.3](https://getbootstrap.com/) (solo CSS), desde jsDelivr.
- Fuentes Bricolage Grotesque e IBM Plex Sans, desde Google Fonts.
- [SheetJS 0.18.5](https://sheetjs.com/), desde cdnjs. Solo se descarga al pulsar **Descargar Excel**. Si no carga, se descarga un CSV.
