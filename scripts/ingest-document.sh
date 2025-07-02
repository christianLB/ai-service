#!/bin/bash

DOCUMENT_PATH="$1"
CATEGORY="$2"

if [ -z "$DOCUMENT_PATH" ]; then
    echo "❌ Uso: $0 <ruta_documento> [categoría]"
    echo "   Ejemplo: $0 CENTRO_COMUNICACION.md documentation"
    exit 1
fi

if [ ! -f "$DOCUMENT_PATH" ]; then
    echo "❌ Error: El archivo '$DOCUMENT_PATH' no existe"
    exit 1
fi

# Configuración
INBOX_DIR="/home/k2600x/dev/ai-service-data/documents/inbox"
FILENAME=$(basename "$DOCUMENT_PATH")
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TARGET_FILE="${INBOX_DIR}/${TIMESTAMP}_${FILENAME}"

# Verificar que el directorio inbox existe
if [ ! -d "$INBOX_DIR" ]; then
    echo "❌ Error: Directorio inbox no existe. Ejecuta primero: ./scripts/setup-production.sh"
    exit 1
fi

echo "📄 Procesando documento: $DOCUMENT_PATH"

# Copiar archivo a inbox
cp "$DOCUMENT_PATH" "$TARGET_FILE"
echo "✅ Archivo copiado a: $TARGET_FILE"

# Crear metadata
cat > "${TARGET_FILE}.meta" << EOF
{
  "original_path": "$DOCUMENT_PATH",
  "filename": "$FILENAME",
  "category": "${CATEGORY:-general}",
  "ingested_at": "$(date -Iseconds)",
  "status": "pending",
  "priority": "normal",
  "file_size": $(stat -c%s "$DOCUMENT_PATH"),
  "file_type": "${FILENAME##*.}"
}
EOF

echo "✅ Metadata creada: ${TARGET_FILE}.meta"

# Intentar trigger de procesamiento via API si el servicio está corriendo
echo "🔄 Intentando procesar via API..."
if curl -s -f http://localhost:3000/status > /dev/null 2>&1; then
    RESPONSE=$(curl -s -X POST http://localhost:3000/api/documents/process \
      -H "Content-Type: application/json" \
      -d "{\"file\": \"$TARGET_FILE\", \"category\": \"${CATEGORY:-general}\"}" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        echo "✅ Documento procesado via API: $RESPONSE"
    else
        echo "⚠️ API no disponible, documento encolado para procesamiento posterior"
    fi
else
    echo "⚠️ Servicio AI no está corriendo, documento encolado para procesamiento posterior"
    echo "   Para procesar: docker-compose --env-file .env.production up -d"
fi

echo ""
echo "📋 Resumen:"
echo "   📄 Archivo original: $DOCUMENT_PATH"
echo "   📁 Archivo en cola: $TARGET_FILE"
echo "   🏷️ Categoría: ${CATEGORY:-general}"
echo "   ⏰ Timestamp: $TIMESTAMP"
echo ""
echo "🎯 Para verificar procesamiento:"
echo "   curl http://localhost:3000/api/documents"