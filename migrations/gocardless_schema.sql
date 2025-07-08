-- Schema para integración con GoCardless
-- Incluye mandatos, pagos, webhooks y eventos

-- Tabla de clientes/customers sincronizados con GoCardless
CREATE TABLE IF NOT EXISTS financial.gocardless_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id VARCHAR(255) UNIQUE NOT NULL, -- ID de GoCardless
    email VARCHAR(255),
    given_name VARCHAR(255),
    family_name VARCHAR(255),
    company_name VARCHAR(255),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(255),
    postal_code VARCHAR(50),
    country_code VARCHAR(2),
    language VARCHAR(5) DEFAULT 'es',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    synced_at TIMESTAMP
);

-- Tabla de cuentas bancarias
CREATE TABLE IF NOT EXISTS financial.gocardless_bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_account_id VARCHAR(255) UNIQUE NOT NULL, -- ID de GoCardless
    customer_id VARCHAR(255) REFERENCES financial.gocardless_customers(customer_id),
    account_holder_name VARCHAR(255),
    account_number_ending VARCHAR(4),
    bank_name VARCHAR(255),
    currency VARCHAR(3),
    country_code VARCHAR(2),
    enabled BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de mandatos
CREATE TABLE IF NOT EXISTS financial.gocardless_mandates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mandate_id VARCHAR(255) UNIQUE NOT NULL, -- ID de GoCardless
    customer_id VARCHAR(255) REFERENCES financial.gocardless_customers(customer_id),
    bank_account_id VARCHAR(255) REFERENCES financial.gocardless_bank_accounts(bank_account_id),
    reference VARCHAR(255),
    scheme VARCHAR(50), -- 'sepa_core', 'bacs', etc.
    status VARCHAR(50), -- 'pending_submission', 'active', 'failed', 'cancelled'
    next_possible_charge_date DATE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de pagos
CREATE TABLE IF NOT EXISTS financial.gocardless_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id VARCHAR(255) UNIQUE NOT NULL, -- ID de GoCardless
    mandate_id VARCHAR(255) REFERENCES financial.gocardless_mandates(mandate_id),
    amount INTEGER NOT NULL, -- En centavos
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(50), -- 'pending_submission', 'submitted', 'confirmed', 'paid_out', 'failed'
    description VARCHAR(255),
    charge_date DATE,
    reference VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de webhooks/eventos
CREATE TABLE IF NOT EXISTS financial.gocardless_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(255) UNIQUE NOT NULL, -- ID del evento de GoCardless
    action VARCHAR(100) NOT NULL, -- 'created', 'payment_confirmed', etc.
    resource_type VARCHAR(50), -- 'payments', 'mandates', etc.
    resource_id VARCHAR(255),
    details JSONB,
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de configuración de webhooks
CREATE TABLE IF NOT EXISTS financial.gocardless_webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url VARCHAR(500) NOT NULL,
    secret VARCHAR(255) NOT NULL,
    events TEXT[], -- Array de eventos a los que está suscrito
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX idx_gocardless_payments_status ON financial.gocardless_payments(status);
CREATE INDEX idx_gocardless_payments_charge_date ON financial.gocardless_payments(charge_date);
CREATE INDEX idx_gocardless_mandates_status ON financial.gocardless_mandates(status);
CREATE INDEX idx_gocardless_events_processed ON financial.gocardless_events(processed);
CREATE INDEX idx_gocardless_events_created ON financial.gocardless_events(created_at);

-- Vista para dashboard
CREATE OR REPLACE VIEW financial.gocardless_dashboard_summary AS
SELECT 
    -- Resumen de mandatos
    (SELECT COUNT(*) FROM financial.gocardless_mandates WHERE status = 'active') as active_mandates,
    (SELECT COUNT(*) FROM financial.gocardless_mandates WHERE status = 'pending_submission') as pending_mandates,
    
    -- Resumen de pagos del mes actual
    (SELECT COUNT(*) FROM financial.gocardless_payments 
     WHERE DATE_TRUNC('month', charge_date) = DATE_TRUNC('month', CURRENT_DATE)) as payments_this_month,
    
    (SELECT SUM(amount) FROM financial.gocardless_payments 
     WHERE DATE_TRUNC('month', charge_date) = DATE_TRUNC('month', CURRENT_DATE) 
     AND status IN ('confirmed', 'paid_out')) as revenue_this_month,
    
    -- Próximos cobros (próximos 7 días)
    (SELECT COUNT(*) FROM financial.gocardless_payments 
     WHERE charge_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
     AND status = 'pending_submission') as upcoming_payments_count,
     
    (SELECT SUM(amount) FROM financial.gocardless_payments 
     WHERE charge_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
     AND status = 'pending_submission') as upcoming_payments_amount,
    
    -- Eventos sin procesar
    (SELECT COUNT(*) FROM financial.gocardless_events WHERE NOT processed) as unprocessed_events;

-- Función para procesar eventos de webhook
CREATE OR REPLACE FUNCTION financial.process_gocardless_webhook_event(
    p_event_id VARCHAR,
    p_action VARCHAR,
    p_resource_type VARCHAR,
    p_resource_id VARCHAR,
    p_details JSONB
) RETURNS VOID AS $$
BEGIN
    -- Insertar evento si no existe
    INSERT INTO financial.gocardless_events (
        event_id, action, resource_type, resource_id, details
    ) VALUES (
        p_event_id, p_action, p_resource_type, p_resource_id, p_details
    ) ON CONFLICT (event_id) DO NOTHING;
    
    -- Procesar según tipo de recurso y acción
    CASE p_resource_type
        WHEN 'payments' THEN
            -- Actualizar estado del pago
            UPDATE financial.gocardless_payments
            SET status = p_details->>'status',
                updated_at = CURRENT_TIMESTAMP
            WHERE payment_id = p_resource_id;
            
        WHEN 'mandates' THEN
            -- Actualizar estado del mandato
            UPDATE financial.gocardless_mandates
            SET status = p_details->>'status',
                updated_at = CURRENT_TIMESTAMP
            WHERE mandate_id = p_resource_id;
    END CASE;
    
    -- Marcar evento como procesado
    UPDATE financial.gocardless_events
    SET processed = true,
        processed_at = CURRENT_TIMESTAMP
    WHERE event_id = p_event_id;
END;
$$ LANGUAGE plpgsql;