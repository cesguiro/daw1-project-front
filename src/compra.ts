import { crearPedido, ErrorApi, obtenerPedidoPorSolicitud, type LineaPedidoSolicitud, type PagoFicticio } from "./api.js";
import { consultar } from "./gestion-carrito.js";
import { obtenerToken, obtenerUsuario } from "./sesion.js";
import { dinero, elemento } from "./vista.js";

const CLAVE = "entre-paginas.pedidoPendiente";
interface Pendiente { requestId: string; userId: string; items: LineaPedidoSolicitud[]; }
const estado = document.querySelector<HTMLElement>("#checkout-status")!;
const contenido = document.querySelector<HTMLElement>("#checkout-content")!;
const acceso = document.querySelector<HTMLElement>("#checkout-login")!;
const resumen = document.querySelector<HTMLDListElement>("#checkout-summary")!;
const formulario = document.querySelector<HTMLFormElement>("#checkout-form")!;
const campos = document.querySelector<HTMLFieldSetElement>("#checkout-fields")!;
const boton = document.querySelector<HTMLButtonElement>("#checkout-submit")!;
const reintentar = document.querySelector<HTMLButtonElement>("#checkout-retry")!;
let lineas: LineaPedidoSolicitud[] = [];
let pendiente: Pendiente | null = null;

function fallo(mensaje: string, comprobar = false): void {
  estado.textContent = mensaje;
  contenido.hidden = true;
  reintentar.hidden = !comprobar;
}
function irAlPedido(id: string): void {
  sessionStorage.removeItem(CLAVE);
  formulario.reset();
  window.location.href = `pedido.html?id=${encodeURIComponent(id)}&confirmado=1`;
}
function leerPendiente(): Pendiente | null {
  const texto = sessionStorage.getItem(CLAVE);
  if (!texto) return null;
  const valor = JSON.parse(texto) as Pendiente;
  if (!valor || typeof valor.requestId !== "string" || typeof valor.userId !== "string" || !Array.isArray(valor.items)) throw new Error("No se puede leer el pedido pendiente.");
  return valor;
}
function mismaCompra(a: LineaPedidoSolicitud[], b: LineaPedidoSolicitud[]): boolean {
  return a.length === b.length && a.every(item => b.some(otro => otro.bookId === item.bookId && otro.quantity === item.quantity && otro.expectedPriceCents === item.expectedPriceCents));
}
async function cargar(): Promise<void> {
  contenido.hidden = true;
  acceso.hidden = true;
  reintentar.hidden = true;
  estado.textContent = "Cargando compra...";
  const token = obtenerToken();
  const userId = obtenerUsuario();
  if (!token || !userId) {
    estado.textContent = "Necesitas iniciar sesión para confirmar la compra.";
    acceso.hidden = false;
    return;
  }
  try {
    pendiente = leerPendiente();
    if (pendiente && pendiente.userId !== userId) {
      fallo("Hay una compra pendiente de otra cuenta. Inicia sesión con esa cuenta para comprobarla.");
      return;
    }
    if (pendiente) {
      try { irAlPedido((await obtenerPedidoPorSolicitud(token, pendiente.requestId)).id); return; }
      catch (error) { if (!(error instanceof ErrorApi && error.status === 404)) throw error; }
    }
    const carrito = await consultar();
    if (!carrito.items.length) { fallo("Tu carrito está vacío. Añade algún libro antes de comprar."); return; }
    if (carrito.items.some(item => !item.book)) { fallo("Hay libros no disponibles. Elimínalos del carrito para continuar."); return; }
    lineas = carrito.items.map(item => ({ bookId: item.bookId, quantity: item.quantity, expectedPriceCents: item.book!.finalPriceCents }));
    if (pendiente && !mismaCompra(pendiente.items, lineas)) {
      // La consulta anterior confirmó que no se creó el pedido en esta simulación.
      sessionStorage.removeItem(CLAVE);
      pendiente = null;
    }
    const nodos = carrito.items.map(item => {
      const fila = elemento("div");
      fila.append(elemento("dt", "", `${item.book!.title} × ${item.quantity}`), elemento("dd", "", dinero(item.book!.finalPriceCents * item.quantity)));
      return fila;
    });
    const total = elemento("div", "summary-total");
    total.append(elemento("dt", "", "Total"), elemento("dd", "", dinero(lineas.reduce((suma, item) => suma + item.expectedPriceCents * item.quantity, 0))));
    resumen.replaceChildren(...nodos, total);
    estado.textContent = "Revisa el pedido y utiliza únicamente datos ficticios.";
    contenido.hidden = false;
    campos.disabled = false;
    boton.disabled = false;
  } catch (error) {
    if (error instanceof ErrorApi && error.status === 401) {
      fallo("La sesión ha caducado. Inicia sesión para continuar.");
      acceso.hidden = false;
    } else fallo("No se ha podido comprobar la compra. Inténtalo de nuevo; si había un pedido pendiente, se conserva.", true);
  }
}

function leerPago(): PagoFicticio | null {
  const name = document.querySelector<HTMLInputElement>("#card-name")!.value.trim();
  const numero = document.querySelector<HTMLInputElement>("#card-number")!.value.trim();
  const expiry = document.querySelector<HTMLInputElement>("#card-expiry")!.value.trim();
  const cvv = document.querySelector<HTMLInputElement>("#card-cvv")!.value.trim();
  if (!name || name.length > 100 || !/^[\d -]+$/.test(numero)) return null;
  const number = numero.replace(/[ -]/g, "");
  if (!["4242424242424242", "4000000000000002", "4000000000009995"].includes(number) || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry) || !/^\d{3}$/.test(cvv)) return null;
  const [mes, ano] = expiry.split("/").map(Number);
  const ahora = new Date();
  if (2000 + ano < ahora.getFullYear() || (2000 + ano === ahora.getFullYear() && mes < ahora.getMonth() + 1)) return null;
  return { name, number, expiry, cvv };
}
formulario.addEventListener("submit", async evento => {
  evento.preventDefault();
  const token = obtenerToken();
  const userId = obtenerUsuario();
  if (!token || !userId) { fallo("Inicia sesión para continuar."); acceso.hidden = false; return; }
  const pago = leerPago();
  if (!pago) { estado.textContent = "Usa uno de los números de prueba indicados y revisa el nombre, la fecha futura MM/AA y los 3 dígitos del código ficticio."; return; }
  campos.disabled = true;
  boton.disabled = true;
  estado.textContent = "Confirmando compra simulada...";
  try {
    pendiente ??= { requestId: crypto.randomUUID(), userId, items: lineas };
    sessionStorage.setItem(CLAVE, JSON.stringify(pendiente)); // Nunca se guardan los datos de tarjeta.
    const pedido = await crearPedido(token, pendiente.requestId, pendiente.items, pago);
    irAlPedido(pedido.id);
  } catch (error) {
    if (error instanceof ErrorApi && [400, 402, 409].includes(error.status)) {
      sessionStorage.removeItem(CLAVE);
      pendiente = null;
      if (error.status === 409) {
        fallo("El carrito o los precios han cambiado. Comprueba el resumen antes de volver a intentarlo.", true);
      } else {
        estado.textContent = error.code === "CARD_DECLINED" ? "La tarjeta ficticia ha sido rechazada." : error.code === "ACCOUNT_NOT_FOUND" ? "No existe una cuenta ficticia para esa tarjeta." : "Los datos de tarjeta ficticia no son válidos.";
        campos.disabled = false;
        boton.disabled = false;
      }
    } else if (error instanceof ErrorApi && error.status === 401) {
      fallo("La sesión ha caducado. Inicia sesión y comprueba el resultado antes de reintentar.");
      acceso.hidden = false;
    } else fallo("No se ha podido confirmar el resultado. Compruébalo antes de volver a enviar el pedido.", true);
  }
});
reintentar.addEventListener("click", () => void cargar());
window.addEventListener("sesion-cerrada", () => { formulario.reset(); void cargar(); });
void cargar();
