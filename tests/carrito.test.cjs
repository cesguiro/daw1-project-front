const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const net = require("node:net");

test("carritos autenticados: aislamiento, validación y persistencia", async t => {
  const directorio = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), "entre-paginas-test-"));
  const db = path.join(directorio, "db.json");
  const puerto = await new Promise((resolve, reject) => {
    const servidor = net.createServer();
    servidor.once("error", reject);
    servidor.listen(0, "127.0.0.1", () => {
      const port = servidor.address().port;
      servidor.close(() => resolve(port));
    });
  });
  const proceso = spawn(process.execPath, ["scripts/servidor-api.cjs"], {
    cwd: path.join(__dirname, ".."), env: { ...process.env, API_DB_PATH: db, API_PORT: String(puerto) }
  });
  t.after(() => { proceso.kill(); fs.rmSync(directorio, { recursive: true, force: true }); });
  await new Promise((resolve, reject) => {
    proceso.stdout.once("data", resolve);
    proceso.once("error", reject);
    proceso.once("exit", code => reject(new Error(`La API terminó: ${code}`)));
  });
  const url = `http://127.0.0.1:${puerto}/api`;
  async function peticion(ruta, method = "GET", body, token) {
    const response = await fetch(url + ruta, { method, headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, body: await response.json() };
  }
  const login = await peticion("/login", "POST", { email: "alumno@ejemplo.test", password: "clave123" });
  assert.equal(login.status, 200);
  const token = login.body.accessToken;
  const registro = await peticion("/register", "POST", { name: "Otro", email: "otro@ejemplo.test", password: "clave123" });
  assert.equal(registro.status, 201);
  const otro = registro.body.accessToken;
  assert.equal((await peticion("/cart")).status, 401);
  assert.equal((await peticion("/cart", "GET", undefined, "token-falso")).status, 401);
  assert.deepEqual((await peticion("/cart", "GET", undefined, token)).body.items, []);
  assert.equal((await peticion("/cart/items", "POST", { bookId: "no-existe", quantity: 1 }, token)).status, 404);
  assert.equal((await peticion("/cart/items", "POST", { bookId: "b01", quantity: 0 }, token)).status, 400);
  assert.equal((await peticion("/cart/items", "POST", { bookId: "b01", quantity: 2, userId: 2 }, token)).body.items[0].quantity, 2);
  assert.equal((await peticion("/cart/items", "POST", { bookId: "b01", quantity: 1 }, token)).body.items[0].quantity, 3);
  assert.equal((await peticion("/cart/items", "POST", { bookId: "b01", quantity: 99 }, token)).status, 400);
  assert.deepEqual((await peticion("/cart", "GET", undefined, otro)).body.items, []);
  assert.equal((await peticion("/cart/items/b01", "PATCH", { quantity: 4 }, token)).body.items[0].quantity, 4);
  assert.equal(JSON.parse(fs.readFileSync(db, "utf8")).carts["1"][0].quantity, 4);
  const mezcla = { mergeId: "operacion-1", items: [{ bookId: "b01", quantity: 2 }, { bookId: "b04", quantity: 1 }] };
  const combinado = await peticion("/cart/merge", "POST", mezcla, token);
  assert.equal(combinado.status, 200);
  assert.deepEqual(combinado.body.items.map(item => [item.bookId, item.quantity]), [["b01", 6], ["b04", 1]]);
  assert.deepEqual((await peticion("/cart/merge", "POST", mezcla, token)).body.items.map(item => [item.bookId, item.quantity]), [["b01", 6], ["b04", 1]]);
  assert.equal((await peticion("/cart/merge", "POST", mezcla, otro)).status, 409);
  assert.equal((await peticion("/cart/merge", "POST", { ...mezcla, items: [{ bookId: "b01", quantity: 1 }] }, token)).status, 409);
  assert.equal((await peticion("/cart/merge", "POST", { mergeId: "operacion-2", items: [{ bookId: "b04", quantity: 1 }, { bookId: "b01", quantity: 99 }] }, token)).status, 400);
  assert.deepEqual((await peticion("/cart", "GET", undefined, token)).body.items.map(item => [item.bookId, item.quantity]), [["b01", 6], ["b04", 1]]);
  assert.equal((await peticion("/cart/merge", "POST", { mergeId: "operacion-3", items: [{ bookId: "no-existe", quantity: 1 }] }, token)).status, 404);
  assert.equal((await peticion("/cart/merge", "POST", { mergeId: "operacion-4", items: [{ bookId: "b01", quantity: 1 }, { bookId: "b01", quantity: 1 }] }, token)).status, 400);
  assert.equal(JSON.parse(fs.readFileSync(db, "utf8")).cartMerges["operacion-1"].userId, "1");
  assert.equal((await peticion("/cart/items/b04", "DELETE", undefined, token)).status, 200);
  assert.deepEqual((await peticion("/cart/items/b01", "DELETE", undefined, token)).body.items, []);
});
