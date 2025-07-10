-- Create missing functions for financial schema

-- Function to update client statistics after invoice changes
CREATE OR REPLACE FUNCTION financial.update_client_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
        UPDATE financial.clients
        SET 
            total_revenue = (
                SELECT COALESCE(SUM(total), 0) 
                FROM financial.invoices 
                WHERE client_id = NEW.client_id AND status = 'paid'
            ),
            total_invoices = (
                SELECT COUNT(*) 
                FROM financial.invoices 
                WHERE client_id = NEW.client_id AND status != 'cancelled'
            ),
            outstanding_balance = (
                SELECT COALESCE(SUM(total), 0) 
                FROM financial.invoices 
                WHERE client_id = NEW.client_id AND status IN ('sent', 'viewed', 'overdue')
            ),
            last_invoice_date = GREATEST(
                last_invoice_date, 
                NEW.issue_date
            ),
            average_invoice_amount = (
                SELECT AVG(total) 
                FROM financial.invoices 
                WHERE client_id = NEW.client_id AND status = 'paid'
            ),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.client_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate next invoice number
CREATE OR REPLACE FUNCTION financial.generate_invoice_number(
    p_prefix VARCHAR DEFAULT 'INV',
    p_year INTEGER DEFAULT NULL
)
RETURNS VARCHAR AS $$
DECLARE
    v_year INTEGER;
    v_current_number INTEGER;
    v_format VARCHAR;
    v_invoice_number VARCHAR;
BEGIN
    -- Use current year if not provided
    v_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE));
    
    -- Get or create sequence
    INSERT INTO financial.invoice_sequences (prefix, year, current_number)
    VALUES (p_prefix, v_year, 0)
    ON CONFLICT (prefix, year) DO NOTHING;
    
    -- Get and increment the number
    UPDATE financial.invoice_sequences
    SET 
        current_number = current_number + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE prefix = p_prefix AND year = v_year
    RETURNING current_number, format INTO v_current_number, v_format;
    
    -- Generate invoice number
    v_invoice_number := REPLACE(v_format, 'PREFIX', p_prefix);
    v_invoice_number := REPLACE(v_invoice_number, 'YYYY', v_year::TEXT);
    v_invoice_number := REPLACE(v_invoice_number, '0000', LPAD(v_current_number::TEXT, 4, '0'));
    
    RETURN v_invoice_number;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS update_client_stats_trigger ON financial.invoices;
CREATE TRIGGER update_client_stats_trigger
AFTER INSERT OR UPDATE ON financial.invoices
FOR EACH ROW
EXECUTE FUNCTION financial.update_client_stats();