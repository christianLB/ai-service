-- Fix definitivo para el dashboard financiero

-- 1. Primero, asegurar que la columna description existe en categories
ALTER TABLE financial.categories ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Eliminar la tabla account_insights si existe (debe ser una vista)
DROP TABLE IF EXISTS financial.account_insights CASCADE;

-- 3. Crear la vista account_insights correctamente
CREATE OR REPLACE VIEW financial.account_insights AS
SELECT 
    a.id,
    COALESCE(a.name, a.account_name, 'Account ' || a.id::text) as name,
    COALESCE(a.balance, 0) as balance,
    COALESCE(c.code, a.currency, 'EUR') as currency_code,
    (
        SELECT COUNT(*) 
        FROM financial.transactions t 
        WHERE t.account_id = a.account_id 
        AND t.date >= CURRENT_DATE - INTERVAL '30 days'
    ) as transactions_30d,
    (
        SELECT COALESCE(SUM(t.amount), 0) 
        FROM financial.transactions t 
        WHERE t.account_id = a.account_id 
        AND t.amount > 0 
        AND t.date >= CURRENT_DATE - INTERVAL '30 days'
    ) as income_30d,
    (
        SELECT COALESCE(SUM(ABS(t.amount)), 0) 
        FROM financial.transactions t 
        WHERE t.account_id = a.account_id 
        AND t.amount < 0 
        AND t.date >= CURRENT_DATE - INTERVAL '30 days'
    ) as expenses_30d
FROM financial.accounts a
LEFT JOIN financial.currencies c ON a.currency_id = c.id OR a.currency = c.code
WHERE COALESCE(a.is_active, true) = true;

-- 4. Asegurar que currencies tiene las columnas necesarias
ALTER TABLE financial.currencies ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid() PRIMARY KEY;
ALTER TABLE financial.currencies ADD COLUMN IF NOT EXISTS code VARCHAR(3);

-- 5. Si no hay datos en currencies, insertar los básicos
INSERT INTO financial.currencies (code, name, symbol) VALUES
    ('EUR', 'Euro', '€'),
    ('USD', 'US Dollar', '$'),
    ('GBP', 'British Pound', '£')
ON CONFLICT (code) DO NOTHING;

-- 6. Actualizar currency_id en accounts si es necesario
UPDATE financial.accounts a
SET currency_id = c.id
FROM financial.currencies c
WHERE a.currency = c.code 
AND a.currency_id IS NULL;

-- 7. Verificar que todo está bien
SELECT 'Verificación final:';
SELECT 'Categories tiene description:', EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'financial' 
    AND table_name = 'categories' 
    AND column_name = 'description'
);

SELECT 'account_insights es una vista:', EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'financial' 
    AND table_name = 'account_insights'
);

-- Test de la vista
SELECT 'Test de account_insights:', COUNT(*) as registros FROM financial.account_insights;