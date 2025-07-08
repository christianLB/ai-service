-- Fix final para el esquema financiero

-- Agregar columna is_pending si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'financial' 
                   AND table_name = 'transactions' 
                   AND column_name = 'is_pending') THEN
        ALTER TABLE financial.transactions ADD COLUMN is_pending BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Recrear la vista monthly_category_summary
DROP VIEW IF EXISTS financial.monthly_category_summary CASCADE;

CREATE VIEW financial.monthly_category_summary AS
SELECT 
    date_trunc('month', t.date) as month,
    t.category,
    COUNT(*) as transaction_count,
    SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END) as total_expenses,
    SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END) as total_income
FROM financial.transactions t
WHERE COALESCE(t.is_pending, false) = false
GROUP BY date_trunc('month', t.date), t.category;

-- Verificar que todo está bien
SELECT 'account_insights exists:', EXISTS (SELECT FROM financial.account_insights LIMIT 1);
SELECT 'categories has description:', EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'financial' 
    AND table_name = 'categories' 
    AND column_name = 'description'
);