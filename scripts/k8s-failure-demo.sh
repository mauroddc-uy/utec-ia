#!/usr/bin/env sh
set -eu

NAMESPACE="${1:-utec-ia-pilot}"
SMOKE_URL="${2:-}"
TIMEOUT="${3:-35s}"

PREVIOUS_BACKEND_IMAGE="$(kubectl -n "$NAMESPACE" get deployment/backend -o jsonpath='{.spec.template.spec.containers[?(@.name=="backend")].image}')"

if [ -z "$PREVIOUS_BACKEND_IMAGE" ]; then
  echo "No existe imagen previa del backend para recuperar." >&2
  exit 1
fi

echo "Imagen estable previa: $PREVIOUS_BACKEND_IMAGE"
echo "Aplicando fallo deliberado en el namespace $NAMESPACE..."
kubectl -n "$NAMESPACE" set image deployment/backend backend=invalid.invalid/utec-ia-backend:fallo-demo

set +e
kubectl -n "$NAMESPACE" rollout status deployment/backend --timeout="$TIMEOUT"
ROLLOUT_STATUS=$?
set -e

if [ "$ROLLOUT_STATUS" -eq 0 ]; then
  echo "El fallo deliberado no fallo como se esperaba." >&2
  exit 1
fi

echo "Fallo reproducido. Recuperando imagen estable..."
kubectl -n "$NAMESPACE" set image deployment/backend backend="$PREVIOUS_BACKEND_IMAGE"
kubectl -n "$NAMESPACE" rollout status deployment/backend --timeout=120s

if [ -n "$SMOKE_URL" ]; then
  sh scripts/smoke-test.sh "$SMOKE_URL"
fi

echo "Fallo controlado y recuperacion verificados."
