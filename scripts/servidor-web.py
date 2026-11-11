"""Sirve únicamente las páginas y los recursos del front, en local."""

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

RAIZ = Path(__file__).resolve().parent.parent


class ServidorFront(SimpleHTTPRequestHandler):
    def send_head(self):
        ruta = unquote(urlsplit(self.path).path)
        if ruta == "/":
            ruta = "/index.html"
        destino = (RAIZ / ruta.lstrip("/")).resolve()
        try:
            partes = destino.relative_to(RAIZ).parts
        except ValueError:
            partes = ()
        pagina = len(partes) == 1 and destino.suffix == ".html"
        recurso = (len(partes) == 2 and
                   ((partes[0] == "css" and destino.suffix == ".css") or
                    (partes[0] == "js" and destino.suffix == ".js")))
        if not (pagina or recurso):
            self.send_error(404)
            return None
        return super().send_head()


if __name__ == "__main__":
    manejador = partial(ServidorFront, directory=str(RAIZ))
    with ThreadingHTTPServer(("127.0.0.1", 8080), manejador) as servidor:
        print("Front disponible en http://localhost:8080", flush=True)
        servidor.serve_forever()
