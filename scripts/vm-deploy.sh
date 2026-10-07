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
required SSH_KEY
required IMAGE_TAG

VM_PORT="${VM_PORT:-22}"
VM_APP_DIR="${VM_APP_DIR:-/opt/utec-ia}"
FRONTEND_PORT="${FRONTEND_PORT:-8080}"
BACKEND_IMAGE="${BACKEND_IMAGE:-utec-ia-backend}"
FRONTEND_IMAGE="${FRONTEND_IMAGE:-utec-ia-frontend}"
UTEC_IA_VERSION="${UTEC_IA_VERSION:-$IMAGE_TAG}"
UTEC_IA_COMMIT_SHA="${UTEC_IA_COMMIT_SHA:-$IMAGE_TAG}"
UTEC_IA_ENVIRONMENT="${UTEC_IA_ENVIRONMENT:-vm-ubuntu}"
UTEC_IA_MODE="${UTEC_IA_MODE:-demo}"
CORS_ALLOW_ORIGINS="${CORS_ALLOW_ORIGINS:-*}"
PACKAGE_DIR="${PACKAGE_DIR:-.jenkins/vm-package}"

mkdir -p "$PACKAGE_DIR"
rm -f "$PACKAGE_DIR/backend.tar" "$PACKAGE_DIR/frontend.tar" "$PACKAGE_DIR/.env" "$PACKAGE_DIR/docker-compose.vm.yml"

echo "Empaquetando imagenes Docker..."
docker save "${BACKEND_IMAGE}:${IMAGE_TAG}" -o "$PACKAGE_DIR/backend.tar"
docker save "${FRONTEND_IMAGE}:${IMAGE_TAG}" -o "$PACKAGE_DIR/frontend.tar"

cp docker-compose.vm.yml "$PACKAGE_DIR/docker-compose.vm.yml"

cat > "$PACKAGE_DIR/.env" <<EOF
BACKEND_IMAGE=${BACKEND_IMAGE}
FRONTEND_IMAGE=${FRONTEND_IMAGE}
IMAGE_TAG=${IMAGE_TAG}
FRONTEND_PORT=${FRONTEND_PORT}
UTEC_IA_VERSION=${UTEC_IA_VERSION}
UTEC_IA_COMMIT_SHA=${UTEC_IA_COMMIT_SHA}
UTEC_IA_ENVIRONMENT=${UTEC_IA_ENVIRONMENT}
UTEC_IA_MODE=${UTEC_IA_MODE}
CORS_ALLOW_ORIGINS=${CORS_ALLOW_ORIGINS}
EOF

SSH_OPTIONS="-i $SSH_KEY -p $VM_PORT -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
REMOTE="${VM_USER}@${VM_HOST}"

echo "Preparando directorio remoto ${VM_APP_DIR}..."
ssh $SSH_OPTIONS "$REMOTE" "mkdir -p '$VM_APP_DIR'"

echo "Guardando configuracion remota previa si existe..."
ssh $SSH_OPTIONS "$REMOTE" "
  set -eu
  cd '$VM_APP_DIR'
  if [ -f .env ]; then
    cp .env .env.previous
  fi
  if [ -f docker-compose.vm.yml ]; then
    cp docker-compose.vm.yml docker-compose.vm.yml.previous
  fi
"

echo "Copiando artefactos a la VM..."
scp $SSH_OPTIONS \
  "$PACKAGE_DIR/backend.tar" \
  "$PACKAGE_DIR/frontend.tar" \
  "$PACKAGE_DIR/docker-compose.vm.yml" \
  "$PACKAGE_DIR/.env" \
  "$REMOTE:$VM_APP_DIR/"

echo "Cargando imagenes y levantando servicios en la VM..."
ssh $SSH_OPTIONS "$REMOTE" "
  set -eu
  cd '$VM_APP_DIR'
  docker load -i backend.tar
  docker load -i frontend.tar
  docker compose -f docker-compose.vm.yml --env-file .env up -d --remove-orphans
  docker compose -f docker-compose.vm.yml --env-file .env ps
"

echo "Despliegue VM terminado."
