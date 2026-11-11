import type { Libro, Resena } from "./libros.js";

export function elemento<K extends keyof HTMLElementTagNameMap>(etiqueta: K, clase = "", texto = ""): HTMLElementTagNameMap[K] {
  const resultado = document.createElement(etiqueta);
  if (clase) resultado.className = clase;
  resultado.textContent = texto;
  return resultado;
}

function dinero(centimos: number): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(centimos / 100);
}

export function crearPrecio(libro: Libro, clase: string): HTMLParagraphElement {
  const precio = elemento("p", clase);
  if (libro.discountPercent > 0) {
    precio.append(
      elemento("span", "visually-hidden", "Precio actual: "),
      elemento("span", "sale-price", dinero(libro.finalPriceCents)),
      document.createTextNode(" "),
      elemento("span", "visually-hidden", "Precio anterior: "),
      elemento("del", "original-price", dinero(libro.priceCents)),
      document.createTextNode(" "),
      elemento("span", "discount", `−${libro.discountPercent} %`)
    );
  } else {
    precio.textContent = dinero(libro.finalPriceCents);
  }
  return precio;
}

export function crearPuntuacion(media: number | null, cantidad: number): HTMLParagraphElement {
  const puntuacion = elemento("p", "rating");
  if (media === null || cantidad === 0) {
    puntuacion.classList.add("rating-empty");
    puntuacion.textContent = "Sin reseñas";
    return puntuacion;
  }
  const completas = Math.max(0, Math.min(5, Math.round(media)));
  const estrellas = elemento("span", "stars", "★".repeat(completas) + "☆".repeat(5 - completas));
  estrellas.setAttribute("aria-hidden", "true");
  const numero = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(media);
  puntuacion.append(estrellas, elemento("span", "", `${numero} de 5 · ${cantidad} ${cantidad === 1 ? "reseña" : "reseñas"}`));
  return puntuacion;
}

export function crearResena(resena: Resena): HTMLElement {
  const articulo = elemento("article", "review");
  const cabecera = elemento("div", "review-header");
  const fecha = elemento("time");
  fecha.dateTime = resena.createdAt;
  fecha.textContent = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(resena.createdAt));
  cabecera.append(elemento("h3", "", resena.userName), fecha);
  const estrellas = elemento("span", "stars", "★".repeat(resena.rating) + "☆".repeat(5 - resena.rating));
  estrellas.setAttribute("aria-hidden", "true");
  const puntuacion = elemento("p", "rating");
  puntuacion.append(estrellas, elemento("span", "", `${resena.rating} de 5`));
  articulo.append(cabecera, puntuacion, elemento("p", "", resena.comment));
  return articulo;
}
