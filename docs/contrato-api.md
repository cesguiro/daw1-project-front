# Contrato inicial de la API

Propuesta para coordinar el front y el back de la librería. La simulación implementa el catálogo, el detalle, la consulta de reseñas, el login, el registro, el carrito y los pedidos con pago ficticio. La publicación de reseñas queda para otra fase.

## Convenciones

- Las rutas siguientes incluyen el prefijo `/api` y son relativas al origen del servidor. Se intercambia JSON con `Content-Type: application/json`.
- Los identificadores de libros y pedidos son cadenas. En la simulación actual, los identificadores de usuarios son numéricos. Las fechas incluyen zona horaria y usan ISO 8601, por ejemplo `2025-03-20T10:00:00Z`.
- Los importes son números enteros en **céntimos de euro**: `1196` equivale a 11,96 €. Los descuentos son porcentajes enteros de 0 a 100.
- Las rutas protegidas requieren `Authorization: Bearer <token>`. El servidor determina el usuario a partir del token; no acepta un identificador de usuario enviado por el cliente para seleccionar sus pedidos.
- El carrito de un usuario identificado se guarda en el servidor, asociado al usuario del token. El carrito de invitado se guarda en el navegador y se combina al iniciar sesión.

## Usuarios y sesión

### Registro

`POST /api/register`

Petición:

```json
{ "name": "Ana", "email": "ana@example.com", "password": "contraseña-de-ejemplo" }
```

Respuesta `201 Created`:

```json
{ "accessToken": "token-de-ejemplo", "user": { "id": 1, "name": "Ana", "email": "ana@example.com" } }
```

La confirmación de contraseña se comprueba en el front y no se envía. Aunque la simulación devuelve un token al registrar, el front no lo guarda: después se utiliza el login.

### Login

`POST /api/login`

Petición:

```json
{ "email": "ana@example.com", "password": "contraseña-de-ejemplo" }
```

Respuesta `200 OK`:

```json
{ "accessToken": "token-de-ejemplo", "user": { "id": 1, "name": "Ana", "email": "ana@example.com" } }
```

El front trata el token como una cadena sin interpretar su contenido. El servidor debe generarlo de forma segura, comprobarlo en cada petición protegida y definir su caducidad. Nunca se devuelven contraseñas; el back real debe almacenarlas mediante un hash seguro, no en texto plano.

En la simulación, `GET /api/session` permite comprobar el token mediante `Authorization: Bearer <accessToken>`. Devuelve `{ "active": true }` o `401` si falta o ha caducado. El token simulado dura una hora; cerrar sesión lo elimina del navegador, pero no lo invalida en el servidor.

## Libros

### Catálogo

`GET /api/books?page=1&size=6` devuelve una página de libros. `page` empieza en 1 y `size` debe estar entre 1 y 100. Por defecto son 1 y 6. El orden es por identificador ascendente. Los parámetros no válidos devuelven `400`; una página fuera de rango tiene `content` vacío. Si no hay libros, `totalPages` es 0. En Spring se puede convertir a índice cero con `PageRequest.of(page - 1, size)`.

El precio final se proporciona para que el front no tenga que duplicar la regla de descuento. Ejemplo abreviado de `content`:

```json
{
  "content": [
  {
    "id": "b01",
    "title": "Los juegos del hambre",
    "author": "Suzanne Collins",
    "category": "Ciencia ficción",
    "coverUrl": "https://images.cesguiro.es/books/9780439023528.webp",
    "priceCents": 1495,
    "discountPercent": 20,
    "finalPriceCents": 1196,
    "averageRating": 4.3,
    "reviewCount": 6,
    "description": "Katniss participa en los Juegos del Hambre."
  }
  ],
  "page": 1,
  "size": 6,
  "totalElements": 24,
  "totalPages": 4
}
```

Para un libro sin descuento, `discountPercent` es `0` y ambos precios son iguales. Para uno sin reseñas, `averageRating` es `null` y `reviewCount` es `0`. La media se calcula sobre todas las reseñas, redondeada a una cifra decimal.

### Detalle

`GET /api/books/{bookId}` devuelve los datos del libro, incluida `description`:

```json
{
  "id": "b01",
  "title": "Los juegos del hambre",
  "author": "Suzanne Collins",
  "category": "Ciencia ficción",
  "coverUrl": "https://images.cesguiro.es/books/9780439023528.webp",
  "priceCents": 1495,
  "discountPercent": 20,
  "finalPriceCents": 1196,
  "averageRating": 4.3,
  "reviewCount": 6,
  "description": "Katniss Everdeen participa en los Juegos del Hambre."
}
```

## Reseñas

`GET /api/books/{bookId}/reviews?page=1&size=5` devuelve primero las más recientes. `page` empieza en 1 y `size` es 5 por defecto. El total corresponde a todas las reseñas del libro, no solo a las de esa página.

```json
{
  "content": [
    { "id": "r1", "userName": "Lucía M.", "rating": 5, "comment": "Una historia emocionante.", "createdAt": "2025-03-15T10:00:00Z" }
  ],
  "page": 1,
  "size": 5,
  "totalElements": 6,
  "totalPages": 2
}
```

El ejemplo abrevia `content`; una respuesta real incluirá hasta cinco reseñas. Si no existen, `content` es un array vacío y `totalElements` es `0`.

`POST /api/books/{bookId}/reviews` permite a un usuario identificado enviar `{ "rating": 5, "comment": "Me gustó mucho" }`. La respuesta `201` devuelve la reseña con la estructura anterior. La puntuación es un entero de 1 a 5 y cada usuario puede publicar una reseña por libro. El formulario de la maqueta está deshabilitado.

## Carrito

Todas las rutas requieren `Authorization: Bearer <token>` y operan exclusivamente sobre el carrito del usuario autenticado. `GET /api/cart` devuelve `{ "items": [{ "bookId": "b01", "quantity": 1, "book": { ... } }] }`. `book` contiene los datos actuales del catálogo, o `null` si el libro ya no existe; esa línea se puede eliminar. Un carrito vacío devuelve `{ "items": [] }`.

- `POST /api/cart/items` recibe `{ "bookId": "b01", "quantity": 1 }` y suma la cantidad si ya existe la línea.
- `PATCH /api/cart/items/{bookId}` recibe `{ "quantity": 2 }` y sustituye la cantidad.
- `DELETE /api/cart/items/{bookId}` elimina la línea.

Las operaciones devuelven el carrito actualizado. Las cantidades son enteros de 1 a 99; superar el límite devuelve `400` sin modificarlo. Un libro o línea inexistente devuelve `404`. Los precios mostrados son orientativos; la compra debe calcularlos en el servidor. La API simulada guarda carritos en `data/db.local.json`, solo para desarrollo local.

### Combinar el carrito de invitado

`POST /api/cart/merge` requiere login y recibe, por ejemplo:

```json
{ "mergeId": "f4509828-1638-4fe2-9ec0-67a2e8c561cb", "items": [{ "bookId": "b01", "quantity": 2 }] }
```

El servidor suma las cantidades a las líneas existentes e incorpora los libros nuevos; devuelve el carrito actualizado. Valida todas las líneas antes de modificarlo (hasta 100 libros distintos, cantidades de 1 a 99, libros existentes y sin identificadores duplicados). Si una suma supera 99, rechaza la operación completa con `400`; si un libro no existe, devuelve `404`. El cliente conserva el carrito local para corregirlo.

`mergeId` identifica la operación, no el carrito. El servidor guarda el resultado de la operación junto a su identidad y contenido: un reintento con el mismo identificador, usuario y líneas no vuelve a sumar y devuelve el carrito actual. Reutilizar el identificador con otro usuario o contenido devuelve `409`. El cliente guarda el identificador y las líneas antes de enviarlas y solo elimina el pendiente al recibir confirmación; si la respuesta se pierde, reintenta con la misma cuenta. El registro no inicia sesión ni elimina el carrito local.

La implementación simulada escribe los carritos y los identificadores de combinación en el mismo archivo local. Un back real debe implementar la combinación y la reserva del identificador como una transacción persistente y gestionar la concurrencia; la simulación no está preparada para producción.

## Pedidos

Todas estas rutas requieren login. Solo se pueden consultar los pedidos del usuario autenticado.

### Crear pedido

`POST /api/orders`

Petición:

```json
{
  "requestId": "b9a15126-31d0-41e9-83e4-2b7882e199e6",
  "items": [ { "bookId": "b01", "quantity": 1, "expectedPriceCents": 1196 } ],
  "payment": { "name": "Nombre ficticio", "number": "4242424242424242", "expiry": "12/99", "cvv": "123" }
}
```

Las líneas deben coincidir con el carrito actual del usuario y las cantidades son enteros de 1 a 99. El servidor obtiene los libros y precios actuales, comprueba que coincidan con `expectedPriceCents` y calcula el total: el precio enviado solo permite detectar cambios, no determinar el importe. Si el carrito o los precios han cambiado, devuelve `409 CART_CHANGED` sin crear el pedido; el usuario debe revisar el resumen. No hay gastos de envío ni gestión de stock en esta versión.

Respuesta `201 Created`: devuelve el detalle completo del pedido con la estructura de `GET /api/orders/{orderId}` y vacía el carrito en la misma escritura local. La operación es una simulación: no se procesan pagos reales. La tarjeta ficticia se comprueba durante la petición y no se guarda en el pedido, el archivo de datos ni el almacenamiento del navegador. No se deben introducir datos reales ni exponer la API simulada.

Solo se aceptan estos números de prueba (16 dígitos sin espacios en la petición): `4242424242424242` acepta; `4000000000000002` devuelve `402 CARD_DECLINED`; `4000000000009995` devuelve `402 ACCOUNT_NOT_FOUND`. Cualquier otro número, campo incorrecto o fecha caducada devuelve `400 INVALID_CARD`. El nombre debe tener de 1 a 100 caracteres no vacíos, la caducidad sigue `MM/AA` y el código de seguridad ficticio tiene tres dígitos. Los rechazos no crean pedido ni vacían el carrito.

`requestId` identifica el intento para el usuario autenticado. Al repetir un pedido ya aceptado con el mismo identificador y líneas, el servidor devuelve `200` con el pedido original, sin crear otro ni vaciar un carrito posterior. Si las líneas son distintas, devuelve `409 REQUEST_CONFLICT`. `GET /api/orders/by-request/{requestId}` permite recuperar el resultado del usuario autenticado o devuelve `404`. Antes de enviar, el front guarda el identificador, el usuario y las líneas en `sessionStorage` —nunca la tarjeta— para poder comprobar el resultado si se pierde la respuesta. Si se cierra la pestaña, se puede comprobar el historial de pedidos.

La API simulada escribe pedido y carrito en su archivo local; un back real necesitaría transacciones, protección contra reintentos y un proveedor de pagos adecuado. Esta simulación no es un sistema de pagos ni sirve para procesar tarjetas reales.

### Listado de mis pedidos

`GET /api/orders` devuelve un array, del más reciente al más antiguo:

```json
[
  { "id": "1001", "createdAt": "2025-03-20T10:00:00Z", "itemCount": 2, "totalCents": 2472 }
]
```

`itemCount` es la suma de las cantidades de libros. Si no hay pedidos, se devuelve `[]`.

### Detalle de un pedido

`GET /api/orders/{orderId}`:

```json
{
  "id": "1001",
  "createdAt": "2025-03-20T10:00:00Z",
  "itemCount": 2,
  "items": [
    {
      "bookId": "b01",
      "title": "Los juegos del hambre",
      "author": "Suzanne Collins",
      "coverUrl": "https://images.cesguiro.es/books/9780439023528.webp",
      "quantity": 1,
      "unitPriceCents": 1196,
      "subtotalCents": 1196
    },
    {
      "bookId": "b04",
      "title": "El principito",
      "author": "Antoine de Saint-Exupéry",
      "coverUrl": "https://images.cesguiro.es/books/9780142424179.webp",
      "quantity": 1,
      "unitPriceCents": 1276,
      "subtotalCents": 1276
    }
  ],
  "totalCents": 2472
}
```

Las líneas conservan el título, autor, portada y precio unitario aplicados al comprar, aunque después cambie el catálogo. El subtotal es el precio unitario multiplicado por la cantidad; el total es la suma de los subtotales.

## Errores

Las respuestas de error usan esta estructura:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "La cantidad debe ser mayor que cero." } }
```

- `400`: datos inválidos.
- `401`: credenciales incorrectas o token ausente, inválido o caducado.
- `402`: tarjeta ficticia rechazada o cuenta ficticia inexistente.
- `404`: libro o pedido no encontrado; también se usa si el pedido pertenece a otra persona.
- `409`: correo ya registrado, reseña duplicada o conflicto en el carrito o identificador de pedido.
- `500`: error inesperado del servidor.

Estos errores son la propuesta para el back real. `json-server-auth` devuelve errores como cadenas JSON y utiliza `400` tanto para credenciales incorrectas como para correos ya registrados.

## API simulada

JSON Server puede servir como punto de partida para los datos, pero **no implementa por sí solo este contrato completo**: hacen falta lógica adicional para el login con tokens, las restricciones por usuario, los cálculos de pedidos, la media de reseñas y las respuestas propuestas. Podría usarse un pequeño servidor simulado en su lugar. Ninguna de estas medidas convierte la simulación en un sistema listo para producción.

La simulación actual adapta la paginación de JSON Server al contrato de `/api/books`, implementa el carrito y los pedidos ficticios y utiliza `json-server-auth` para el login. Es únicamente para desarrollo local: el complemento utiliza una clave JWT fija y conocida, por lo que no es seguro exponerlo. Los precios finales, medias y recuentos se mantienen en los datos de ejemplo; no se calculan automáticamente.
