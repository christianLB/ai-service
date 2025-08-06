const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function createTestUser() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres123@localhost:5434/ai_service'
  });

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    
    // Create the user
    const query = `
      INSERT INTO users (email, password_hash, full_name, role, is_active)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO UPDATE 
      SET password_hash = $2, is_active = $5
      RETURNING id, email, full_name, role, is_active
    `;
    
    const values = [
      'test@example.com',
      hashedPassword,
      'Test User',
      'admin',
      true
    ];
    
    const result = await pool.query(query, values);
    console.log('Test user created/updated:', result.rows[0]);
    
    // Test credentials
    console.log('\nTest credentials:');
    console.log('Email: test@example.com');
    console.log('Password: testpassword123');
    
  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    await pool.end();
  }
}

createTestUser();