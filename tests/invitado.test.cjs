const { test } = require("node:test");
const assert = require("node:assert/strict");

test("invitado: registro, combinación y reintento sin duplicados", async () => {
  function almacenamiento() {
    const datos = new Map();
    return { getItem: clave => datos.get(clave) ?? null, setItem: (clave, valor) => datos.set(clave, String(valor)), removeItem: clave => datos.delete(clave) };
  }
  globalThis.localStorage = almacenamiento();
  globalThis.sessionStorage = almacenamiento();
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { locks: { request: async (_clave, tarea) => tarea() } } });
  const libros = { b01: { id: "b01", finalPriceCents: 100 }, b04: { id: "b04", finalPriceCents: 200 } };
  const cuenta = new Map([["b01", 2]]);
  const operaciones = new Map();
  let perderRespuesta = true;
  globalThis.fetch = async (url, opciones = {}) => {
    const ruta = new URL(url).pathname;
    const respuesta = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
    if (ruta.startsWith("/api/books/")) return libros[ruta.split("/").pop()] ? respuesta(libros[ruta.split("/").pop()]) : respuesta({}, 404);
    if (ruta === "/api/cart/merge") {
      const datos = JSON.parse(opciones.body);
      if (!operaciones.has(datos.mergeId)) {
        if (datos.items.some(item => (cuenta.get(item.bookId) || 0) + item.quantity > 99)) return respuesta({}, 400);
        for (const item of datos.items) cuenta.set(item.bookId, (cuenta.get(item.bookId) || 0) + item.quantity);
        operaciones.set(datos.mergeId, datos.items);
      }
      if (perderRespuesta) { perderRespuesta = false; throw new Error("conexión perdida después de aplicar"); }
      return respuesta({ items: [] });
    }
    if (ruta === "/api/cart") return respuesta({ items: [...cuenta].map(([bookId, quantity]) => ({ bookId, quantity, book: libros[bookId] })) });
    throw new Error(`Petición inesperada: ${ruta}`);
  };
  const carrito = await import("../js/gestion-carrito.js");
  await carrito.anadir("b01");
  await carrito.anadir("b01");
  await carrito.anadir("b04");
  assert.deepEqual((await carrito.consultar()).items.map(item => item.quantity), [2, 1]);
  await carrito.modificar("b04", 3);
  // El registro no modifica localStorage; el login establece la sesión después.
  sessionStorage.setItem("entre-paginas.accessToken", "token");
  sessionStorage.setItem("entre-paginas.userId", "1");
  await assert.rejects(carrito.sincronizarInvitado("token", "1"), /reintentar/);
  assert.equal(cuenta.get("b01"), 4);
  assert.equal(cuenta.get("b04"), 3);
  await assert.rejects(carrito.sincronizarInvitado("otro-token", "2"), /otra cuenta/);
  await carrito.sincronizarInvitado("token", "1");
  assert.equal(cuenta.get("b01"), 4);
  assert.equal(operaciones.size, 1);
  assert.deepEqual(JSON.parse(localStorage.getItem("entre-paginas.carritoInvitado")), { items: [] });
  assert.deepEqual((await carrito.consultar()).items.map(item => item.quantity), [4, 3]);

  sessionStorage.removeItem("entre-paginas.accessToken");
  sessionStorage.removeItem("entre-paginas.userId");
  await carrito.anadir("b01");
  cuenta.set("b01", 99);
  sessionStorage.setItem("entre-paginas.accessToken", "token");
  sessionStorage.setItem("entre-paginas.userId", "1");
  await assert.rejects(carrito.sincronizarInvitado("token", "1"), /supere 99/);
  sessionStorage.removeItem("entre-paginas.accessToken");
  assert.equal((await carrito.consultar()).items[0].quantity, 1);
  assert.deepEqual((await carrito.modificar("b01", null)).items, []);
});
