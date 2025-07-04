# 🤖 Configuración del Bot de Telegram

## 1. Crear el Bot

1. Abre Telegram y busca `@BotFather`
2. Envía `/newbot`
3. Elige un nombre para tu bot (ej: "Mi AI Service Bot")
4. Elige un username único que termine en `bot` (ej: `mi_ai_service_bot`)
5. Guarda el token que te proporciona BotFather

## 2. Obtener tu Chat ID

1. Envía un mensaje a tu bot recién creado
2. Abre esta URL en tu navegador (reemplaza YOUR_BOT_TOKEN):
   ```
   https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates
   ```
3. Busca el campo `"chat":{"id":123456789}` - ese número es tu CHAT_ID

## 3. Configurar Variables de Entorno

### Para desarrollo local:

Crea un archivo `.env.local` con:
```env
TELEGRAM_BOT_TOKEN=tu_token_aqui
TELEGRAM_CHAT_ID=tu_chat_id_aqui
TELEGRAM_ALERTS_ENABLED=true
```

### Para producción:

Actualiza `.env.production` con tus valores reales:
```env
TELEGRAM_BOT_TOKEN=tu_token_aqui
TELEGRAM_CHAT_ID=tu_chat_id_aqui
TELEGRAM_WEBHOOK_URL=https://tudominio.com/api/telegram/webhook
TELEGRAM_ALERTS_ENABLED=true
```

## 4. Configurar Webhook (Producción)

Si tu servicio está en producción con HTTPS:

```bash
curl -X POST https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://tudominio.com/api/telegram/webhook"}'
```

## 5. Comandos Disponibles

- `/start` - Iniciar el bot
- `/help` - Mostrar ayuda
- `/status` - Estado del sistema
- `/balance` - Balance de cuentas
- `/gastos` - Gastos por categoría
- `/reporte` - Generar reporte
- `/sync` - Sincronizar datos bancarios
- `/dashboard` - Enlace al dashboard

## 6. Probar el Bot

### Desarrollo:
```bash
# El bot usa polling automático
npm run dev
```

### Producción:
```bash
# Reconstruir y desplegar
docker-compose -f docker-compose.production.yml up -d --build
```

## 7. Verificar Funcionamiento

```bash
# Ver logs del servicio
docker logs ai-service-app-1 -f

# Verificar configuración
./scripts/diagnose-health.sh
```

## Troubleshooting

### Bot no responde:
1. Verifica que el token sea correcto
2. Confirma que el chat_id sea correcto
3. Revisa los logs para errores de configuración

### Webhook no funciona:
1. Asegúrate de tener HTTPS configurado
2. Verifica que el dominio sea accesible públicamente
3. Revisa el status del webhook:
   ```bash
   curl https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo
   ```