import { Page, Locator } from '@playwright/test';

/**
 * Authentication Page Object Model
 * Handles login, logout, and authentication flows
 */
export class AuthPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly logoutButton: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    // Use data-testid when available, fallback to other selectors
    this.emailInput = page.locator('[data-testid="login-email-input"], input[name="email"], input[type="email"]');
    this.passwordInput = page.locator('[data-testid="login-password-input"], input[name="password"], input[type="password"]');
    this.loginButton = page.locator('[data-testid="login-submit-button"], button[type="submit"]:has-text("Sign In"), button:has-text("Sign in")');
    this.logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign out")');
    this.errorMessage = page.locator('.error-message, .alert-danger, [role="alert"]');
    this.successMessage = page.locator('.success-message, .alert-success');
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
    await this.page.waitForURL('**/login');
  }

  async waitForAuthentication(): Promise<void> {
    // Wait for redirect to root (dashboard) or auth_token in localStorage
    await Promise.race([
      this.page.waitForURL('http://localhost:3000/', { timeout: 10000 }),
      this.page.waitForFunction(() => localStorage.getItem('auth_token') !== null, { timeout: 10000 }),
    ]);
  }

  async isAuthenticated(): Promise<boolean> {
    // Check if auth_token exists in localStorage
    const token = await this.page.evaluate(() => localStorage.getItem('auth_token'));
    return token !== null;
  }

  async getErrorMessage(): Promise<string | null> {
    if (await this.errorMessage.isVisible()) {
      return await this.errorMessage.textContent();
    }
    return null;
  }

  async getSuccessMessage(): Promise<string | null> {
    if (await this.successMessage.isVisible()) {
      return await this.successMessage.textContent();
    }
    return null;
  }

  async fillLoginForm(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  async submitLoginForm(): Promise<void> {
    await this.loginButton.click();
  }

  async isLoginFormVisible(): Promise<boolean> {
    return await this.emailInput.isVisible() && await this.passwordInput.isVisible();
  }

  async waitForLoginError(): Promise<void> {
    await this.errorMessage.waitFor({ state: 'visible', timeout: 5000 });
  }

  async waitForLogout(): Promise<void> {
    await this.page.waitForURL('**/login');
    await this.page.waitForLoadState('networkidle');
  }
}