#!/usr/bin/env sh
set -eu

NAMESPACE="${1:-utec-ia-pilot}"
ALLOWED_POD="utec-ia-netpol-allowed"
DENIED_POD="utec-ia-netpol-denied"
IMAGE="${2:-curlimages/curl:8.11.1}"

cleanup() {
  kubectl -n "$NAMESPACE" delete pod "$ALLOWED_POD" "$DENIED_POD" --ignore-not-found=true >/dev/null 2>&1 || true
}
trap cleanup EXIT

cleanup

kubectl -n "$NAMESPACE" run "$ALLOWED_POD" \
  --image="$IMAGE" \
  --restart=Never \
  --labels=app=frontend \
  --command -- sh -c "sleep 3600"

kubectl -n "$NAMESPACE" run "$DENIED_POD" \
  --image="$IMAGE" \
  --restart=Never \
  --labels=app=netpol-denied \
  --command -- sh -c "sleep 3600"

kubectl -n "$NAMESPACE" wait --for=condition=Ready pod/"$ALLOWED_POD" --timeout=120s
kubectl -n "$NAMESPACE" wait --for=condition=Ready pod/"$DENIED_POD" --timeout=120s

echo "Probando trafico permitido desde app=frontend hacia backend..."
kubectl -n "$NAMESPACE" exec "$ALLOWED_POD" -- curl -fsS --connect-timeout 5 http://backend:8000/health >/dev/null

echo "Probando trafico denegado desde un Pod sin etiqueta permitida..."
set +e
kubectl -n "$NAMESPACE" exec "$DENIED_POD" -- curl -fsS --connect-timeout 5 http://backend:8000/health >/dev/null
DENIED_STATUS=$?
set -e

if [ "$DENIED_STATUS" -eq 0 ]; then
  echo "El trafico no permitido llego al backend. El CNI no aplica NetworkPolicies o la politica es insuficiente." >&2
  exit 1
fi

echo "NetworkPolicies verificadas: trafico permitido y denegado se comportan como se esperaba."
