import type { Libro, Pagina, Resena } from "./libros.js";

// Dirección de JSON Server en el ordenador del alumno.
const API_URL = "http://localhost:3000/api";

export class ErrorApi extends Error {
  constructor(public status: number) {
    super(`La API respondió con el estado ${status}`);
  }
}

export interface RespuestaAcceso {
  accessToken: string;
}

export async function iniciarSesion(email: string, password: string): Promise<RespuestaAcceso> {
  const respuesta = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!respuesta.ok) throw new ErrorApi(respuesta.status);
  const resultado = await respuesta.json() as RespuestaAcceso;
  if (typeof resultado.accessToken !== "string" || !resultado.accessToken) throw new Error("La API no ha devuelto un token válido");
  return resultado;
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
