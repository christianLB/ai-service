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
    // Updated selectors based on actual login page structure
    this.emailInput = page.locator('input[placeholder="Email"], [data-testid="login-email-input"], input[name="email"], input[type="email"]').first();
    this.passwordInput = page.locator('input[placeholder="Password"], [data-testid="login-password-input"], input[name="password"], input[type="password"]').first();
    this.loginButton = page.locator('button:has-text("Sign In"), [data-testid="login-submit-button"], button[type="submit"]:has-text("Sign In")').first();
    this.logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign out")');
    this.errorMessage = page.locator('.error-message, .alert-danger, [role="alert"]');
    this.successMessage = page.locator('.success-message, .alert-success');
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');
  }

  async login(email: string = 'admin@ai-service.local', password: string = 'admin123'): Promise<void> {
    await this.goto();
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    await this.waitForAuthentication();
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
    await this.page.waitForURL('**/login');
  }

  async waitForAuthentication(): Promise<void> {
    // Wait for auth_token in localStorage (more reliable than URL change)
    await this.page.waitForFunction(() => localStorage.getItem('auth_token') !== null, { timeout: 10000 });
    // Give the app a moment to process the token
    await this.page.waitForTimeout(500);
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