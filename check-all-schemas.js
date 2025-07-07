#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkAllSchemas() {
    const pool = new Pool({
        host: process.env.POSTGRES_HOST,
        port: process.env.POSTGRES_PORT,
        database: process.env.POSTGRES_DB,
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
    });
    
    try {
        console.log('📊 All schemas in database:');
        const schemasResult = await pool.query(`
            SELECT schema_name FROM information_schema.schemata 
            WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
            ORDER BY schema_name;
        `);
        
        for (const schema of schemasResult.rows) {
            console.log(`\n🔹 Schema: ${schema.schema_name}`);
            
            const tablesResult = await pool.query(`
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = $1 
                ORDER BY table_name;
            `, [schema.schema_name]);
            
            if (tablesResult.rows.length > 0) {
                console.log('  Tables:', tablesResult.rows.map(r => r.table_name).join(', '));
            } else {
                console.log('  No tables found');
            }
        }
        
        // Test specific tables we need
        console.log('\n🔍 Testing access to financial tables...');
        try {
            const clientsResult = await pool.query('SELECT COUNT(*) FROM financial.clients LIMIT 1');
            console.log('✅ financial.clients accessible');
        } catch (error) {
            console.log('❌ financial.clients not accessible:', error.message);
        }
        
        try {
            const invoicesResult = await pool.query('SELECT COUNT(*) FROM financial.invoices LIMIT 1');
            console.log('✅ financial.invoices accessible');
        } catch (error) {
            console.log('❌ financial.invoices not accessible:', error.message);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkAllSchemas().catch(console.error);