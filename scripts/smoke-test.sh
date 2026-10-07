#!/usr/bin/env sh
set -eu

BASE_URL="${1:-http://127.0.0.1:8080}"
EXPECTED_VERSION="${2:-}"
EXPECTED_COMMIT="${3:-}"
TMP_DIR="${TMPDIR:-/tmp}/utec-ia-smoke-$$"

mkdir -p "$TMP_DIR"
trap 'rm -rf "$TMP_DIR"' EXIT

fetch_with_retry() {
  url="$1"
  output="$2"
  attempts="${3:-20}"
  delay="${4:-2}"
  count=1

  while [ "$count" -le "$attempts" ]; do
    if curl -fsS "$url" -o "$output"; then
      return 0
    fi

    sleep "$delay"
    count=$((count + 1))
  done

  echo "No se pudo obtener $url" >&2
  return 1
}

fetch_with_retry "$BASE_URL/" "$TMP_DIR/frontend.html"
grep -qi "UTECia" "$TMP_DIR/frontend.html"

fetch_with_retry "$BASE_URL/health" "$TMP_DIR/health.json"
grep -F '"status":"ok"' "$TMP_DIR/health.json" >/dev/null

fetch_with_retry "$BASE_URL/version" "$TMP_DIR/version.json"
grep -F '"application":"UTEC_IA"' "$TMP_DIR/version.json" >/dev/null

if [ -n "$EXPECTED_VERSION" ]; then
  grep -F "\"version\":\"$EXPECTED_VERSION\"" "$TMP_DIR/version.json" >/dev/null
fi

if [ -n "$EXPECTED_COMMIT" ]; then
  grep -F "\"commit\":\"$EXPECTED_COMMIT\"" "$TMP_DIR/version.json" >/dev/null
fi

curl -fsS \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"message":"cuantos creditos tengo","user_email":" estudiante@utec.edu.uy "}' \
  "$BASE_URL/api/chat" \
  -o "$TMP_DIR/chat.json"

grep -F "245 creditos aprobados" "$TMP_DIR/chat.json" >/dev/null

echo "Smoke OK: $BASE_URL"
