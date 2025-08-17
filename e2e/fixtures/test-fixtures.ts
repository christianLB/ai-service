import { test as base } from '@playwright/test';
import { AuthPage } from '../pages/auth.page';
import { DashboardPage } from '../pages/dashboard.page';
import { ClientsPage } from '../pages/clients.page';
import { InvoicesPage } from '../pages/invoices.page';
import { TestDataManager } from '../helpers/test-data';

/**
 * Custom test fixtures for E2E testing
 * Provides page objects and test utilities
 */

interface TestFixtures {
  authPage: AuthPage;
  dashboardPage: DashboardPage;
  clientsPage: ClientsPage;
  invoicesPage: InvoicesPage;
  testData: TestDataManager;
  authenticatedContext: void;
}

export const test = base.extend<TestFixtures>({
  authPage: async ({ page }, use) => {
    const authPage = new AuthPage(page);
    await use(authPage);
  },

  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },

  clientsPage: async ({ page }, use) => {
    const clientsPage = new ClientsPage(page);
    await use(clientsPage);
  },

  invoicesPage: async ({ page }, use) => {
    const invoicesPage = new InvoicesPage(page);
    await use(invoicesPage);
  },

  testData: async ({}, use) => {
    const testData = new TestDataManager();
    await testData.setup();
    await use(testData);
    await testData.cleanup();
  },

  authenticatedContext: async ({ page, authPage }, use) => {
    // Perform authentication before test
    await authPage.goto();
    await authPage.login(
      process.env.TEST_USER_EMAIL || 'test@example.com',
      process.env.TEST_USER_PASSWORD || 'testPassword123'
    );
    await authPage.waitForAuthentication();
    await use();
  },
});

export { expect } from '@playwright/test';