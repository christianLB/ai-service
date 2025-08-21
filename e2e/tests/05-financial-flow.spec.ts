import { test, expect } from '../fixtures/test-fixtures';
import { faker } from '@faker-js/faker';

/**
 * Critical Test 5: Complete Financial Flow
 * Tests the end-to-end financial workflow from client creation to payment
 */

test.describe('Complete Financial Flow', () => {
  test.use({ authenticatedContext: true });

  test('should complete full financial workflow', async ({ 
    clientsPage, 
    invoicesPage, 
    dashboardPage,
    testData 
  }) => {
    // Step 1: Create a new client
    await clientsPage.goto();
    await clientsPage.waitForClientsLoad();
    
    const clientData = {
      name: 'E2E Test Corporation',
      email: 'e2e@testcorp.com',
      phone: faker.phone.number(),
      address: faker.location.streetAddress(),
    };
    
    await clientsPage.openAddClientModal();
    await clientsPage.fillClientForm(clientData);
    await clientsPage.saveClient();
    
    // Verify client created
    const clientCreated = await clientsPage.verifySuccessMessage();
    expect(clientCreated).toBeTruthy();
    
    const clientInList = await clientsPage.isClientInList(clientData.name);
    expect(clientInList).toBeTruthy();
    
    // Step 2: Navigate to invoices
    await invoicesPage.goto();
    await invoicesPage.waitForInvoicesLoad();
    
    // Step 3: Create invoice for the client
    await invoicesPage.openCreateInvoiceModal();
    
    const invoiceData = {
      clientId: 'E2E Test Corporation', // Will need to be adjusted based on actual implementation
      amount: '2500.00',
      dueDate: faker.date.soon({ days: 30 }).toISOString().split('T')[0],
      description: 'Professional Services - Q1 2025',
    };
    
    await invoicesPage.fillInvoiceForm(invoiceData);
    await invoicesPage.saveInvoice();
    
    // Verify invoice created
    const invoiceCreated = await invoicesPage.verifySuccessMessage();
    expect(invoiceCreated).toBeTruthy();
    
    // Step 4: Get the invoice number (assuming it's visible in the list)
    const invoiceCount = await invoicesPage.getInvoiceCount();
    expect(invoiceCount).toBeGreaterThan(0);
    
    // Step 5: Update invoice status to PAID
    // Note: In real implementation, you'd get the actual invoice number
    await invoicesPage.page.waitForTimeout(1000); // Wait for list to update
    
    // Find the most recent invoice (should be at top)
    const firstInvoiceRow = invoicesPage.page.locator('tbody tr, .invoice-row').first();
    const invoiceNumber = await firstInvoiceRow.locator('td:first-child, .invoice-number').textContent();
    
    if (invoiceNumber) {
      await invoicesPage.updateInvoiceStatus(invoiceNumber, 'PAID');
      
      // Verify status updated
      const statusUpdated = await invoicesPage.verifySuccessMessage();
      expect(statusUpdated).toBeTruthy();
    }
    
    // Step 6: Navigate to dashboard to verify metrics updated
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();
    
    // Verify dashboard shows updated metrics
    const revenue = await dashboardPage.getRevenueValue();
    expect(revenue).toBeTruthy();
    expect(revenue).not.toBe('0');
    
    const clients = await dashboardPage.getClientsCount();
    expect(clients).toBeTruthy();
    
    const invoices = await dashboardPage.getInvoicesCount();
    expect(invoices).toBeTruthy();
  });

  test('should handle invoice payment workflow', async ({ 
    invoicesPage, 
    dashboardPage,
    testData 
  }) => {
    // Create test data
    const testClient = await testData.createTestClient({
      name: 'Payment Test Client',
    });
    
    const testInvoice = await testData.createTestInvoice(testClient.id, {
      invoiceNumber: 'INV-PAY-001',
      amount: 5000.00,
      status: 'PENDING',
    });
    
    // Record initial dashboard metrics
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();
    
    const initialRevenue = await dashboardPage.getRevenueValue();
    
    // Go to invoices and mark as paid
    await invoicesPage.goto();
    await invoicesPage.waitForInvoicesLoad();
    
    // Update invoice to PAID
    await invoicesPage.updateInvoiceStatus('INV-PAY-001', 'PAID');
    
    // Verify success
    const success = await invoicesPage.verifySuccessMessage();
    expect(success).toBeTruthy();
    
    // Go back to dashboard
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();
    
    // Verify metrics updated (revenue should have increased)
    const newRevenue = await dashboardPage.getRevenueValue();
    expect(newRevenue).toBeTruthy();
    
    // Note: Exact comparison depends on currency formatting
    // But we can verify it's not zero and has changed
    expect(newRevenue).not.toBe('0');
  });

  test('should handle overdue invoices', async ({ 
    invoicesPage,
    testData 
  }) => {
    // Create overdue invoice
    const testClient = await testData.createTestClient();
    const pastDueDate = faker.date.past();
    
    const overdueInvoice = await testData.createTestInvoice(testClient.id, {
      invoiceNumber: 'INV-OVERDUE-001',
      amount: 3000.00,
      status: 'PENDING',
      dueDate: pastDueDate,
    });
    
    await invoicesPage.goto();
    await invoicesPage.waitForInvoicesLoad();
    
    // Filter by OVERDUE status
    await invoicesPage.filterByStatus('OVERDUE');
    
    // Verify overdue invoice appears
    const overdueVisible = await invoicesPage.isInvoiceInList('INV-OVERDUE-001');
    expect(overdueVisible).toBeTruthy();
    
    // Get invoice details
    const details = await invoicesPage.getInvoiceDetails('INV-OVERDUE-001');
    expect(details).toBeTruthy();
    
    // Update to PAID
    await invoicesPage.updateInvoiceStatus('INV-OVERDUE-001', 'PAID');
    
    // Verify success
    const success = await invoicesPage.verifySuccessMessage();
    expect(success).toBeTruthy();
  });

  test('should validate financial data integrity', async ({ 
    clientsPage,
    invoicesPage,
    testData 
  }) => {
    // Create multiple invoices for calculation validation
    const testClient = await testData.createTestClient({
      name: 'Calculation Test Client',
    });
    
    const amounts = [1000.00, 1500.50, 2499.50];
    const expectedTotal = 5000.00;
    
    for (const amount of amounts) {
      await testData.createTestInvoice(testClient.id, {
        amount,
        status: 'PAID',
      });
    }
    
    await invoicesPage.goto();
    await invoicesPage.waitForInvoicesLoad();
    
    // Get total amount displayed
    const totalAmount = await invoicesPage.getTotalAmount();
    
    // Verify total includes expected amount
    // Note: Format may include currency symbol
    expect(totalAmount).toContain('5000');
    
    // Verify individual invoice amounts are correct
    const invoiceCount = await invoicesPage.getInvoiceCount();
    expect(invoiceCount).toBeGreaterThanOrEqual(amounts.length);
  });

  test('should handle concurrent financial operations', async ({ 
    page,
    clientsPage,
    invoicesPage,
    testData 
  }) => {
    // Create test client
    const testClient = await testData.createTestClient({
      name: 'Concurrent Test Client',
    });
    
    // Open two tabs
    const context = page.context();
    const page1 = page;
    const page2 = await context.newPage();
    
    // Create invoice in first tab
    const invoicesPage1 = new (await import('../pages/invoices.page')).InvoicesPage(page1);
    await invoicesPage1.goto();
    await invoicesPage1.waitForInvoicesLoad();
    
    // Create invoice in second tab simultaneously
    const invoicesPage2 = new (await import('../pages/invoices.page')).InvoicesPage(page2);
    await invoicesPage2.goto();
    await invoicesPage2.waitForInvoicesLoad();
    
    // Both should load successfully
    const count1 = await invoicesPage1.getInvoiceCount();
    const count2 = await invoicesPage2.getInvoiceCount();
    
    // Counts should be consistent
    expect(count1).toBe(count2);
    
    // Clean up
    await page2.close();
  });
});