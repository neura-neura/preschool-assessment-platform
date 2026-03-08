# Editor de Evaluaciones Preescolar

Aplicacion web estatica para redactar, validar y exportar reportes de evaluacion en formato TXT.

## Archivos del proyecto

- `index.html`: estructura de la interfaz.
- `styles.css`: estilos de la aplicacion.
- `app.js`: logica de captura, validacion, guardado y exportacion.

## Funcionalidades

- Gestion de alumnos (agregar, duplicar, eliminar y buscar).
- Edicion de 8 campos por alumno con reglas de longitud.
- Normalizacion de texto (mayusculas, acentos, puntuacion, comas configurables).
- Deteccion de errores y validacion manual de observaciones.
- Analisis de repeticiones y similitud entre alumnos.
- Guardado en `localStorage` y respaldo/importacion en TXT.
- Exportacion de progreso y reporte final en TXT.

## Ejecucion local

No requiere instalacion ni build.

1. Abre `index.html` directamente en el navegador.
2. Opcional: sirve la carpeta con un servidor estatico.

## Deploy en GitHub Pages

1. Crea un repositorio privado y sube estos archivos:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `README.md`
   - `.gitignore`
2. En GitHub abre `Settings > Pages`.
3. En `Build and deployment`, selecciona `Deploy from a branch`.
4. Elige la rama principal (`main` o la que uses) y la carpeta `/ (root)`.
5. Guarda los cambios y espera la URL publica de Pages.

## Nota de datos

La informacion capturada se guarda en el navegador del usuario (`localStorage`).
Si cambias de equipo o navegador, exporta/importa TXT para conservar avances.
