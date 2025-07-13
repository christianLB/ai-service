// Test script for authentication system
const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

async function testAuth() {
  console.log('🧪 Testing Authentication System...\n');

  try {
    // Test 1: Try to access protected endpoint without auth
    console.log('1. Testing protected endpoint without auth...');
    try {
      const response = await axios.get(`${API_URL}/financial/health`);
      console.log('❌ FAIL: Should have been blocked!');
      console.log('Response:', response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ PASS: Got 401 Unauthorized as expected');
      } else {
        console.log('❌ FAIL:', error.message);
      }
    }

    // Test 2: Login with correct credentials
    console.log('\n2. Testing login with correct credentials...');
    try {
      const loginResponse = await axios.post(`${API_URL}/auth/login`, {
        email: 'admin@ai-service.local',
        password: 'admin123'
      });
      console.log('✅ PASS: Login successful');
      console.log('Access Token:', loginResponse.data.accessToken.substring(0, 20) + '...');
      console.log('Refresh Token:', loginResponse.data.refreshToken.substring(0, 20) + '...');
      
      const accessToken = loginResponse.data.accessToken;

      // Test 3: Access protected endpoint with token
      console.log('\n3. Testing protected endpoint with auth token...');
      const protectedResponse = await axios.get(`${API_URL}/financial/health`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      console.log('✅ PASS: Protected endpoint accessed successfully');
      console.log('Response:', protectedResponse.data);

      // Test 4: Get current user
      console.log('\n4. Testing /auth/me endpoint...');
      const meResponse = await axios.get(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      console.log('✅ PASS: User info retrieved');
      console.log('User:', meResponse.data);

    } catch (error) {
      console.log('❌ FAIL:', error.response?.data || error.message);
    }

    // Test 5: Login with wrong credentials
    console.log('\n5. Testing login with wrong credentials...');
    try {
      await axios.post(`${API_URL}/auth/login`, {
        email: 'admin@ai-service.local',
        password: 'wrongpassword'
      });
      console.log('❌ FAIL: Should have rejected wrong password');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ PASS: Login rejected as expected');
      } else {
        console.log('❌ FAIL:', error.message);
      }
    }

    // Test 6: Rate limiting
    console.log('\n6. Testing rate limiting (5 attempts)...');
    for (let i = 1; i <= 6; i++) {
      try {
        await axios.post(`${API_URL}/auth/login`, {
          email: 'test@example.com',
          password: 'wrongpassword'
        });
        console.log(`❌ Attempt ${i}: Should have failed`);
      } catch (error) {
        if (i <= 5 && error.response?.status === 401) {
          console.log(`✅ Attempt ${i}: Failed as expected (401)`);
        } else if (i === 6 && error.response?.status === 429) {
          console.log(`✅ Attempt ${i}: Rate limited as expected (429)`);
        } else {
          console.log(`❌ Attempt ${i}: Unexpected response`, error.response?.status);
        }
      }
    }

  } catch (error) {
    console.error('Test suite error:', error.message);
  }

  console.log('\n✅ Authentication tests completed!');
}

// Check if auth bypass is enabled
console.log('📋 Checking AUTH_BYPASS status...');
if (process.env.AUTH_BYPASS === 'true') {
  console.log('⚠️  AUTH_BYPASS is enabled - authentication might be bypassed');
}

// Run tests
testAuth();