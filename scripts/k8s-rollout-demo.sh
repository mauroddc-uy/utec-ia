#!/usr/bin/env sh
set -eu

NAMESPACE="${1:-utec-ia-pilot}"
VERSION="${2:-demo-$(date +%Y%m%d%H%M%S)}"
COMMIT="${3:-local-demo}"

kubectl -n "$NAMESPACE" set env deployment/backend \
  UTEC_IA_VERSION="$VERSION" \
  UTEC_IA_COMMIT_SHA="$COMMIT"

kubectl -n "$NAMESPACE" rollout status deployment/backend --timeout=120s
kubectl -n "$NAMESPACE" get pods -l app=backend -o wide

echo "Version demo publicada: $VERSION / $COMMIT"
