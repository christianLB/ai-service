# 🚀 Manual: Cambio a Auto-Deploy en NAS Synology

## **Opción 1: Via SSH (Recomendada)**

### Desde tu máquina local:
```bash
# 1. Commit y push los cambios
git add . && git commit -m "feat: enable watchtower auto-deploy"
git push

# 2. Esperar que GitHub Actions termine (3-5 min)

# 3. Ejecutar switch remoto
make switch-to-ghcr-remote
```

### O manualmente vía SSH:
```bash
# 1. SSH al NAS
ssh anaxi@ai-service.anaxi.net

# 2. Una vez dentro
cd ~/ai-service

# 3. Pull del proyecto actualizado
git pull

# 4. Pull de la nueva imagen
docker pull ghcr.io/k2600x/ai-service:latest

# 5. Restart con Watchtower
docker compose down
docker compose up -d

# 6. Verificar
docker compose ps
docker compose logs watchtower
```

---

## **Opción 2: Via Container Manager (GUI)**

### 1. Acceder a DSM
- Abrir DSM de tu NAS en el navegador
- Ir a **Container Manager**

### 2. Actualizar el proyecto ai-service
- Ir a **Project** → **ai-service**
- **Stop** el proyecto
- **Edit** el proyecto
- Cambiar en `ai-service` service:
  ```yaml
  # Cambiar de:
  build: 
    context: .
    target: production
  
  # A:
  image: ghcr.io/k2600x/ai-service:latest
  ```

### 3. Agregar Watchtower
- En la misma edición, agregar servicio:
  ```yaml
  watchtower:
    image: containrrr/watchtower:latest
    environment:
      - WATCHTOWER_CLEANUP=true
      - WATCHTOWER_POLL_INTERVAL=300
      - WATCHTOWER_SCOPE=ai-service
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: --scope ai-service --cleanup --interval 300
  ```

### 4. Start del proyecto
- **Save** y **Start** el proyecto
- Verificar que todos los servicios están **running**
- Revisar logs de **watchtower**

---

## **Opción 3: Portainer (Si lo tienes instalado)**

### 1. Acceder a Portainer
- Abrir Portainer en tu NAS
- Ir a **Stacks** → **ai-service**

### 2. Editar Stack
- **Editor** → Modificar docker-compose.yml
- Hacer los mismos cambios que en Opción 2

### 3. Update Stack
- **Update the stack**
- Verificar servicios

---

## **Verificación Post-Switch**

### Comandos para verificar:
```bash
# Estado de servicios
docker compose ps

# Logs de Watchtower
docker compose logs watchtower

# Test de versión
curl http://localhost:3000/api/version

# Test de notificación
curl -X POST http://localhost:3000/api/test-notification

# Estado de salud
curl http://localhost:3000/status
```

### ✅ **Señales de que funciona:**
- Watchtower muestra logs de "Checking for updates"
- API `/version` muestra versión nueva (v2025.01.07-xxxxx)
- Test notification envía mensaje a Telegram
- Próximo push → Auto-deploy + notificación

---

## **🎯 Resultado Final:**

Después del switch:
- ✅ **Auto-deploy** activado 
- ✅ **Watchtower** monitoreando cada 5 min
- ✅ **Notificaciones** vía Telegram
- ✅ **Versioning** visible en dashboard
- ✅ **Zero manual work** en futuros deployments

**¡Es el último redespliegue manual que harás!** 🚀