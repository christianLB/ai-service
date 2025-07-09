# CI/CD Security Configuration - AI Service

## Guía Rápida de Configuración de Seguridad

Esta guía te ayudará a configurar todos los aspectos de seguridad necesarios para el sistema CI/CD del AI Service.

## 🚀 Inicio Rápido

```bash
# Configuración completa de CI/CD (interactivo)
make cicd-setup

# O ejecutar pasos individuales:
make ghcr-setup      # Configurar GitHub Container Registry
make validate-cicd   # Validar configuración
```

## 📁 Archivos Creados

### 1. `/config/watchtower/config.json`
- **Descripción**: Configuración de autenticación Docker para Watchtower
- **Uso**: Permite a Watchtower en el NAS descargar imágenes de ghcr.io
- **Seguridad**: Contiene credenciales codificadas en base64, debe tener permisos 600

### 2. `/scripts/secure-secrets-manager.sh`
- **Descripción**: Script interactivo para gestión segura de secretos
- **Uso**: Gestiona credenciales, backups, rotación de secretos
- **Comandos disponibles**:
  ```bash
  ./scripts/secure-secrets-manager.sh setup    # Configuración completa
  ./scripts/secure-secrets-manager.sh ghcr     # Solo GHCR
  ./scripts/secure-secrets-manager.sh verify   # Verificar seguridad
  ./scripts/secure-secrets-manager.sh backup   # Backup de secretos
  ```

### 3. `/.env.template`
- **Descripción**: Template con todas las variables de entorno necesarias
- **Uso**: Base para crear `.env.production`
- **Contenido**: 170+ variables organizadas por categorías

### 4. `/docs/GITHUB_SECRETS_SETUP.md`
- **Descripción**: Documentación detallada de secretos necesarios en GitHub
- **Uso**: Guía paso a paso para configurar GitHub Actions
- **Incluye**: Nombres exactos, formatos, y cómo obtener cada secreto

## 🔐 Secretos Requeridos

### GitHub Actions (Configurar en el repositorio)

1. **GHCR_TOKEN**
   - Token de GitHub con permisos de packages
   - Necesario para publicar imágenes Docker

2. **NAS_SSH_PASSWORD**
   - Contraseña SSH del usuario k2600x
   - Para deployment automático

3. **NAS_SUDO_PASSWORD**
   - Contraseña para comandos sudo
   - Para operaciones privilegiadas

### Servidor de Producción (Configurar en el NAS)

1. **Variables de entorno** en `.env.production`
2. **Configuración de Watchtower** en `/config/watchtower/config.json`

## 🛡️ Mejores Prácticas de Seguridad

### 1. Permisos de Archivos
```bash
# Verificar permisos
make -f Makefile.security permissions-check

# Los archivos sensibles deben tener permisos 600
chmod 600 .env.production
chmod 600 config/watchtower/config.json
```

### 2. Rotación de Secretos
```bash
# Rotar secretos interactivamente
make -f Makefile.security secrets-rotate

# Generar nuevo secret seguro
make -f Makefile.security generate-secret
```

### 3. Auditoría de Seguridad
```bash
# Escanear por secretos expuestos
make -f Makefile.security security-scan

# Auditoría completa
make -f Makefile.security secrets-audit
```

### 4. Backups Seguros
```bash
# Crear backup cifrado
make -f Makefile.security secrets-backup

# Restaurar desde backup
make -f Makefile.security secrets-restore
```

## 🔄 Flujo de CI/CD Seguro

1. **Push a GitHub** → GitHub Actions se ejecuta
2. **Build de imagen** → Se autentica con GHCR usando GHCR_TOKEN
3. **Push a ghcr.io** → Imagen publicada en GitHub Container Registry
4. **Watchtower en NAS** → Detecta nueva imagen usando config.json
5. **Pull automático** → Descarga imagen autenticándose con ghcr.io
6. **Deploy** → Actualiza contenedor con nueva versión

## 🚨 Troubleshooting

### Error: "unauthorized: authentication required"
```bash
# Verificar autenticación GHCR
make -f Makefile.security test-ghcr-auth

# Regenerar configuración
make ghcr-setup
```

### Error: "Permission denied"
```bash
# Verificar permisos de archivos
make -f Makefile.security permissions-check

# Verificar credenciales SSH
cat .make.env  # Debe tener SSHPASS y SUDO_PASS
```

### Error: "Secret not found in GitHub"
1. Ve a Settings → Secrets → Actions en tu repositorio
2. Verifica que todos los secretos estén configurados
3. Los nombres deben coincidir exactamente (case sensitive)

## 📝 Checklist de Seguridad

- [ ] Archivo `.make.env` creado con credenciales SSH
- [ ] Ejecutado `make cicd-setup` exitosamente
- [ ] Secretos configurados en GitHub Actions
- [ ] Archivo `config/watchtower/config.json` copiado al NAS
- [ ] Permisos 600 en todos los archivos sensibles
- [ ] Backup de secretos creado y guardado de forma segura
- [ ] Validación ejecutada: `make validate-cicd`

## 🔗 Enlaces Útiles

- [GitHub Personal Access Tokens](https://github.com/settings/tokens)
- [GitHub Actions Secrets](https://github.com/christianlb/ai-service/settings/secrets/actions)
- [Docker Registry Authentication](https://docs.docker.com/engine/reference/commandline/login/)

---

**Última actualización**: 2025-07-09
**Mantenido por**: Elena (Security Guardian)