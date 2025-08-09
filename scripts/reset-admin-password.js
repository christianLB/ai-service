const bcrypt = require('bcrypt');
const { Pool } = require('pg');

async function resetAdminPassword() {
  const pool = new Pool({
    host: 'localhost',
    port: 5434,
    database: 'ai_service',
    user: 'ai_user',
    password: 'ultra_secure_password_2025'
  });

  try {
    // Generate new hash for 'admin123'
    const newPasswordHash = await bcrypt.hash('admin123', 10);
    console.log('Generated hash for admin123:', newPasswordHash);

    // Update the admin user's password
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING email',
      [newPasswordHash, 'admin@ai-service.local']
    );

    if (result.rowCount > 0) {
      console.log('✅ Successfully reset password for:', result.rows[0].email);
      console.log('You can now login with:');
      console.log('  Email: admin@ai-service.local');
      console.log('  Password: admin123');
    } else {
      console.log('❌ Admin user not found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

resetAdminPassword();