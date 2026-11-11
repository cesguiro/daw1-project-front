import { ErrorApi, iniciarSesion } from "./api.js";
import { guardarToken } from "./sesion.js";

const formulario = document.querySelector<HTMLFormElement>("#login-form")!;
const mensaje = document.querySelector<HTMLParagraphElement>("#login-message")!;
const boton = document.querySelector<HTMLButtonElement>("#login-submit")!;
const campos = document.querySelector<HTMLFieldSetElement>("#login-fields")!;

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  mensaje.textContent = "";
  const email = document.querySelector<HTMLInputElement>("#email")!.value.trim().toLowerCase();
  const password = document.querySelector<HTMLInputElement>("#password")!.value;
  boton.disabled = true;
  try {
    const resultado = await iniciarSesion(email, password);
    guardarToken(resultado.accessToken);
    window.location.href = "index.html";
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
