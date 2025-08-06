const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Test authentication logic directly
async function testAuth() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres123@localhost:5434/ai_service'
  });

  const email = 'test@example.com';
  const password = 'testpassword123';
  const jwtSecret = process.env.JWT_SECRET || 'default-jwt-secret-for-dev';

  try {
    console.log('Testing authentication for:', email);
    
    // 1. Fetch user from database
    const userQuery = 'SELECT * FROM users WHERE email = $1';
    const userResult = await pool.query(userQuery, [email]);
    
    if (userResult.rows.length === 0) {
      console.error('❌ User not found');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('✅ User found:', { id: user.id, email: user.email, role: user.role });
    
    // 2. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    console.log('✅ Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.error('❌ Invalid password');
      return;
    }
    
    // 3. Generate JWT tokens
    const accessToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      jwtSecret,
      { expiresIn: '15m' }
    );
    
    const refreshToken = jwt.sign(
      { 
        userId: user.id,
        type: 'refresh'
      },
      jwtSecret,
      { expiresIn: '7d' }
    );
    
    console.log('\n✅ Authentication successful!');
    console.log('\nGenerated tokens:');
    console.log('Access Token:', accessToken.substring(0, 50) + '...');
    console.log('Refresh Token:', refreshToken.substring(0, 50) + '...');
    
    // 4. Verify the access token
    const decoded = jwt.verify(accessToken, jwtSecret);
    console.log('\n✅ Token decoded:', decoded);
    
    // 5. Test API call with token
    console.log('\nTo test the API with this token:');
    console.log(`curl -H "Authorization: Bearer ${accessToken}" http://localhost:3001/api/auth/me`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testAuth();