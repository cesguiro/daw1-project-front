import { cambiarCantidad, eliminarDelCarrito, ErrorApi, obtenerCarrito, type Carrito, type LineaCarrito } from "./api.js";
import { obtenerToken } from "./sesion.js";
import { crearPrecio, dinero, elemento } from "./vista.js";

const estado = document.querySelector<HTMLElement>("#cart-status")!;
const contenido = document.querySelector<HTMLElement>("#cart-content")!;
const listado = document.querySelector<HTMLElement>("#cart-items")!;
const cuenta = document.querySelector<HTMLElement>("#cart-count")!;
const total = document.querySelector<HTMLElement>("#cart-total")!;

function mostrar(carrito: Carrito): void {
  contenido.hidden = false;
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
  async function actualizar(operacion: (token: string) => Promise<Carrito>): Promise<void> {
    const token = obtenerToken();
    if (!token) { estado.textContent = "Inicia sesión para consultar tu carrito."; return; }
    cantidad.disabled = true;
    eliminar.disabled = true;
    try { mostrar(await operacion(token)); }
    catch (error) {
      estado.textContent = error instanceof ErrorApi && error.status === 401 ? "La sesión ha caducado. Inicia sesión de nuevo." : "No se ha podido actualizar el carrito. Inténtalo de nuevo.";
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
    void actualizar(token => cambiarCantidad(token, linea.bookId, valor));
  });
  eliminar.addEventListener("click", () => void actualizar(token => eliminarDelCarrito(token, linea.bookId)));
  controles.append(etiqueta, eliminar);
  detalle.append(controles);
  articulo.append(detalle);
  return articulo;
}

async function cargar(): Promise<void> {
  const token = obtenerToken();
  if (!token) { estado.textContent = "Inicia sesión para consultar tu carrito."; return; }
  try { mostrar(await obtenerCarrito(token)); }
  catch (error) {
    estado.textContent = error instanceof ErrorApi && error.status === 401 ? "La sesión ha caducado. Inicia sesión de nuevo." : "No se ha podido cargar el carrito. Comprueba la conexión.";
  }
}
void cargar();
