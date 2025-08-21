#!/usr/bin/env bash
set -euo pipefail

FILE="infra/compose/docker-compose.dev.yml"
if [[ ! -f "$FILE" ]]; then
  echo "Compose file not found: $FILE" >&2
  exit 1
fi

run_compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose -f "$FILE" "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose -f "$FILE" "$@"
  else
    echo "Neither docker compose (v2) nor docker-compose (v1) found. Please install Docker Compose." >&2
    exit 127
  fi
}

svc_ready() {
  local url="$1"
  for i in $(seq 1 60); do
    if curl -sf "$url" >/dev/null; then
      return 0
    fi
    sleep 1
  done
  return 1
}

echo "=== Building api-gateway ==="
run_compose build api-gateway

echo "=== Recreating api-gateway ==="
run_compose up -d --build api-gateway

run_compose ps

echo "=== Waiting for gateway readiness ==="
if ! svc_ready "http://localhost:3005/health/ready"; then
  echo "Gateway did not become ready in time" >&2
  exit 2
fi

set +e

echo -e "\n# POST /api/financial/gocardless/sync/accounts"
curl -si -X POST http://localhost:3005/api/financial/gocardless/sync/accounts

echo -e "\n# POST /api/financial/gocardless/sync/transactions (accountId=test)"
curl -si -X POST http://localhost:3005/api/financial/gocardless/sync/transactions \
  -H 'Content-Type: application/json' \
  --data '{"accountId":"test"}'

set -e

echo -e "\n=== Done. If the above responses are 2xx, GoCardless sync proxies are working via gateway. ==="
