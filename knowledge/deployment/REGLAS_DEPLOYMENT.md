# 🚨 REGLAS CRÍTICAS DE DEPLOYMENT - NO CAMBIAR

## 📁 ARCHIVO ÚNICO DE PRODUCCIÓN

**USAR SOLO**: `docker-compose.production.yml`

Todos los demás archivos docker-compose han sido eliminados para evitar confusión.

## 🔴 PUERTO: 3003

**EL PUERTO DEBE SER SIEMPRE 3003**

- Puerto externo: **3003**
- Puerto interno: 3000
- Mapeo en docker-compose: `"3003:3000"`

### ¿Por qué?
- El proxy reverso (nginx) está configurado para reenviar a puerto 3003
- Cambiar esto rompe TODA la comunicación con Telegram
- Este puerto fue elegido para evitar conflictos con otros servicios

### Configuración actual:
```yaml
ai-service:
  ports:
    - "3003:3000"  # NO CAMBIAR NUNCA
```

## 🔴 PROXY REVERSO

La configuración del proxy reverso es:
- Dominio: `https://ai-service.anaxi.net`
- Reenvía a: `http://localhost:3003`

## 🔴 VARIABLES DE ENTORNO

El archivo `.env.production` está en:
- `/volume1/docker/ai-service/config/.env.production`

NO usar variables de entorno en Portainer, SIEMPRE usar el archivo.

## 🔴 TELEGRAM WEBHOOK

El webhook está configurado como:
- URL: `https://ai-service.anaxi.net/api/telegram/webhook`
- Esto depende del puerto 3003

## ⚠️ CONSECUENCIAS DE CAMBIAR EL PUERTO

Si cambias el puerto de 3003 a otro:
1. ❌ Telegram dejará de funcionar
2. ❌ El dashboard no será accesible
3. ❌ Todos los webhooks fallarán
4. ❌ El usuario se enojará MUCHO

---

**ÚLTIMA ACTUALIZACIÓN**: 2025-07-04
**RAZÓN**: Alguien cambió el puerto de 3003 a 3001 y rompió todo el servicio