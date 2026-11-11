# Entre páginas

Proyecto de front de una librería para 1DAW. El catálogo se genera con TypeScript a partir de datos ficticios; el resto sigue siendo una maqueta en HTML y CSS.

Instala las dependencias con `npm ci` y compila con `npm run build`. Después ejecuta `python3 -m http.server 8080` y abre <http://localhost:8080/>. Para recompilar al guardar, usa `npm run watch` en otra terminal. No abras la página con `file://`, ya que los módulos JavaScript necesitan un servidor web.

Los datos están en `src/libros.ts` y todavía no hay API. El detalle, acceso, registro, carrito, compra y pedidos son pantallas de ejemplo; sus acciones están deshabilitadas. Las portadas se cargan desde un servidor externo.

## Fases del proyecto

Cada fase completada se identificará con un tag de Git para poder consultar el proyecto en ese punto.

| Tag | Fase |
| --- | --- |
| `v0.1-maqueta` | Pantallas estáticas en HTML y CSS, datos de ejemplo y contrato inicial de la API. |
| `v0.2-typescript` | Catálogo generado con TypeScript, tipos y manipulación del DOM. |
