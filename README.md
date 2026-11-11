# Entre páginas

Proyecto de front de una librería para 1DAW. El catálogo, el detalle, las reseñas y el inicio de sesión utilizan TypeScript y una API simulada; el resto sigue siendo una maqueta.

Se necesitan Node.js, npm, Python 3 y Bash. Instala las dependencias con `npm ci` y ejecuta `./desarrollo.sh`: el script compila TypeScript y arranca los servidores del front y de la API. Abre <http://localhost:8080/> y pulsa `Ctrl+C` para detener ambos servidores. Los puertos 8080 y 3000 deben estar libres.

Para comprender los pasos por separado, puedes ejecutar `npm run build`, iniciar la API con `npm run api` y arrancar el front con `python3 scripts/servidor-web.py` en otra terminal. Para recompilar al guardar, usa `npm run watch` en otra terminal. No abras la página con `file://`, ya que los módulos JavaScript necesitan un servidor web.

Los datos de ejemplo están en `data/db.json`. La API simulada adapta JSON Server al contrato de catálogo, detalle y reseñas. Las reseñas se solicitan de cinco en cinco. Registro, carrito, compra y pedidos siguen siendo pantallas de ejemplo. Las portadas se cargan desde un servidor externo.

Para probar el login, utiliza el correo ficticio `alumno@ejemplo.test` y la contraseña `clave123`. El token se guarda en la pestaña actual; al cerrar sesión se elimina del navegador. La primera vez que se inicia la API se crea `data/db.local.json` a partir de los datos iniciales. La copia local no se guarda en Git ni se sobrescribe en los siguientes arranques.

La autenticación es **solo una simulación local**: `json-server-auth` usa una clave de firma fija y conocida, por lo que sus tokens pueden falsificarse. No uses contraseñas reales ni expongas estos servidores en una red o en producción. Cerrar sesión en el front no invalida el token en el servidor; el token de ejemplo caduca al cabo de una hora.

## Fases del proyecto

Cada fase completada se identificará con un tag de Git para poder consultar el proyecto en ese punto.

| Tag | Fase |
| --- | --- |
| `v0.1-maqueta` | Pantallas estáticas en HTML y CSS, datos de ejemplo y contrato inicial de la API. |
| `v0.2-typescript` | Catálogo generado con TypeScript, tipos y manipulación del DOM. |
| `v0.3-catalogo` | Catálogo paginado con JSON Server y `fetch`. |
| `v0.4-detalle` | Detalle de libro cargado desde la API a partir del identificador de la URL. |
| `v0.5-resenas` | Reseñas relacionadas con cada libro y carga de páginas adicionales. |
| `v0.6-script` | Script de desarrollo para compilar y arrancar ambos servidores. |
| `v0.7-login` | Inicio y cierre de sesión con un usuario de prueba y cabecera adaptada. |
