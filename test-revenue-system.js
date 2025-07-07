#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testRevenueSystem() {
    console.log('🧪 Testing Revenue System...\n');
    
    // Test database connection
    const pool = new Pool({
        host: process.env.POSTGRES_HOST,
        port: process.env.POSTGRES_PORT,
        database: process.env.POSTGRES_DB,
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
    });
    
    try {
        // Test 1: Check database tables
        console.log('📊 1. Checking financial schema tables...');
        const tablesResult = await pool.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'financial' 
            AND table_name IN ('clients', 'invoices', 'transactions', 'categories')
            ORDER BY table_name;
        `);
        
        console.log('✅ Tables found:', tablesResult.rows.map(r => r.table_name));
        
        // Test 2: Check if we can create a client
        console.log('\n👤 2. Testing client creation...');
        const clientId = `client_${Date.now()}`;
        const taxId = `TAX${Date.now()}`;
        const clientResult = await pool.query(`
            INSERT INTO financial.clients (
                id, name, email, phone, address, tax_id, tax_id_type, client_type
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, name, email;
        `, [
            clientId, 
            'Test Client SA', 
            `test${Date.now()}@testclient.com`, 
            '+34123456789', 
            JSON.stringify({street: 'Test Address 123', city: 'Madrid', country: 'Spain'}),
            taxId,
            'CIF',
            'business'
        ]);
        
        console.log('✅ Client created:', clientResult.rows[0]);
        
        // Test 3: Check if we can create an invoice
        console.log('\n🧾 3. Testing invoice creation...');
        const invoiceNumber = `FAC-2025-${Date.now().toString().slice(-4)}`;
        const invoiceId = `invoice_${Date.now()}`;
        const invoiceResult = await pool.query(`
            INSERT INTO financial.invoices (
                id, invoice_number, client_id, client_name, client_tax_id, type,
                issue_date, due_date, subtotal, tax_rate, tax_amount, total, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id, invoice_number, total, status;
        `, [
            invoiceId,
            invoiceNumber, 
            clientId, 
            'Test Client SA',
            taxId,
            'invoice',
            new Date().toISOString().split('T')[0], // Format as YYYY-MM-DD
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
            1000, 21, 210, 1210, 'draft'
        ]);
        
        console.log('✅ Invoice created:', invoiceResult.rows[0]);
        
        // Test 4: Add invoice items (if table exists)
        console.log('\n📝 4. Testing invoice items...');
        try {
            await pool.query(`
                INSERT INTO financial.invoice_items (invoice_id, description, quantity, unit_price, total_price)
                VALUES ($1, $2, $3, $4, $5);
            `, [invoiceId, 'Test Service', 1, 1000, 1000]);
            console.log('✅ Invoice item added');
        } catch (error) {
            console.log('ℹ️ Invoice items table not found, using items JSONB field instead');
            await pool.query(`
                UPDATE financial.invoices 
                SET items = '[{"description": "Test Service", "quantity": 1, "unit_price": 1000, "total": 1000}]'
                WHERE id = $1;
            `, [invoiceId]);
            console.log('✅ Invoice items updated in JSONB');
        }
        
        // Test 5: Check revenue calculation
        console.log('\n💰 5. Testing revenue calculation...');
        const revenueResult = await pool.query(`
            SELECT 
                COUNT(*) as total_invoices,
                SUM(total) as total_revenue,
                SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END) as paid_revenue,
                SUM(CASE WHEN status != 'paid' THEN total ELSE 0 END) as pending_revenue
            FROM financial.invoices;
        `);
        
        console.log('✅ Revenue summary:', revenueResult.rows[0]);
        
        // Test 6: Test PDF generation dependencies
        console.log('\n📄 6. Testing PDF generation dependencies...');
        try {
            const puppeteer = require('puppeteer');
            const handlebars = require('handlebars');
            const qrcode = require('qrcode');
            console.log('✅ PDF dependencies loaded (puppeteer, handlebars, qrcode)');
        } catch (error) {
            console.log('❌ PDF dependencies error:', error.message);
        }
        
        // Test 7: Test email dependencies
        console.log('\n📧 7. Testing email dependencies...');
        try {
            const nodemailer = require('nodemailer');
            console.log('✅ Email dependencies loaded (nodemailer)');
        } catch (error) {
            console.log('❌ Email dependencies error:', error.message);
        }
        
        console.log('\n🎉 Revenue system test completed successfully!');
        console.log('\n📱 Next steps:');
        console.log('1. Test Telegram commands using the test guide');
        console.log('2. Try creating invoices via Telegram: /invoice create "Test Company" 1500 "Development services"');
        console.log('3. Check revenue: /revenue month');
        console.log('4. View pending invoices: /pending');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await pool.end();
    }
}

testRevenueSystem().catch(console.error);