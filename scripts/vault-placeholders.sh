#!/usr/bin/env bash
set -euo pipefail

# Create placeholder secrets for ai-service in Vault (KV v2).
# Usage: vault-placeholders.sh [--engine secret] [--path ai-service] [--force]

ENGINE="${ENGINE:-secret}"
VPATH="${VPATH:-ai-service}"
FORCE=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --engine) ENGINE="$2"; shift 2;;
    --path) VPATH="$2"; shift 2;;
    --force) FORCE=true; shift;;
    -h|--help) echo "Usage: $(basename "$0") [--engine secret] [--path ai-service] [--force]"; exit 0;;
    *) shift;;
  esac
done

[[ -n ${VAULT_ADDR:-} && -n ${VAULT_TOKEN:-} ]] || { echo "❌ Set VAULT_ADDR and VAULT_TOKEN"; exit 1; }

base="$VAULT_ADDR/v1/$ENGINE"
if ! $FORCE && curl -s -f -H "X-Vault-Token: $VAULT_TOKEN" "$base/metadata/$VPATH" >/dev/null 2>&1; then
  echo "ℹ️  $ENGINE/$VPATH already exists. Use --force to overwrite."; exit 0
fi

payload='{
  "data": {
    "openai-api-key": "CHANGEME",
    "anthropic-api-key": "CHANGEME",
    "ollama-host": "http://localhost:11434",
    "redis-url": "redis://localhost:6379",
    "comm-service-url": "http://192.168.1.11:8080",
    "comm-service-token": "CHANGEME",
    "gemini-api-key": "CHANGEME"
  }
}'

curl -s -f -H "X-Vault-Token: $VAULT_TOKEN" -H 'Content-Type: application/json' \
  -X POST "$base/data/$VPATH" -d "$payload" >/dev/null
echo "✅ Placeholders created at $ENGINE/$VPATH"

