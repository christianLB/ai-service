// scripts/get-admin-token.js

// Load environment variables from .env.local
require('dotenv').config({ path: './.env.local' });

const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Error: DATABASE_URL is not defined. Make sure it is in your .env.local file.');
  process.exit(1);
}

const pool = new Pool({ connectionString });

const getAdminToken = async () => {
  try {
    const userResult = await pool.query("SELECT * FROM users WHERE email = 'admin@ai-service.local'");

    if (userResult.rows.length === 0) {
      console.error('❌ Admin user not found. Please create it first by running: make dev-auth-create-admin');
      process.exit(1);
    }

    const adminUser = userResult.rows[0];
    const payload = { userId: adminUser.id, email: adminUser.email, role: adminUser.role, type: 'access' };
    
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('❌ JWT_SECRET is not defined in your .env.local file.');
      process.exit(1);
    }

    const token = jwt.sign(payload, secret, { expiresIn: '1h' });

    console.log('✅ Admin JWT Token:');
    console.log(token);

  } catch (error) {
    console.error(`❌ An error occurred: ${error.message}`);
    if (error.code) {
      console.error(`   Database error code: ${error.code}`);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
};

getAdminToken();
