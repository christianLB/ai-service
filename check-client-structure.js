#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkClientStructure() {
    const pool = new Pool({
        host: process.env.POSTGRES_HOST,
        port: process.env.POSTGRES_PORT,
        database: process.env.POSTGRES_DB,
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
    });
    
    try {
        // Check column structure
        console.log('📋 Client table structure:');
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_schema = 'financial' AND table_name = 'clients'
            ORDER BY ordinal_position;
        `);
        
        result.rows.forEach(row => {
            console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(NOT NULL)' : ''} ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`);
        });
        
        // Check constraints
        console.log('\n🔒 Client table constraints:');
        const constraintResult = await pool.query(`
            SELECT constraint_name, constraint_type
            FROM information_schema.table_constraints 
            WHERE table_schema = 'financial' AND table_name = 'clients';
        `);
        
        constraintResult.rows.forEach(row => {
            console.log(`  ${row.constraint_name}: ${row.constraint_type}`);
        });
        
        // Try a simple insert without conflict
        console.log('\n👤 Testing simple client creation...');
        const testResult = await pool.query(`
            INSERT INTO financial.clients (name, email, phone)
            VALUES ($1, $2, $3)
            RETURNING id, name, email;
        `, [`Test Client ${Date.now()}`, `test${Date.now()}@example.com`, '+34123456789']);
        
        console.log('✅ Simple client created:', testResult.rows[0]);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkClientStructure().catch(console.error);