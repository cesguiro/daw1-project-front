import { ErrorApi, obtenerPedidos } from "./api.js";
import { obtenerToken } from "./sesion.js";
import { dinero, elemento } from "./vista.js";

const estado = document.querySelector<HTMLElement>("#orders-status")!;
const acceso = document.querySelector<HTMLElement>("#orders-login")!;
const listado = document.querySelector<HTMLElement>("#orders-list")!;
async function cargar(): Promise<void> {
  listado.replaceChildren();
  acceso.hidden = true;
  const token = obtenerToken();
  if (!token) { estado.textContent = "Necesitas iniciar sesión."; acceso.hidden = false; return; }
  try {
    const pedidos = await obtenerPedidos(token);
    estado.textContent = pedidos.length ? "" : "Todavía no tienes pedidos.";
    listado.replaceChildren(...pedidos.map(pedido => {
      const tarjeta = elemento("article", "panel order-card");
      const datos = elemento("div");
      const fecha = new Intl.DateTimeFormat("es-ES", { dateStyle: "long" }).format(new Date(pedido.createdAt));
      datos.append(elemento("h2", "", `Pedido #${pedido.id}`), elemento("p", "", `${fecha} · ${pedido.itemCount} ${pedido.itemCount === 1 ? "libro" : "libros"} · Total: ${dinero(pedido.totalCents)}`));
      const enlace = elemento("a", "book-detail-link", "Ver detalle ↗");
      enlace.href = `pedido.html?id=${encodeURIComponent(pedido.id)}`;
      tarjeta.append(datos, enlace);
      return tarjeta;
    }));
  } catch (error) {
    estado.textContent = error instanceof ErrorApi && error.status === 401 ? "La sesión ha caducado. Inicia sesión de nuevo." : "No se han podido cargar los pedidos. Comprueba la conexión.";
    if (error instanceof ErrorApi && error.status === 401) acceso.hidden = false;
  }
}
window.addEventListener("sesion-cerrada", () => void cargar());
void cargar();
