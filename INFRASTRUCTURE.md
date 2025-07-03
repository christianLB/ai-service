# 🏗️ Documentación de Infraestructura - AI Service

## 📍 Información de Producción

### **🏠 Servidor Principal**
- **Hardware**: Synology DSM 420+
- **IP Local**: `192.168.1.11`
- **Tipo**: Self-hosted / Auto-alojado
- **OS**: Synology DSM

### **🌐 Dominio y SSL**
- **Dominio Principal**: `anaxi.net`
- **DNS/CDN**: Cloudflare
- **SSL**: Certificado único para todos los subdominios
- **Configuración**: Todos los subdominios → Proxy inverso

### **🔄 Proxy Inverso**
- **Función**: Enrutamiento de subdominios
- **SSL Termination**: Cloudflare → Proxy → Servicios internos
- **Configuración**: `*.anaxi.net` → `192.168.1.11`

---

## 🎯 Estrategia de Deployment para Telegram Bot

### **🚀 Opción Recomendada: Subdominio Dedicado**

#### **Setup Propuesto:**
```
ai-service.anaxi.net → 192.168.1.11:3000
```

#### **Configuración del Webhook:**
```bash
# Webhook URL de producción
TELEGRAM_WEBHOOK_URL=https://ai-service.anaxi.net/api/telegram/webhook
```

#### **Ventajas de esta Estrategia:**
- ✅ **SSL automático** vía Cloudflare
- ✅ **Dominio profesional** vs ngrok temporal
- ✅ **Persistencia** sin reiniciar URLs
- ✅ **Performance óptima** sin tunneling
- ✅ **Control total** sobre la infraestructura

---

## 🔧 Configuración de Producción

### **1. Variables de Entorno para Producción**

Actualizar `.env.local` para producción:
```bash
# === CORE SERVICE ===
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# === TELEGRAM BOT ===
TELEGRAM_BOT_TOKEN=tu_token_real_de_botfather
TELEGRAM_CHAT_ID=tu_chat_id_real
TELEGRAM_WEBHOOK_URL=https://ai-service.anaxi.net/api/telegram/webhook
TELEGRAM_ALERTS_ENABLED=true

# === DATABASE (Synology) ===
POSTGRES_HOST=192.168.1.11
POSTGRES_PORT=5432
POSTGRES_DB=ai_service
POSTGRES_USER=ai_user
POSTGRES_PASSWORD=tu_password_seguro

# === DASHBOARD ===
DASHBOARD_URL=https://ai-service.anaxi.net/dashboard

# === MONITORING ===
PROMETHEUS_ENABLED=true
GRAFANA_URL=https://grafana.anaxi.net
```

### **2. Configuración del Proxy Inverso (Synology)**

#### **Crear Regla de Proxy:**
1. **DSM** → **Control Panel** → **Application Portal** → **Reverse Proxy**
2. **Agregar regla**:
   ```
   Source:
   - Protocol: HTTPS
   - Hostname: ai-service.anaxi.net
   - Port: 443
   
   Destination:
   - Protocol: HTTP
   - Hostname: localhost
   - Port: 3000
   ```

#### **Headers Adicionales:**
```
X-Real-IP: $remote_addr
X-Forwarded-For: $proxy_add_x_forwarded_for
X-Forwarded-Proto: $scheme
Host: $host
```

### **3. Docker Compose para Synology**

Crear `docker-compose.synology.yml`:
```yaml
version: '3.8'

services:
  ai-service:
    build: .
    container_name: ai-service-prod
    environment:
      - NODE_ENV=production
    env_file:
      - .env.local
    ports:
      - "3000:3000"
    volumes:
      - /volume1/docker/ai-service/data:/app/data
      - /volume1/docker/ai-service/logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:3000/status || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15-alpine
    container_name: ai-service-db
    environment:
      POSTGRES_DB: ai_service
      POSTGRES_USER: ai_user
      POSTGRES_PASSWORD: tu_password_seguro
    volumes:
      - /volume1/docker/ai-service/postgres:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: ai-service-redis
    command: redis-server --requirepass tu_redis_password
    volumes:
      - /volume1/docker/ai-service/redis:/data
    ports:
      - "6379:6379"
    restart: unless-stopped
```

---

## 🚀 Plan de Deployment Paso a Paso

### **Fase 1: Preparación del Synology (15 min)**

#### **1.1 Crear Estructura de Directorios**
```bash
# En el Synology DSM File Manager:
/volume1/docker/ai-service/
├── data/
├── logs/
├── postgres/
└── redis/
```

#### **1.2 Instalar Docker (si no está instalado)**
- **Package Center** → **Docker** → **Install**

### **Fase 2: Configuración de DNS/Proxy (10 min)**

#### **2.1 Verificar DNS**
```bash
# Verificar que ai-service.anaxi.net apunta a CloudFront
nslookup ai-service.anaxi.net
```

#### **2.2 Configurar Proxy Inverso**
- Seguir pasos de la sección "Configuración del Proxy Inverso"

### **Fase 3: Deploy del AI Service (10 min)**

#### **3.1 Subir Código al Synology**
```bash
# Opción A: Git clone en Synology
ssh admin@192.168.1.11
cd /volume1/docker/
git clone tu-repo ai-service

# Opción B: SFTP upload
scp -r ./ai-service admin@192.168.1.11:/volume1/docker/
```

#### **3.2 Configurar Variables de Entorno**
```bash
# En Synology
cd /volume1/docker/ai-service
cp .env.example .env.local
# Editar .env.local con valores reales
```

#### **3.3 Iniciar Servicios**
```bash
# En Synology
docker-compose -f docker-compose.synology.yml up -d
```

### **Fase 4: Configuración del Webhook (5 min)**

#### **4.1 Verificar Servicio Online**
```bash
curl https://ai-service.anaxi.net/status
```

#### **4.2 Configurar Webhook de Telegram**
```bash
curl -X POST https://ai-service.anaxi.net/api/telegram/setup-webhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://ai-service.anaxi.net/api/telegram/webhook"}'
```

#### **4.3 Test Final**
- Enviar `/start` al bot de Telegram
- Verificar respuesta

---

## 🔍 Monitoreo y Mantenimiento

### **URLs de Servicios en Producción**
```
AI Service:     https://ai-service.anaxi.net
Dashboard:      https://ai-service.anaxi.net/dashboard
Health Check:   https://ai-service.anaxi.net/status
Telegram API:   https://ai-service.anaxi.net/api/telegram/status
```

### **Logs y Debugging**
```bash
# Ver logs del servicio
ssh admin@192.168.1.11
cd /volume1/docker/ai-service
docker-compose logs -f ai-service

# Verificar estado de contenedores
docker-compose ps
```

### **Backup y Persistencia**
```bash
# Los datos se persisten en:
/volume1/docker/ai-service/postgres/  # Base de datos
/volume1/docker/ai-service/data/      # Archivos de aplicación
/volume1/docker/ai-service/logs/      # Logs del sistema
```

---

## 🚨 Troubleshooting

### **❌ "ai-service.anaxi.net no responde"**
**Causa**: Proxy inverso no configurado
**Solución**: Verificar regla en DSM → Application Portal

### **❌ "SSL Certificate error"**
**Causa**: Cloudflare no tiene el subdominio
**Solución**: Verificar configuración de Cloudflare para `*.anaxi.net`

### **❌ "Telegram webhook fails"**
**Causa**: URL no accesible desde internet
**Solución**: Verificar que el dominio resuelve correctamente desde fuera de la red

### **❌ "Database connection error"**
**Causa**: PostgreSQL no disponible
**Solución**: 
```bash
docker-compose restart postgres
docker-compose logs postgres
```

---

## 📊 Ventajas de esta Infraestructura

### **🏠 Self-Hosted**
- ✅ **Control total** sobre datos y servicios
- ✅ **Sin costos de hosting** mensual en cloud
- ✅ **Performance local** para datos sensibles
- ✅ **Backup físico** en dispositivo propio

### **🌐 Dominio Profesional**
- ✅ **SSL automático** vía Cloudflare
- ✅ **Subdominio limpio** vs ngrok temporal
- ✅ **Escalabilidad** para múltiples servicios
- ✅ **Persistencia** sin cambio de URLs

### **🔄 Proxy Inverso**
- ✅ **Múltiples servicios** en un solo servidor
- ✅ **SSL termination** centralizado
- ✅ **Load balancing** futuro
- ✅ **Header injection** para logging

---

## 🎯 Próximos Pasos

### **Inmediato (Hoy)**
1. ✅ Configurar proxy inverso para `ai-service.anaxi.net`
2. ✅ Deploy del AI Service en Synology
3. ✅ Configurar webhook de Telegram
4. ✅ Testing completo del bot

### **Esta Semana**
- [ ] Monitoreo con Grafana en `grafana.anaxi.net`
- [ ] Backup automático de base de datos
- [ ] Alertas de sistema vía Telegram
- [ ] Documentación de procedures

### **Próximo Mes**
- [ ] Multi-servicio deployment
- [ ] CI/CD pipeline desde GitHub
- [ ] Monitoring avanzado
- [ ] Disaster recovery plan

---

**Infraestructura documentada**: 2025-07-02  
**Servidor**: Synology DSM 420+ (192.168.1.11)  
**Dominio**: anaxi.net con Cloudflare  
**Estado**: Listo para deployment de producción ✅