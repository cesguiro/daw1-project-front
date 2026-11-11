import { ErrorApi, obtenerPedido } from "./api.js";
import { obtenerToken } from "./sesion.js";
import { dinero, elemento } from "./vista.js";

const estado = document.querySelector<HTMLElement>("#order-status")!;
const acceso = document.querySelector<HTMLElement>("#order-login")!;
const contenido = document.querySelector<HTMLElement>("#order-content")!;
const info = document.querySelector<HTMLElement>("#order-info")!;

async function cargar(): Promise<void> {
  contenido.hidden = true;
  info.hidden = true;
  acceso.hidden = true;
  const token = obtenerToken();
  if (!token) { estado.textContent = "Necesitas iniciar sesión."; acceso.hidden = false; return; }
  const parametros = new URLSearchParams(window.location.search);
  const id = parametros.get("id");
  if (!id) { estado.textContent = "No se ha indicado ningún pedido."; return; }
  try {
    const pedido = await obtenerPedido(token, id);
    document.title = `Pedido #${pedido.id} | Entre páginas`;
    document.querySelector<HTMLElement>("#order-title")!.textContent = `Pedido #${pedido.id}`;
    const fecha = elemento("time");
    fecha.dateTime = pedido.createdAt;
    fecha.textContent = new Intl.DateTimeFormat("es-ES", { dateStyle: "long" }).format(new Date(pedido.createdAt));
    const fechaTexto = elemento("p", "", "Fecha: ");
    fechaTexto.append(fecha);
    info.replaceChildren(fechaTexto, elemento("p", "", `${pedido.itemCount} ${pedido.itemCount === 1 ? "libro" : "libros"}`));
    document.querySelector<HTMLElement>("#order-items")!.replaceChildren(...pedido.items.map(item => {
      const articulo = elemento("article", "order-item");
      const imagen = elemento("img");
      imagen.src = item.coverUrl;
      imagen.alt = `Portada de ${item.title}`;
      imagen.width = 76;
      imagen.height = 110;
      const detalle = elemento("div", "item-content");
      detalle.append(elemento("h3", "", item.title), elemento("p", "", item.author), elemento("p", "", `Cantidad: ${item.quantity} · Precio unitario: ${dinero(item.unitPriceCents)}`), elemento("p", "item-price", `Subtotal: ${dinero(item.subtotalCents)}`));
      articulo.append(imagen, detalle);
      return articulo;
    }));
    document.querySelector<HTMLElement>("#order-count")!.textContent = String(pedido.itemCount);
    document.querySelector<HTMLElement>("#order-total")!.textContent = dinero(pedido.totalCents);
    estado.textContent = parametros.get("confirmado") === "1" ? "Compra simulada confirmada. No se ha realizado ningún pago real." : "";
    info.hidden = false;
    contenido.hidden = false;
  } catch (error) {
    estado.textContent = error instanceof ErrorApi && error.status === 404 ? "Pedido no encontrado." : error instanceof ErrorApi && error.status === 401 ? "La sesión ha caducado. Inicia sesión de nuevo." : "No se ha podido cargar el pedido. Comprueba la conexión.";
    if (error instanceof ErrorApi && error.status === 401) acceso.hidden = false;
  }
}
window.addEventListener("sesion-cerrada", () => void cargar());
void cargar();
