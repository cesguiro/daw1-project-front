import type { Libro, Pagina, Resena } from "./libros.js";

// Dirección de JSON Server en el ordenador del alumno.
const API_URL = "http://localhost:3000/api";

export class ErrorApi extends Error {
  constructor(public status: number, public code?: string) {
    super(`La API respondió con el estado ${status}`);
  }
}

export interface RespuestaAcceso {
  accessToken: string;
  user: { id: number | string };
}

export interface LineaCarrito {
  bookId: string;
  quantity: number;
  book: Libro | null;
}

export interface Carrito { items: LineaCarrito[]; }
export interface LineaLocal { bookId: string; quantity: number; }
export interface LineaPedidoSolicitud extends LineaLocal { expectedPriceCents: number; }
export interface PagoFicticio { name: string; number: string; expiry: string; cvv: string; }
export interface ResumenPedido { id: string; createdAt: string; itemCount: number; totalCents: number; }
export interface Pedido extends ResumenPedido {
  items: { bookId: string; title: string; author: string; coverUrl: string; quantity: number; unitPriceCents: number; subtotalCents: number }[];
}

async function peticionPedidos<T>(token: string, ruta = "", datos?: object): Promise<T> {
  const respuesta = await fetch(`${API_URL}/orders${ruta}`, {
    method: datos ? "POST" : "GET",
    headers: { Authorization: `Bearer ${token}`, ...(datos ? { "Content-Type": "application/json" } : {}) },
    ...(datos ? { body: JSON.stringify(datos) } : {})
  });
  if (!respuesta.ok) {
    let code: string | undefined;
    try { code = ((await respuesta.json()) as { error?: { code?: string } }).error?.code; } catch { /* La API puede no devolver JSON. */ }
    throw new ErrorApi(respuesta.status, code);
  }
  return respuesta.json() as Promise<T>;
}
export function crearPedido(token: string, requestId: string, items: LineaPedidoSolicitud[], payment: PagoFicticio): Promise<Pedido> {
  return peticionPedidos(token, "", { requestId, items, payment });
}
export function obtenerPedidoPorSolicitud(token: string, requestId: string): Promise<Pedido> {
  return peticionPedidos(token, `/by-request/${encodeURIComponent(requestId)}`);
}
export function obtenerPedido(token: string, id: string): Promise<Pedido> { return peticionPedidos(token, `/${encodeURIComponent(id)}`); }
export function obtenerPedidos(token: string): Promise<ResumenPedido[]> { return peticionPedidos(token); }

async function peticionCarrito(token: string, ruta = "", method = "GET", datos?: object): Promise<Carrito> {
  const respuesta = await fetch(`${API_URL}/cart${ruta}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(datos ? { "Content-Type": "application/json" } : {}) },
    ...(datos ? { body: JSON.stringify(datos) } : {})
  });
  if (!respuesta.ok) throw new ErrorApi(respuesta.status);
  return respuesta.json() as Promise<Carrito>;
}

export function obtenerCarrito(token: string): Promise<Carrito> { return peticionCarrito(token); }
export function anadirAlCarrito(token: string, bookId: string, quantity = 1): Promise<Carrito> {
  return peticionCarrito(token, "/items", "POST", { bookId, quantity });
}
export function cambiarCantidad(token: string, bookId: string, quantity: number): Promise<Carrito> {
  return peticionCarrito(token, `/items/${encodeURIComponent(bookId)}`, "PATCH", { quantity });
}
export function eliminarDelCarrito(token: string, bookId: string): Promise<Carrito> {
  return peticionCarrito(token, `/items/${encodeURIComponent(bookId)}`, "DELETE");
}
export function combinarCarrito(token: string, mergeId: string, items: LineaLocal[]): Promise<Carrito> {
  return peticionCarrito(token, "/merge", "POST", { mergeId, items });
}

async function autenticar(ruta: string, datos: object): Promise<RespuestaAcceso> {
  const respuesta = await fetch(`${API_URL}${ruta}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos)
  });
  if (!respuesta.ok) throw new ErrorApi(respuesta.status);
  const resultado = await respuesta.json() as RespuestaAcceso;
  if (typeof resultado.accessToken !== "string" || !resultado.accessToken) throw new Error("La API no ha devuelto un token válido");
  return resultado;
}

export function iniciarSesion(email: string, password: string): Promise<RespuestaAcceso> {
  return autenticar("/login", { email, password });
}

export function registrarUsuario(name: string, email: string, password: string): Promise<RespuestaAcceso> {
  return autenticar("/register", { name, email, password });
}

export async function comprobarSesion(token: string): Promise<boolean> {
  const respuesta = await fetch(`${API_URL}/session`, { headers: { Authorization: `Bearer ${token}` } });
  if (respuesta.status === 401) return false;
  if (!respuesta.ok) throw new ErrorApi(respuesta.status);
  return true;
}

export async function obtenerLibros(page: number, size: number): Promise<Pagina<Libro>> {
  const parametros = new URLSearchParams({ page: String(page), size: String(size) });
  const respuesta = await fetch(`${API_URL}/books?${parametros}`);
  if (!respuesta.ok) throw new ErrorApi(respuesta.status);
  return respuesta.json() as Promise<Pagina<Libro>>;
}

export async function obtenerLibro(id: string): Promise<Libro> {
  const respuesta = await fetch(`${API_URL}/books/${encodeURIComponent(id)}`);
  if (!respuesta.ok) throw new ErrorApi(respuesta.status);
  return respuesta.json() as Promise<Libro>;
}

export async function obtenerResenas(id: string, page: number, size: number): Promise<Pagina<Resena>> {
  const parametros = new URLSearchParams({ page: String(page), size: String(size) });
  const respuesta = await fetch(`${API_URL}/books/${encodeURIComponent(id)}/reviews?${parametros}`);
  if (!respuesta.ok) throw new ErrorApi(respuesta.status);
  return respuesta.json() as Promise<Pagina<Resena>>;
}
