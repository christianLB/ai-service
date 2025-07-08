-- Eliminar tabla si existe y crear vista account_insights
DROP TABLE IF EXISTS financial.account_insights CASCADE;

-- Crear vista account_insights con la estructura esperada
CREATE OR REPLACE VIEW financial.account_insights AS
SELECT 
    a.id,
    a.name,
    a.balance,
    c.code as currency_code,
    -- Calcular transacciones de los últimos 30 días
    (
        SELECT COUNT(*) 
        FROM financial.transactions t 
        WHERE t.account_id = a.id 
        AND t.date >= CURRENT_DATE - INTERVAL '30 days'
    ) as transactions_30d,
    -- Calcular ingresos de los últimos 30 días
    (
        SELECT COALESCE(SUM(amount), 0) 
        FROM financial.transactions t 
        WHERE t.account_id = a.id 
        AND t.amount > 0
        AND t.date >= CURRENT_DATE - INTERVAL '30 days'
    ) as income_30d,
    -- Calcular gastos de los últimos 30 días
    (
        SELECT COALESCE(ABS(SUM(amount)), 0) 
        FROM financial.transactions t 
        WHERE t.account_id = a.id 
        AND t.amount < 0
        AND t.date >= CURRENT_DATE - INTERVAL '30 days'
    ) as expenses_30d
FROM financial.accounts a
LEFT JOIN financial.currencies c ON a.currency_id = c.id
WHERE a.is_active = true;