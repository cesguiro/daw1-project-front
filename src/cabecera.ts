import { comprobarSesion } from "./api.js";
import { cerrarSesion, obtenerToken } from "./sesion.js";

const enlaceLogin = document.querySelector<HTMLElement>("[data-sesion-invitado]");
const menuCuenta = document.querySelector<HTMLElement>("[data-sesion-activa]");
const botonSalir = document.querySelector<HTMLButtonElement>("[data-cerrar-sesion]");

function mostrarSesion(activa: boolean): void {
  if (enlaceLogin) enlaceLogin.hidden = activa;
  if (menuCuenta) menuCuenta.hidden = !activa;
}

async function actualizarCabecera(): Promise<void> {
  let token: string | null;
  try {
    token = obtenerToken();
  } catch (error) {
    console.error("No se puede consultar la sesión:", error);
    mostrarSesion(false);
    return;
  }
  mostrarSesion(Boolean(token));
  if (!token) return;
  try {
    const activa = await comprobarSesion(token);
    if (!activa && obtenerToken() === token) {
      cerrarSesion();
      mostrarSesion(false);
    }
  } catch (error) {
    // Una desconexión de la API no significa que el token haya caducado.
    console.error("No se pudo comprobar la sesión:", error);
  }
}

botonSalir?.addEventListener("click", () => {
  cerrarSesion();
  mostrarSesion(false);
  window.dispatchEvent(new Event("sesion-cerrada"));
  if (menuCuenta instanceof HTMLDetailsElement) menuCuenta.open = false;
});

window.addEventListener("sesion-iniciada", () => mostrarSesion(true));
void actualizarCabecera();
