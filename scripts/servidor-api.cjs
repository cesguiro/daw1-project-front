const path = require("node:path");
const fs = require("node:fs");
const cors = require("cors");
const jsonServer = require("json-server");
const auth = require("json-server-auth");

const servidor = jsonServer.create();
const datosIniciales = path.join(__dirname, "..", "data", "db.json");
const datosLocales = path.join(__dirname, "..", "data", "db.local.json");
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
servidor.use(auth.rewriter({ "/api/login": "/login", "/api/register": "/register", "/api/session": "/660/session" }));
servidor.use(auth);
servidor.get("/session", (_req, res) => res.json({ active: true }));

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

servidor.listen(3000, "127.0.0.1", () => console.log("API simulada: http://localhost:3000/api/books"));
