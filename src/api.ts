import type { Libro, Pagina } from "./libros.js";

// Dirección de JSON Server en el ordenador del alumno.
const API_URL = "http://localhost:3000/api";

export async function obtenerLibros(page: number, size: number): Promise<Pagina<Libro>> {
  const parametros = new URLSearchParams({ page: String(page), size: String(size) });
  const respuesta = await fetch(`${API_URL}/books?${parametros}`);
  if (!respuesta.ok) throw new Error(`La API respondió con el estado ${respuesta.status}`);
  return respuesta.json() as Promise<Pagina<Libro>>;
}
