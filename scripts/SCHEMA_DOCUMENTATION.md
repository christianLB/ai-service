# Documentación del Esquema de Base de Datos

## Resumen Ejecutivo

Este documento describe todas las tablas del esquema de base de datos del AI Service, identificando las diferencias entre desarrollo y producción basándose en los errores encontrados.

## Errores Conocidos en Producción

Los siguientes errores indican columnas/tablas faltantes en producción:
- `currency_code` - La columna fue reemplazada por `currency_id` (referencia a tabla `currencies`)
- `is_pending` - No existe esta columna en ninguna tabla del esquema actual
- `wallet_address` - Faltaba en la tabla `financial.accounts`
- `counterparty_name` - Faltaba en la tabla `financial.transactions`

## Esquemas de Base de Datos

### 1. Esquema `financial`

#### 1.1 Tabla `currencies` ✅ NUEVA EN PRODUCCIÓN
**Descripción**: Catálogo de monedas fiat y crypto
```sql
- id (UUID) - PK
- code (VARCHAR 10) - UNIQUE, NOT NULL
- name (VARCHAR 100) - NOT NULL
- type (VARCHAR 20) - CHECK IN ('fiat', 'crypto')
- decimals (INTEGER) - DEFAULT 2
- symbol (VARCHAR 10)
- is_active (BOOLEAN) - DEFAULT TRUE
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

#### 1.2 Tabla `accounts`
**Columnas nuevas en desarrollo**:
- `wallet_address` (VARCHAR 255) - ⚠️ FALTABA EN PRODUCCIÓN
- `chain_id` (VARCHAR 50) - ⚠️ FALTABA EN PRODUCCIÓN
- `exchange_name` (VARCHAR 100) - ⚠️ FALTABA EN PRODUCCIÓN
- `institution_id` (VARCHAR 255) - ⚠️ POSIBLEMENTE FALTABA
- `requisition_id` (VARCHAR 255) - ⚠️ POSIBLEMENTE FALTABA
- `iban` (VARCHAR 255) - ⚠️ POSIBLEMENTE FALTABA
- `last_sync` (TIMESTAMPTZ) - ⚠️ POSIBLEMENTE FALTABA

#### 1.3 Tabla `transactions`
**Cambios importantes**:
- ❌ `currency` o `currency_code` - ELIMINADA
- ✅ `currency_id` (UUID) - NUEVA, referencia a `currencies`
- ✅ `counterparty_name` (VARCHAR 255) - ⚠️ FALTABA EN PRODUCCIÓN
- ✅ `status` (VARCHAR 50) - DEFAULT 'confirmed'
- ✅ `reference` (VARCHAR 255)
- ✅ `updated_at` (TIMESTAMPTZ)
- ✅ `tags` (TEXT[])
- ✅ `fee_amount` (DECIMAL 20,8)
- ✅ `fee_currency_id` (UUID)

#### 1.4 Tabla `categories` ✅ NUEVA EN PRODUCCIÓN
**Descripción**: Categorías para clasificar transacciones
```sql
- id (UUID) - PK
- name (VARCHAR 100) - UNIQUE, NOT NULL
- type (VARCHAR 20) - CHECK IN ('income', 'expense', 'transfer')
- parent_id (UUID) - FK autorreferencial
- color (VARCHAR 7)
- icon (VARCHAR 50)
- is_active (BOOLEAN)
- created_at, updated_at (TIMESTAMPTZ)
```

#### 1.5 Tabla `transaction_categorizations` ✅ NUEVA EN PRODUCCIÓN
**Descripción**: Relación entre transacciones y categorías
```sql
- id (UUID) - PK
- transaction_id (UUID) - FK a transactions
- category_id (UUID) - FK a categories
- confidence (DECIMAL 3,2) - DEFAULT 1.00
- method (VARCHAR 50) - DEFAULT 'manual'
- created_at (TIMESTAMPTZ)
- UNIQUE(transaction_id)
```

#### 1.6 Tabla `clients` ✅ NUEVA
**Descripción**: Gestión de clientes para facturación
- Múltiples campos incluyendo información fiscal, contacto, métricas de negocio

#### 1.7 Tabla `invoices` ✅ NUEVA
**Descripción**: Sistema completo de facturación
- Gestión de facturas con todos los campos necesarios para compliance fiscal

#### 1.8 Tabla `invoice_sequences` ✅ NUEVA
**Descripción**: Secuencias para numeración de facturas

#### 1.9 Tabla `client_transaction_links` ✅ NUEVA
**Descripción**: Vinculación de transacciones con clientes

#### 1.10 Tabla `transaction_matching_patterns` ✅ NUEVA
**Descripción**: Patrones para identificación automática de transacciones

#### 1.11 Tabla `customers` ✅ NUEVA
**Descripción**: Tabla simplificada de clientes (del financial service)

#### 1.12 Tabla `exchange_rates` ✅ NUEVA
**Descripción**: Tipos de cambio entre monedas

#### 1.13 Tabla `transaction_invoice_links` ✅ NUEVA
**Descripción**: Reconciliación entre transacciones e invoices

#### 1.14 Tabla `invoice_items` ✅ NUEVA
**Descripción**: Líneas de detalle de las facturas

### 2. Esquema `public` (Core)

#### 2.1 Tabla `workflows`
- Sistema de gestión de workflows de n8n
- Sin cambios respecto a producción

#### 2.2 Tabla `executions`
- Registro de ejecuciones de workflows
- Sin cambios respecto a producción

#### 2.3 Tabla `metrics`
- Sistema de métricas genérico
- Sin cambios respecto a producción

#### 2.4 Tabla `documents` ✅ NUEVA
- Sistema de gestión documental

#### 2.5 Tabla `knowledge_entries` ✅ NUEVA
- Base de conocimiento estructurada

#### 2.6 Tabla `autonomous_tasks` ✅ NUEVA
- Sistema de tareas autónomas

#### 2.7 Tabla `communication_log` ✅ NUEVA
- Registro de comunicaciones multi-canal

## Vistas Creadas

1. `financial.categorized_transactions` - Vista con transacciones y sus categorías
2. `financial.monthly_category_summary` - Resumen mensual por categoría
3. `financial.client_statistics` - Estadísticas de clientes

## Funciones y Triggers

1. `financial.update_client_stats()` - Actualiza estadísticas de clientes automáticamente
2. `financial.generate_invoice_number()` - Genera números de factura secuenciales

## Índices Críticos

Se crearon más de 40 índices para optimizar:
- Búsquedas por fecha
- Búsquedas por estado
- Búsquedas por cliente/cuenta
- Búsquedas con JSONB (GIN indexes)

## Recomendaciones de Migración

1. **CRÍTICO**: Ejecutar primero el script `complete-production-schema.sql` que es 100% idempotente
2. **BACKUP**: Hacer backup completo antes de cualquier migración
3. **VERIFICACIÓN**: El script incluye verificaciones automáticas al final
4. **MONITOREO**: Verificar logs después de la ejecución

## Notas sobre Compatibilidad

- El script detecta automáticamente si usa `gen_random_uuid()` o `uuid_generate_v4()`
- Todas las tablas nuevas son creadas con `IF NOT EXISTS`
- Todas las columnas nuevas son agregadas con verificación previa
- No hay comandos destructivos (DROP) en el script