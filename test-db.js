const { Pool } = require('pg');

const pool = new Pool({
  host: 'postgres',
  port: 5432,
  database: 'ai_service',
  user: 'ai_user',
  password: 'ultra_secure_password_2025'
});

async function testDb() {
  try {
    // Test connection
    console.log('Testing database connection...');
    const res = await pool.query('SELECT NOW()');
    console.log('Database connected:', res.rows[0].now);
    
    // Check for user
    console.log('\nLooking for test user...');
    const userRes = await pool.query('SELECT id, email, full_name, role FROM users WHERE email = $1', ['test@example.com']);
    
    if (userRes.rows.length > 0) {
      console.log('User found:', userRes.rows[0]);
    } else {
      console.log('User not found');
    }
    
    // Check schema
    console.log('\nChecking database schema...');
    const schemaRes = await pool.query(`
      SELECT schemaname, tablename 
      FROM pg_tables 
      WHERE tablename IN ('users', 'clients', 'invoices')
      ORDER BY schemaname, tablename
    `);
    console.log('Tables found:');
    schemaRes.rows.forEach(row => {
      console.log(`  ${row.schemaname}.${row.tablename}`);
    });
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

testDb();