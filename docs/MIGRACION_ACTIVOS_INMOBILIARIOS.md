# Instrucciones para aplicar la migración de bienes inmuebles

Este documento describe cómo ejecutar la migración que crea el esquema `real_estate` y sus tablas asociadas.

## Pasos

1. Asegúrate de que las variables de entorno de PostgreSQL están configuradas (`POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`).
2. Instala las dependencias si es la primera vez:
   ```bash
   npm install
   ```
3. Ejecuta la migración usando **node-pg-migrate**:
   ```bash
   npm run migrate
   ```
   Esto aplicará el archivo `migrations/1752106000000_create-real-estate-schema.js`.
4. Verifica las tablas creadas:
   ```bash
   psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB -c "\dt real_estate.*"
   ```
5. Compila el proyecto para asegurar que el nuevo módulo quede incluido en el build:
   ```bash
   npm run build
   ```

Con estas tablas podrás comenzar a registrar propiedades, transacciones y tasaciones desde el nuevo módulo.
