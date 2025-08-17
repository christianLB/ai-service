import { test, expect } from '../fixtures/test-fixtures';

/**
 * Critical Test 2: Dashboard Metrics
 * Tests dashboard loading, metrics display, and navigation
 */

test.describe('Dashboard Metrics', () => {
  test.use({ authenticatedContext: true });

  test('should load dashboard with all metrics', async ({ dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();
    
    // Verify page title
    await expect(dashboardPage.pageTitle).toBeVisible();
    
    // Verify all metric cards are loaded
    const metricsLoaded = await dashboardPage.verifyMetricsLoaded();
    expect(metricsLoaded).toBeTruthy();
    
    // Verify revenue card has value
    const revenue = await dashboardPage.getRevenueValue();
    expect(revenue).toBeTruthy();
    expect(revenue).not.toBe('0');
    
    // Verify clients count
    const clients = await dashboardPage.getClientsCount();
    expect(clients).toBeTruthy();
    
    // Verify invoices count
    const invoices = await dashboardPage.getInvoicesCount();
    expect(invoices).toBeTruthy();
    
    // Verify transactions count
    const transactions = await dashboardPage.getTransactionsCount();
    expect(transactions).toBeTruthy();
    
    // Verify chart is visible
    const chartVisible = await dashboardPage.isChartVisible();
    expect(chartVisible).toBeTruthy();
  });

  test('should navigate to clients page from dashboard', async ({ dashboardPage, clientsPage }) => {
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();
    
    // Navigate to clients
    await dashboardPage.navigateToClients();
    
    // Verify on clients page
    await clientsPage.waitForClientsLoad();
    await expect(dashboardPage.page).toHaveURL(/.*clients/);
    await expect(clientsPage.pageTitle).toBeVisible();
  });

  test('should navigate to invoices page from dashboard', async ({ dashboardPage, invoicesPage }) => {
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();
    
    // Navigate to invoices
    await dashboardPage.navigateToInvoices();
    
    // Verify on invoices page
    await invoicesPage.waitForInvoicesLoad();
    await expect(dashboardPage.page).toHaveURL(/.*invoices/);
    await expect(invoicesPage.pageTitle).toBeVisible();
  });

  test('should refresh dashboard metrics', async ({ dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();
    
    // Get initial revenue value
    const initialRevenue = await dashboardPage.getRevenueValue();
    
    // Refresh dashboard
    await dashboardPage.refreshDashboard();
    
    // Verify metrics still loaded
    const metricsLoaded = await dashboardPage.verifyMetricsLoaded();
    expect(metricsLoaded).toBeTruthy();
    
    // Verify revenue still has value (may or may not be same)
    const refreshedRevenue = await dashboardPage.getRevenueValue();
    expect(refreshedRevenue).toBeTruthy();
  });

  test('should not show errors on dashboard', async ({ dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();
    
    // Check for any error messages
    const noErrors = await dashboardPage.checkForErrors();
    expect(noErrors).toBeTruthy();
    
    // Verify all metrics loaded successfully
    const metricsLoaded = await dashboardPage.verifyMetricsLoaded();
    expect(metricsLoaded).toBeTruthy();
  });
});