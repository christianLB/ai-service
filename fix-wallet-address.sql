-- Script para agregar columna wallet_address manualmente
-- Ejecutar en la base de datos PostgreSQL

-- Verificar si la columna existe
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'financial' 
AND table_name = 'accounts'
AND column_name = 'wallet_address';

-- Agregar la columna si no existe
ALTER TABLE financial.accounts 
ADD COLUMN IF NOT EXISTS wallet_address VARCHAR(255);

-- Verificar que se agregó correctamente
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'financial' 
AND table_name = 'accounts'
ORDER BY ordinal_position;