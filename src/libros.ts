export interface Libro {
  id: string;
  title: string;
  author: string;
  category: string;
  coverUrl: string;
  priceCents: number;
  finalPriceCents: number;
  discountPercent: number;
  averageRating: number | null;
  reviewCount: number;
}

// Primeros datos de ejemplo: en esta fase todavía no hay API.
export const libros: Libro[] = [
  { id: "b1", title: "Los juegos del hambre", author: "Suzanne Collins", category: "Ciencia ficción", coverUrl: "https://images.cesguiro.es/books/9780439023528.webp", priceCents: 1495, finalPriceCents: 1196, discountPercent: 20, averageRating: 4.3, reviewCount: 6 },
  { id: "b3", title: "La comunidad del anillo", author: "J. R. R. Tolkien", category: "Fantasía", coverUrl: "https://images.cesguiro.es/books/9780261103573.webp", priceCents: 1650, finalPriceCents: 1650, discountPercent: 0, averageRating: 5, reviewCount: 2 },
  { id: "b4", title: "El cuento de Ferdinando", author: "Munro Leaf", category: "Literatura infantil", coverUrl: "https://images.cesguiro.es/books/9781451673319.jpg", priceCents: 1395, finalPriceCents: 1395, discountPercent: 0, averageRating: null, reviewCount: 0 },
  { id: "b2", title: "El principito", author: "Antoine de Saint-Exupéry", category: "Literatura infantil", coverUrl: "https://images.cesguiro.es/books/9780142424179.webp", priceCents: 1595, finalPriceCents: 1276, discountPercent: 20, averageRating: 4, reviewCount: 1 },
  { id: "b5", title: "Bajo la misma estrella", author: "John Green", category: "Novela", coverUrl: "https://images.cesguiro.es/books/9780142424180.webp", priceCents: 1295, finalPriceCents: 1295, discountPercent: 0, averageRating: null, reviewCount: 0 },
  { id: "b6", title: "Harry Potter y la piedra filosofal", author: "J. K. Rowling", category: "Fantasía", coverUrl: "https://images.cesguiro.es/books/9780439554930.webp", priceCents: 1750, finalPriceCents: 1750, discountPercent: 0, averageRating: 5, reviewCount: 1 }
];
