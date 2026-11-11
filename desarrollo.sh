#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [[ ! -x node_modules/.bin/tsc || ! -d node_modules/json-server ]]; then
  printf '%s\n' 'Faltan dependencias. Ejecuta primero: npm ci' >&2
  exit 1
fi

npm run build

api_pid=''
web_pid=''
limpiar() {
  for pid in "$api_pid" "$web_pid"; do
    if [[ -n "$pid" ]]; then
      kill "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
    fi
  done
}
trap limpiar EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

node scripts/servidor-api.cjs &
api_pid=$!
python3 scripts/servidor-web.py &
web_pid=$!

printf '%s\n' 'Pulsa Ctrl+C para detener ambos servidores.'
set +e
wait -n "$api_pid" "$web_pid"
resultado=$?
set -e
printf '%s\n' 'Un servidor se ha detenido; cerrando el otro.' >&2
exit "$resultado"
