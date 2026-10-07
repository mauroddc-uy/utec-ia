#!/usr/bin/env sh
set -eu

NAMESPACE="${1:-utec-ia-pilot}"

POD_NAME="$(kubectl -n "$NAMESPACE" get pods -l app=backend -o jsonpath='{.items[0].metadata.name}')"

if [ -z "$POD_NAME" ]; then
  echo "No se encontro ningun Pod del backend." >&2
  exit 1
fi

echo "Eliminando Pod del backend: $POD_NAME"
kubectl -n "$NAMESPACE" delete pod "$POD_NAME"
kubectl -n "$NAMESPACE" rollout status deployment/backend --timeout=120s
kubectl -n "$NAMESPACE" get pods -l app=backend -o wide
