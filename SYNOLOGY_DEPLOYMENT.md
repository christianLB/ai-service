# 🚀 Synology NAS Deployment Guide

Este documento explica cómo desplegar AI Service en un Synology NAS usando Docker.

## 📋 Pre-requisitos

1. **Synology NAS** con Docker instalado
2. **SSH habilitado** en el NAS
3. **Git** instalado (opcional)
4. **Acceso a GitHub** para descargar la imagen

## 🔧 Configuración Inicial

### 1. Preparar el archivo de configuración

1. Conéctate al NAS por SSH:
```bash
ssh usuario@tu-nas-ip
```

2. Crea el directorio de configuración:
```bash
sudo mkdir -p /volume1/docker/ai-service/config
```

3. Crea el archivo `.env.production`:
```bash
sudo nano /volume1/docker/ai-service/config/.env.production
```

4. Copia la configuración de `.env.production` del repositorio y ajusta:
   - Contraseñas de base de datos
   - API keys reales
   - Tokens de Telegram
   - URLs correctas

### 2. Despliegue Automático

Opción A - Descargar y ejecutar el script:
```bash
# Descargar el script
curl -o deploy-synology.sh https://raw.githubusercontent.com/christianLB/ai-service/main/scripts/deploy-synology.sh

# Hacer ejecutable
chmod +x deploy-synology.sh

# Ejecutar
./deploy-synology.sh
```

Opción B - Despliegue manual:
```bash
# Descargar docker-compose
curl -o docker-compose.yml https://raw.githubusercontent.com/christianLB/ai-service/main/docker-compose.synology.yml

# Cargar variables de entorno
export $(cat /volume1/docker/ai-service/config/.env.production | grep -v '^#' | xargs)

# Iniciar servicios
docker-compose up -d
```

## 🔄 Actualización Automática

El proceso ahora es completamente automático:

1. **Push a GitHub** → GitHub Actions construye la imagen
2. **Imagen publicada** en `ghcr.io/christianlb/ai-service:latest`
3. **En el NAS**, ejecutar:
```bash
./deploy-synology.sh
```

El script:
- Descarga la última configuración
- Pull de la última imagen
- Reinicia los servicios
- Verifica el estado

## 📊 Monitoreo

### Ver logs en tiempo real:
```bash
docker logs -f ai-service-prod
```

### Ver estado de servicios:
```bash
docker-compose ps
```

### Acceder a los servicios:
- **AI Service**: http://tu-nas:3001
- **Dashboard**: http://tu-nas:3001/dashboard
- **Prometheus**: http://tu-nas:9091

## 🛠️ Troubleshooting

### Si el servicio no inicia:

1. Verificar logs:
```bash
docker logs ai-service-prod
```

2. Verificar que PostgreSQL esté listo:
```bash
docker logs ai-service-db
```

3. Verificar archivo .env:
```bash
cat /volume1/docker/ai-service/config/.env.production
```

### Si hay errores de migración:

Conectar a la base de datos:
```bash
docker exec -it ai-service-db psql -U ai_user -d ai_service
```

Ver esquemas:
```sql
\dn
\dt financial.*
```

## 🔐 Seguridad

1. **Nunca** commitear `.env.production` con datos reales
2. **Usar** contraseñas fuertes para PostgreSQL y Redis
3. **Configurar** firewall del NAS para limitar acceso
4. **Habilitar** HTTPS con reverse proxy de Synology

## 📝 Notas Importantes

- El archivo `.env.production` se lee desde `/volume1/docker/ai-service/config/`
- Los datos persisten en `/volume1/docker/ai-service/`
- La imagen se actualiza automáticamente desde GitHub
- No necesitas clonar el repositorio en el NAS