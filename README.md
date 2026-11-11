# Entre páginas

Proyecto de front de una librería para 1DAW. El catálogo, el detalle, las reseñas, el login, el registro, el carrito y la compra simulada utilizan TypeScript y una API simulada.

Se necesitan Node.js, npm, Python 3 y Bash. Instala las dependencias con `npm ci` y ejecuta `./desarrollo.sh`: el script compila TypeScript y arranca los servidores del front y de la API. Abre <http://localhost:8080/> y pulsa `Ctrl+C` para detener ambos servidores. Los puertos 8080 y 3000 deben estar libres.

Para comprender los pasos por separado, puedes ejecutar `npm run build`, iniciar la API con `npm run api` y arrancar el front con `python3 scripts/servidor-web.py` en otra terminal. Para recompilar al guardar, usa `npm run watch` en otra terminal. `npm test` compila y ejecuta las pruebas con Node.js 20 o posterior, en una copia temporal de la API. No abras la página con `file://`, ya que los módulos JavaScript necesitan un servidor web.

Los datos de ejemplo están en `data/db.json`. La API simulada adapta JSON Server al contrato de catálogo, detalle, reseñas, carrito y pedidos. Las reseñas se solicitan de cinco en cinco. Las portadas se cargan desde un servidor externo.

Para probar el login, utiliza el correo ficticio `alumno@ejemplo.test` y la contraseña `clave123`, o registra una cuenta de prueba. Tras el registro hay que iniciar sesión. El token se guarda en la pestaña actual; al cerrar sesión se elimina del navegador. La primera vez que se inicia la API se crea `data/db.local.json` a partir de los datos iniciales. La copia local no se guarda en Git ni se sobrescribe en los siguientes arranques.

El carrito de invitado se guarda en `localStorage` del navegador. Al iniciar sesión se combina con el de la cuenta, sumando las cantidades de los libros repetidos; el carrito de la cuenta se guarda en la API y se comparte entre dispositivos que utilicen esa misma API. Si se pierde la conexión, el carrito se conserva y se reintenta con la misma cuenta. Una combinación que supere 99 unidades por libro o incluya un libro eliminado se rechaza: cierra sesión para editar el carrito de invitado antes de volver a intentarlo. El carrito local se comparte entre las pestañas del mismo navegador y origen; Web Locks coordina los cambios entre pestañas cuando está disponible. Si no está disponible, evita modificarlo simultáneamente en varias pestañas.

La compra es **solo una simulación local**: no hay banco ni pago real. No utilices datos reales de tarjetas. Para probarla, añade un libro, inicia sesión y confirma la compra con nombre ficticio, caducidad futura `MM/AA` y cualquier código ficticio de tres dígitos. Los únicos números admitidos son:

| Número de prueba | Resultado simulado |
| --- | --- |
| `4242 4242 4242 4242` | Compra aceptada. |
| `4000 0000 0000 0002` | Tarjeta rechazada. |
| `4000 0000 0000 9995` | Cuenta inexistente. |

Si se acepta, el pedido queda guardado en la API local y se vacía el carrito; si se rechaza, el carrito se conserva. Los datos de tarjeta se envían a la API simulada, pero no se guardan en el navegador ni en los pedidos. Si se pierde la respuesta, la misma pestaña permite comprobar el pedido pendiente sin enviar otra compra; también puedes consultar «Mis pedidos».

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
| `v0.8-registro` | Registro de usuarios de prueba y validación del formulario. |
| `v0.9-carrito-usuarios` | Carrito persistente para usuarios identificados. |
| `v0.10-carrito-invitados` | Carrito de invitados y combinación segura al iniciar sesión. |
| `v0.11-compra-simulada` | Compra simulada y consulta de pedidos. |
