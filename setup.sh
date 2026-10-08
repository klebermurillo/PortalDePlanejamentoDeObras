#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

for command_name in docker openssl; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    printf 'Erro: %s precisa estar instalado. Instale Docker Desktop/Engine com Docker Compose e tente novamente.\n' "$command_name" >&2
    exit 1
  fi
done

if ! docker compose version >/dev/null 2>&1; then
  printf 'Erro: Docker Compose v2 nao esta disponivel.\n' >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  umask 077
  cp .env.example .env
fi

if grep -Eq '^DB_(ROOT_)?PASSWORD=configure-' .env; then
  umask 077
  db_password="$(openssl rand -hex 32)"
  db_root_password="$(openssl rand -hex 32)"
  temporary_env="$(mktemp .env.XXXXXX)"
  sed \
    -e "s/^DB_PASSWORD=configure-.*/DB_PASSWORD=${db_password}/" \
    -e "s/^DB_ROOT_PASSWORD=configure-.*/DB_ROOT_PASSWORD=${db_root_password}/" \
    .env > "$temporary_env"
  chmod 600 "$temporary_env"
  mv "$temporary_env" .env
  printf 'Placeholders do MySQL no .env foram substituidos por senhas aleatorias.\n'
fi

if ! grep -Eq '^DB_PASSWORD=.+$' .env || ! grep -Eq '^DB_ROOT_PASSWORD=.+$' .env; then
  printf 'Erro: configure DB_PASSWORD e DB_ROOT_PASSWORD no .env.\n' >&2
  exit 1
fi

printf 'Construindo a aplicacao e iniciando o MySQL...\n'
docker compose up --detach --build --wait

printf 'Verificando o administrador inicial...\n'
docker compose exec app node dist/scripts/criarAdministrador.js --if-empty

port="$(sed -n 's/^PORT=//p' .env | head -n 1)"
port="${port:-3000}"
url="http://localhost:${port}"

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$url" >/dev/null 2>&1 || true
elif command -v open >/dev/null 2>&1; then
  open "$url" >/dev/null 2>&1 || true
fi

printf '\nSIGPO esta no ar: %s\n' "$url"
printf 'Para parar sem apagar os dados: docker compose down\n'