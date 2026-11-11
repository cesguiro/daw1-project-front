import { ErrorApi, type Carrito, type LineaCarrito } from "./api.js";
import { obtenerToken } from "./sesion.js";
import { crearPrecio, dinero, elemento } from "./vista.js";
import { consultar, modificar } from "./gestion-carrito.js";

const estado = document.querySelector<HTMLElement>("#cart-status")!;
const contenido = document.querySelector<HTMLElement>("#cart-content")!;
const listado = document.querySelector<HTMLElement>("#cart-items")!;
const cuenta = document.querySelector<HTMLElement>("#cart-count")!;
const total = document.querySelector<HTMLElement>("#cart-total")!;
const acceso = document.querySelector<HTMLElement>("#cart-login")!;

function mostrar(carrito: Carrito): void {
  contenido.hidden = false;
  acceso.hidden = Boolean(obtenerToken()) || carrito.items.length === 0;
  estado.textContent = carrito.items.length ? "" : "Tu carrito está vacío.";
  listado.replaceChildren(...carrito.items.map(crearLinea));
  cuenta.textContent = String(carrito.items.reduce((suma, linea) => suma + linea.quantity, 0));
  const disponibles = carrito.items.every(linea => linea.book !== null);
  total.textContent = disponibles ? dinero(carrito.items.reduce((suma, linea) => suma + linea.quantity * (linea.book?.finalPriceCents || 0), 0)) : "No disponible";
}

function crearLinea(linea: LineaCarrito): HTMLElement {
  const articulo = elemento("article", "order-item");
  const detalle = elemento("div", "item-content");
  if (linea.book) {
    const imagen = elemento("img");
    imagen.src = linea.book.coverUrl;
    imagen.alt = `Portada de ${linea.book.title}`;
    imagen.width = 76;
    imagen.height = 110;
    articulo.append(imagen);
    detalle.append(elemento("h3", "", linea.book.title), elemento("p", "", linea.book.author), crearPrecio(linea.book, "item-price"));
  } else detalle.append(elemento("h3", "", "Libro no disponible"), elemento("p", "", `Identificador: ${linea.bookId}`));
  const controles = elemento("div", "item-controls");
  const etiqueta = elemento("label", "", "Cantidad");
  const cantidad = elemento("input");
  cantidad.type = "number";
  cantidad.min = "1";
  cantidad.max = "99";
  cantidad.value = String(linea.quantity);
  etiqueta.append(cantidad);
  const eliminar = elemento("button", "", "Eliminar");
  eliminar.type = "button";
  async function actualizar(operacion: () => Promise<Carrito>): Promise<void> {
    cantidad.disabled = true;
    eliminar.disabled = true;
    try { mostrar(await operacion()); }
    catch (error) {
      estado.textContent = error instanceof ErrorApi && error.status === 401 ? "La sesión ha caducado. Inicia sesión de nuevo." : error instanceof Error && !(error instanceof ErrorApi) ? error.message : "No se ha podido actualizar el carrito. Inténtalo de nuevo.";
      cantidad.value = String(linea.quantity);
    } finally { cantidad.disabled = false; eliminar.disabled = false; }
  }
  cantidad.addEventListener("change", () => {
    const valor = cantidad.valueAsNumber;
    if (!Number.isInteger(valor) || valor < 1 || valor > 99) {
      estado.textContent = "La cantidad debe ser un entero entre 1 y 99.";
      cantidad.value = String(linea.quantity);
      return;
    }
    void actualizar(() => modificar(linea.bookId, valor));
  });
  eliminar.addEventListener("click", () => void actualizar(() => modificar(linea.bookId, null)));
  controles.append(etiqueta, eliminar);
  detalle.append(controles);
  articulo.append(detalle);
  return articulo;
}

async function cargar(): Promise<void> {
  try { mostrar(await consultar()); }
  catch (error) {
    estado.textContent = error instanceof ErrorApi && error.status === 401 ? "La sesión ha caducado. Inicia sesión de nuevo." : error instanceof Error && !(error instanceof ErrorApi) ? error.message : "No se ha podido cargar el carrito. Comprueba la conexión.";
  }
}
window.addEventListener("storage", evento => { if (evento.key === "entre-paginas.carritoInvitado") void cargar(); });
window.addEventListener("sesion-cerrada", () => { contenido.hidden = true; void cargar(); });
void cargar();
