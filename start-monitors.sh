#!/bin/bash

# Script para iniciar monitores del AI Service
# Uso: ./start-monitors.sh [tipo] [puerto]

PORT=${2:-3001}
API_BASE="http://localhost:$PORT"
MONITOR_TYPE=${1:-mini}

echo "🚀 AI Service Monitor Launcher"
echo "================================"
echo "🌐 API Base: $API_BASE"
echo "📊 Monitor Type: $MONITOR_TYPE"
echo ""

# Verificar que el servicio esté corriendo
echo "🔍 Checking if AI Service is running..."
if curl -s --max-time 3 "$API_BASE/status" > /dev/null 2>&1; then
    echo "✅ AI Service is running at $API_BASE"
else
    echo "❌ AI Service is not running at $API_BASE"
    echo ""
    echo "💡 Start the service first:"
    echo "   node demo-standalone.js"
    echo "   # or #"
    echo "   docker-compose up -d"
    exit 1
fi

echo ""

case $MONITOR_TYPE in
    "full"|"dashboard")
        echo "🖥️  Starting FULL DASHBOARD monitor..."
        echo "   - Rich interface with trends and alerts"
        echo "   - Best for dedicated monitoring terminal"
        echo ""
        node monitor-dashboard.js
        ;;
    
    "mini"|"compact")
        echo "📱 Starting MINI monitor..."
        echo "   - Compact interface for small windows"
        echo "   - Perfect for keeping open while working"
        echo ""
        node mini-monitor.js
        ;;
    
    "line"|"status")
        echo "📏 Starting STATUS LINE monitor..."
        echo "   - Single line status update"
        echo "   - Minimal resource usage"
        echo ""
        ./status-line.sh "$API_BASE"
        ;;
    
    "all"|"tmux")
        echo "🚪 Starting ALL monitors in tmux session..."
        echo "   - Creates 3 tmux panes with different monitors"
        echo ""
        
        # Crear sesión tmux con múltiples panes
        tmux new-session -d -s ai-monitor -x 120 -y 30
        
        # Pane principal con dashboard completo
        tmux send-keys -t ai-monitor "cd $(pwd) && node monitor-dashboard.js" Enter
        
        # Split horizontal para mini monitor
        tmux split-window -h -t ai-monitor
        tmux send-keys -t ai-monitor "cd $(pwd) && sleep 2 && node mini-monitor.js" Enter
        
        # Split vertical en el panel derecho para status line
        tmux split-window -v -t ai-monitor
        tmux send-keys -t ai-monitor "cd $(pwd) && sleep 4 && ./status-line.sh $API_BASE" Enter
        
        # Ajustar tamaños
        tmux select-pane -t ai-monitor:0.0
        tmux resize-pane -R 20
        
        echo "✅ Tmux session 'ai-monitor' created with 3 monitors"
        echo "🔗 Attach with: tmux attach -t ai-monitor"
        echo "🚪 Detach with: Ctrl+B then D"
        echo "❌ Kill session: tmux kill-session -t ai-monitor"
        
        # Conectar automáticamente
        tmux attach -t ai-monitor
        ;;
    
    "watch")
        echo "👁️  Starting WATCH monitor..."
        echo "   - Simple watch command with curl"
        echo ""
        watch -n 2 -c "curl -s $API_BASE/api/metrics/json | jq '{service: .service, uptime: .metrics.uptime_seconds, memory: .metrics.memory_usage_mb, workflows: .metrics.workflows_generated, requests: .metrics.api_requests}'"
        ;;
    
    "help"|*)
        echo "📖 Available monitor types:"
        echo ""
        echo "   full      - Full dashboard with trends and alerts"
        echo "   mini      - Compact monitor for small windows"
        echo "   line      - Single line status updates"
        echo "   all       - All monitors in tmux session"
        echo "   watch     - Simple watch command"
        echo ""
        echo "Usage examples:"
        echo "   ./start-monitors.sh mini"
        echo "   ./start-monitors.sh full 3000"
        echo "   ./start-monitors.sh all"
        echo ""
        ;;
esac