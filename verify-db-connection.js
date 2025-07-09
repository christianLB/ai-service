#!/usr/bin/env node

// Script para verificar la conexión a PostgreSQL
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Cargar variables de entorno
const envLocalPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
  console.log('✅ Loaded .env.local');
} else {
  console.log('⚠️  No .env.local found, using environment variables');
}

console.log('\n🔍 Database Configuration:');
console.log('POSTGRES_HOST:', process.env.POSTGRES_HOST || '❌ NOT SET');
console.log('POSTGRES_PORT:', process.env.POSTGRES_PORT || '❌ NOT SET');
console.log('POSTGRES_DB:', process.env.POSTGRES_DB || '❌ NOT SET');
console.log('POSTGRES_USER:', process.env.POSTGRES_USER || '❌ NOT SET');
console.log('POSTGRES_PASSWORD:', process.env.POSTGRES_PASSWORD ? '✅ SET' : '❌ NOT SET');

async function verifyConnection() {
  // Verificar variables requeridas
  const requiredVars = ['POSTGRES_HOST', 'POSTGRES_PORT', 'POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD'];
  const missingVars = requiredVars.filter(v => !process.env[v]);
  
  if (missingVars.length > 0) {
    console.error('\n❌ Missing required environment variables:', missingVars);
    process.exit(1);
  }

  // Crear pool con la configuración correcta
  const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT),
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    connectionTimeoutMillis: 5000
  });

  try {
    console.log('\n🔄 Testing database connection...');
    
    // Test básico de conexión
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, current_database() as database');
    console.log('✅ Connected successfully!');
    console.log('📅 Server time:', result.rows[0].current_time);
    console.log('🗄️  Database:', result.rows[0].database);
    
    // Verificar tablas de invoice
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('invoice_numbering_sequences', 'stored_invoices')
    `);
    
    console.log('\n📋 Invoice tables:');
    if (tablesResult.rows.length === 0) {
      console.log('⚠️  No invoice tables found - they will be created on first use');
    } else {
      tablesResult.rows.forEach(row => {
        console.log('✅', row.table_name);
      });
    }
    
    // Verificar conexiones activas
    const connectionsResult = await client.query(`
      SELECT count(*) as total_connections,
             sum(case when state = 'active' then 1 else 0 end) as active,
             sum(case when state = 'idle' then 1 else 0 end) as idle
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `);
    
    const conn = connectionsResult.rows[0];
    console.log('\n📊 Connection stats:');
    console.log(`Total: ${conn.total_connections}, Active: ${conn.active}, Idle: ${conn.idle}`);
    
    client.release();
    
  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    console.error('Error code:', error.code);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Possible solutions:');
      console.error('1. Check if PostgreSQL is running');
      console.error('2. Verify POSTGRES_HOST is correct (current:', process.env.POSTGRES_HOST, ')');
      console.error('3. Check firewall/network settings');
      console.error('4. For Docker: use container name, not localhost');
    } else if (error.code === '28P01') {
      console.error('\n💡 Authentication failed - check username and password');
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Ejecutar verificación
verifyConnection().then(() => {
  console.log('\n✅ Database verification completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});