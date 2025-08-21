import { Page, Locator } from '@playwright/test';

/**
 * Clients Page Object Model
 * Handles client management operations
 */
export class ClientsPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly addClientButton: Locator;
  readonly clientsTable: Locator;
  readonly searchInput: Locator;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  readonly addressInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly deleteButton: Locator;
  readonly editButton: Locator;
  readonly modal: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('h1:has-text("Clients"), h2:has-text("Clients")');
    this.addClientButton = page.locator('button:has-text("Add Client"), button:has-text("New Client")');
    this.clientsTable = page.locator('table, [role="table"], .clients-list');
    this.searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
    this.nameInput = page.locator('input[name="name"], input[placeholder*="Name"]');
    this.emailInput = page.locator('input[name="email"], input[type="email"]');
    this.phoneInput = page.locator('input[name="phone"], input[placeholder*="Phone"]');
    this.addressInput = page.locator('input[name="address"], textarea[name="address"]');
    this.saveButton = page.locator('button:has-text("Save"), button[type="submit"]');
    this.cancelButton = page.locator('button:has-text("Cancel")');
    this.deleteButton = page.locator('button:has-text("Delete")');
    this.editButton = page.locator('button:has-text("Edit")');
    this.modal = page.locator('.modal, [role="dialog"], .dialog');
  }

  async goto(): Promise<void> {
    await this.page.goto('/clients');
    await this.page.waitForLoadState('networkidle');
  }

  async waitForClientsLoad(): Promise<void> {
    await this.pageTitle.waitFor({ state: 'visible' });
    await this.clientsTable.waitFor({ state: 'visible' });
  }

  async openAddClientModal(): Promise<void> {
    await this.addClientButton.click();
    await this.modal.waitFor({ state: 'visible' });
  }

  async fillClientForm(client: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
  }): Promise<void> {
    await this.nameInput.fill(client.name);
    await this.emailInput.fill(client.email);
    if (client.phone) {
      await this.phoneInput.fill(client.phone);
    }
    if (client.address) {
      await this.addressInput.fill(client.address);
    }
  }

  async saveClient(): Promise<void> {
    await this.saveButton.click();
    // Wait for modal to close or success message
    await Promise.race([
      this.modal.waitFor({ state: 'hidden', timeout: 5000 }),
      this.page.locator('.success-message, .toast-success').waitFor({ state: 'visible', timeout: 5000 }),
    ]);
  }

  async cancelClientForm(): Promise<void> {
    await this.cancelButton.click();
    await this.modal.waitFor({ state: 'hidden' });
  }

  async searchClient(searchTerm: string): Promise<void> {
    await this.searchInput.fill(searchTerm);
    await this.page.waitForTimeout(500); // Debounce
    await this.page.waitForLoadState('networkidle');
  }

  async getClientCount(): Promise<number> {
    const rows = await this.page.locator('tbody tr, .client-row').count();
    return rows;
  }

  async isClientInList(clientName: string): Promise<boolean> {
    const client = this.page.locator(`text="${clientName}"`);
    return await client.isVisible();
  }

  async editClient(clientName: string): Promise<void> {
    const row = this.page.locator(`tr:has-text("${clientName}"), .client-row:has-text("${clientName}")`);
    await row.locator('button:has-text("Edit"), .edit-button').click();
    await this.modal.waitFor({ state: 'visible' });
  }

  async deleteClient(clientName: string): Promise<void> {
    const row = this.page.locator(`tr:has-text("${clientName}"), .client-row:has-text("${clientName}")`);
    await row.locator('button:has-text("Delete"), .delete-button').click();
    
    // Handle confirmation dialog
    const confirmButton = this.page.locator('button:has-text("Confirm"), button:has-text("Yes")');
    if (await confirmButton.isVisible({ timeout: 1000 })) {
      await confirmButton.click();
    }
    
    // Wait for deletion
    await row.waitFor({ state: 'hidden', timeout: 5000 });
  }

  async getClientDetails(clientName: string): Promise<{
    name: string;
    email: string;
    phone?: string;
  } | null> {
    const row = this.page.locator(`tr:has-text("${clientName}"), .client-row:has-text("${clientName}")`);
    if (await row.isVisible()) {
      const name = await row.locator('td:nth-child(1), .client-name').textContent();
      const email = await row.locator('td:nth-child(2), .client-email').textContent();
      const phone = await row.locator('td:nth-child(3), .client-phone').textContent();
      
      return {
        name: name?.trim() || '',
        email: email?.trim() || '',
        phone: phone?.trim(),
      };
    }
    return null;
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
}