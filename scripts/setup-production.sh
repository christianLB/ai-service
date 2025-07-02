#!/bin/bash
set -e

echo "🚀 Configurando AI Service para Producción Real..."

# 1. Verificar estructura de directorios
echo "📁 Verificando estructura de volúmenes persistentes..."
if [ ! -d "/home/k2600x/dev/ai-service-data" ]; then
    echo "📁 Creando estructura de volúmenes persistentes..."
    mkdir -p /home/k2600x/dev/ai-service-data/{postgres,redis,n8n,grafana,prometheus,workflows,documents/{inbox,processed,failed},knowledge/{embeddings,categories,metadata},logs}
    echo "✅ Estructura de directorios creada"
else
    echo "✅ Estructura de directorios ya existe"
fi

# 2. Configurar permisos
echo "🔐 Configurando permisos..."
chmod -R 755 /home/k2600x/dev/ai-service-data
echo "✅ Permisos configurados"

# 3. Crear base de datos inicial
echo "🗄️ Preparando script de inicialización de base de datos..."
mkdir -p scripts
cat > scripts/init-db.sql << 'EOF'
-- Crear base de datos para n8n si no existe
CREATE DATABASE IF NOT EXISTS n8n;

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Crear tablas extendidas para experimentación
-- Tabla de documentos ingestados
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    original_path TEXT,
    content_type VARCHAR(100),
    file_size BIGINT,
    content_text TEXT,
    category VARCHAR(100),
    tags TEXT[],
    metadata JSONB,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de conocimiento estructurado
CREATE TABLE IF NOT EXISTS knowledge_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100),
    confidence_score DECIMAL(3,2),
    source_document_id UUID REFERENCES documents(id),
    relations JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de tareas autónomas
CREATE TABLE IF NOT EXISTS autonomous_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    input_data JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    priority INTEGER DEFAULT 5,
    requires_approval BOOLEAN DEFAULT false,
    approved_by VARCHAR(100),
    approved_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    result_data JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de comunicaciones
CREATE TABLE IF NOT EXISTS communication_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel VARCHAR(50) NOT NULL,
    direction VARCHAR(10) NOT NULL,
    message_type VARCHAR(50),
    content TEXT,
    metadata JSONB,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_entries(category);
CREATE INDEX IF NOT EXISTS idx_autonomous_status ON autonomous_tasks(status);
CREATE INDEX IF NOT EXISTS idx_communication_channel ON communication_log(channel);

EOF

echo "✅ Script de base de datos preparado"

# 4. Verificar dependencias
echo "🔍 Verificando dependencias..."
command -v docker >/dev/null 2>&1 || { echo "❌ Docker no está instalado"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose no está instalado"; exit 1; }
echo "✅ Dependencias verificadas"

# 5. Crear archivo de configuración si no existe
if [ ! -f .env.production ]; then
    echo "⚙️ Creando archivo de configuración..."  
    if [ -f .env.template ]; then
        cp .env.template .env.production
    else
        cat > .env.production << 'EOF'
# === CORE SERVICE ===
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# === DATABASE REAL ===
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=ai_service
POSTGRES_USER=ai_user
POSTGRES_PASSWORD=ultra_secure_password_2025
DATABASE_URL=postgresql://ai_user:ultra_secure_password_2025@postgres:5432/ai_service

# === CACHE ===
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis_secure_password_2025

# === AI INTEGRATIONS (REAL) ===
OPENAI_API_KEY=sk-your-real-openai-key-here
CLAUDE_API_KEY=sk-ant-your-real-claude-key-here
GEMINI_API_KEY=your-real-gemini-key-here

# === N8N INTEGRATION ===
N8N_API_URL=http://n8n:5678
N8N_API_KEY=your-n8n-api-key-here
N8N_WEBHOOK_URL=http://localhost:5678

# === MONITORING ===
PROMETHEUS_ENABLED=true
METRICS_RETENTION_DAYS=90
GRAFANA_ADMIN_PASSWORD=grafana_admin_password_2025

# === DOCUMENT INGESTION ===
DOCUMENT_INGESTION_PATH=/app/data/documents/inbox
MAX_DOCUMENT_SIZE_MB=50
SUPPORTED_FORMATS=pdf,docx,txt,md,json,csv

# === COMMUNICATION CHANNELS ===
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook/url
WHATSAPP_API_KEY=your-whatsapp-api-key
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_USER=your-email@gmail.com
EMAIL_SMTP_PASSWORD=your-app-password

# === FINANCIAL INTEGRATIONS ===
BINANCE_API_KEY=your-binance-api-key
BINANCE_SECRET_KEY=your-binance-secret-key
ALPHA_VANTAGE_API_KEY=your-alpha-vantage-key
YAHOO_FINANCE_API_KEY=your-yahoo-finance-key

# === SECURITY ===
JWT_SECRET=ultra_secure_jwt_secret_key_2025
API_RATE_LIMIT_PER_HOUR=1000
ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.com
EOF
    fi
    echo "⚠️ IMPORTANTE: Edita .env.production con tus API keys reales"
    echo "✅ Archivo de configuración creado"
else
    echo "✅ Archivo .env.production ya existe"
fi

# 6. Crear archivos de demostración en directorios
echo "📄 Creando archivos de demostración..."

# Crear archivo README en cada directorio
echo "# Directorio de workflows generados" > /home/k2600x/dev/ai-service-data/workflows/README.md
echo "# Directorio de logs del sistema" > /home/k2600x/dev/ai-service-data/logs/README.md
echo "# Directorio inbox para documentos nuevos" > /home/k2600x/dev/ai-service-data/documents/inbox/README.md
echo "# Directorio de documentos procesados" > /home/k2600x/dev/ai-service-data/documents/processed/README.md
echo "# Directorio de documentos con errores" > /home/k2600x/dev/ai-service-data/documents/failed/README.md
echo "# Directorio de embeddings de documentos" > /home/k2600x/dev/ai-service-data/knowledge/embeddings/README.md
echo "# Directorio de categorías automáticas" > /home/k2600x/dev/ai-service-data/knowledge/categories/README.md
echo "# Directorio de metadatos de conocimiento" > /home/k2600x/dev/ai-service-data/knowledge/metadata/README.md

echo "✅ Archivos de demostración creados"

# 7. Mostrar estructura final
echo "📋 Estructura final creada:"
find /home/k2600x/dev/ai-service-data/ -type d | sort | sed 's|/home/k2600x/dev/ai-service-data/|  |g'

echo ""
echo "🎉 Setup completo!"
echo "📋 Próximos pasos:"
echo "   1. Editar .env.production con tus API keys reales"
echo "   2. Ejecutar: docker-compose --env-file .env.production up -d"
echo "   3. Verificar: curl http://localhost:3000/status"
echo ""
echo "🚀 ¡El cerebro artificial está listo para datos reales!"