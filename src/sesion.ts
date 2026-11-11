const CLAVE_TOKEN = "entre-paginas.accessToken";

export function obtenerToken(): string | null {
  return sessionStorage.getItem(CLAVE_TOKEN);
}

export function guardarToken(token: string): void {
  sessionStorage.setItem(CLAVE_TOKEN, token);
}

export function cerrarSesion(): void {
  sessionStorage.removeItem(CLAVE_TOKEN);
}
