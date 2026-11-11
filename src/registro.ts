import { ErrorApi, registrarUsuario } from "./api.js";

const formulario = document.querySelector<HTMLFormElement>("#register-form")!;
const mensaje = document.querySelector<HTMLParagraphElement>("#register-message")!;
const boton = document.querySelector<HTMLButtonElement>("#register-submit")!;
const campos = document.querySelector<HTMLFieldSetElement>("#register-fields")!;
const continuarCompra = new URLSearchParams(window.location.search).get("next") === "compra";
if (continuarCompra) document.querySelector<HTMLAnchorElement>(".form-note a")!.href = "login.html?next=compra";

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  mensaje.textContent = "";
  const name = document.querySelector<HTMLInputElement>("#name")!.value.trim();
  const email = document.querySelector<HTMLInputElement>("#email")!.value.trim().toLowerCase();
  const password = document.querySelector<HTMLInputElement>("#password")!.value;
  const confirmacion = document.querySelector<HTMLInputElement>("#confirm-password")!.value;
  if (!name) {
    mensaje.textContent = "Indica tu nombre.";
    return;
  }
  if (password !== confirmacion) {
    mensaje.textContent = "Las contraseñas no coinciden.";
    return;
  }
  boton.disabled = true;
  try {
    await registrarUsuario(name, email, password);
    // El servidor devuelve un token al registrar, pero pedimos iniciar sesión aparte.
    window.location.href = continuarCompra ? "login.html?registro=ok&next=compra" : "login.html?registro=ok";
  } catch (error) {
    console.error("No se pudo crear la cuenta:", error);
    mensaje.textContent = error instanceof ErrorApi && error.status === 400
      ? "No se ha podido crear la cuenta. Revisa los datos y comprueba que el correo no esté registrado."
      : "No se ha podido crear la cuenta. Comprueba que la API está en marcha e inténtalo de nuevo.";
  } finally {
    boton.disabled = false;
  }
});

campos.disabled = false;
boton.disabled = false;
