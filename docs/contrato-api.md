# Contrato inicial de la API

Propuesta para coordinar el front y el back de la librería. La simulación implementa el catálogo y el detalle; las demás rutas se incorporarán en sus fases correspondientes.

## Convenciones

- Las rutas siguientes incluyen el prefijo `/api` y son relativas al origen del servidor. Se intercambia JSON con `Content-Type: application/json`.
- Los identificadores son cadenas. Las fechas incluyen zona horaria y usan ISO 8601, por ejemplo `2025-03-20T10:00:00Z`.
- Los importes son números enteros en **céntimos de euro**: `1196` equivale a 11,96 €. Los descuentos son porcentajes enteros de 0 a 100.
- Las rutas protegidas requieren `Authorization: Bearer <token>`. El servidor determina el usuario a partir del token; no acepta un identificador de usuario enviado por el cliente para seleccionar sus pedidos.
- El cliente guarda el carrito localmente. La API solo recibe sus líneas al confirmar un pedido.

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

La confirmación de contraseña se comprueba en el front y no se envía. El registro no inicia sesión automáticamente: después se utiliza el login.

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

## Pedidos

Todas estas rutas requieren login. Solo se pueden consultar los pedidos del usuario autenticado.

### Crear pedido

`POST /api/orders`

Petición:

```json
{ "items": [ { "bookId": "b01", "quantity": 1 }, { "bookId": "b04", "quantity": 1 } ] }
```

Las cantidades son enteros positivos. El servidor obtiene los precios actuales, aplica los descuentos, calcula el total y asocia el pedido al usuario. No confía en precios ni totales enviados por el cliente. No hay gastos de envío ni gestión de stock en esta versión.

Respuesta `201 Created`: devuelve el detalle completo del pedido con la estructura de `GET /api/orders/{orderId}`. La operación es una simulación: no se procesan pagos reales. Los campos de tarjeta de la maqueta no forman parte de esta petición y no se envían ni guardan.

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
- `404`: libro o pedido no encontrado; también se usa si el pedido pertenece a otra persona.
- `409`: correo ya registrado o reseña duplicada.
- `500`: error inesperado del servidor.

## API simulada

JSON Server puede servir como punto de partida para los datos, pero **no implementa por sí solo este contrato completo**: hacen falta lógica adicional para el login con tokens, las restricciones por usuario, los cálculos de pedidos, la media de reseñas y las respuestas propuestas. Podría usarse un pequeño servidor simulado en su lugar. Ninguna de estas medidas convierte la simulación en un sistema listo para producción.

La simulación actual adapta la paginación de JSON Server al contrato de `/api/books`. Los precios finales, medias y recuentos se mantienen en los datos de ejemplo; no se calculan automáticamente.
