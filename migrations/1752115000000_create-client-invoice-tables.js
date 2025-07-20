/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  // Create clients table
  pgm.createTable({ schema: 'financial', name: 'clients' }, {
    id: {
      type: 'varchar(255)',
      primaryKey: true,
    },
    name: {
      type: 'varchar(255)',
      notNull: true,
    },
    business_name: {
      type: 'varchar(255)',
    },
    tax_id: {
      type: 'varchar(100)',
      notNull: true,
    },
    tax_id_type: {
      type: 'varchar(20)',
      notNull: true,
      check: "tax_id_type IN ('RFC', 'CIF', 'NIT', 'VAT', 'OTHER')",
    },
    // Contact Information
    email: {
      type: 'varchar(255)',
      notNull: true,
    },
    phone: {
      type: 'varchar(50)',
    },
    address: {
      type: 'jsonb',
    },
    // Business Information
    client_type: {
      type: 'varchar(20)',
      notNull: true,
      check: "client_type IN ('individual', 'business')",
    },
    currency: {
      type: 'varchar(10)',
      notNull: true,
      default: "'EUR'",
    },
    language: {
      type: 'varchar(10)',
      notNull: true,
      default: "'es'",
    },
    timezone: {
      type: 'varchar(50)',
    },
    // Payment & Billing
    payment_terms: {
      type: 'integer',
      notNull: true,
      default: 30,
    },
    payment_method: {
      type: 'varchar(20)',
      check: "payment_method IN ('transfer', 'cash', 'card', 'crypto', 'other')",
    },
    bank_account: {
      type: 'varchar(255)',
    },
    credit_limit: {
      type: 'decimal(15,2)',
      default: 0,
    },
    // Status & Metrics
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: "'active'",
      check: "status IN ('active', 'inactive', 'suspended', 'prospect')",
    },
    total_revenue: {
      type: 'decimal(15,2)',
      notNull: true,
      default: 0,
    },
    total_invoices: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    outstanding_balance: {
      type: 'decimal(15,2)',
      notNull: true,
      default: 0,
    },
    last_invoice_date: {
      type: 'timestamp',
    },
    average_invoice_amount: {
      type: 'decimal(15,2)',
    },
    // Custom Fields
    custom_fields: {
      type: 'jsonb',
      default: "'{}'",
    },
    tags: {
      type: 'text[]',
      default: "'{}'",
    },
    notes: {
      type: 'text',
    },
    // Metadata
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    created_by: {
      type: 'varchar(255)',
    },
    last_contact_date: {
      type: 'timestamp',
    },
  });

  // Create unique constraint for tax_id
  pgm.addConstraint({ schema: 'financial', name: 'clients' }, 'unique_tax_id', {
    unique: ['tax_id', 'tax_id_type'],
  });

  // Create indexes for clients
  pgm.createIndex({ schema: 'financial', name: 'clients' }, 'status');
  pgm.createIndex({ schema: 'financial', name: 'clients' }, 'email');
  pgm.createIndex({ schema: 'financial', name: 'clients' }, 'tax_id');
  pgm.createIndex({ schema: 'financial', name: 'clients' }, 'created_at', { method: 'btree', order: 'DESC' });
  pgm.createIndex({ schema: 'financial', name: 'clients' }, 'tags', { method: 'gin' });

  // Create invoices table
  pgm.createTable({ schema: 'financial', name: 'invoices' }, {
    id: {
      type: 'varchar(255)',
      primaryKey: true,
    },
    invoice_number: {
      type: 'varchar(50)',
      notNull: true,
      unique: true,
    },
    // Client Information
    client_id: {
      type: 'varchar(255)',
      notNull: true,
      references: { schema: 'financial', name: 'clients' },
    },
    client_name: {
      type: 'varchar(255)',
      notNull: true,
    },
    client_tax_id: {
      type: 'varchar(100)',
      notNull: true,
    },
    client_address: {
      type: 'jsonb',
    },
    // Invoice Details
    type: {
      type: 'varchar(20)',
      notNull: true,
      check: "type IN ('invoice', 'credit_note', 'proforma', 'receipt')",
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: "'draft'",
      check: "status IN ('draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled', 'refunded')",
    },
    // Dates
    issue_date: {
      type: 'date',
      notNull: true,
      default: pgm.func('current_date'),
    },
    due_date: {
      type: 'date',
      notNull: true,
    },
    paid_date: {
      type: 'date',
    },
    service_start_date: {
      type: 'date',
    },
    service_end_date: {
      type: 'date',
    },
    // Financial Information
    currency: {
      type: 'varchar(10)',
      notNull: true,
      default: "'EUR'",
    },
    exchange_rate: {
      type: 'decimal(10,6)',
    },
    // Line Items (stored as JSONB array)
    items: {
      type: 'jsonb',
      notNull: true,
      default: "'[]'",
    },
    // Totals
    subtotal: {
      type: 'decimal(15,2)',
      notNull: true,
      default: 0,
    },
    tax_amount: {
      type: 'decimal(15,2)',
      notNull: true,
      default: 0,
    },
    tax_rate: {
      type: 'decimal(5,2)',
      notNull: true,
      default: 21,
    },
    tax_type: {
      type: 'varchar(10)',
      notNull: true,
      default: "'IVA'",
      check: "tax_type IN ('IVA', 'VAT', 'GST', 'NONE')",
    },
    discount: {
      type: 'decimal(15,2)',
    },
    discount_type: {
      type: 'varchar(10)',
      check: "discount_type IN ('percentage', 'fixed')",
    },
    total: {
      type: 'decimal(15,2)',
      notNull: true,
      default: 0,
    },
    // Payment Information
    payment_method: {
      type: 'varchar(20)',
      check: "payment_method IN ('transfer', 'cash', 'card', 'crypto', 'other')",
    },
    payment_terms: {
      type: 'integer',
      notNull: true,
      default: 30,
    },
    bank_account: {
      type: 'varchar(255)',
    },
    payment_reference: {
      type: 'varchar(255)',
    },
    // Related Documents
    related_documents: {
      type: 'jsonb',
      default: "'[]'",
    },
    related_transaction_ids: {
      type: 'text[]',
      default: "'{}'",
    },
    // Custom Fields
    notes: {
      type: 'text',
    },
    terms_and_conditions: {
      type: 'text',
    },
    custom_fields: {
      type: 'jsonb',
      default: "'{}'",
    },
    tags: {
      type: 'text[]',
      default: "'{}'",
    },
    // Metadata
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    sent_at: {
      type: 'timestamp',
    },
    viewed_at: {
      type: 'timestamp',
    },
    created_by: {
      type: 'varchar(255)',
    },
    // Attachments
    attachments: {
      type: 'jsonb',
      default: "'[]'",
    },
    pdf_url: {
      type: 'varchar(500)',
    },
    // Tax Deductible Info
    is_deductible: {
      type: 'boolean',
      default: false,
    },
    deductible_category: {
      type: 'varchar(100)',
    },
    deductible_percentage: {
      type: 'decimal(5,2)',
    },
  });

  // Create indexes for invoices
  pgm.createIndex({ schema: 'financial', name: 'invoices' }, 'client_id');
  pgm.createIndex({ schema: 'financial', name: 'invoices' }, 'status');
  pgm.createIndex({ schema: 'financial', name: 'invoices' }, 'issue_date', { method: 'btree', order: 'DESC' });
  pgm.createIndex({ schema: 'financial', name: 'invoices' }, 'due_date');
  pgm.createIndex({ schema: 'financial', name: 'invoices' }, 'invoice_number');
  pgm.createIndex({ schema: 'financial', name: 'invoices' }, 'tags', { method: 'gin' });
  pgm.createIndex({ schema: 'financial', name: 'invoices' }, 'related_transaction_ids', { method: 'gin' });

  // Invoice number sequences table
  pgm.createTable({ schema: 'financial', name: 'invoice_sequences' }, {
    id: {
      type: 'serial',
      primaryKey: true,
    },
    prefix: {
      type: 'varchar(20)',
      notNull: true,
    },
    current_number: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    year: {
      type: 'integer',
    },
    format: {
      type: 'varchar(50)',
      notNull: true,
      default: "'PREFIX-YYYY-0000'",
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  // Add unique constraint for invoice sequences
  pgm.addConstraint({ schema: 'financial', name: 'invoice_sequences' }, 'unique_sequence_prefix_year', {
    unique: ['prefix', 'year'],
  });

  // Create view for client statistics
  pgm.sql(`
    CREATE OR REPLACE VIEW financial.client_statistics AS
    SELECT 
      c.id AS client_id,
      c.name AS client_name,
      c.total_revenue,
      c.total_invoices,
      COUNT(CASE WHEN i.status = 'paid' THEN 1 END) AS paid_invoices,
      COUNT(CASE WHEN i.status IN ('sent', 'viewed') THEN 1 END) AS pending_invoices,
      COUNT(CASE WHEN i.status = 'overdue' THEN 1 END) AS overdue_invoices,
      AVG(CASE 
        WHEN i.paid_date IS NOT NULL 
        THEN EXTRACT(DAY FROM (i.paid_date - i.issue_date))
      END) AS average_payment_days,
      MAX(i.paid_date) AS last_payment_date,
      CASE 
        WHEN COUNT(CASE WHEN i.status = 'overdue' THEN 1 END) > 2 THEN 'high'
        WHEN COUNT(CASE WHEN i.status = 'overdue' THEN 1 END) > 0 THEN 'medium'
        ELSE 'low'
      END AS risk_score
    FROM financial.clients c
    LEFT JOIN financial.invoices i ON c.id = i.client_id
    GROUP BY c.id, c.name, c.total_revenue, c.total_invoices;
  `);

  // Create function to update client statistics
  pgm.sql(`
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
  `);

  // Create trigger for automatic client stats update
  pgm.sql(`
    CREATE TRIGGER update_client_stats_trigger
    AFTER INSERT OR UPDATE ON financial.invoices
    FOR EACH ROW
    EXECUTE FUNCTION financial.update_client_stats();
  `);

  // Create function to generate invoice numbers
  pgm.sql(`
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
  `);

  // Grant permissions
  pgm.sql('GRANT ALL ON financial.clients TO ai_user;');
  pgm.sql('GRANT ALL ON financial.invoices TO ai_user;');
  pgm.sql('GRANT ALL ON financial.invoice_sequences TO ai_user;');
  pgm.sql('GRANT ALL ON financial.invoice_sequences_id_seq TO ai_user;');
  pgm.sql('GRANT ALL ON financial.client_statistics TO ai_user;');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  // Drop trigger first
  pgm.sql('DROP TRIGGER IF EXISTS update_client_stats_trigger ON financial.invoices;');
  
  // Drop functions
  pgm.sql('DROP FUNCTION IF EXISTS financial.update_client_stats();');
  pgm.sql('DROP FUNCTION IF EXISTS financial.generate_invoice_number(varchar, integer);');
  
  // Drop view
  pgm.sql('DROP VIEW IF EXISTS financial.client_statistics;');
  
  // Drop tables
  pgm.dropTable({ schema: 'financial', name: 'invoice_sequences' });
  pgm.dropTable({ schema: 'financial', name: 'invoices' });
  pgm.dropTable({ schema: 'financial', name: 'clients' });
};