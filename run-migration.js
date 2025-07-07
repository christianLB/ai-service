#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
    const pool = new Pool({
        host: process.env.POSTGRES_HOST,
        port: process.env.POSTGRES_PORT,
        database: process.env.POSTGRES_DB,
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
    });
    
    try {
        console.log('🔧 Running database migration...\n');
        
        // First create the simplified client-invoice schema that's compatible with our services
        const schemaPath = path.join(__dirname, 'src/services/database-migrations/client-invoice-schema.sql');
        if (fs.existsSync(schemaPath)) {
            console.log('📁 Executing client-invoice schema...');
            const schema = fs.readFileSync(schemaPath, 'utf8');
            await pool.query(schema);
            console.log('✅ Client-invoice schema created successfully');
        } else {
            // Create basic tables needed for our revenue system
            console.log('📁 Creating basic revenue system tables...');
            
            // Create schemas
            await pool.query('CREATE SCHEMA IF NOT EXISTS financial;');
            console.log('✅ Financial schema created');
            
            // Create clients table (simplified version)
            await pool.query(`
                CREATE TABLE IF NOT EXISTS clients (
                    id VARCHAR(255) PRIMARY KEY DEFAULT 'client_' || gen_random_uuid(),
                    name VARCHAR(255) NOT NULL,
                    email VARCHAR(255) NOT NULL UNIQUE,
                    phone VARCHAR(50),
                    address TEXT,
                    language VARCHAR(10) DEFAULT 'es',
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
            `);
            console.log('✅ Clients table created');
            
            // Create invoices table
            await pool.query(`
                CREATE TABLE IF NOT EXISTS invoices (
                    id VARCHAR(255) PRIMARY KEY DEFAULT 'inv_' || gen_random_uuid(),
                    invoice_number VARCHAR(50) NOT NULL UNIQUE,
                    client_id VARCHAR(255) NOT NULL REFERENCES clients(id),
                    type VARCHAR(20) NOT NULL DEFAULT 'invoice',
                    status VARCHAR(20) NOT NULL DEFAULT 'draft',
                    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
                    due_date DATE NOT NULL,
                    paid_date DATE,
                    currency VARCHAR(10) NOT NULL DEFAULT 'EUR',
                    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
                    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
                    tax_rate DECIMAL(5,2) NOT NULL DEFAULT 21,
                    discount DECIMAL(15,2),
                    discount_type VARCHAR(10),
                    total DECIMAL(15,2) NOT NULL DEFAULT 0,
                    notes TEXT,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
            `);
            console.log('✅ Invoices table created');
            
            // Create invoice items table
            await pool.query(`
                CREATE TABLE IF NOT EXISTS invoice_items (
                    id VARCHAR(255) PRIMARY KEY DEFAULT 'item_' || gen_random_uuid(),
                    invoice_id VARCHAR(255) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
                    description TEXT NOT NULL,
                    quantity DECIMAL(10,3) DEFAULT 1,
                    unit_price DECIMAL(12,2) NOT NULL,
                    total DECIMAL(12,2) NOT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
            `);
            console.log('✅ Invoice items table created');
            
            // Create transactions table
            await pool.query(`
                CREATE TABLE IF NOT EXISTS transactions (
                    id VARCHAR(255) PRIMARY KEY DEFAULT 'txn_' || gen_random_uuid(),
                    description TEXT NOT NULL,
                    amount DECIMAL(15,2) NOT NULL,
                    currency VARCHAR(10) NOT NULL DEFAULT 'EUR',
                    date DATE NOT NULL,
                    counterparty_name VARCHAR(255),
                    reference VARCHAR(255),
                    status VARCHAR(20) DEFAULT 'confirmed',
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
            `);
            console.log('✅ Transactions table created');
            
            // Create indexes
            await pool.query('CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);');
            await pool.query('CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);');
            await pool.query('CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);');
            console.log('✅ Indexes created');
        }
        
        // Check final tables
        console.log('\n📊 Checking final database state...');
        const result = await pool.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('clients', 'invoices', 'invoice_items', 'transactions')
            ORDER BY table_name;
        `);
        
        console.log('✅ Tables available:', result.rows.map(r => r.table_name));
        
        // Insert a test client if none exist
        const clientCheck = await pool.query('SELECT COUNT(*) FROM clients');
        if (parseInt(clientCheck.rows[0].count) === 0) {
            console.log('\n👤 Creating sample data...');
            await pool.query(`
                INSERT INTO clients (id, name, email, phone, language)
                VALUES 
                ('test_client_1', 'Empresa Demo SL', 'demo@empresa.com', '+34123456789', 'es')
                ON CONFLICT (email) DO NOTHING;
            `);
            console.log('✅ Sample client created');
        }
        
        console.log('\n🎉 Database migration completed successfully!');
        console.log('\n📱 Ready to test Telegram commands:');
        console.log('- /invoice create "Cliente Test" 1500 "Servicios de desarrollo"');
        console.log('- /revenue month');
        console.log('- /pending');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

runMigration().catch(console.error);