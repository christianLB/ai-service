-- Simple migration to add just the gocardless_data column
ALTER TABLE financial.transactions 
ADD COLUMN IF NOT EXISTS gocardless_data JSONB;