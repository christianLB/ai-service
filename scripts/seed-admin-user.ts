import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { config } from '../src/config';

async function seedAdminUser() {
  const pool = new Pool(config.postgres);
  
  try {
    console.log('🌱 Seeding admin user...');
    
    // Check if admin already exists
    const checkQuery = 'SELECT id FROM users WHERE email = $1';
    const checkResult = await pool.query(checkQuery, ['admin@ai-service.local']);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ Admin user already exists');
      return;
    }
    
    // Generate secure password hash
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD;
    if (!defaultPassword) {
      console.error('❌ Error: DEFAULT_ADMIN_PASSWORD environment variable is required');
      console.error('   Please set it in your .env file or environment');
      process.exit(1);
    }
    if (process.env.NODE_ENV === 'production' && defaultPassword.length < 12) {
      console.error('❌ Error: Password must be at least 12 characters in production');
      process.exit(1);
    }
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    
    // Insert admin user
    const insertQuery = `
      INSERT INTO users (email, password_hash, full_name, role, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, full_name, role
    `;
    
    const result = await pool.query(insertQuery, [
      'admin@ai-service.local',
      passwordHash,
      'System Administrator',
      'admin',
      true
    ]);
    
    console.log('✅ Admin user created successfully:');
    console.log('   Email:', result.rows[0].email);
    console.log('   Role:', result.rows[0].role);
    if (process.env.NODE_ENV !== 'production') {
      console.log('   Password:', defaultPassword);
    }
    console.log('\n⚠️  IMPORTANT: Change the password on first login!');
    
  } catch (error) {
    console.error('❌ Error seeding admin user:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  seedAdminUser()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { seedAdminUser };