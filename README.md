# Entre páginas

Proyecto de front de una librería para 1DAW. El catálogo paginado, el detalle y las reseñas se cargan con TypeScript y `fetch` desde JSON Server; el resto sigue siendo una maqueta en HTML y CSS.

Instala las dependencias con `npm ci` y compila con `npm run build`. Inicia la API con `npm run api` y, en otra terminal, ejecuta `python3 -m http.server 8080`. Abre <http://localhost:8080/>. Para recompilar al guardar, usa `npm run watch` en otra terminal. No abras la página con `file://`, ya que los módulos JavaScript necesitan un servidor web.

Los datos de ejemplo están en `data/db.json`. La API simulada adapta JSON Server al contrato de catálogo, detalle y reseñas. Las reseñas se solicitan de cinco en cinco. Acceso, registro, carrito, compra y pedidos son pantallas de ejemplo. Las portadas se cargan desde un servidor externo.

## Fases del proyecto

Cada fase completada se identificará con un tag de Git para poder consultar el proyecto en ese punto.

| Tag | Fase |
| --- | --- |
| `v0.1-maqueta` | Pantallas estáticas en HTML y CSS, datos de ejemplo y contrato inicial de la API. |
| `v0.2-typescript` | Catálogo generado con TypeScript, tipos y manipulación del DOM. |
| `v0.3-catalogo` | Catálogo paginado con JSON Server y `fetch`. |
| `v0.4-detalle` | Detalle de libro cargado desde la API a partir del identificador de la URL. |
| `v0.5-resenas` | Reseñas relacionadas con cada libro y carga de páginas adicionales. |
