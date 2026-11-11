import { libros } from "./libros.js";
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
  const titulo = elemento("h3", "", libro.title);
  informacion.append(elemento("p", "book-category", libro.category), titulo,
    elemento("p", "book-author", libro.author), crearPuntuacion(libro.averageRating, libro.reviewCount),
    crearPrecio(libro, "book-price"));

  // El único detalle disponible en la maqueta es el primer libro.
  if (libro.id === "b1") {
    const enlacePortada = elemento("a", "cover-link");
    enlacePortada.href = "libro.html";
    enlacePortada.setAttribute("aria-label", `Ver detalle de ${libro.title}`);
    enlacePortada.append(portada);
    articulo.append(enlacePortada);
    const enlace = elemento("a", "book-detail-link", "Ver detalle ↗");
    enlace.href = "libro.html";
    informacion.append(enlace);
  } else {
    articulo.append(portada);
  }
  articulo.append(informacion);
  return articulo;
}

const listado = document.querySelector<HTMLElement>(".book-grid");
if (listado) listado.replaceChildren(...libros.map(crearTarjeta));
