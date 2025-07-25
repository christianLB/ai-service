# 🤖 Guía de Configuración: Telegram Bot

## 📋 Resumen

Esta guía te llevará paso a paso para configurar tu Telegram Bot y conectarlo con el AI Service. El proceso completo toma aproximadamente **10 minutos**.

---

## 🎯 Prerrequisitos

- ✅ AI Service funcionando (puerto 3000)
- ✅ Cuenta de Telegram en tu móvil/desktop
- ✅ Acceso a internet para configurar webhook

---

## 📱 Paso 1: Crear el Bot en Telegram

### **1.1 Abrir BotFather**
1. En Telegram, busca: `@BotFather`
2. Inicia conversación con `/start`

### **1.2 Crear Nuevo Bot**
```
/newbot
```

### **1.3 Configurar Nombre y Username**
```
# Cuando BotFather pregunta por el nombre:
Mi AI Service Bot

# Cuando pregunta por el username (debe terminar en 'bot'):
mi_ai_service_bot
```

### **1.4 Guardar Token**
BotFather te dará algo como:
```
1234567890:AAEhBOwF8qhGlP0QjXkN-abcdefghijklmnop
```
**⚠️ IMPORTANTE**: Copia este token, lo necesitarás en el Paso 3.

---

## 🆔 Paso 2: Obtener tu Chat ID

### **2.1 Enviar Mensaje a tu Bot**
1. Busca tu bot recién creado en Telegram
2. Envía cualquier mensaje, por ejemplo: `Hola`

### **2.2 Obtener Chat ID via API**
Abre en tu navegador (reemplaza `TU_BOT_TOKEN`):
```
https://api.telegram.org/bot<TU_BOT_TOKEN>/getUpdates
```

### **2.3 Encontrar Chat ID**
Busca en la respuesta JSON:
```json
{
  "message": {
    "chat": {
      "id": 123456789,  ← Este es tu CHAT_ID
      "type": "private"
    }
  }
}
```

**📝 Alternativa Rápida**: Usa `@userinfobot` para obtener tu ID directamente.

---

## ⚙️ Paso 3: Configurar Variables de Entorno

### **3.1 Editar Archivo de Configuración**
```bash
# En la raíz del proyecto AI Service:
cp .env.example .env.local
```

### **3.2 Agregar Configuración de Telegram**
Edita `.env.local` y agrega/modifica:
```bash
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=1234567890:AAEhBOwF8qhGlP0QjXkN-abcdefghijklmnop
TELEGRAM_CHAT_ID=123456789
TELEGRAM_WEBHOOK_URL=https://tu-dominio.com/api/telegram/webhook
TELEGRAM_ALERTS_ENABLED=true

# Dashboard Configuration (opcional)
DASHBOARD_URL=http://localhost:3000/dashboard
```

**⚠️ Nota**: `TELEGRAM_WEBHOOK_URL` se configurará en el Paso 5.

---

## 🚀 Paso 4: Iniciar AI Service

### **4.1 Instalar Dependencias (si no lo has hecho)**
```bash
npm install
```

### **4.2 Compilar TypeScript**
```bash
npm run build
```

### **4.3 Iniciar Servicio**
```bash
# Modo desarrollo (recomendado para testing)
npm run dev

# O modo producción
npm start
```

### **4.4 Verificar Estado**
```bash
curl http://localhost:3000/api/telegram/status
```

Respuesta esperada:
```json
{
  "configured": true,
  "botToken": true,
  "chatId": true,
  "webhookUrl": "https://tu-dominio.com/api/telegram/webhook",
  "alertsEnabled": true
}
```

---

## 🌐 Paso 5: Configurar Webhook

### **Opción A: Para Testing Local (Recomendado)**

#### **5.1 Instalar ngrok**
```bash
# Via npm (global)
npm install -g ngrok

# Via brew (Mac)
brew install ngrok

# Via apt (Ubuntu)
sudo apt install ngrok
```

#### **5.2 Exponer Puerto Local**
```bash
# En nueva terminal (mantener abierta):
ngrok http 3000
```

Obtienes algo como:
```
Forwarding    https://abc123.ngrok.io -> http://localhost:3000
```

#### **5.3 Configurar Webhook**
```bash
# Usar la URL de ngrok:
curl -X POST http://localhost:3000/api/telegram/setup-webhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://abc123.ngrok.io/api/telegram/webhook"}'
```

### **Opción B: Para Producción (anaxi.net) ⭐ RECOMENDADO**

**Infraestructura disponible**: Synology DSM 420+ con dominio propio

#### **5.B.1 Configuración de Producción**
```bash
# Usar dominio real con SSL automático:
curl -X POST http://localhost:3000/api/telegram/setup-webhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://ai-service.anaxi.net/api/telegram/webhook"}'
```

#### **5.B.2 Ventajas vs ngrok**
- ✅ **SSL automático** vía Cloudflare
- ✅ **URL persistente** sin cambios
- ✅ **Performance superior** sin tunneling
- ✅ **Dominio profesional** vs temporal

#### **5.B.3 Setup de Proxy Inverso** 
**Ver documentación completa**: [INFRASTRUCTURE.md](./INFRASTRUCTURE.md)

Resumen rápido:
1. **DSM** → **Control Panel** → **Application Portal** → **Reverse Proxy**
2. **Crear regla**: `ai-service.anaxi.net:443` → `localhost:3000`
3. **Deploy en Synology**: `docker-compose up -d`

---

## 🧪 Paso 6: Testing Completo

### **6.1 Test de Conexión**
En Telegram, envía a tu bot:
```
/start
```

Respuesta esperada:
```
🤖 ¡Hola! Soy tu Bot Financiero AI

Estoy conectado a tu sistema AI Service y puedo ayudarte con:

💰 Información financiera
📊 Reportes automáticos  
🔄 Sincronización bancaria
⚙️ Control del sistema

Usa /help para ver todos los comandos disponibles.
```

### **6.2 Test de Comandos**
Prueba estos comandos uno por uno:
```
/help     - Ver lista de comandos
/status   - Estado del sistema
/balance  - Balance de cuentas
/gastos   - Gastos recientes
/reporte daily - Reporte diario
/dashboard - Enlace al dashboard
```

### **6.3 Test de API Direct**
```bash
# Test de mensaje manual
curl -X POST http://localhost:3000/api/telegram/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "TU_CHAT_ID",
    "message": "🧪 <b>Test message</b> from AI Service API"
  }'

# Test de alerta
curl -X POST http://localhost:3000/api/telegram/send-alert \
  -H "Content-Type: application/json" \
  -d '{
    "type": "system_error",
    "priority": "medium",
    "message": "Test alert from AI Service"
  }'
```

---

## 📊 Paso 7: Configuración de Alertas (Opcional)

### **7.1 Tipos de Alertas Automáticas**
El bot enviará automáticamente:
- 💰 **Transacciones > 500€**
- ⚠️ **Errores del sistema**
- 🔄 **Estado de sincronización bancaria**
- 📈 **Reportes diarios** (8:00 AM)

### **7.2 Personalizar Alertas**
Edita en `.env.local`:
```bash
# Deshabilitar alertas
TELEGRAM_ALERTS_ENABLED=false

# Cambiar umbral de transacciones (en el código)
# src/services/communication/telegram.service.ts
# Buscar: amount > 500
```

---

## 🛠️ Paso 8: Comandos Avanzados

### **8.1 Configurar Comandos del Bot**
Los comandos se configuran automáticamente, pero puedes verificar en BotFather:
```
/setcommands

# Selecciona tu bot y pega:
start - Iniciar el bot
help - Mostrar ayuda
status - Estado del sistema
balance - Balance de cuentas
gastos - Gastos por categoría
reporte - Generar reporte
sync - Sincronizar datos bancarios
dashboard - Enlace al dashboard
```

### **8.2 Personalizar Mensaje de Bienvenida**
Edita `src/services/communication/telegram.service.ts`, función `handleStartCommand()`.

---

## 🔧 Troubleshooting

### **❌ "Telegram service not configured"**
**Causa**: Variables de entorno faltantes
**Solución**: Verificar `.env.local` tiene `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID`

### **❌ "Bot doesn't respond to commands"**
**Causa**: Webhook no configurado o incorrecto
**Solución**: 
```bash
# Verificar webhook
curl http://localhost:3000/api/telegram/status

# Reconfigurar webhook
curl -X POST http://localhost:3000/api/telegram/setup-webhook \
  -d '{"url": "https://TU_NGROK_URL/api/telegram/webhook"}'
```

### **❌ "ngrok URL not working"**
**Causa**: ngrok se desconectó o cambió URL
**Solución**:
1. Verificar que `ngrok http 3000` sigue corriendo
2. Reconfigurar webhook con nueva URL

### **❌ "Financial data not showing"**
**Causa**: Base de datos no configurada
**Solución**: Verificar PostgreSQL y configuración financiera en `CENTRO_COMUNICACION.md`

---

## 📋 Checklist Final

- [ ] ✅ Bot creado en @BotFather
- [ ] ✅ Token guardado en `.env.local`
- [ ] ✅ Chat ID obtenido y configurado
- [ ] ✅ AI Service iniciado (`npm run dev`)
- [ ] ✅ ngrok expuesto (`ngrok http 3000`)
- [ ] ✅ Webhook configurado
- [ ] ✅ `/start` funciona
- [ ] ✅ `/help` muestra comandos
- [ ] ✅ `/status` muestra sistema online
- [ ] ✅ Tests de API funcionando

---

## 🎉 ¡Configuración Completa!

Tu Telegram Bot está ahora completamente integrado con el AI Service. 

### **Próximos Pasos:**
1. **Personalizar alertas** según tus necesidades
2. **Configurar reportes automáticos** 
3. **Integrar con más servicios** financieros
4. **Deploy en producción** con dominio real

### **Documentación Relacionada:**
- `TELEGRAM_SLACK_INTEGRATION.md` - Documentación técnica completa
- `CENTRO_COMUNICACION.md` - Estado del proyecto y roadmap
- `.env.example` - Variables de entorno disponibles

---

**Última actualización**: 2025-07-02  
**Próxima revisión**: Feedback del usuario post-configuración

---

### 📞 Soporte

Si encuentras problemas:
1. Revisa los logs del AI Service
2. Verifica el estado con `/api/telegram/status`
3. Consulta la sección Troubleshooting
4. Revisa `CENTRO_COMUNICACION.md` para problemas conocidos