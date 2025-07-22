# Prisma Migrations

Este directorio contiene las migraciones de base de datos gestionadas por Prisma Migrate.

## Comandos disponibles

### Desarrollo

```bash
# Ver estado de las migraciones
make db-migrate-status

# Aplicar migraciones pendientes
make db-migrate

# Crear una nueva migración
make db-migrate-create NAME=descripcion_de_cambio

# Generar cliente Prisma después de cambios en schema
make db-generate
```

### Producción

```bash
# Aplicar migraciones en producción (sin crear nuevas)
make db-migrate-deploy
```

## Migraciones actuales

- `20250121_initial_schema`: Esquema inicial de la base de datos
- `20250121_client_statistics_view`: Vista para estadísticas de clientes
- `20250121090000_fix_transaction_id`: Corrección de ID de transacciones
- `20250121090100_add_gocardless_data`: Añadir datos de GoCardless
- `20250121090200_complete_missing_columns`: Completar columnas faltantes
- `20250121090300_create_security_logs`: Crear logs de seguridad
- `20250121090400_create_integration_configs`: Configuraciones de integración
- `20250121090500_rate_limit_tracking`: Seguimiento de límites de tasa
- `20250121090600_create_trading_tables`: Tablas de trading

## Proceso de migración desde SQL

Las migraciones SQL antiguas del directorio `/migrations` han sido convertidas al formato de Prisma.
De ahora en adelante, todas las nuevas migraciones deben crearse usando:

```bash
make db-migrate-create NAME=nombre_descriptivo
```

## Notas importantes

1. **NO** editar manualmente las migraciones ya aplicadas
2. **NO** eliminar archivos de migración
3. Siempre revisar las migraciones generadas antes de aplicarlas
4. En producción, usar `make db-migrate-deploy` para aplicar solo migraciones ya probadas