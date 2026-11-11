import { anadirAlCarrito, cambiarCantidad, combinarCarrito, eliminarDelCarrito, ErrorApi, obtenerCarrito, obtenerLibro, type Carrito, type LineaLocal } from "./api.js";
import { obtenerToken, obtenerUsuario } from "./sesion.js";

const CLAVE = "entre-paginas.carritoInvitado";
interface Pendiente { id: string; userId: string; items: LineaLocal[]; }
interface Almacen { items: LineaLocal[]; pendiente?: Pendiente; }

// Web Locks serializa también las pestañas para no editar una combinación en curso.
let cola: Promise<unknown> = Promise.resolve();
async function exclusivo<T>(operacion: () => Promise<T>): Promise<T> {
  if (navigator.locks) return navigator.locks.request(CLAVE, operacion);
  const resultado = cola.then(operacion, operacion);
  cola = resultado.catch(() => undefined);
  return resultado;
}
function leer(): Almacen {
  const texto = localStorage.getItem(CLAVE);
  if (!texto) return { items: [] };
  const datos: unknown = JSON.parse(texto);
  if (!datos || typeof datos !== "object" || !Array.isArray((datos as Almacen).items)) throw new Error("El carrito local no se puede leer.");
  const almacen = datos as Almacen;
  const validas = (items: LineaLocal[]) => items.length <= 100 && items.every(item => item && typeof item.bookId === "string" && item.bookId.length > 0 && Number.isInteger(item.quantity) && item.quantity >= 1 && item.quantity <= 99) && new Set(items.map(item => item.bookId)).size === items.length;
  if (!validas(almacen.items) || (almacen.pendiente && (typeof almacen.pendiente.id !== "string" || typeof almacen.pendiente.userId !== "string" || !Array.isArray(almacen.pendiente.items) || !validas(almacen.pendiente.items)))) throw new Error("El carrito local contiene datos inválidos.");
  return almacen;
}
function guardar(almacen: Almacen): void { localStorage.setItem(CLAVE, JSON.stringify(almacen)); }
function comprobarPendiente(almacen: Almacen): void {
  if (almacen.pendiente) throw new Error("Hay una combinación pendiente. Inicia sesión con la misma cuenta para reintentarla.");
}
async function sincronizarSinBloqueo(token: string, userId: string | null): Promise<boolean> {
  const almacen = leer();
  if (!almacen.pendiente && !almacen.items.length) return false;
  if (!userId) throw new Error("Inicia sesión de nuevo para combinar el carrito de invitado.");
  if (almacen.pendiente && almacen.pendiente.userId !== userId) throw new Error("El carrito tiene una combinación pendiente con otra cuenta. Inicia sesión con esa cuenta para recuperarlo.");
  if (!almacen.pendiente) {
    almacen.pendiente = { id: crypto.randomUUID(), userId, items: almacen.items };
    almacen.items = [];
    guardar(almacen); // Guardar el identificador antes de enviar permite reintentar sin duplicar.
  }
  try {
    await combinarCarrito(token, almacen.pendiente.id, almacen.pendiente.items);
  } catch (error) {
    // Estos errores son respuestas definitivas anteriores a cualquier escritura.
    if (error instanceof ErrorApi && (error.status === 400 || error.status === 404)) {
      almacen.items = almacen.pendiente.items;
      delete almacen.pendiente;
      guardar(almacen);
      throw new Error("No se ha podido combinar el carrito: comprueba los libros y que ninguna cantidad sumada supere 99. Cierra sesión para editar el carrito de invitado.");
    }
    throw new Error("No se ha podido combinar el carrito. Se conserva para reintentar con esta cuenta.");
  }
  delete almacen.pendiente;
  guardar(almacen);
  return true;
}
export function sincronizarInvitado(token: string, userId: string): Promise<boolean> {
  return exclusivo(() => sincronizarSinBloqueo(token, userId));
}
async function carritoLocal(almacen: Almacen): Promise<Carrito> {
  comprobarPendiente(almacen);
  const items = await Promise.all(almacen.items.map(async linea => {
    try { return { ...linea, book: await obtenerLibro(linea.bookId) }; }
    catch (error) { if (error instanceof ErrorApi && error.status === 404) return { ...linea, book: null }; throw error; }
  }));
  return { items };
}
export function consultar(): Promise<Carrito> {
  return exclusivo(async () => {
    const token = obtenerToken();
    if (!token) return carritoLocal(leer());
    await sincronizarSinBloqueo(token, obtenerUsuario());
    return obtenerCarrito(token);
  });
}
export function anadir(bookId: string): Promise<void> {
  return exclusivo(async () => {
    const token = obtenerToken();
    if (token) {
      await sincronizarSinBloqueo(token, obtenerUsuario());
      await anadirAlCarrito(token, bookId);
      return;
    }
    const almacen = leer();
    comprobarPendiente(almacen);
    const linea = almacen.items.find(item => item.bookId === bookId);
    if (linea) {
      if (linea.quantity >= 99) throw new Error("La cantidad no puede superar 99.");
      linea.quantity++;
    } else {
      if (almacen.items.length >= 100) throw new Error("El carrito no puede contener más de 100 libros distintos.");
      almacen.items.push({ bookId, quantity: 1 });
    }
    guardar(almacen);
  });
}
export function modificar(bookId: string, quantity: number | null): Promise<Carrito> {
  return exclusivo(async () => {
    const token = obtenerToken();
    if (token) {
      await sincronizarSinBloqueo(token, obtenerUsuario());
      return quantity === null ? eliminarDelCarrito(token, bookId) : cambiarCantidad(token, bookId, quantity);
    }
    const almacen = leer();
    comprobarPendiente(almacen);
    const linea = almacen.items.find(item => item.bookId === bookId);
    if (!linea) throw new Error("La línea ya no existe. Actualiza el carrito.");
    if (quantity === null) almacen.items = almacen.items.filter(item => item.bookId !== bookId);
    else {
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new Error("La cantidad debe estar entre 1 y 99.");
      linea.quantity = quantity;
    }
    guardar(almacen);
    return carritoLocal(almacen);
  });
}
