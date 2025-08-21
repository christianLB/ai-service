import { test, expect } from '../fixtures/test-fixtures';
import { faker } from '@faker-js/faker';

/**
 * Critical Test 3: Client Management
 * Tests CRUD operations for clients
 */

test.describe('Client Management', () => {
  test.use({ authenticatedContext: true });

  test('should create a new client', async ({ clientsPage }) => {
    await clientsPage.goto();
    await clientsPage.waitForClientsLoad();
    
    // Get initial client count
    const initialCount = await clientsPage.getClientCount();
    
    // Open add client modal
    await clientsPage.openAddClientModal();
    
    // Fill client form
    const newClient = {
      name: faker.company.name(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      address: faker.location.streetAddress(),
    };
    
    await clientsPage.fillClientForm(newClient);
    
    // Save client
    await clientsPage.saveClient();
    
    // Verify success message
    const success = await clientsPage.verifySuccessMessage();
    expect(success).toBeTruthy();
    
    // Verify client appears in list
    const clientInList = await clientsPage.isClientInList(newClient.name);
    expect(clientInList).toBeTruthy();
    
    // Verify count increased
    const newCount = await clientsPage.getClientCount();
    expect(newCount).toBe(initialCount + 1);
  });

  test('should search for a client', async ({ clientsPage, testData }) => {
    // Create a test client first
    const testClient = await testData.createTestClient({
      name: 'Searchable Company Inc',
    });
    
    await clientsPage.goto();
    await clientsPage.waitForClientsLoad();
    
    // Search for the client
    await clientsPage.searchClient('Searchable');
    
    // Verify client appears in filtered results
    const clientFound = await clientsPage.isClientInList('Searchable Company Inc');
    expect(clientFound).toBeTruthy();
    
    // Search for non-existent client
    await clientsPage.searchClient('NonExistentCompany123');
    
    // Verify no results or empty state
    const count = await clientsPage.getClientCount();
    expect(count).toBe(0);
  });

  test('should edit an existing client', async ({ clientsPage, testData }) => {
    // Create a test client
    const testClient = await testData.createTestClient({
      name: 'Original Company Name',
      email: 'original@example.com',
    });
    
    await clientsPage.goto();
    await clientsPage.waitForClientsLoad();
    
    // Edit the client
    await clientsPage.editClient('Original Company Name');
    
    // Update client information
    const updatedInfo = {
      name: 'Updated Company Name',
      email: 'updated@example.com',
      phone: faker.phone.number(),
    };
    
    await clientsPage.fillClientForm(updatedInfo);
    await clientsPage.saveClient();
    
    // Verify success message
    const success = await clientsPage.verifySuccessMessage();
    expect(success).toBeTruthy();
    
    // Verify updated client appears in list
    const updatedClientInList = await clientsPage.isClientInList('Updated Company Name');
    expect(updatedClientInList).toBeTruthy();
    
    // Verify old name no longer appears
    const oldClientInList = await clientsPage.isClientInList('Original Company Name');
    expect(oldClientInList).toBeFalsy();
  });

  test('should delete a client', async ({ clientsPage, testData }) => {
    // Create a test client
    const testClient = await testData.createTestClient({
      name: 'Company To Delete',
    });
    
    await clientsPage.goto();
    await clientsPage.waitForClientsLoad();
    
    // Get initial count
    const initialCount = await clientsPage.getClientCount();
    
    // Verify client exists
    const clientExists = await clientsPage.isClientInList('Company To Delete');
    expect(clientExists).toBeTruthy();
    
    // Delete the client
    await clientsPage.deleteClient('Company To Delete');
    
    // Verify success message
    const success = await clientsPage.verifySuccessMessage();
    expect(success).toBeTruthy();
    
    // Verify client no longer in list
    const clientDeleted = await clientsPage.isClientInList('Company To Delete');
    expect(clientDeleted).toBeFalsy();
    
    // Verify count decreased
    const newCount = await clientsPage.getClientCount();
    expect(newCount).toBe(initialCount - 1);
  });

  test('should validate required fields when creating client', async ({ clientsPage }) => {
    await clientsPage.goto();
    await clientsPage.waitForClientsLoad();
    
    // Open add client modal
    await clientsPage.openAddClientModal();
    
    // Try to save without filling required fields
    await clientsPage.saveButton.click();
    
    // Verify error message appears
    const errorMessage = await clientsPage.verifyErrorMessage();
    expect(errorMessage).toBeTruthy();
    
    // Modal should still be open
    await expect(clientsPage.modal).toBeVisible();
    
    // Fill only name (missing email)
    await clientsPage.fillClientForm({
      name: 'Test Company',
      email: '', // Invalid email
    });
    
    await clientsPage.saveButton.click();
    
    // Should still show error
    const emailError = await clientsPage.verifyErrorMessage();
    expect(emailError).toBeTruthy();
  });
});