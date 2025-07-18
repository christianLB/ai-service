# 🚀 MCP Bridge - Guía de Despliegue Rápido

## 📋 Pre-requisitos

- ✅ AI Service funcionando en el NAS
- ✅ Docker y Docker Compose instalados
- ✅ Acceso SSH al NAS (192.168.1.11)
- ✅ Node.js 18+ (para desarrollo local)

## 🔧 Configuración Inicial

### 1. Preparar entorno local

```bash
cd mcp-bridge
npm install
cp .env.production .env
# Editar .env con tus valores
```

### 2. Obtener token de autenticación

```bash
# Obtener JWT token del AI Service
curl -X POST http://192.168.1.11:3003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@ai-service.local", "password": "admin123"}' \
  | jq -r '.token'

# Guardar el token
export MCP_AUTH_TOKEN=<token-obtenido>
```

## 🐳 Despliegue en NAS

### Opción A: Script Automático (Recomendado)

```bash
# Asegurar que .make.env existe en el directorio padre
cd ..
cp .make.env.example .make.env  # Si no existe
# Editar .make.env con credenciales del NAS

cd mcp-bridge
./scripts/deploy-to-nas.sh
```

### Opción B: Despliegue Manual

```bash
# 1. Crear estructura en NAS
ssh k2600x@192.168.1.11
sudo mkdir -p /volume1/docker/ai-service-mcp/{config,logs,scripts,src}
sudo chown -R k2600x:users /volume1/docker/ai-service-mcp

# 2. Copiar archivos
# Desde local:
rsync -avz --exclude='node_modules' --exclude='dist' ./ \
  k2600x@192.168.1.11:/volume1/docker/ai-service-mcp/src/

scp .env.production k2600x@192.168.1.11:/volume1/docker/ai-service-mcp/config/.env
scp docker-compose.mcp.yml k2600x@192.168.1.11:/volume1/docker/ai-service-mcp/

# 3. Build y deploy en NAS
ssh k2600x@192.168.1.11
cd /volume1/docker/ai-service-mcp/src
sudo docker build -t mcp-bridge:latest .

cd /volume1/docker/ai-service-mcp
sudo docker-compose -f docker-compose.mcp.yml up -d
```

## ✅ Verificación

### 1. Test de salud

```bash
# Verificar que el servicio responde
curl http://192.168.1.11:8080/health

# Ver capacidades
curl http://192.168.1.11:8080/mcp/capabilities | jq .
```

### 2. Test completo

```bash
cd mcp-bridge
export MCP_ENDPOINT=http://192.168.1.11:8080
./scripts/test-mcp.sh
```

### 3. Usar el cliente MCP

```bash
# Configurar variables
export MCP_ENDPOINT=http://192.168.1.11:8080
export MCP_AUTH_TOKEN=<tu-token>

# Listar herramientas
python scripts/mcp-client.py list

# Ejecutar herramienta
python scripts/mcp-client.py tool get_financial_summary --period month
```

## 🔍 Monitoreo

### Ver logs en tiempo real

```bash
ssh k2600x@192.168.1.11
sudo docker logs -f mcp-bridge
```

### Ver estado del contenedor

```bash
sudo docker ps | grep mcp-bridge
sudo docker stats mcp-bridge
```

### Ejecutar mantenimiento

```bash
ssh k2600x@192.168.1.11
cd /volume1/docker/ai-service-mcp/scripts
sudo ./maintenance.sh
```

## 🚨 Troubleshooting

### Error: Cannot connect to AI Service

```bash
# Verificar que ambos contenedores están en la misma red
sudo docker network inspect ai-service-network
```

### Error: Authentication failed

```bash
# Verificar JWT secret
sudo docker exec mcp-bridge env | grep JWT_SECRET
# Debe ser: ultra_secure_jwt_secret_key_2025
```

### Error: Container not starting

```bash
# Ver logs detallados
sudo docker logs mcp-bridge --tail 50
```

## 🔐 Seguridad

### Generar API Keys

```bash
# Generar 3 API keys seguras
for i in {1..3}; do
  openssl rand -hex 32
done

# Añadir a VALID_API_KEYS en .env (separadas por comas)
```

### Configurar Proxy Inverso (Opcional)

En Synology DSM:
1. Control Panel → Application Portal → Reverse Proxy
2. Create:
   - Source: `https://mcp.ai-service.anaxi.net`
   - Destination: `http://localhost:8080`

## 📊 Comandos Útiles

```bash
# Reiniciar servicio
sudo docker-compose -f docker-compose.mcp.yml restart

# Ver métricas
curl http://192.168.1.11:8080/mcp/info | jq .

# Backup configuración
tar -czf mcp-backup.tar.gz /volume1/docker/ai-service-mcp/config

# Limpiar logs antiguos
find /volume1/docker/ai-service-mcp/logs -name "*.log" -mtime +7 -delete
```

## 🎯 Próximos Pasos

1. ✅ Verificar todas las herramientas funcionan
2. ✅ Configurar Claude Code con el endpoint
3. ⏳ Configurar proxy inverso (opcional)
4. ⏳ Configurar alertas de monitoreo
5. ⏳ Documentar API keys generadas

## 📝 Notas

- El volumen MCP está en: `/volume1/docker/ai-service-mcp`
- Los logs se guardan en: `/volume1/docker/ai-service-mcp/logs`
- La configuración está en: `/volume1/docker/ai-service-mcp/config`
- El contenedor se llama: `mcp-bridge`
- El puerto expuesto es: `8080`