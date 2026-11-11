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
  description: string;
}

export interface Pagina<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
