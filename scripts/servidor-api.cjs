const path = require("node:path");
const cors = require("cors");
const jsonServer = require("json-server");

const servidor = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, "..", "data", "db.json"));
servidor.use(cors({ origin: ["http://localhost:8080", "http://127.0.0.1:8080"] }));

// Adaptamos la paginación de JSON Server al contrato que seguirá Spring.
servidor.get("/api/books", (req, res) => {
  const pagina = req.query.page === undefined ? "1" : req.query.page;
  const tamano = req.query.size === undefined ? "6" : req.query.size;
  if (typeof pagina !== "string" || typeof tamano !== "string" ||
      !/^[1-9]\d*$/.test(pagina) || !/^[1-9]\d*$/.test(tamano) ||
      !Number.isSafeInteger(Number(pagina)) || !Number.isSafeInteger(Number(tamano)) || Number(tamano) > 100) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "page y size deben ser enteros positivos; size no puede superar 100." } });
  }
  const page = Number(pagina);
  const size = Number(tamano);
  const libros = router.db.get("books").value().slice().sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const inicio = (page - 1) * size;
  return res.json({ content: libros.slice(inicio, inicio + size), page, size, totalElements: libros.length, totalPages: Math.ceil(libros.length / size) });
});

servidor.listen(3000, "127.0.0.1", () => console.log("API simulada: http://localhost:3000/api/books"));
