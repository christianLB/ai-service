import { test, expect } from '../fixtures/test-fixtures';
import { faker } from '@faker-js/faker';

/**
 * Critical Test 4: Invoice Creation and Management
 * Tests invoice generation, status updates, and financial calculations
 */

test.describe('Invoice Creation and Management', () => {
  test.use({ authenticatedContext: true });

  test('should create a new invoice', async ({ invoicesPage, testData }) => {
    // Create a test client first
    const testClient = await testData.createTestClient({
      name: 'Invoice Test Client',
    });
    
    await invoicesPage.goto();
    await invoicesPage.waitForInvoicesLoad();
    
    // Get initial invoice count
    const initialCount = await invoicesPage.getInvoiceCount();
    
    // Open create invoice modal
    await invoicesPage.openCreateInvoiceModal();
    
    // Fill invoice form
    const invoiceData = {
      clientId: testClient.id,
      amount: '1500.00',
      dueDate: faker.date.future().toISOString().split('T')[0],
      description: 'Web Development Services',
    };
    
    await invoicesPage.fillInvoiceForm(invoiceData);
    
    // Save invoice
    await invoicesPage.saveInvoice();
    
    // Verify success message
    const success = await invoicesPage.verifySuccessMessage('Invoice created');
    expect(success).toBeTruthy();
    
    // Verify invoice count increased
    const newCount = await invoicesPage.getInvoiceCount();
    expect(newCount).toBe(initialCount + 1);
  });

  test('should update invoice status', async ({ invoicesPage, testData }) => {
    // Create test data
    const testClient = await testData.createTestClient();
    const testInvoice = await testData.createTestInvoice(testClient.id, {
      invoiceNumber: 'INV-TEST-001',
      status: 'PENDING',
    });
    
    await invoicesPage.goto();
    await invoicesPage.waitForInvoicesLoad();
    
    // Verify invoice exists
    const invoiceExists = await invoicesPage.isInvoiceInList('INV-TEST-001');
    expect(invoiceExists).toBeTruthy();
    
    // Update status to PAID
    await invoicesPage.updateInvoiceStatus('INV-TEST-001', 'PAID');
    
    // Verify success message
    const success = await invoicesPage.verifySuccessMessage();
    expect(success).toBeTruthy();
    
    // Get invoice details
    const details = await invoicesPage.getInvoiceDetails('INV-TEST-001');
    expect(details).toBeTruthy();
    expect(details?.status).toBe('PAID');
  });

  test('should filter invoices by status', async ({ invoicesPage, testData }) => {
    // Create test invoices with different statuses
    const testClient = await testData.createTestClient();
    
    await testData.createTestInvoice(testClient.id, {
      invoiceNumber: 'INV-PENDING-001',
      status: 'PENDING',
    });
    
    await testData.createTestInvoice(testClient.id, {
      invoiceNumber: 'INV-PAID-001',
      status: 'PAID',
    });
    
    await testData.createTestInvoice(testClient.id, {
      invoiceNumber: 'INV-OVERDUE-001',
      status: 'OVERDUE',
    });
    
    await invoicesPage.goto();
    await invoicesPage.waitForInvoicesLoad();
    
    // Filter by PENDING
    await invoicesPage.filterByStatus('PENDING');
    
    // Verify only pending invoices shown
    const pendingVisible = await invoicesPage.isInvoiceInList('INV-PENDING-001');
    const paidVisible = await invoicesPage.isInvoiceInList('INV-PAID-001');
    
    expect(pendingVisible).toBeTruthy();
    expect(paidVisible).toBeFalsy();
    
    // Filter by PAID
    await invoicesPage.filterByStatus('PAID');
    
    // Verify only paid invoices shown
    const paidNowVisible = await invoicesPage.isInvoiceInList('INV-PAID-001');
    const pendingNowVisible = await invoicesPage.isInvoiceInList('INV-PENDING-001');
    
    expect(paidNowVisible).toBeTruthy();
    expect(pendingNowVisible).toBeFalsy();
  });

  test('should calculate total invoice amount', async ({ invoicesPage, testData }) => {
    // Create test invoices with known amounts
    const testClient = await testData.createTestClient();
    
    await testData.createTestInvoice(testClient.id, {
      amount: 1000.00,
      status: 'PAID',
    });
    
    await testData.createTestInvoice(testClient.id, {
      amount: 2000.00,
      status: 'PAID',
    });
    
    await testData.createTestInvoice(testClient.id, {
      amount: 500.00,
      status: 'PENDING',
    });
    
    await invoicesPage.goto();
    await invoicesPage.waitForInvoicesLoad();
    
    // Get total amount
    const totalAmount = await invoicesPage.getTotalAmount();
    
    // Verify total is calculated correctly
    // Note: The exact format may vary, but it should include 3500
    expect(totalAmount).toContain('3500');
  });

  test('should download invoice PDF', async ({ invoicesPage, testData, page }) => {
    // Create test invoice
    const testClient = await testData.createTestClient();
    const testInvoice = await testData.createTestInvoice(testClient.id, {
      invoiceNumber: 'INV-DOWNLOAD-001',
    });
    
    await invoicesPage.goto();
    await invoicesPage.waitForInvoicesLoad();
    
    // Set up download handler
    const downloadPromise = page.waitForEvent('download');
    
    // Trigger download
    await invoicesPage.downloadInvoice('INV-DOWNLOAD-001');
    
    // Wait for download
    const download = await downloadPromise;
    
    // Verify download
    expect(download).toBeTruthy();
    expect(download.suggestedFilename()).toContain('INV');
    
    // Save the file for verification
    const path = `./test-results/downloads/${download.suggestedFilename()}`;
    await download.saveAs(path);
  });
});