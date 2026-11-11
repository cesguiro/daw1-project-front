import { ErrorApi, obtenerLibro, obtenerResenas } from "./api.js";
import { crearPrecio, crearPuntuacion, crearResena } from "./vista.js";

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
    porId("reviews-rating").replaceChildren(crearPuntuacion(libro.averageRating, libro.reviewCount));
    porId("book-detail").hidden = false;
    porId("resenas").hidden = false;
    estado.hidden = true;
    await cargarResenas(id);
  } catch (error) {
    console.error("No se pudo cargar el libro:", error);
    estado.textContent = error instanceof ErrorApi && error.status === 404
      ? "No se ha encontrado el libro. Vuelve al catálogo y selecciona otro."
      : "No se ha podido cargar el libro. Comprueba que JSON Server está en marcha e inténtalo de nuevo.";
  }
}

async function cargarResenas(id: string): Promise<void> {
  const estado = porId<HTMLParagraphElement>("reviews-status");
  const listado = porId<HTMLDivElement>("review-list");
  const boton = porId<HTMLButtonElement>("more-reviews");
  let paginaActual = 0;

  async function cargarSiguiente(): Promise<void> {
    estado.hidden = false;
    estado.textContent = "Cargando reseñas...";
    boton.disabled = true;
    try {
      const resultado = await obtenerResenas(id, paginaActual + 1, 5);
      if (resultado.totalElements === 0) {
        estado.textContent = "Este libro todavía no tiene reseñas.";
        boton.hidden = true;
        return;
      }
      listado.append(...resultado.content.map(crearResena));
      paginaActual = resultado.page;
      boton.hidden = resultado.page >= resultado.totalPages;
      estado.hidden = true;
    } catch (error) {
      console.error("No se pudieron cargar las reseñas:", error);
      estado.textContent = "No se han podido cargar las reseñas. Inténtalo de nuevo.";
      boton.hidden = false;
      boton.textContent = "Reintentar";
    } finally {
      boton.disabled = false;
    }
  }

  boton.addEventListener("click", () => {
    boton.textContent = "Mostrar más reseñas";
    void cargarSiguiente();
  });
  await cargarSiguiente();
}

void cargarDetalle();
