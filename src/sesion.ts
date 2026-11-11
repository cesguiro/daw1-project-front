const CLAVE_TOKEN = "entre-paginas.accessToken";
const CLAVE_USUARIO = "entre-paginas.userId";

export function obtenerToken(): string | null {
  return sessionStorage.getItem(CLAVE_TOKEN);
}

export function guardarToken(token: string, userId: string): void {
  sessionStorage.setItem(CLAVE_TOKEN, token);
  sessionStorage.setItem(CLAVE_USUARIO, userId);
}

export function obtenerUsuario(): string | null { return sessionStorage.getItem(CLAVE_USUARIO); }

export function cerrarSesion(): void {
  sessionStorage.removeItem(CLAVE_TOKEN);
  sessionStorage.removeItem(CLAVE_USUARIO);
}
