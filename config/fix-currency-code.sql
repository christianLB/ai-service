-- Fix para el problema de currency_code

-- Verificar qué columnas relacionadas con currency existen
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'financial' 
AND table_name = 'transactions' 
AND column_name LIKE '%currency%';

-- Si existe currency_id pero el código busca currency_code, crear alias
DO $$
BEGIN
    -- Si existe currency_id pero no currency_code, crear currency_code
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'financial' 
               AND table_name = 'transactions' 
               AND column_name = 'currency_id')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'financial' 
                       AND table_name = 'transactions' 
                       AND column_name = 'currency_code') THEN
        ALTER TABLE financial.transactions ADD COLUMN currency_code VARCHAR(3);
        UPDATE financial.transactions SET currency_code = currency_id;
    END IF;
    
    -- Si no existe ninguna columna currency, crear currency_code
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'financial' 
                   AND table_name = 'transactions' 
                   AND column_name IN ('currency_code', 'currency_id', 'currency')) THEN
        ALTER TABLE financial.transactions ADD COLUMN currency_code VARCHAR(3) DEFAULT 'EUR';
    END IF;
END $$;

-- Hacer lo mismo para la tabla accounts
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'financial' 
                   AND table_name = 'accounts' 
                   AND column_name = 'currency_code') THEN
        -- Si existe currency, copiar su valor
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'financial' 
                   AND table_name = 'accounts' 
                   AND column_name = 'currency') THEN
            ALTER TABLE financial.accounts ADD COLUMN currency_code VARCHAR(3);
            UPDATE financial.accounts SET currency_code = currency;
        ELSE
            -- Si no existe ninguna, crear con default
            ALTER TABLE financial.accounts ADD COLUMN currency_code VARCHAR(3) DEFAULT 'EUR';
        END IF;
    END IF;
END $$;

-- Verificar resultado
SELECT 'Columnas currency en transactions:', string_agg(column_name, ', ')
FROM information_schema.columns 
WHERE table_schema = 'financial' 
AND table_name = 'transactions' 
AND column_name LIKE '%currency%';

SELECT 'Columnas currency en accounts:', string_agg(column_name, ', ')
FROM information_schema.columns 
WHERE table_schema = 'financial' 
AND table_name = 'accounts' 
AND column_name LIKE '%currency%';