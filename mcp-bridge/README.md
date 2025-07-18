# 🌉 MCP Bridge Server

Model Context Protocol (MCP) bridge server para AI Service. Expone todas las capacidades del AI Service a través del protocolo MCP estándar.

## 🚀 Características

- **🔧 25+ Herramientas MCP**: Financieras, documentales y del sistema
- **🔐 Autenticación**: JWT y API Keys
- **⚡ WebSocket Support**: Comunicación en tiempo real
- **🛡️ Rate Limiting**: Protección contra abuso
- **📊 Caché Redis**: Optimización de rendimiento
- **🐳 Docker Ready**: Contenedor independiente

## 📋 Requisitos

- Node.js 18+
- Docker y Docker Compose
- Acceso a AI Service
- Redis (compartido con AI Service)

## 🛠️ Instalación

### Opción 1: Docker (Recomendado)

```bash
# Clonar repositorio
git clone [repository-url]
cd mcp-bridge

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# Construir imagen
docker build -t mcp-bridge:latest .

# Iniciar con docker-compose
docker-compose -f docker-compose.mcp.yml up -d
```

### Opción 2: Desarrollo Local

```bash
# Instalar dependencias
npm install

# Compilar TypeScript
npm run build

# Iniciar servidor
npm start
```

## 🔧 Configuración

### Variables de Entorno Principales

```env
# Conexión con AI Service
AI_SERVICE_URL=http://ai-service:3000

# Autenticación (debe coincidir con AI Service)
JWT_SECRET=tu-secret-seguro-min-32-chars

# API Keys (opcional)
ENABLE_API_KEY=true
VALID_API_KEYS=key1,key2,key3

# Redis (compartido con AI Service)
REDIS_HOST=ai-redis
REDIS_PORT=6379
```

## 📚 Herramientas Disponibles

### 💰 Financieras

| Herramienta | Descripción | Auth |
|-------------|-------------|------|
| `get_financial_summary` | Resumen financiero completo | ✅ |
| `get_account_balance` | Balance de cuentas | ✅ |
| `analyze_expenses` | Análisis de gastos | ✅ |
| `get_transactions` | Lista de transacciones | ✅ |
| `create_invoice` | Crear factura | ✅ |
| `categorize_transaction` | Categorizar transacción | ✅ |
| `auto_categorize_transactions` | Auto-categorización con IA | ✅ |
| `generate_financial_report` | Generar reporte PDF | ✅ |
| `sync_financial_data` | Sincronizar datos bancarios | ✅ |

### 📄 Documentales

| Herramienta | Descripción | Auth |
|-------------|-------------|------|
| `search_documents` | Búsqueda semántica | ✅ |
| `analyze_document` | Análisis con IA | ✅ |
| `ask_document_question` | Q&A sobre documentos | ✅ |
| `get_document_details` | Detalles de documento | ✅ |
| `extract_document_entities` | Extracción de entidades | ✅ |
| `generate_document_summary` | Generar resumen | ✅ |
| `compare_documents` | Comparar documentos | ✅ |

### 🖥️ Sistema

| Herramienta | Descripción | Auth |
|-------------|-------------|------|
| `get_system_status` | Estado del sistema | ❌ |
| `get_neural_status` | Estado neural | ❌ |
| `get_system_metrics` | Métricas detalladas | ✅ |
| `trigger_backup` | Backup manual | ✅ |
| `clear_cache` | Limpiar caché | ✅ |
| `get_service_logs` | Ver logs | ✅ |
| `health_check` | Chequeo de salud | ❌ |
| `restart_service` | Reiniciar servicio | ✅ |

## 🔌 Uso del Cliente

### CLI Python

```bash
# Listar herramientas
./scripts/mcp-client.py list

# Ejecutar herramienta
./scripts/mcp-client.py tool get_financial_summary --period month

# Con parámetros JSON
./scripts/mcp-client.py tool search_documents --json '{"query": "invoice", "limit": 5}'

# Ver información de herramienta
./scripts/mcp-client.py info get_transactions

# Ver capacidades del servidor
./scripts/mcp-client.py capabilities
```

### API REST

```bash
# Listar herramientas
curl http://localhost:8080/mcp/tools

# Ejecutar herramienta
curl -X POST http://localhost:8080/mcp/tools/get_financial_summary/execute \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"period": "month"}'
```

### WebSocket

```javascript
const ws = new WebSocket('ws://localhost:8080');

ws.send(JSON.stringify({
  type: 'tool-execute',
  tool: 'get_financial_summary',
  params: { period: 'month' },
  requestId: '123'
}));
```

## 🚀 Deployment en NAS

El MCP Bridge se despliega en un volumen dedicado separado del AI Service principal:
- **Volumen**: `/volume1/docker/ai-service-mcp`
- **Configuración**: `/volume1/docker/ai-service-mcp/config`
- **Logs**: `/volume1/docker/ai-service-mcp/logs`

### Deployment Automático

```bash
# Usar script de deployment
./scripts/deploy-to-nas.sh
```

### Deployment Manual

```bash
ssh k2600x@192.168.1.11
cd /volume1/docker/ai-service-mcp
sudo docker-compose -f docker-compose.mcp.yml up -d
```

Ver [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) para instrucciones detalladas.

## 🔐 Seguridad

1. **JWT Authentication**: Tokens seguros con expiración
2. **API Keys**: Para automatización y servicios
3. **Rate Limiting**: Protección contra abuso
4. **CORS**: Configuración estricta
5. **Input Validation**: Validación con Zod

## 📊 Monitoreo

- Health check: `GET /health`
- Métricas: `GET /mcp/info`
- Logs: Formato JSON para análisis

## 🧪 Testing

```bash
# Tests unitarios
npm test

# Tests de integración
npm run test:integration

# Linting
npm run lint
```

## 📝 Ejemplos

### Obtener resumen financiero

```python
# Python
client = MCPClient()
result = client.execute_tool('get_financial_summary', {'period': 'month'})
print(result['data'])
```

### Buscar documentos

```bash
# CLI
./scripts/mcp-client.py tool search_documents --query "contract" --limit 10
```

### Analizar gastos

```javascript
// JavaScript/Node.js
const response = await fetch('http://localhost:8080/mcp/tools/analyze_expenses/execute', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    startDate: '2024-01-01',
    endDate: '2024-12-31'
  })
});
```

## 🐛 Troubleshooting

### Error: Cannot connect to AI Service

```bash
# Verificar red Docker
docker network ls | grep ai-service-network

# Verificar conectividad
docker exec mcp-bridge ping ai-service
```

### Error: Authentication failed

```bash
# Verificar JWT secret
echo $JWT_SECRET

# Debe coincidir en ambos servicios
```

### Error: Rate limit exceeded

```bash
# Ajustar límites en .env
RATE_LIMIT_MAX_REQUESTS=200
RATE_LIMIT_WINDOW_MS=60000
```

## 📄 Licencia

MIT

## 🤝 Contribuir

1. Fork el proyecto
2. Crear feature branch (`git checkout -b feature/amazing`)
3. Commit cambios (`git commit -m 'Add amazing feature'`)
4. Push al branch (`git push origin feature/amazing`)
5. Abrir Pull Request