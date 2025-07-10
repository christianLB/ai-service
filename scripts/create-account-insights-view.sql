-- Create account_insights view for cash flow analysis
CREATE OR REPLACE VIEW financial.account_insights AS
SELECT 
    a.id,
    a.name,
    a.balance,
    c.code as currency_code,
    -- Count transactions in last 30 days
    (SELECT COUNT(*) 
     FROM financial.transactions t 
     WHERE t.account_id = a.id 
     AND t.date >= CURRENT_DATE - INTERVAL '30 days') as transactions_30d,
    -- Income in last 30 days
    (SELECT COALESCE(SUM(t.amount), 0) 
     FROM financial.transactions t
     LEFT JOIN financial.transaction_categorizations tc ON t.id = tc.transaction_id
     LEFT JOIN financial.categories cat ON tc.category_id = cat.id
     WHERE t.account_id = a.id 
     AND t.date >= CURRENT_DATE - INTERVAL '30 days'
     AND (t.amount > 0 OR cat.type = 'income')) as income_30d,
    -- Expenses in last 30 days  
    (SELECT COALESCE(SUM(ABS(t.amount)), 0)
     FROM financial.transactions t
     LEFT JOIN financial.transaction_categorizations tc ON t.id = tc.transaction_id
     LEFT JOIN financial.categories cat ON tc.category_id = cat.id
     WHERE t.account_id = a.id 
     AND t.date >= CURRENT_DATE - INTERVAL '30 days'
     AND (t.amount < 0 OR cat.type = 'expense')) as expenses_30d
FROM financial.accounts a
JOIN financial.currencies c ON a.currency_id = c.id
WHERE a.is_active = true;