const path = require("node:path");
const fs = require("node:fs");
const { randomUUID } = require("node:crypto");
const cors = require("cors");
const jsonServer = require("json-server");
const auth = require("json-server-auth");

const servidor = jsonServer.create();
const datosIniciales = path.join(__dirname, "..", "data", "db.json");
const datosLocales = process.env.API_DB_PATH || path.join(__dirname, "..", "data", "db.local.json");
if (!fs.existsSync(datosLocales)) fs.copyFileSync(datosIniciales, datosLocales, fs.constants.COPYFILE_EXCL);
const router = jsonServer.router(datosLocales);
servidor.db = router.db;
servidor.use(cors({ origin: ["http://localhost:8080", "http://127.0.0.1:8080"] }));
servidor.use(jsonServer.bodyParser);

// Limitamos las rutas expuestas: no se pueden consultar /db ni /users.
servidor.use((req, res, next) => {
  const lectura = req.method === "GET" || req.method === "HEAD";
  const libros = /^\/api\/books(?:\/[^/]+(?:\/reviews)?)?\/?$/.test(req.path);
  const sesion = req.path === "/api/session";
  const autenticacion = req.path === "/api/login" || req.path === "/api/register";
  const carrito = /^\/api\/cart(?:\/items(?:\/[^/]+)?|\/merge)?\/?$/.test(req.path);
  const pedidos = /^\/api\/orders(?:\/(?:by-request\/)?[^/]+)?\/?$/.test(req.path);
  if (carrito && ["GET", "POST", "PATCH", "DELETE"].includes(req.method)) return next();
  if (pedidos && (lectura || req.method === "POST")) return next();
  if ((lectura && (libros || sesion)) || (req.method === "POST" && autenticacion)) {
    if (autenticacion) {
      const { name, email, password } = req.body || {};
      if (typeof email !== "string" || typeof password !== "string" ||
          (req.path === "/api/register" && (typeof name !== "string" || !name.trim()))) {
        return res.status(400).json({ error: "Datos de autenticación inválidos" });
      }
      req.body = req.path === "/api/register" ? { name: name.trim(), email, password } : { email, password };
    }
    return next();
  }
  return res.status(404).json({ error: "Ruta no disponible en la simulación" });
});

// La sesión se comprueba sin que el front tenga que leer el contenido del token.
servidor.use(auth.rewriter({ "/api/login": "/login", "/api/register": "/register", "/api/session": "/660/session", "/api/cart*": "/660/cart$1", "/api/orders*": "/660/orders$1" }));
servidor.use(auth);
servidor.get("/session", (_req, res) => res.json({ active: true }));

// La identidad procede exclusivamente del token verificado por json-server-auth.
function lineasCarrito(req) {
  return router.db.get("carts").value()?.[req.claims.sub] || [];
}
function guardarCarrito(req, lineas) {
  const carritos = router.db.get("carts").value() || {};
  router.db.set("carts", { ...carritos, [req.claims.sub]: lineas }).write();
}
function respuestaCarrito(lineas) {
  const items = lineas.map(linea => ({ ...linea, book: router.db.get("books").find({ id: linea.bookId }).value() || null }));
  return { items };
}
function cantidadValida(cantidad) {
  return Number.isSafeInteger(cantidad) && cantidad >= 1 && cantidad <= 99;
}
function errorCarrito(res, status, mensaje) {
  return res.status(status).json({ error: { code: status === 404 ? "NOT_FOUND" : "VALIDATION_ERROR", message: mensaje } });
}
servidor.get("/cart", (req, res) => res.json(respuestaCarrito(lineasCarrito(req))));
servidor.post("/cart/items", (req, res) => {
  const { bookId, quantity } = req.body || {};
  if (typeof bookId !== "string" || !cantidadValida(quantity)) return errorCarrito(res, 400, "Libro o cantidad no válidos (1 a 99).");
  if (!router.db.get("books").find({ id: bookId }).value()) return errorCarrito(res, 404, "Libro no encontrado.");
  const lineas = lineasCarrito(req).map(linea => ({ ...linea }));
  const existente = lineas.find(linea => linea.bookId === bookId);
  if (existente) {
    if (!cantidadValida(existente.quantity + quantity)) return errorCarrito(res, 400, "La cantidad no puede superar 99.");
    existente.quantity += quantity;
  } else lineas.push({ bookId, quantity });
  guardarCarrito(req, lineas);
  return res.json(respuestaCarrito(lineas));
});
servidor.patch("/cart/items/:id", (req, res) => {
  const quantity = req.body?.quantity;
  if (!cantidadValida(quantity)) return errorCarrito(res, 400, "La cantidad debe estar entre 1 y 99.");
  const lineas = lineasCarrito(req).map(linea => ({ ...linea }));
  const linea = lineas.find(item => item.bookId === req.params.id);
  if (!linea) return errorCarrito(res, 404, "Línea no encontrada.");
  linea.quantity = quantity;
  guardarCarrito(req, lineas);
  return res.json(respuestaCarrito(lineas));
});
servidor.delete("/cart/items/:id", (req, res) => {
  const lineas = lineasCarrito(req);
  if (!lineas.some(item => item.bookId === req.params.id)) return errorCarrito(res, 404, "Línea no encontrada.");
  const restantes = lineas.filter(item => item.bookId !== req.params.id);
  guardarCarrito(req, restantes);
  return res.json(respuestaCarrito(restantes));
});
// Una operación de combinación se registra junto al carrito en la misma escritura.
// Reintentar su identificador no vuelve a sumar las cantidades.
servidor.post("/cart/merge", (req, res) => {
  const { mergeId, items } = req.body || {};
  if (typeof mergeId !== "string" || !/^[a-zA-Z0-9-]{1,100}$/.test(mergeId) || !Array.isArray(items) || items.length === 0 || items.length > 100) {
    return errorCarrito(res, 400, "Combinación no válida.");
  }
  const ids = new Set();
  for (const item of items) {
    if (!item || typeof item.bookId !== "string" || ids.has(item.bookId) || !cantidadValida(item.quantity)) return errorCarrito(res, 400, "Líneas no válidas.");
    ids.add(item.bookId);
  }
  const firmas = JSON.stringify(items.map(({ bookId, quantity }) => ({ bookId, quantity })));
  const operaciones = router.db.get("cartMerges").value() || {};
  const anterior = operaciones[mergeId];
  if (anterior) {
    if (anterior.userId !== req.claims.sub || anterior.items !== firmas) return res.status(409).json({ error: { code: "CONFLICT", message: "Identificador de combinación ya utilizado." } });
    return res.json(respuestaCarrito(lineasCarrito(req)));
  }
  const lineas = lineasCarrito(req).map(linea => ({ ...linea }));
  for (const item of items) {
    if (!router.db.get("books").find({ id: item.bookId }).value()) return errorCarrito(res, 404, `Libro no encontrado: ${item.bookId}.`);
    const existente = lineas.find(linea => linea.bookId === item.bookId);
    if (existente) {
      if (!cantidadValida(existente.quantity + item.quantity)) return errorCarrito(res, 400, "La cantidad combinada no puede superar 99.");
      existente.quantity += item.quantity;
    } else lineas.push({ bookId: item.bookId, quantity: item.quantity });
  }
  const carritos = router.db.get("carts").value() || {};
  router.db.assign({ carts: { ...carritos, [req.claims.sub]: lineas }, cartMerges: { ...operaciones, [mergeId]: { userId: req.claims.sub, items: firmas } } }).write();
  return res.json(respuestaCarrito(lineas));
});

// Los números de prueba nunca representan cuentas reales ni se guardan.
function pagoSimulado(payment) {
  if (!payment || typeof payment.name !== "string" || !payment.name.trim() || payment.name.length > 100 ||
      typeof payment.number !== "string" || !/^\d{16}$/.test(payment.number) ||
      typeof payment.expiry !== "string" || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(payment.expiry) ||
      typeof payment.cvv !== "string" || !/^\d{3}$/.test(payment.cvv)) return "INVALID_CARD";
  const [mes, ano] = payment.expiry.split("/").map(Number);
  const ahora = new Date();
  if (2000 + ano < ahora.getFullYear() || (2000 + ano === ahora.getFullYear() && mes < ahora.getMonth() + 1)) return "INVALID_CARD";
  if (payment.number === "4242424242424242") return null;
  if (payment.number === "4000000000000002") return "CARD_DECLINED";
  if (payment.number === "4000000000009995") return "ACCOUNT_NOT_FOUND";
  return "INVALID_CARD";
}
function pedidoPublico(pedido) {
  const { userId, requestId, requestItems, ...publico } = pedido;
  return publico;
}
function errorPedido(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}
servidor.get("/orders", (req, res) => {
  const pedidos = (router.db.get("orders").value() || []).filter(pedido => pedido.userId === req.claims.sub)
    .slice().reverse().map(({ id, createdAt, itemCount, totalCents }) => ({ id, createdAt, itemCount, totalCents }));
  return res.json(pedidos);
});
servidor.get("/orders/by-request/:id", (req, res) => {
  const pedido = (router.db.get("orders").value() || []).find(item => item.userId === req.claims.sub && item.requestId === req.params.id);
  return pedido ? res.json(pedidoPublico(pedido)) : errorPedido(res, 404, "NOT_FOUND", "Pedido no encontrado.");
});
servidor.get("/orders/:id", (req, res) => {
  const pedido = (router.db.get("orders").value() || []).find(item => item.userId === req.claims.sub && item.id === req.params.id);
  return pedido ? res.json(pedidoPublico(pedido)) : errorPedido(res, 404, "NOT_FOUND", "Pedido no encontrado.");
});
servidor.post("/orders", (req, res) => {
  const { requestId, items, payment } = req.body || {};
  if (typeof requestId !== "string" || !/^[a-zA-Z0-9-]{1,100}$/.test(requestId) || !Array.isArray(items) || !items.length || items.length > 100) {
    return errorPedido(res, 400, "VALIDATION_ERROR", "Pedido no válido.");
  }
  const ids = new Set();
  for (const item of items) {
    if (!item || typeof item.bookId !== "string" || ids.has(item.bookId) || !cantidadValida(item.quantity) || !Number.isSafeInteger(item.expectedPriceCents) || item.expectedPriceCents < 0) {
      return errorPedido(res, 400, "VALIDATION_ERROR", "Líneas del pedido no válidas.");
    }
    ids.add(item.bookId);
  }
  const lineasSolicitadas = items.map(({ bookId, quantity, expectedPriceCents }) => ({ bookId, quantity, expectedPriceCents })).sort((a, b) => a.bookId.localeCompare(b.bookId));
  const firma = JSON.stringify(lineasSolicitadas);
  const pedidos = router.db.get("orders").value() || [];
  const anterior = pedidos.find(item => item.userId === req.claims.sub && item.requestId === requestId);
  if (anterior) return anterior.requestItems === firma ? res.json(pedidoPublico(anterior)) : errorPedido(res, 409, "REQUEST_CONFLICT", "Identificador ya utilizado para otro pedido.");

  const carrito = lineasCarrito(req);
  if (carrito.length !== items.length || carrito.some(linea => !items.some(item => item.bookId === linea.bookId && item.quantity === linea.quantity))) {
    return errorPedido(res, 409, "CART_CHANGED", "El carrito ha cambiado. Revisa el pedido.");
  }
  const lineas = [];
  for (const item of items) {
    const libro = router.db.get("books").find({ id: item.bookId }).value();
    if (!libro || libro.finalPriceCents !== item.expectedPriceCents) return errorPedido(res, 409, "CART_CHANGED", "Los libros o precios han cambiado. Revisa el pedido.");
    lineas.push({ bookId: libro.id, title: libro.title, author: libro.author, coverUrl: libro.coverUrl, quantity: item.quantity, unitPriceCents: libro.finalPriceCents, subtotalCents: libro.finalPriceCents * item.quantity });
  }
  const resultado = pagoSimulado(payment);
  if (resultado === "INVALID_CARD") return errorPedido(res, 400, resultado, "Datos de tarjeta ficticia no válidos o caducados.");
  if (resultado === "CARD_DECLINED") return errorPedido(res, 402, resultado, "La tarjeta ficticia ha sido rechazada.");
  if (resultado === "ACCOUNT_NOT_FOUND") return errorPedido(res, 402, resultado, "No existe una cuenta ficticia para esa tarjeta.");
  const pedido = { id: randomUUID(), userId: req.claims.sub, requestId, requestItems: firma, createdAt: new Date().toISOString(), itemCount: lineas.reduce((suma, item) => suma + item.quantity, 0), items: lineas, totalCents: lineas.reduce((suma, item) => suma + item.subtotalCents, 0) };
  const carritos = router.db.get("carts").value() || {};
  router.db.assign({ orders: [...pedidos, pedido], carts: { ...carritos, [req.claims.sub]: [] } }).write();
  return res.status(201).json(pedidoPublico(pedido));
});

// Adaptamos la paginación de JSON Server al contrato que seguirá Spring.
function paginar(req, res, elementos, tamanoPorDefecto) {
  const pagina = req.query.page === undefined ? "1" : req.query.page;
  const tamano = req.query.size === undefined ? String(tamanoPorDefecto) : req.query.size;
  if (typeof pagina !== "string" || typeof tamano !== "string" ||
      !/^[1-9]\d*$/.test(pagina) || !/^[1-9]\d*$/.test(tamano) ||
      !Number.isSafeInteger(Number(pagina)) || !Number.isSafeInteger(Number(tamano)) || Number(tamano) > 100) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "page y size deben ser enteros positivos; size no puede superar 100." } });
  }
  const page = Number(pagina);
  const size = Number(tamano);
  const inicio = (page - 1) * size;
  return res.json({ content: elementos.slice(inicio, inicio + size), page, size, totalElements: elementos.length, totalPages: Math.ceil(elementos.length / size) });
}

servidor.get("/api/books", (req, res) => {
  const libros = router.db.get("books").value().slice().sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  return paginar(req, res, libros, 6);
});

servidor.get("/api/books/:id", (req, res) => {
  const libro = router.db.get("books").find({ id: req.params.id }).value();
  if (!libro) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Libro no encontrado." } });
  return res.json(libro);
});

servidor.get("/api/books/:id/reviews", (req, res) => {
  const libro = router.db.get("books").find({ id: req.params.id }).value();
  if (!libro) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Libro no encontrado." } });
  const resenas = router.db.get("reviews").filter({ bookId: req.params.id }).value().slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
  return paginar(req, res, resenas, 5);
});

servidor.listen(Number(process.env.API_PORT || 3000), "127.0.0.1", () => console.log("API simulada en marcha"));
