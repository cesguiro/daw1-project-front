import { ErrorApi, iniciarSesion } from "./api.js";
import { guardarToken } from "./sesion.js";
import { sincronizarInvitado } from "./gestion-carrito.js";

const formulario = document.querySelector<HTMLFormElement>("#login-form")!;
const mensaje = document.querySelector<HTMLParagraphElement>("#login-message")!;
const boton = document.querySelector<HTMLButtonElement>("#login-submit")!;
const campos = document.querySelector<HTMLFieldSetElement>("#login-fields")!;

if (new URLSearchParams(window.location.search).get("registro") === "ok") {
  mensaje.textContent = "Cuenta creada. Ya puedes iniciar sesión.";
}

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  mensaje.textContent = "";
  const email = document.querySelector<HTMLInputElement>("#email")!.value.trim().toLowerCase();
  const password = document.querySelector<HTMLInputElement>("#password")!.value;
  boton.disabled = true;
  try {
    const resultado = await iniciarSesion(email, password);
    if (!resultado.user || resultado.user.id === undefined || resultado.user.id === null) throw new Error("La API no ha devuelto el usuario.");
    const userId = String(resultado.user.id);
    guardarToken(resultado.accessToken, userId);
    window.dispatchEvent(new Event("sesion-iniciada"));
    try {
      const combinado = await sincronizarInvitado(resultado.accessToken, userId);
      window.location.href = combinado ? "carrito.html" : "index.html";
    } catch (error) {
      mensaje.textContent = error instanceof Error ? error.message : "No se ha podido combinar el carrito.";
      return;
    }
  } catch (error) {
    console.error("No se pudo iniciar sesión:", error);
    mensaje.textContent = error instanceof ErrorApi && error.status === 400
      ? "Correo o contraseña incorrectos."
      : "No se ha podido iniciar sesión. Comprueba que la API está en marcha e inténtalo de nuevo.";
  } finally {
    boton.disabled = false;
  }
});

campos.disabled = false;
boton.disabled = false;
