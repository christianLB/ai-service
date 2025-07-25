# 🚀 ACTIVACIÓN INMEDIATA DEL SISTEMA CI/CD

## ⚡ Pasos para activar TODO ahora mismo:

### 1️⃣ Configurar GitHub Container Registry (5 minutos)

```bash
# Generar token en GitHub
# https://github.com/settings/tokens/new
# Permisos necesarios: write:packages, read:packages, delete:packages

# Configurar autenticación local
make cicd-setup
# Seleccionar opción 1: Configure GitHub Container Registry
```

### 2️⃣ Configurar Secretos en GitHub (3 minutos)

Ir a: https://github.com/christianlb/ai-service/settings/secrets/actions

Agregar estos secretos:

- `GHCR_TOKEN`: Token generado en paso 1
- `NAS_SSH_PASSWORD`: Password SSH del NAS
- `NAS_SUDO_PASSWORD`: Password sudo del NAS
- `TELEGRAM_BOT_TOKEN`: Token del bot de Telegram (opcional)
- `TELEGRAM_CHAT_ID`: ID del chat de Telegram (opcional)

### 3️⃣ Preparar el NAS (5 minutos)

```bash
# Crear directorio de configuración
ssh k2600x@192.168.1.11 "mkdir -p /volume1/docker/ai-service/config/watchtower"

# Copiar configuración de Watchtower
scp config/watchtower/config.json k2600x@192.168.1.11:/volume1/docker/ai-service/config/watchtower/

# Copiar scripts de emergencia
make emergency-sync

# Crear backup preventivo
make prod-backup
```

### 4️⃣ Activar el nuevo sistema (2 minutos)

```bash
# Commit y push de todos los cambios
git add .
git commit -m "feat: implement complete CI/CD pipeline with automated deployment

- GitHub Actions builds and pushes to ghcr.io
- Watchtower auto-deploys new images
- Emergency rollback in < 30 seconds
- Monitoring with < 50MB overhead
- Optimized for Synology DSM 420+ (10GB RAM)"

git push origin main
```

### 5️⃣ Verificar que funciona (3 minutos)

```bash
# Ver el build en GitHub Actions
# https://github.com/christianlb/ai-service/actions

# Una vez termine el build, verificar en el NAS:
make prod-status

# Ver logs de Watchtower
ssh k2600x@192.168.1.11 "docker logs ai-watchtower -f"
```

## 🎯 Resultado esperado:

1. **Push a main** → GitHub Actions se activa
2. **Build automático** → Imagen subida a ghcr.io
3. **Watchtower detecta** → Nueva imagen disponible
4. **Deploy automático** → Contenedor actualizado
5. **Notificación** → Telegram avisa del deploy

Total: **< 10 minutos de push a producción**

## 🆘 Si algo falla:

```bash
# Diagnóstico rápido
make emergency-diagnose

# Rollback inmediato
make emergency-rollback

# Ver runbook completo
make 911
```

## 📊 Monitoreo:

```bash
# Dashboard visual
make monitor-dashboard
# Abre http://localhost:8080

# Métricas Prometheus
curl http://192.168.1.11:3003/metrics
```

## ✅ Checklist final:

- [ ] GitHub token configurado
- [ ] Secretos en GitHub agregados
- [ ] Configuración copiada al NAS
- [ ] Backup preventivo creado
- [ ] Push realizado
- [ ] Deploy verificado

---

**¡El sistema está LISTO para activarse!** 🚀

Solo necesitas seguir estos pasos y en menos de 20 minutos tendrás CI/CD completo funcionando.
