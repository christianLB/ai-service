#!/bin/bash

# Monitor de una línea para AI Service
API_BASE="${1:-http://localhost:3001}"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[0;37m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${CYAN}🚀 AI Service Status Monitor - Press CTRL+C to stop${NC}"
echo ""

while true; do
  # Obtener timestamp
  TIMESTAMP=$(date '+%H:%M:%S')
  
  # Hacer request al API
  STATUS_RESPONSE=$(curl -s --max-time 3 "$API_BASE/status" 2>/dev/null)
  METRICS_RESPONSE=$(curl -s --max-time 3 "$API_BASE/api/metrics/json" 2>/dev/null)
  
  if [ $? -eq 0 ] && [ -n "$STATUS_RESPONSE" ]; then
    # Parsear JSON con herramientas básicas
    STATUS=$(echo "$STATUS_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    UPTIME=$(echo "$STATUS_RESPONSE" | grep -o '"uptime":[^,}]*' | cut -d':' -f2)
    MEMORY=$(echo "$STATUS_RESPONSE" | grep -o '"heapUsed":[^,}]*' | cut -d':' -f2)
    
    WORKFLOWS=$(echo "$METRICS_RESPONSE" | grep -o '"workflows_generated":[^,}]*' | cut -d':' -f2)
    REQUESTS=$(echo "$METRICS_RESPONSE" | grep -o '"api_requests":[^,}]*' | cut -d':' -f2)
    VALIDATIONS=$(echo "$METRICS_RESPONSE" | grep -o '"validations_run":[^,}]*' | cut -d':' -f2)
    
    # Formatear valores
    UPTIME_FORMATTED=$(echo "$UPTIME" | awk '{printf "%dh%dm", $1/3600, ($1%3600)/60}')
    MEMORY_MB=$(echo "$MEMORY" | awk '{printf "%.1fMB", $1/(1024*1024)}')
    
    # Determinar color del status
    if [ "$STATUS" = "ok" ]; then
      STATUS_COLOR="${GREEN}"
      STATUS_ICON="🟢"
    else
      STATUS_COLOR="${RED}"
      STATUS_ICON="🔴"
    fi
    
    # Limpiar línea y mostrar status
    printf "\r\033[K"
    printf "${BOLD}${CYAN}[${WHITE}%s${CYAN}] ${STATUS_ICON} ${STATUS_COLOR}%s${NC} ${WHITE}| ⏱️ %s | 💾 %s | 🔥 %s workflows | 📊 %s requests | ✅ %s validated${NC}" \
      "$TIMESTAMP" "$STATUS" "$UPTIME_FORMATTED" "$MEMORY_MB" "$WORKFLOWS" "$REQUESTS" "$VALIDATIONS"
  else
    # Error de conexión
    printf "\r\033[K"
    printf "${BOLD}${CYAN}[${WHITE}%s${CYAN}] 🔴 ${RED}OFFLINE${NC} ${WHITE}| Cannot connect to ${YELLOW}%s${NC}" \
      "$TIMESTAMP" "$API_BASE"
  fi
  
  sleep 2
done