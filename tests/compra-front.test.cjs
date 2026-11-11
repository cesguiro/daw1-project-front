const { test } = require("node:test");
const assert = require("node:assert/strict");

test("front de compra: rechazos y recuperación tras respuesta perdida", async () => {
  function almacenamiento() {
    const datos = new Map();
    return { getItem: clave => datos.get(clave) ?? null, setItem: (clave, valor) => datos.set(clave, String(valor)), removeItem: clave => datos.delete(clave) };
  }
  function nodo() {
    return { hidden: false, disabled: false, textContent: "", value: "", hijos: [], eventos: {}, addEventListener(tipo, fn) { this.eventos[tipo] = fn; }, append(...hijos) { this.hijos.push(...hijos); }, replaceChildren(...hijos) { this.hijos = hijos; }, reset() { this.reiniciado = true; } };
  }
  const ids = ["checkout-status", "checkout-content", "checkout-login", "checkout-summary", "checkout-form", "checkout-fields", "checkout-submit", "checkout-retry", "card-name", "card-number", "card-expiry", "card-cvv"];
  const nodos = Object.fromEntries(ids.map(id => [id, nodo()]));
  globalThis.document = { querySelector: selector => nodos[selector.slice(1)], createElement: nodo };
  globalThis.window = { location: { href: "compra.html", search: "" }, addEventListener() {} };
  globalThis.localStorage = almacenamiento();
  globalThis.sessionStorage = almacenamiento();
  sessionStorage.setItem("entre-paginas.accessToken", "token");
  sessionStorage.setItem("entre-paginas.userId", "1");
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { locks: { request: async (_clave, tarea) => tarea() } } });
  let pedido;
  let envios = 0;
  const libro = { id: "b01", title: "Libro", finalPriceCents: 1196 };
  globalThis.fetch = async (url, opciones = {}) => {
    const ruta = new URL(url).pathname;
    const respuesta = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
    if (ruta === "/api/cart") return respuesta({ items: [{ bookId: "b01", quantity: 1, book: libro }] });
    if (ruta.startsWith("/api/orders/by-request/")) return pedido ? respuesta(pedido) : respuesta({}, 404);
    if (ruta === "/api/orders") {
      envios++;
      const datos = JSON.parse(opciones.body);
      if (datos.payment.number === "4000000000000002") return respuesta({ error: { code: "CARD_DECLINED" } }, 402);
      pedido = { id: "pedido-prueba" };
      throw new TypeError("respuesta perdida");
    }
    throw new Error(`Petición inesperada: ${ruta}`);
  };
  await import("../js/compra.js");
  for (let n = 0; nodos["checkout-content"].hidden && n < 20; n++) await new Promise(resolve => setImmediate(resolve));
  assert.equal(nodos["checkout-content"].hidden, false);
  nodos["card-name"].value = "Nombre privado";
  nodos["card-number"].value = "1234567890123456";
  nodos["card-expiry"].value = "12/99";
  nodos["card-cvv"].value = "987";
  const enviar = () => nodos["checkout-form"].eventos.submit({ preventDefault() {} });
  await enviar();
  assert.equal(envios, 0); // No se envían números que no sean de prueba.
  nodos["card-number"].value = "4000 0000 0000 0002";
  await enviar();
  assert.match(nodos["checkout-status"].textContent, /rechazada/);
  assert.equal(sessionStorage.getItem("entre-paginas.pedidoPendiente"), null);
  nodos["card-number"].value = "4242 4242 4242 4242";
  await enviar();
  const pendiente = sessionStorage.getItem("entre-paginas.pedidoPendiente");
  assert.ok(pendiente);
  for (const dato of ["Nombre privado", "4242424242424242", "987", "12/99"]) assert.equal(pendiente.includes(dato), false);
  assert.equal(nodos["checkout-retry"].hidden, false);
  nodos["checkout-retry"].eventos.click();
  for (let n = 0; !window.location.href.includes("pedido.html") && n < 20; n++) await new Promise(resolve => setImmediate(resolve));
  assert.equal(window.location.href, "pedido.html?id=pedido-prueba&confirmado=1");
  assert.equal(sessionStorage.getItem("entre-paginas.pedidoPendiente"), null);
  assert.equal(envios, 2);
});
