import { obtenerLibros } from "./api.js";
import type { Libro } from "./libros.js";
import { crearPrecio, crearPuntuacion, elemento } from "./vista.js";

function crearTarjeta(libro: Libro): HTMLElement {
  const articulo = elemento("article", "book-card");
  const portada = elemento("div", "book-cover");
  const imagen = elemento("img");
  imagen.src = libro.coverUrl;
  imagen.alt = `Portada de ${libro.title}`;
  imagen.width = 240;
  imagen.height = 360;
  imagen.loading = "lazy";
  portada.append(imagen);

  const informacion = elemento("div", "book-info");
  const titulo = elemento("h3");
  const ruta = `libro.html?id=${encodeURIComponent(libro.id)}`;
  const enlaceTitulo = elemento("a", "", libro.title);
  enlaceTitulo.href = ruta;
  titulo.append(enlaceTitulo);
  informacion.append(elemento("p", "book-category", libro.category), titulo,
    elemento("p", "book-author", libro.author), crearPuntuacion(libro.averageRating, libro.reviewCount),
    crearPrecio(libro, "book-price"));

  const enlacePortada = elemento("a", "cover-link");
  enlacePortada.href = ruta;
  enlacePortada.setAttribute("aria-label", `Ver detalle de ${libro.title}`);
  enlacePortada.append(portada);
  articulo.append(enlacePortada);
  const enlace = elemento("a", "book-detail-link", "Ver detalle ↗");
  enlace.href = ruta;
  enlace.setAttribute("aria-label", `Ver detalle de ${libro.title}`);
  informacion.append(enlace);
  articulo.append(informacion);
  return articulo;
}

const listado = document.querySelector<HTMLElement>("#book-grid")!;
const estado = document.querySelector<HTMLElement>("#catalog-status")!;
const paginacion = document.querySelector<HTMLElement>("#pagination")!;
const anterior = document.querySelector<HTMLButtonElement>("#previous-page")!;
const siguiente = document.querySelector<HTMLButtonElement>("#next-page")!;
const informacion = document.querySelector<HTMLElement>("#page-info")!;
let paginaActual = 1;

async function cargarPagina(pagina: number): Promise<void> {
  estado.hidden = false;
  estado.textContent = "Cargando libros...";
  listado.hidden = true;
  paginacion.hidden = true;
  try {
    const resultado = await obtenerLibros(pagina, 6);
    if (resultado.totalElements === 0) {
      estado.textContent = "No hay libros en el catálogo.";
      return;
    }
    if (resultado.content.length === 0) {
      estado.textContent = "No hay libros en esta página.";
      return;
    }
    paginaActual = resultado.page;
    listado.replaceChildren(...resultado.content.map(crearTarjeta));
    informacion.textContent = `Página ${resultado.page} de ${resultado.totalPages}`;
    anterior.disabled = resultado.page <= 1;
    siguiente.disabled = resultado.page >= resultado.totalPages;
    listado.hidden = false;
    paginacion.hidden = false;
    estado.hidden = true;
  } catch (error) {
    console.error("No se pudo cargar el catálogo:", error);
    estado.textContent = "No se ha podido cargar el catálogo. Comprueba que JSON Server está en marcha e inténtalo de nuevo.";
  }
}

anterior.addEventListener("click", () => void cargarPagina(paginaActual - 1));
siguiente.addEventListener("click", () => void cargarPagina(paginaActual + 1));
void cargarPagina(1);
