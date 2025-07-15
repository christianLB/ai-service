# GoCardless Sandbox Setup Guide

## 🎯 Objetivo

Esta guía te ayudará a configurar y probar la integración con GoCardless en modo sandbox para importar cuentas y transacciones dummy.

## 📋 Pre-requisitos

1. **Cuenta en GoCardless Sandbox**: Regístrate en https://manage-sandbox.gocardless.com/
2. **Backend ejecutándose**: `make dev-up`
3. **Base de datos configurada**: Las migraciones deben estar aplicadas

## 🔧 Configuración

### Paso 1: Obtener el Access Token de Sandbox

1. Inicia sesión en [GoCardless Sandbox](https://manage-sandbox.gocardless.com/)
2. Ve a la sección de **Developers** → **Access tokens**
3. Genera un nuevo access token
4. Copia el token (se verá algo como: `sand_...`)

### Paso 2: Configurar el Sandbox

#### Opción A: Usando la UI (Recomendado)

1. Ve a http://localhost:3000/dashboard/integrations
2. Selecciona la pestaña **GoCardless**
3. Activa el **Modo Sandbox**
4. Completa los campos:
   - **Redirect URI**: `http://localhost:3000/financial/callback`
   - **Sandbox Access Token**: El token obtenido del portal de GoCardless
   - **Sandbox test bank ID**: `SANDBOXFINANCE_SFIN0000` (o déjalo vacío para usar el valor por defecto)
5. Haz clic en **Guardar**

#### Opción B: Usando la API

```bash
# Configurar todo de una vez
curl -X POST http://localhost:3000/api/integrations/configs \
  -H "Content-Type: application/json" \
  -d '[
    {
      "integrationType": "gocardless",
      "configKey": "sandbox_mode",
      "configValue": "true",
      "isGlobal": true
    },
    {
      "integrationType": "gocardless",
      "configKey": "redirect_uri",
      "configValue": "http://localhost:3000/financial/callback",
      "isGlobal": true
    },
    {
      "integrationType": "gocardless",
      "configKey": "sandbox_access_token",
      "configValue": "TU_ACCESS_TOKEN_AQUI",
      "isGlobal": true,
      "encrypt": true
    },
    {
      "integrationType": "gocardless",
      "configKey": "sandbox_institution_id",
      "configValue": "SANDBOXFINANCE_SFIN0000",
      "isGlobal": true
    }
  ]'
```

### Paso 3: Verificar la Configuración

#### Opción 1: Script de verificación
```bash
# Ejecutar el script de verificación
npx ts-node scripts/check-gocardless-config.ts
```

#### Opción 2: Verificación manual
```bash
curl http://localhost:3000/api/financial/sandbox-status
```

Deberías ver:
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "institutionId": "SANDBOXFINANCE_SFIN0000",
    "institutionName": "Sandbox Finance (Mock Bank)",
    "environment": "development",
    "testAccountsAvailable": true
  }
}
```

## 🚀 Ejecutar el Test Completo

### Opción 1: Script Automatizado

```bash
./scripts/test-gocardless-sandbox.sh
```

Este script:
1. Verifica que el backend esté ejecutándose
2. Crea una requisición de prueba
3. Te guía por el proceso de autorización
4. Importa cuentas y transacciones dummy
5. Muestra un resumen de los resultados

### Opción 2: Prueba Manual

1. **Crear una requisición**:
```bash
curl -X POST http://localhost:3000/api/financial/setup-sandbox
```

Recibirás:
```json
{
  "success": true,
  "data": {
    "requisitionId": "xxx-xxx-xxx",
    "consentUrl": "https://...",
    "requisition": {...}
  }
}
```

2. **Completar la autorización**:
   - Abre el `consentUrl` en tu navegador
   - Sigue el flujo de autorización (puedes usar cualquier credencial)
   - Completa el proceso

3. **Verificar el estado**:
```bash
curl http://localhost:3000/api/financial/requisition-status/TU_REQUISITION_ID
```

4. **Completar la configuración**:
```bash
curl -X POST http://localhost:3000/api/financial/complete-setup \
  -H "Content-Type: application/json" \
  -d '{"requisitionId": "TU_REQUISITION_ID"}'
```

5. **Ver las cuentas importadas**:
```bash
curl http://localhost:3000/api/financial/accounts
```

6. **Ver las transacciones**:
```bash
curl http://localhost:3000/api/financial/transactions
```

## 🧹 Limpiar Datos de Prueba

Para eliminar todos los datos del sandbox:

```bash
curl -X POST http://localhost:3000/api/financial/sandbox-reset
```

## ❓ Troubleshooting

### Error 404 al crear requisición
- **Causa**: URL incorrecta o token inválido
- **Solución**: Verifica que el access token sea correcto y que esté configurado

### Error de autenticación
- **Causa**: Token expirado o no configurado
- **Solución**: Genera un nuevo token en el portal de sandbox

### No se importan transacciones
- **Causa**: El banco de prueba puede no tener datos
- **Solución**: Intenta con diferentes cuentas en el flujo de autorización

## 📚 Recursos Adicionales

- [GoCardless Sandbox Portal](https://manage-sandbox.gocardless.com/)
- [Documentación de la API](https://developer.gocardless.com/bank-account-data/quick-start-guide/)
- [Sandbox Documentation](https://developer.gocardless.com/bank-account-data/sandbox/)