#!/usr/bin/env sh
set -eu

NAMESPACE="${1:-utec-ia-pilot}"
STATE_DIR="${2:-.jenkins/previous-state}"
SMOKE_URL="${3:-}"
HAS_PREVIOUS=0

if [ -s "$STATE_DIR/configmap.yaml" ]; then
  echo "Restaurando ConfigMap previo..."
  kubectl apply -f "$STATE_DIR/configmap.yaml"
fi

if [ -s "$STATE_DIR/backend-image.txt" ]; then
  BACKEND_IMAGE="$(cat "$STATE_DIR/backend-image.txt")"
  echo "Restaurando backend: $BACKEND_IMAGE"
  kubectl -n "$NAMESPACE" set image deployment/backend backend="$BACKEND_IMAGE"
  HAS_PREVIOUS=1
fi

if [ -s "$STATE_DIR/backend-version.txt" ] || [ -s "$STATE_DIR/backend-commit.txt" ]; then
  BACKEND_VERSION="$(cat "$STATE_DIR/backend-version.txt" 2>/dev/null || true)"
  BACKEND_COMMIT="$(cat "$STATE_DIR/backend-commit.txt" 2>/dev/null || true)"

  if [ -n "$BACKEND_VERSION" ] && [ -n "$BACKEND_COMMIT" ]; then
    echo "Restaurando metadata backend: $BACKEND_VERSION / $BACKEND_COMMIT"
    kubectl -n "$NAMESPACE" set env deployment/backend \
      UTEC_IA_VERSION="$BACKEND_VERSION" \
      UTEC_IA_COMMIT_SHA="$BACKEND_COMMIT"
  fi
fi

if [ -s "$STATE_DIR/frontend-image.txt" ]; then
  FRONTEND_IMAGE="$(cat "$STATE_DIR/frontend-image.txt")"
  echo "Restaurando frontend: $FRONTEND_IMAGE"
  kubectl -n "$NAMESPACE" set image deployment/frontend frontend="$FRONTEND_IMAGE"
  HAS_PREVIOUS=1
fi

if [ "$HAS_PREVIOUS" -eq 0 ]; then
  echo "No existe version previa registrada para recuperar."
  exit 0
fi

kubectl -n "$NAMESPACE" rollout status deployment/backend --timeout=120s
kubectl -n "$NAMESPACE" rollout status deployment/frontend --timeout=120s

if [ -n "$SMOKE_URL" ]; then
  sh scripts/smoke-test.sh "$SMOKE_URL"
fi

echo "Recuperacion terminada."
