# MCP Bridge - Secure Deployment Guide

## 🔐 Principio Fundamental

**NUNCA** se deben exponer, mostrar o registrar claves, secretos o credenciales. Todo el proceso está diseñado para manejar información sensible de forma segura y automatizada.

## 🚀 Flujo de Despliegue Seguro

### Opción 1: Flujo Completo Automatizado (Recomendado)

```bash
make mcp-secure-workflow
```

Este comando ejecuta automáticamente:
1. Generación segura de configuración
2. Validación de configuración
3. Backup de configuración
4. Despliegue seguro
5. Testing sin exposición
6. Validación final

### Opción 2: Paso a Paso

#### 1. Generar Configuración Segura

```bash
make mcp-setup-secure
```

**Resultado esperado:**
```
✅ Production configuration generated successfully
✅ Secrets stored in: .env.production
✅ File permissions set to 600 (read/write owner only)
```

#### 2. Validar Configuración

```bash
make mcp-validate-config
```

**Resultado esperado:**
```
✅ All configurations valid
✅ Ready for deployment
```

#### 3. Crear Backup

```bash
make mcp-backup-config
```

**Resultado esperado:**
```
✅ Backup created: config-production-TIMESTAMP.tar.gz.enc
```

#### 4. Desplegar

```bash
make mcp-deploy-secure
```

**Resultado esperado:**
```
✅ Configuration validated
✅ Package created
✅ Transferred to NAS
✅ Docker image built
✅ Container started
✅ Deployment successful
```

#### 5. Testing

```bash
make mcp-test-secure
```

**Resultado esperado:**
```
✅ All tests passed!
✅ MCP Bridge is ready for production use
```

#### 6. Validación Final

```bash
make mcp-validate-deployment
```

**Resultado esperado:**
```
✅ Container Status: RUNNING
✅ Health Endpoint: RESPONSIVE
✅ Authentication: WORKING
✅ AI Service Connection: ESTABLISHED
✅ Tool Registry: 24 TOOLS LOADED
✅ Security: PROPERLY CONFIGURED

Deployment Status: SUCCESS
```

## 🛡️ Scripts de Seguridad

### secure-setup.sh
- Genera JWT secret de 128 caracteres
- Genera 3 API keys de 64 caracteres
- Actualiza .env automáticamente
- Establece permisos 600 (solo lectura/escritura del propietario)
- **NUNCA muestra las claves generadas**

### validate-config.sh
- Verifica longitud mínima de secretos
- Valida formato de API keys
- Comprueba URLs y puertos
- Verifica permisos de archivos
- **Solo reporta estado, no valores**

### backup-config.sh
- Crea backups encriptados con AES-256
- Usa hostname como parte de la clave de encriptación
- Mantiene máximo 10 backups
- **Backups solo se pueden restaurar en el mismo host**

### deploy-secure.sh
- Valida prerequisitos antes de desplegar
- Transfiere archivos de forma segura
- Construye y despliega sin exponer configuración
- Verifica el despliegue automáticamente
- **Todo el proceso sin mostrar credenciales**

### test-production.sh
- Lee API key del archivo sin mostrarla
- Ejecuta tests completos
- Reporta solo resultados
- **Nunca expone credenciales en logs**

### validate-deployment.sh
- Verifica infraestructura completa
- Comprueba seguridad
- Valida integraciones
- **Detecta si hay secretos expuestos en logs**

### rollback.sh
- Guarda estado antes de rollback
- Detiene y limpia de forma segura
- Opción de restaurar desde backup
- **Preserva logs para análisis**

## 🔒 Medidas de Seguridad

1. **Archivos de Configuración**
   - Permisos 600 en todos los .env
   - Archivos excluidos de git
   - Backups encriptados

2. **Transmisión**
   - SSH para todas las transferencias
   - No se usan contraseñas en texto plano
   - Configuración empaquetada de forma segura

3. **Logs y Monitoreo**
   - Validación automática de logs sin secretos
   - Rotación automática de logs
   - Auditoría de seguridad incluida

4. **Autenticación**
   - JWT con secretos fuertes
   - API keys únicas por ambiente
   - Rate limiting activo

## 🚨 Troubleshooting

### Si el despliegue falla:

1. **Revisar logs sin exponer datos:**
   ```bash
   make mcp-logs
   ```

2. **Validar configuración:**
   ```bash
   make mcp-validate-config
   ```

3. **Ejecutar rollback:**
   ```bash
   make mcp-rollback
   ```

### Si necesitas regenerar secretos:

```bash
# Hacer backup primero
make mcp-backup-config

# Regenerar
make mcp-setup-secure

# Validar
make mcp-validate-config
```

## ⚠️ Importante

1. **NUNCA** edites manualmente los archivos .env con secretos
2. **SIEMPRE** usa los scripts para cualquier operación con credenciales
3. **VERIFICA** que no hay secretos en logs antes de compartirlos
4. **GUARDA** los backups en un lugar seguro
5. **DOCUMENTA** cualquier cambio en el proceso de seguridad

## 📋 Checklist Pre-Despliegue

- [ ] ¿Tienes acceso SSH al NAS?
- [ ] ¿Docker está instalado y funcionando?
- [ ] ¿El AI Service está corriendo?
- [ ] ¿Hay al menos 1GB de espacio libre?
- [ ] ¿Has hecho backup de configuraciones anteriores?

## 🎯 Comando Rápido

Para un despliegue completo y seguro:

```bash
make mcp-secure-workflow
```

Este comando te guiará por todo el proceso de forma interactiva y segura.