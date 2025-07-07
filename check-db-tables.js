#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkTables() {
    const pool = new Pool({
        host: process.env.POSTGRES_HOST,
        port: process.env.POSTGRES_PORT,
        database: process.env.POSTGRES_DB,
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
    });
    
    try {
        console.log('📊 All tables in database:');
        const result = await pool.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `);
        
        console.log(result.rows.map(r => r.table_name));
        
        if (result.rows.length === 0) {
            console.log('\n🔧 No tables found. Running schema creation...');
            
            // Run the schema creation
            const fs = require('fs');
            const path = require('path');
            
            // Check if schema file exists
            const schemaPath = path.join(__dirname, 'src/models/financial/schema.sql');
            if (fs.existsSync(schemaPath)) {
                console.log('Found schema.sql, executing...');
                const schema = fs.readFileSync(schemaPath, 'utf8');
                await pool.query(schema);
                console.log('✅ Schema created successfully');
            } else {
                console.log('❌ Schema file not found at:', schemaPath);
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkTables().catch(console.error);