import { ErrorApi, obtenerLibro } from "./api.js";
import { crearPrecio, crearPuntuacion } from "./vista.js";

function porId<T extends HTMLElement>(id: string): T {
  const resultado = document.getElementById(id);
  if (!resultado) throw new Error(`No existe el elemento ${id}`);
  return resultado as T;
}

async function cargarDetalle(): Promise<void> {
  const estado = porId<HTMLParagraphElement>("book-status");
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) {
    estado.textContent = "No se ha indicado ningún libro. Vuelve al catálogo y selecciona uno.";
    return;
  }
  try {
    const libro = await obtenerLibro(id);
    document.title = `${libro.title} | Entre páginas`;
    const portada = porId<HTMLImageElement>("book-cover");
    portada.src = libro.coverUrl;
    portada.alt = `Portada de ${libro.title}`;
    porId("book-category").textContent = libro.category;
    porId("book-title").textContent = libro.title;
    porId("book-author").textContent = `de ${libro.author}`;
    porId("book-metadata-author").textContent = libro.author;
    porId("book-description").textContent = libro.description;
    porId("book-price").replaceChildren(crearPrecio(libro, "detail-price"));
    porId("book-rating").replaceChildren(crearPuntuacion(libro.averageRating, libro.reviewCount));
    porId("book-detail").hidden = false;
    // Las reseñas de la maqueta pertenecen únicamente al primer libro.
    porId(id === "b01" ? "resenas" : "reviews-placeholder").hidden = false;
    estado.hidden = true;
  } catch (error) {
    console.error("No se pudo cargar el libro:", error);
    estado.textContent = error instanceof ErrorApi && error.status === 404
      ? "No se ha encontrado el libro. Vuelve al catálogo y selecciona otro."
      : "No se ha podido cargar el libro. Comprueba que JSON Server está en marcha e inténtalo de nuevo.";
  }
}

void cargarDetalle();
