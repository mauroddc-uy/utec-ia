#!/usr/bin/env sh
set -eu

required() {
  name="$1"
  value="$(eval "printf '%s' \"\${$name:-}\"")"

  if [ -z "$value" ]; then
    echo "Falta variable requerida: $name" >&2
    exit 2
  fi
}

required VM_HOST
required VM_USER

VM_PORT="${VM_PORT:-22}"
VM_APP_DIR="${VM_APP_DIR:-/opt/utec-ia}"

SSH_OPTIONS="-p $VM_PORT -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
if [ -n "${SSH_KEY:-}" ]; then
  SSH_OPTIONS="-i $SSH_KEY $SSH_OPTIONS"
fi

REMOTE="${VM_USER}@${VM_HOST}"

echo "Restaurando configuracion previa en ${REMOTE}:${VM_APP_DIR}..."
ssh $SSH_OPTIONS "$REMOTE" "
  set -eu
  cd '$VM_APP_DIR'

  if [ ! -f .env.previous ]; then
    echo 'No existe .env.previous para rollback.' >&2
    exit 1
  fi

  TS=\$(date +%Y%m%d%H%M%S)

  if [ -f .env ]; then
    cp .env \".env.failed.\$TS\"
  fi

  if [ -f docker-compose.vm.yml ]; then
    cp docker-compose.vm.yml \"docker-compose.vm.yml.failed.\$TS\"
  fi

  cp .env.previous .env

  if [ -f docker-compose.vm.yml.previous ]; then
    cp docker-compose.vm.yml.previous docker-compose.vm.yml
  fi

  docker compose -f docker-compose.vm.yml --env-file .env up -d --remove-orphans
  docker compose -f docker-compose.vm.yml --env-file .env ps
"

echo "Rollback VM terminado."
