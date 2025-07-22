const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:3000/api/financial';
const AUTH_TOKEN = 'test-token'; // Replace with actual token

const headers = {
  'Authorization': `Bearer ${AUTH_TOKEN}`,
  'Content-Type': 'application/json'
};

async function testTransactionMatching() {
  console.log('Testing Transaction Matching Service...\n');

  try {
    // 1. Test getting unlinked transactions
    console.log('1. Getting unlinked transactions...');
    const unlinkedResponse = await axios.get(`${API_BASE_URL}/transactions/unlinked`, { headers });
    console.log(`Found ${unlinkedResponse.data.data.total} unlinked transactions`);
    console.log('First 3 transactions:', unlinkedResponse.data.data.transactions.slice(0, 3));

    // 2. Test auto-matching
    console.log('\n2. Testing auto-match...');
    const autoMatchResponse = await axios.post(`${API_BASE_URL}/transactions/auto-match`, {}, { headers });
    console.log('Auto-match results:', autoMatchResponse.data);

    // 3. Test getting patterns for a client (if you have a client ID)
    const clientId = 'test-client-id'; // Replace with actual client ID
    console.log('\n3. Getting matching patterns for client...');
    try {
      const patternsResponse = await axios.get(`${API_BASE_URL}/transactions/patterns/${clientId}`, { headers });
      console.log('Patterns:', patternsResponse.data);
    } catch (error) {
      console.log('Error getting patterns:', error.response?.data || error.message);
    }

    // 4. Test creating a pattern
    console.log('\n4. Creating a matching pattern...');
    try {
      const patternResponse = await axios.post(`${API_BASE_URL}/transactions/patterns`, {
        clientId: clientId,
        patternType: 'description',
        pattern: 'test payment.*',
        confidence: 0.85,
        isActive: true
      }, { headers });
      console.log('Created pattern:', patternResponse.data);
    } catch (error) {
      console.log('Error creating pattern:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testTransactionMatching();