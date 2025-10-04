#!/usr/bin/env bash
set -euo pipefail
EXPIRY="${EXPIRY:-30d}"; ENGINE="${ENGINE:-secret}"; VPATH="${VPATH:-ai-service}"; WRITE=false
while [[ $# -gt 0 ]]; do case "$1" in --expiry) EXPIRY="$2"; shift 2;; --engine) ENGINE="$2"; shift 2;; --path) VPATH="$2"; shift 2;; --write-vault) WRITE=true; shift;; -h|--help) echo "Usage: $(basename "$0") [--expiry 30d] [--engine secret] [--path ai-service] [--write-vault]"; exit 0;; *) shift;; esac; done
SCRIPT="${HOME}/.bmad/scripts/generate-comm-token.sh"; [[ -x "$SCRIPT" ]] || { echo "❌ $SCRIPT not found"; exit 1; }
args=( --service ai-service --expiry "$EXPIRY" ); $WRITE && args+=( --write-vault --engine "$ENGINE" --path "$VPATH" );
"$SCRIPT" "${args[@]}"

