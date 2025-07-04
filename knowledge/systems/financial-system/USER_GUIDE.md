# 🏦 Sistema Financiero AI Service - Guía del Usuario

## 📋 Resumen Ejecutivo

El Sistema Financiero AI Service es una plataforma completa para la gestión automatizada de transacciones bancarias y financieras, integrada con GoCardless para Open Banking (PSD2) y preparada para expansión a criptomonedas.

### ✅ Estado Actual (Julio 2025)
- **Completamente funcional** con datos bancarios reales
- **Transacciones reales** cargadas (últimos 90 días)
- **Múltiples cuentas** conectadas y sincronizadas
- **Arquitectura crypto-ready** para escalabilidad futura

---

## 🚀 Funcionalidades Implementadas

### 1. **Integración Bancaria Real**
- ✅ Conexión directa con BBVA España vía GoCardless/Nordigen
- ✅ Autenticación PSD2 segura con consentimiento del usuario
- ✅ Sincronización automática de transacciones
- ✅ Actualización de balances en tiempo real

### 2. **Base de Datos Unificada**
- ✅ PostgreSQL con esquema extensible fiat + crypto
- ✅ Soporte para múltiples divisas (EUR, USD, BTC, ETH, USDT)
- ✅ Alta precisión decimal para criptomonedas
- ✅ Metadatos flexibles para extensibilidad futura

### 3. **Sistema de Cuentas**
- ✅ Gestión de múltiples cuentas bancarias
- ✅ Seguimiento de balances y estados
- ✅ Clasificación por tipos (bank_account, crypto_wallet, etc.)
- ✅ Metadatos personalizables por cuenta

### 4. **Gestión de Transacciones**
- ✅ Registro automático de todas las transacciones
- ✅ Clasificación por tipos y estados
- ✅ Datos completos del contrapartida
- ✅ Prevención de duplicados

---

## 🔧 Configuración Inicial

### Prerrequisitos
1. **Docker y Docker Compose** instalados
2. **Credenciales GoCardless** (secret_id y secret_key)
3. **Cuenta BBVA España** para testing

### Paso 1: Configuración del Entorno

```bash
# 1. Copiar template de configuración
cp .env.template .env.local

# 2. Configurar credenciales GoCardless en .env.local
GO_SECRET_ID=tu_secret_id_aqui
GO_SECRET_KEY=tu_secret_key_aqui
GO_REDIRECT_URI=https://localhost:3000/financial/callback

# 3. Configurar PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5434
POSTGRES_DB=ai_service
POSTGRES_USER=ai_user
POSTGRES_PASSWORD=ultra_secure_password_2025
```

### Paso 2: Inicialización de la Base de Datos

```bash
# 1. Iniciar PostgreSQL
docker compose up postgres -d

# 2. Configurar esquema financiero
./scripts/setup-financial-db.sh

# 3. Verificar tablas creadas
docker exec ai-service-postgres-1 psql -U ai_user -d ai_service -c "
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'financial' ORDER BY table_name;"
```

### Paso 3: Primera Conexión Bancaria

```bash
# 1. Testear credenciales GoCardless
node test-gocardless.js

# 2. Iniciar proceso de consentimiento BBVA
# (El script generará una URL de consentimiento)

# 3. Visitar URL, hacer login en BBVA y autorizar

# 4. Completar setup y cargar transacciones
node load-transactions.js
```

---

## 📊 Uso del Sistema

### Consulta de Cuentas

```sql
-- Ver todas las cuentas
SELECT a.name, a.iban, a.balance, c.symbol 
FROM financial.accounts a
JOIN financial.currencies c ON a.currency_id = c.id
WHERE a.is_active = true;

-- Resumen por cuenta
SELECT 
  a.name,
  a.balance,
  COUNT(t.id) as transaction_count,
  MAX(t.date) as last_transaction
FROM financial.accounts a
LEFT JOIN financial.transactions t ON a.id = t.account_id
GROUP BY a.id, a.name, a.balance;
```

### Análisis de Transacciones

```sql
-- Transacciones recientes
SELECT 
  t.date::date,
  t.amount,
  c.symbol,
  t.description,
  t.counterparty_name,
  a.name as account
FROM financial.transactions t
JOIN financial.accounts a ON t.account_id = a.id
JOIN financial.currencies c ON t.currency_id = c.id
ORDER BY t.date DESC
LIMIT 20;

-- Resumen de flujos por mes
SELECT 
  DATE_TRUNC('month', t.date) as month,
  SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END) as inflow,
  SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END) as outflow,
  COUNT(*) as transaction_count
FROM financial.transactions t
GROUP BY DATE_TRUNC('month', t.date)
ORDER BY month DESC;
```

### Monitoreo del Sistema

```bash
# Estado de salud general
curl http://localhost:3000/api/financial/health

# Estado de cuentas
curl http://localhost:3000/api/financial/accounts

# Transacciones recientes
curl "http://localhost:3000/api/financial/transactions?limit=10"

# Resumen financiero
curl http://localhost:3000/api/financial/summary
```

---

## 🔄 Sincronización Automática

### Configuración Actual
- **Frecuencia**: 2 veces al día (8:00 AM y 8:00 PM)
- **Datos**: Transacciones de los últimos 7 días
- **Failover**: Reintentos automáticos con backoff exponencial

### Comandos de Gestión

```bash
# Iniciar sincronización automática
curl -X POST http://localhost:3000/api/financial/scheduler/start

# Detener sincronización
curl -X POST http://localhost:3000/api/financial/scheduler/stop

# Estado del scheduler
curl http://localhost:3000/api/financial/sync-status

# Sincronización manual
curl -X POST http://localhost:3000/api/financial/sync
```

---

## 📈 Métricas y Análisis

### KPIs Disponibles

1. **Métricas Operacionales**
   - Total de cuentas activas
   - Número de transacciones procesadas
   - Frecuencia de sincronización
   - Estado de conectividad bancaria

2. **Métricas Financieras**
   - Balances totales por divisa
   - Flujos de entrada y salida
   - Promedio de transacciones por día
   - Distribución por tipos de transacción

3. **Métricas de Calidad**
   - Tasa de éxito en sincronización
   - Transacciones duplicadas detectadas
   - Tiempo de respuesta de APIs
   - Disponibilidad del sistema

### Consultas de Análisis

```sql
-- Dashboard financiero completo
SELECT 
  COUNT(DISTINCT a.id) as total_accounts,
  COUNT(t.id) as total_transactions,
  ROUND(SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END), 2) as total_inflow,
  ROUND(SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END), 2) as total_outflow,
  ROUND(SUM(a.balance::numeric), 2) as current_balance,
  MIN(t.date)::date as earliest_transaction,
  MAX(t.date)::date as latest_transaction
FROM financial.accounts a
LEFT JOIN financial.transactions t ON a.id = t.account_id
WHERE a.type = 'bank_account' AND a.is_active = true;

-- Análisis de categorías (por descripción)
SELECT 
  CASE 
    WHEN UPPER(description) LIKE '%TRANSFERENCIA%' THEN 'Transferencias'
    WHEN UPPER(description) LIKE '%TARJETA%' THEN 'Pagos con Tarjeta'
    WHEN UPPER(description) LIKE '%ADEUDO%' THEN 'Adeudos Automáticos'
    WHEN UPPER(description) LIKE '%IMPUESTO%' THEN 'Impuestos'
    ELSE 'Otros'
  END as category,
  COUNT(*) as transaction_count,
  ROUND(SUM(ABS(amount)), 2) as total_amount
FROM financial.transactions
WHERE amount != 0
GROUP BY 1
ORDER BY total_amount DESC;
```

---

## 🔮 Roadmap y Expansión

### Próximas Funcionalidades

1. **Sistema de Facturación** (Próximo Sprint)
   - Generación automática de facturas
   - Vinculación con transacciones
   - Templates personalizables
   - Export a PDF

2. **Integración Crypto** (Mes 2)
   - Conexión con wallets principales
   - Tracking de transacciones on-chain
   - Conversiones automáticas fiat/crypto
   - DeFi protocol integration

3. **Automatización Avanzada** (Mes 3)
   - Categorización inteligente con IA
   - Detección de anomalías
   - Predicciones de flujo de caja
   - Alertas inteligentes

4. **Multi-Banking** (Mes 4)
   - Soporte para más bancos españoles
   - Conexiones internacionales
   - Agregación multi-cuenta
   - Reporting consolidado

### Extensibilidad Técnica

- **Arquitectura modular**: Fácil adición de nuevos proveedores
- **API-first**: Integración sencilla con servicios externos
- **Event-driven**: Sistema de eventos para integraciones
- **Crypto-ready**: Preparado para expansión blockchain

---

## 🛡️ Seguridad y Compliance

### Medidas Implementadas

1. **Autenticación Segura**
   - OAuth2 con GoCardless
   - Tokens de acceso con expiración
   - Renovación automática de credenciales

2. **Protección de Datos**
   - Encriptación en tránsito (HTTPS)
   - Datos sensibles en variables de entorno
   - Logs sin información personal

3. **Compliance PSD2**
   - Consentimiento explícito del usuario
   - Acceso limitado a 90 días
   - Revocación de permisos

4. **Backup y Recuperación**
   - Volúmenes persistentes Docker
   - Esquemas versionados
   - Procedimientos de rollback

---

## 🔧 Troubleshooting

### Problemas Comunes

1. **Error de Autenticación GoCardless**
   ```bash
   # Verificar credenciales
   echo $GO_SECRET_ID
   echo $GO_SECRET_KEY
   
   # Testear conexión
   node test-gocardless.js
   ```

2. **Base de Datos No Disponible**
   ```bash
   # Verificar container PostgreSQL
   docker ps | grep postgres
   
   # Reiniciar si es necesario
   docker compose up postgres -d
   ```

3. **Transacciones No Se Cargan**
   ```bash
   # Verificar estado de requisition
   # Revisar logs de sincronización
   curl http://localhost:3000/api/financial/sync-status
   ```

4. **Puertos en Uso**
   ```bash
   # Verificar puertos disponibles
   netstat -tlnp | grep :543
   
   # Cambiar puerto en docker-compose.yml si es necesario
   ```

### Logs y Diagnóstico

```bash
# Logs del container PostgreSQL
docker logs ai-service-postgres-1

# Verificar conectividad
PGPASSWORD=ultra_secure_password_2025 psql -h localhost -p 5434 -U ai_user -d ai_service -c "SELECT NOW();"

# Estado de tablas
docker exec ai-service-postgres-1 psql -U ai_user -d ai_service -c "
SELECT schemaname, tablename, n_tup_ins as inserts, n_tup_upd as updates 
FROM pg_stat_user_tables WHERE schemaname = 'financial';"
```

---

## 📞 Soporte y Mantenimiento

### Contactos Técnicos
- **Arquitectura**: Consultar `CENTRO_COMUNICACION.md`
- **Issues**: Documentar en GitHub issues
- **Updates**: Seguir semantic versioning

### Mantenimiento Rutinario
- **Diario**: Verificar sincronización automática
- **Semanal**: Revisar métricas de performance
- **Mensual**: Backup de configuraciones
- **Trimestral**: Renovar consentimientos bancarios

---

*Última actualización: Julio 2025*  
*Versión del sistema: 1.0.0*  
*Estado: Producción - Completamente funcional*