const axios = require('axios');

const API_URL = 'http://localhost:3001';

async function testClientUpdate() {
  try {
    // Login with admin user
    console.log('1. Logging in with admin user...');
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'admin@ai-service.local',
      password: 'admin123'
    });

    const token = loginResponse.data.accessToken;
    console.log('Login successful, token received');
    
    // Decode JWT to see user info
    const tokenParts = token.split('.');
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
    console.log('JWT payload:', payload);

    // Set authorization header for subsequent requests
    const authHeaders = {
      headers: { Authorization: `Bearer ${token}` }
    };

    // Create a client
    console.log('\n2. Creating a client...');
    const createResponse = await axios.post(`${API_URL}/api/financial/clients`, {
      name: 'Test Client',
      email: 'client@example.com',
      taxId: 'TAX123456',
      taxIdType: 'VAT',
      clientType: 'business',
      phone: '+1234567890',
      address: '123 Test Street',
      timezone: 'America/New_York',
      notes: 'Test client created for update verification'
    }, authHeaders);

    const clientId = createResponse.data.data.client.id;
    console.log(`Client created with ID: ${clientId}`);

    // Update the client with all the fields that were previously missing
    console.log('\n3. Updating the client with previously problematic fields...');
    const updateResponse = await axios.put(`${API_URL}/api/financial/clients/${clientId}`, {
      name: 'Updated Test Client',
      taxId: 'TAX789012',
      taxIdType: 'EIN',
      clientType: 'individual',
      timezone: 'Europe/London',
      phone: '+9876543210',
      notes: 'Client successfully updated with all fields!'
    }, authHeaders);

    console.log('\nUpdate response:', JSON.stringify(updateResponse.data, null, 2));

    // Get the client to verify the update
    console.log('\n4. Fetching updated client to verify changes...');
    const getResponse = await axios.get(`${API_URL}/api/financial/clients/${clientId}`, authHeaders);
    
    const updatedClient = getResponse.data.data.client;
    console.log('\nUpdated client data:');
    console.log(`- Name: ${updatedClient.name}`);
    console.log(`- Tax ID: ${updatedClient.taxId}`);
    console.log(`- Tax ID Type: ${updatedClient.taxIdType}`);
    console.log(`- Client Type: ${updatedClient.clientType}`);
    console.log(`- Timezone: ${updatedClient.timezone}`);
    console.log(`- Phone: ${updatedClient.phone}`);
    console.log(`- Notes: ${updatedClient.notes}`);

    // Verify the fields were actually updated
    const fieldsUpdated = {
      name: updatedClient.name === 'Updated Test Client',
      taxId: updatedClient.taxId === 'TAX789012',
      taxIdType: updatedClient.taxIdType === 'EIN',
      clientType: updatedClient.clientType === 'individual',
      timezone: updatedClient.timezone === 'Europe/London',
      phone: updatedClient.phone === '+9876543210'
    };

    console.log('\n✅ Update verification:');
    Object.entries(fieldsUpdated).forEach(([field, updated]) => {
      console.log(`- ${field}: ${updated ? '✓ Updated' : '✗ NOT Updated'}`);
    });

    const allFieldsUpdated = Object.values(fieldsUpdated).every(v => v);
    if (allFieldsUpdated) {
      console.log('\n🎉 SUCCESS: All fields were updated correctly!');
    } else {
      console.log('\n❌ FAILURE: Some fields were not updated.');
    }

    // Clean up - delete the test client
    console.log('\n5. Cleaning up - deleting test client...');
    await axios.delete(`${API_URL}/api/financial/clients/${clientId}`, authHeaders);
    console.log('Test client deleted.');

  } catch (error) {
    console.error('Error during test:', error.response?.data || error.message);
  }
}

// Run the test
testClientUpdate();