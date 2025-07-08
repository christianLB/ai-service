-- Fix para corregir el esquema financiero

-- Agregar columnas faltantes si no existen
DO $$ 
BEGIN
    -- Agregar columna description a categories si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'financial' 
                   AND table_name = 'categories' 
                   AND column_name = 'description') THEN
        ALTER TABLE financial.categories ADD COLUMN description TEXT;
    END IF;

    -- Agregar columna icon a categories si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'financial' 
                   AND table_name = 'categories' 
                   AND column_name = 'icon') THEN
        ALTER TABLE financial.categories ADD COLUMN icon VARCHAR(50);
    END IF;

    -- Agregar columna color a categories si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'financial' 
                   AND table_name = 'categories' 
                   AND column_name = 'color') THEN
        ALTER TABLE financial.categories ADD COLUMN color VARCHAR(7);
    END IF;

    -- Agregar columna category a transactions si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'financial' 
                   AND table_name = 'transactions' 
                   AND column_name = 'category') THEN
        ALTER TABLE financial.transactions ADD COLUMN category VARCHAR(100);
    END IF;

    -- Agregar columna subcategory a transactions si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'financial' 
                   AND table_name = 'transactions' 
                   AND column_name = 'subcategory') THEN
        ALTER TABLE financial.transactions ADD COLUMN subcategory VARCHAR(100);
    END IF;
END $$;

-- Recrear las vistas con el esquema correcto
DROP VIEW IF EXISTS financial.categorized_transactions CASCADE;
DROP VIEW IF EXISTS financial.monthly_category_summary CASCADE;

-- Vista de transacciones categorizadas
CREATE VIEW financial.categorized_transactions AS
SELECT 
    t.*,
    c.name as category_name,
    c.icon as category_icon,
    c.color as category_color,
    s.name as subcategory_name
FROM financial.transactions t
LEFT JOIN financial.categories c ON t.category = c.name
LEFT JOIN financial.subcategories s ON t.subcategory = s.name;

-- Vista de resumen mensual por categoría
CREATE VIEW financial.monthly_category_summary AS
SELECT 
    date_trunc('month', t.date) as month,
    t.category,
    COUNT(*) as transaction_count,
    SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END) as total_expenses,
    SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END) as total_income
FROM financial.transactions t
WHERE t.is_pending = false
GROUP BY date_trunc('month', t.date), t.category;

-- Insertar categorías básicas si no existen
INSERT INTO financial.categories (name, description, icon, color) VALUES
    ('Alimentación', 'Comida y bebidas', '🍽️', '#FF6B6B'),
    ('Transporte', 'Gasolina, transporte público', '🚗', '#4ECDC4'),
    ('Hogar', 'Alquiler, suministros', '🏠', '#45B7D1'),
    ('Salud', 'Médicos, farmacia', '🏥', '#96CEB4'),
    ('Ocio', 'Entretenimiento, hobbies', '🎮', '#FECA57'),
    ('Ingresos', 'Salarios, pagos', '💰', '#48C774')
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color;