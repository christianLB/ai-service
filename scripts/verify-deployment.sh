#!/bin/bash
# Script para verificar el deployment completo

echo "🔍 Verificando deployment completo..."
echo ""

# Estado del servicio
echo "📊 Estado del servicio:"
STATUS=$(curl -s http://192.168.1.11:3003/status | python3 -c "import sys, json; d = json.load(sys.stdin); print(d.get('status', 'unknown'))")
if [ "$STATUS" = "healthy" ]; then
    echo "   ✅ Status: $STATUS"
else
    echo "   ⚠️  Status: $STATUS"
fi

# Dashboard financiero
echo ""
echo "💰 Dashboard financiero:"
DASHBOARD=$(curl -s http://192.168.1.11:3003/api/financial/dashboard/overview)
if echo "$DASHBOARD" | grep -q '"success":true'; then
    echo "   ✅ Dashboard funcionando"
else
    echo "   ❌ Dashboard con errores:"
    echo "$DASHBOARD" | python3 -m json.tool 2>/dev/null | grep -E "(error|details)" | head -2
fi

# Health check detallado
echo ""
echo "🏥 Health check:"
curl -s http://192.168.1.11:3003/api/health | python3 -m json.tool 2>/dev/null | grep -E "(status|database)" | head -5

echo ""
echo "📈 Para más detalles:"
echo "   make status
echo "   make dashboard-check"