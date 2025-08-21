import { Page, Locator } from '@playwright/test';

/**
 * Dashboard Page Object Model
 * Handles dashboard metrics and navigation
 */
export class DashboardPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly revenueCard: Locator;
  readonly clientsCard: Locator;
  readonly invoicesCard: Locator;
  readonly transactionsCard: Locator;
  readonly revenueChart: Locator;
  readonly navigationMenu: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('h1:has-text("Dashboard"), h2:has-text("Dashboard")');
    this.revenueCard = page.locator('[data-testid="revenue-card"], .metric-card:has-text("Revenue")');
    this.clientsCard = page.locator('[data-testid="clients-card"], .metric-card:has-text("Clients")');
    this.invoicesCard = page.locator('[data-testid="invoices-card"], .metric-card:has-text("Invoices")');
    this.transactionsCard = page.locator('[data-testid="transactions-card"], .metric-card:has-text("Transactions")');
    this.revenueChart = page.locator('[data-testid="revenue-chart"], canvas, .chart-container');
    this.navigationMenu = page.locator('nav, [role="navigation"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async waitForDashboardLoad(): Promise<void> {
    await this.pageTitle.waitFor({ state: 'visible' });
    await this.page.waitForLoadState('networkidle');
  }

  async getRevenueValue(): Promise<string> {
    const element = await this.revenueCard.locator('.metric-value, .card-value, h3, h2').first();
    const text = await element.textContent();
    return text?.trim() || '';
  }

  async getClientsCount(): Promise<string> {
    const element = await this.clientsCard.locator('.metric-value, .card-value, h3, h2').first();
    const text = await element.textContent();
    return text?.trim() || '';
  }

  async getInvoicesCount(): Promise<string> {
    const element = await this.invoicesCard.locator('.metric-value, .card-value, h3, h2').first();
    const text = await element.textContent();
    return text?.trim() || '';
  }

  async getTransactionsCount(): Promise<string> {
    const element = await this.transactionsCard.locator('.metric-value, .card-value, h3, h2').first();
    const text = await element.textContent();
    return text?.trim() || '';
  }

  async isChartVisible(): Promise<boolean> {
    return await this.revenueChart.isVisible();
  }

  async navigateToClients(): Promise<void> {
    await this.page.locator('a:has-text("Clients"), [href*="clients"]').click();
    await this.page.waitForURL('**/clients');
  }

  async navigateToInvoices(): Promise<void> {
    await this.page.locator('a:has-text("Invoices"), [href*="invoices"]').click();
    await this.page.waitForURL('**/invoices');
  }

  async navigateToTransactions(): Promise<void> {
    await this.page.locator('a:has-text("Transactions"), [href*="transactions"]').click();
    await this.page.waitForURL('**/transactions');
  }

  async verifyMetricsLoaded(): Promise<boolean> {
    try {
      await Promise.all([
        this.revenueCard.waitFor({ state: 'visible', timeout: 10000 }),
        this.clientsCard.waitFor({ state: 'visible', timeout: 10000 }),
        this.invoicesCard.waitFor({ state: 'visible', timeout: 10000 }),
        this.transactionsCard.waitFor({ state: 'visible', timeout: 10000 }),
      ]);
      return true;
    } catch {
      return false;
    }
  }

  async refreshDashboard(): Promise<void> {
    await this.page.reload();
    await this.waitForDashboardLoad();
  }

  async checkForErrors(): Promise<boolean> {
    const errorElements = await this.page.locator('.error, .alert-danger, [role="alert"]').count();
    return errorElements === 0;
  }
}