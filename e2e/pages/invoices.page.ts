import { Page, Locator } from '@playwright/test';

/**
 * Invoices Page Object Model
 * Handles invoice management operations
 */
export class InvoicesPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly createInvoiceButton: Locator;
  readonly invoicesTable: Locator;
  readonly searchInput: Locator;
  readonly clientSelect: Locator;
  readonly amountInput: Locator;
  readonly dueDateInput: Locator;
  readonly descriptionInput: Locator;
  readonly statusSelect: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly viewButton: Locator;
  readonly downloadButton: Locator;
  readonly modal: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('h1:has-text("Invoices"), h2:has-text("Invoices")');
    this.createInvoiceButton = page.locator('button:has-text("Create Invoice"), button:has-text("New Invoice")');
    this.invoicesTable = page.locator('table, [role="table"], .invoices-list');
    this.searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
    this.clientSelect = page.locator('select[name="clientId"], select[name="client"]');
    this.amountInput = page.locator('input[name="amount"], input[type="number"]');
    this.dueDateInput = page.locator('input[name="dueDate"], input[type="date"]');
    this.descriptionInput = page.locator('textarea[name="description"], input[name="description"]');
    this.statusSelect = page.locator('select[name="status"]');
    this.saveButton = page.locator('button:has-text("Save"), button[type="submit"]');
    this.cancelButton = page.locator('button:has-text("Cancel")');
    this.viewButton = page.locator('button:has-text("View")');
    this.downloadButton = page.locator('button:has-text("Download")');
    this.modal = page.locator('.modal, [role="dialog"], .dialog');
  }

  async goto(): Promise<void> {
    await this.page.goto('/invoices');
    await this.page.waitForLoadState('networkidle');
  }

  async waitForInvoicesLoad(): Promise<void> {
    await this.pageTitle.waitFor({ state: 'visible' });
    await this.invoicesTable.waitFor({ state: 'visible' });
  }

  async openCreateInvoiceModal(): Promise<void> {
    await this.createInvoiceButton.click();
    await this.modal.waitFor({ state: 'visible' });
  }

  async fillInvoiceForm(invoice: {
    clientId: string;
    amount: string;
    dueDate: string;
    description?: string;
  }): Promise<void> {
    await this.clientSelect.selectOption(invoice.clientId);
    await this.amountInput.fill(invoice.amount);
    await this.dueDateInput.fill(invoice.dueDate);
    if (invoice.description) {
      await this.descriptionInput.fill(invoice.description);
    }
  }

  async saveInvoice(): Promise<void> {
    await this.saveButton.click();
    // Wait for modal to close or success message
    await Promise.race([
      this.modal.waitFor({ state: 'hidden', timeout: 5000 }),
      this.page.locator('.success-message, .toast-success').waitFor({ state: 'visible', timeout: 5000 }),
    ]);
  }

  async cancelInvoiceForm(): Promise<void> {
    await this.cancelButton.click();
    await this.modal.waitFor({ state: 'hidden' });
  }

  async searchInvoice(searchTerm: string): Promise<void> {
    await this.searchInput.fill(searchTerm);
    await this.page.waitForTimeout(500); // Debounce
    await this.page.waitForLoadState('networkidle');
  }

  async getInvoiceCount(): Promise<number> {
    const rows = await this.page.locator('tbody tr, .invoice-row').count();
    return rows;
  }

  async isInvoiceInList(invoiceNumber: string): Promise<boolean> {
    const invoice = this.page.locator(`text="${invoiceNumber}"`);
    return await invoice.isVisible();
  }

  async viewInvoice(invoiceNumber: string): Promise<void> {
    const row = this.page.locator(`tr:has-text("${invoiceNumber}"), .invoice-row:has-text("${invoiceNumber}")`);
    await row.locator('button:has-text("View"), .view-button').click();
  }

  async downloadInvoice(invoiceNumber: string): Promise<void> {
    const row = this.page.locator(`tr:has-text("${invoiceNumber}"), .invoice-row:has-text("${invoiceNumber}")`);
    
    // Start waiting for download before clicking
    const downloadPromise = this.page.waitForEvent('download');
    await row.locator('button:has-text("Download"), .download-button').click();
    const download = await downloadPromise;
    
    // Save the download
    await download.saveAs(`./test-results/downloads/${invoiceNumber}.pdf`);
  }

  async updateInvoiceStatus(invoiceNumber: string, status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED'): Promise<void> {
    const row = this.page.locator(`tr:has-text("${invoiceNumber}"), .invoice-row:has-text("${invoiceNumber}")`);
    const statusSelect = row.locator('select, .status-select');
    
    if (await statusSelect.isVisible()) {
      await statusSelect.selectOption(status);
    } else {
      // Click to edit if needed
      await row.locator('button:has-text("Edit"), .edit-button').click();
      await this.statusSelect.selectOption(status);
      await this.saveButton.click();
    }
    
    await this.page.waitForLoadState('networkidle');
  }

  async getInvoiceDetails(invoiceNumber: string): Promise<{
    number: string;
    client: string;
    amount: string;
    status: string;
    dueDate: string;
  } | null> {
    const row = this.page.locator(`tr:has-text("${invoiceNumber}"), .invoice-row:has-text("${invoiceNumber}")`);
    if (await row.isVisible()) {
      const number = await row.locator('td:nth-child(1), .invoice-number').textContent();
      const client = await row.locator('td:nth-child(2), .invoice-client').textContent();
      const amount = await row.locator('td:nth-child(3), .invoice-amount').textContent();
      const status = await row.locator('td:nth-child(4), .invoice-status').textContent();
      const dueDate = await row.locator('td:nth-child(5), .invoice-due-date').textContent();
      
      return {
        number: number?.trim() || '',
        client: client?.trim() || '',
        amount: amount?.trim() || '',
        status: status?.trim() || '',
        dueDate: dueDate?.trim() || '',
      };
    }
    return null;
  }

  async filterByStatus(status: 'ALL' | 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED'): Promise<void> {
    const filterSelect = this.page.locator('select[name="statusFilter"], .status-filter');
    if (await filterSelect.isVisible()) {
      await filterSelect.selectOption(status);
      await this.page.waitForLoadState('networkidle');
    }
  }

  async verifySuccessMessage(expectedMessage?: string): Promise<boolean> {
    const successMessage = this.page.locator('.success-message, .toast-success, .alert-success');
    if (await successMessage.isVisible({ timeout: 5000 })) {
      if (expectedMessage) {
        const text = await successMessage.textContent();
        return text?.includes(expectedMessage) || false;
      }
      return true;
    }
    return false;
  }

  async verifyErrorMessage(): Promise<string | null> {
    const errorMessage = this.page.locator('.error-message, .toast-error, .alert-danger');
    if (await errorMessage.isVisible({ timeout: 1000 })) {
      return await errorMessage.textContent();
    }
    return null;
  }

  async getTotalAmount(): Promise<string> {
    const totalElement = this.page.locator('.total-amount, .invoices-total, tfoot td:last-child');
    if (await totalElement.isVisible()) {
      const text = await totalElement.textContent();
      return text?.trim() || '0';
    }
    return '0';
  }
}