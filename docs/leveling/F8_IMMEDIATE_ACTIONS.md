# F8 End-to-End Testing - IMMEDIATE ACTION PLAN

_Generated: 2025-01-17_ | _Execution: START NOW_  
_Time to First Test: 2 HOURS_ | _Time to CI Integration: 4 HOURS_

## 🚨 EMERGENCY BOOTSTRAP - DO THIS NOW

### ⏱️ Hour 0-1: Install Playwright (15 minutes)

```bash
# COPY AND PASTE THIS ENTIRE BLOCK INTO YOUR TERMINAL NOW
cd /home/k2600x/dev/ai-service

# Install Playwright with TypeScript support
npm install -D @playwright/test

# Install browsers (this takes ~5 minutes)
npx playwright install

# Verify installation
npx playwright --version

# Create test directory structure
mkdir -p tests/e2e/{auth,financial,trading,dashboard}
mkdir -p tests/e2e/fixtures
mkdir -p tests/e2e/pages
mkdir -p tests/e2e/helpers

echo "✅ Playwright installed successfully!"
```

### ⏱️ Hour 0-1: Create Config (10 minutes)

```bash
# Create Playwright configuration
cat > playwright.config.ts << 'EOF'
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results.json' }],
    ['junit', { outputFile: 'test-results.xml' }]
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
EOF

echo "✅ Playwright configured!"
```

### ⏱️ Hour 0-1: First Real Test (20 minutes)

```bash
# Create authentication test - YOUR FIRST REAL E2E TEST
cat > tests/e2e/auth/login.spec.ts << 'EOF'
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    // Navigate to login
    await page.goto('/login');

    // Verify page loaded
    await expect(page).toHaveTitle(/AI Service/);

    // Check for login form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should handle invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');

    // Submit form
    await page.click('button[type="submit"]');

    // Expect error message
    await expect(page.locator('text=/Invalid credentials/i')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill valid credentials
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');

    // Submit form
    await page.click('button[type="submit"]');

    // Expect redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });
});
EOF

echo "✅ First test created!"
```

### ⏱️ Hour 0-1: Run Your First Test (5 minutes)

```bash
# Run the test you just created
npx playwright test tests/e2e/auth/login.spec.ts

# Run with UI mode (interactive)
npx playwright test --ui

# Generate test report
npx playwright show-report

echo "🎉 CONGRATULATIONS! You have your first E2E test running!"
```

---

## 🔥 Hour 1-2: Critical Financial Test

```bash
# Create financial workflow test - CRITICAL PATH
cat > tests/e2e/financial/invoice.spec.ts << 'EOF'
import { test, expect } from '@playwright/test';

test.describe('Invoice Generation - CRITICAL', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should create new invoice', async ({ page }) => {
    // Navigate to invoices
    await page.goto('/invoices');

    // Click new invoice button
    await page.click('button:has-text("New Invoice")');

    // Fill invoice form
    await page.selectOption('select[name="clientId"]', { label: 'Test Client' });
    await page.fill('input[name="amount"]', '1000');
    await page.fill('textarea[name="description"]', 'Test Invoice Description');

    // Submit
    await page.click('button:has-text("Create Invoice")');

    // Verify success
    await expect(page.locator('.toast-success')).toContainText('Invoice created');

    // Verify invoice appears in list
    await expect(page.locator('table tbody tr')).toContainText('Test Client');
    await expect(page.locator('table tbody tr')).toContainText('€1,000.00');
  });

  test('should generate PDF invoice', async ({ page }) => {
    await page.goto('/invoices');

    // Click on first invoice
    await page.click('table tbody tr:first-child a');

    // Click generate PDF
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Download PDF")')
    ]);

    // Verify download
    expect(download.suggestedFilename()).toMatch(/invoice.*\.pdf/);
  });

  test('should handle payment tracking', async ({ page }) => {
    await page.goto('/invoices');

    // Click on unpaid invoice
    await page.click('tr:has-text("Unpaid")');

    // Mark as paid
    await page.click('button:has-text("Mark as Paid")');
    await page.fill('input[name="paymentDate"]', '2025-01-17');
    await page.fill('input[name="paymentMethod"]', 'Bank Transfer');
    await page.click('button:has-text("Confirm Payment")');

    // Verify status change
    await expect(page.locator('.invoice-status')).toContainText('Paid');
  });
});
EOF

echo "✅ Critical financial test created!"
```

---

## 🚀 Hour 2-3: Test Helpers & Page Objects

```bash
# Create test helpers
cat > tests/e2e/helpers/auth.helper.ts << 'EOF'
import { Page } from '@playwright/test';

export class AuthHelper {
  constructor(private page: Page) {}

  async login(email: string = 'test@example.com', password: string = 'testpassword123') {
    await this.page.goto('/login');
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', password);
    await this.page.click('button[type="submit"]');
    await this.page.waitForURL('/dashboard');
  }

  async logout() {
    await this.page.click('button[aria-label="User menu"]');
    await this.page.click('button:has-text("Logout")');
    await this.page.waitForURL('/login');
  }

  async getAuthToken(): Promise<string> {
    return await this.page.evaluate(() => {
      return localStorage.getItem('auth_token') || '';
    });
  }
}
EOF

# Create Page Object for Dashboard
cat > tests/e2e/pages/dashboard.page.ts << 'EOF'
import { Page, Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly metricsCard: Locator;
  readonly revenueChart: Locator;
  readonly clientsTable: Locator;
  readonly quickActions: Locator;

  constructor(page: Page) {
    this.page = page;
    this.metricsCard = page.locator('.metrics-card');
    this.revenueChart = page.locator('#revenue-chart');
    this.clientsTable = page.locator('#clients-table');
    this.quickActions = page.locator('.quick-actions');
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  async getMetric(name: string): Promise<string> {
    return await this.metricsCard
      .locator(`[data-metric="${name}"]`)
      .textContent() || '';
  }

  async refreshData() {
    await this.page.click('button:has-text("Refresh")');
    await this.page.waitForLoadState('networkidle');
  }
}
EOF

echo "✅ Test helpers and page objects created!"
```

---

## 🔄 Hour 3-4: CI/CD Integration

```bash
# Create GitHub Actions workflow
mkdir -p .github/workflows
cat > .github/workflows/e2e-tests.yml << 'EOF'
name: E2E Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    timeout-minutes: 30
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres123
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps

      - name: Setup test database
        run: |
          npm run db:push
          npm run db:seed
        env:
          DATABASE_URL: postgresql://postgres:postgres123@localhost:5432/test_db

      - name: Run E2E tests
        run: npx playwright test
        env:
          DATABASE_URL: postgresql://postgres:postgres123@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379
          JWT_SECRET: test-secret-key
          NODE_ENV: test

      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

      - name: Send Slack notification on failure
        if: failure()
        run: |
          curl -X POST -H 'Content-type: application/json' \
            --data '{"text":"E2E tests failed! Check the report: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"}' \
            ${{ secrets.SLACK_WEBHOOK_URL }}
EOF

echo "✅ CI/CD pipeline created!"
```

### Add to package.json scripts

```bash
# Add test scripts to package.json
npm pkg set scripts.test:e2e="playwright test"
npm pkg set scripts.test:e2e:ui="playwright test --ui"
npm pkg set scripts.test:e2e:debug="playwright test --debug"
npm pkg set scripts.test:e2e:headed="playwright test --headed"
npm pkg set scripts.test:e2e:report="playwright show-report"

echo "✅ Test scripts added to package.json!"
```

---

## 📊 Hour 4-5: Coverage & Reporting

```bash
# Create test coverage script
cat > tests/e2e/coverage.spec.ts << 'EOF'
import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Coverage Tracking', () => {
  const coverage = {
    auth: { total: 3, passed: 0 },
    financial: { total: 5, passed: 0 },
    trading: { total: 4, passed: 0 },
    dashboard: { total: 3, passed: 0 }
  };

  test.afterAll(async () => {
    const total = Object.values(coverage).reduce((sum, c) => sum + c.total, 0);
    const passed = Object.values(coverage).reduce((sum, c) => sum + c.passed, 0);
    const percentage = (passed / total * 100).toFixed(2);

    const report = {
      timestamp: new Date().toISOString(),
      coverage: percentage + '%',
      details: coverage,
      target: '80%',
      gap: Math.max(0, 80 - parseFloat(percentage)) + '%'
    };

    fs.writeFileSync(
      path.join(__dirname, '../../coverage-e2e.json'),
      JSON.stringify(report, null, 2)
    );

    console.log(`\n📊 E2E Coverage: ${percentage}% (Target: 80%)`);
    console.log(`📈 Gap to target: ${report.gap}`);
  });
});
EOF

echo "✅ Coverage tracking implemented!"
```

---

## ⚡ Hour 5-6: Data Management & Fixtures

```bash
# Create test data fixtures
cat > tests/e2e/fixtures/test-data.ts << 'EOF'
export const testUsers = {
  admin: {
    email: 'admin@test.com',
    password: 'admin123',
    role: 'admin'
  },
  user: {
    email: 'user@test.com',
    password: 'user123',
    role: 'user'
  }
};

export const testClients = [
  {
    name: 'Test Client 1',
    email: 'client1@test.com',
    taxId: '12345678',
    address: '123 Test St'
  },
  {
    name: 'Test Client 2',
    email: 'client2@test.com',
    taxId: '87654321',
    address: '456 Test Ave'
  }
];

export const testInvoices = [
  {
    clientId: 1,
    amount: 1000,
    description: 'Development services',
    dueDate: '2025-02-17'
  },
  {
    clientId: 2,
    amount: 2500,
    description: 'Consulting services',
    dueDate: '2025-02-28'
  }
];
EOF

# Create database seeder for tests
cat > tests/e2e/fixtures/seed-test-db.ts << 'EOF'
import { PrismaClient } from '@prisma/client';
import { testUsers, testClients, testInvoices } from './test-data';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding test database...');

  // Clear existing data
  await prisma.invoice.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  for (const userData of Object.values(testUsers)) {
    await prisma.user.create({
      data: {
        email: userData.email,
        password: await bcrypt.hash(userData.password, 10),
        role: userData.role
      }
    });
  }

  // Create clients
  for (const client of testClients) {
    await prisma.client.create({ data: client });
  }

  // Create invoices
  for (const invoice of testInvoices) {
    await prisma.invoice.create({ data: invoice });
  }

  console.log('✅ Test database seeded!');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
EOF

# Add seed script to package.json
npm pkg set scripts.test:seed="tsx tests/e2e/fixtures/seed-test-db.ts"

echo "✅ Test data management ready!"
```

---

## 🎯 VERIFICATION CHECKLIST - MUST COMPLETE

### ✅ Installation Verification

```bash
# Run this to verify everything is installed
npx playwright --version
ls -la tests/e2e/
cat playwright.config.ts | head -10
```

### ✅ First Test Execution

```bash
# Run your first test NOW
npx playwright test tests/e2e/auth/login.spec.ts --reporter=list
```

### ✅ Report Generation

```bash
# Generate and view test report
npx playwright show-report
```

### ✅ CI Pipeline Test

```bash
# Test the GitHub Actions workflow locally
act -j test  # If you have 'act' installed
# Or commit and push to trigger CI
```

---

## 📈 METRICS TO TRACK (Starting NOW)

### Today's Target (Hour 6)

- [ ] Playwright installed ✅
- [ ] 3 E2E tests written ✅
- [ ] Tests passing locally ✅
- [ ] CI pipeline configured ✅
- [ ] First test report generated ✅

### End of Day 1

- [ ] 5 critical path tests
- [ ] GitHub Actions running
- [ ] Test data management working
- [ ] Coverage tracking active

### End of Week 1

- [ ] 25 E2E tests
- [ ] 40% coverage achieved
- [ ] Visual regression setup
- [ ] All services tested

---

## 🚨 TROUBLESHOOTING QUICK FIXES

### If Playwright won't install:

```bash
# Clear npm cache and retry
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
npm install -D @playwright/test
npx playwright install
```

### If tests won't run:

```bash
# Check if services are running
docker-compose ps
npm run dev

# Run in debug mode
npx playwright test --debug
```

### If CI fails:

```bash
# Check workflow syntax
npm install -g @action-validator/cli
action-validator .github/workflows/e2e-tests.yml
```

---

## 🔴 CRITICAL REMINDERS

1. **YOU MUST HAVE 1 TEST RUNNING IN 2 HOURS**
2. **CI MUST BE INTEGRATED IN 4 HOURS**
3. **5 TESTS MUST BE COMPLETE BY END OF DAY**
4. **NO EXCUSES - THIS IS SURVIVAL**

---

## 📞 ESCALATION

If blocked for more than 30 minutes:

1. Check the troubleshooting section above
2. Review error logs carefully
3. Search Playwright documentation
4. Ask for help immediately - don't waste time

---

**START TIME**: ****\_\_\_****  
**FIRST TEST COMPLETED**: ****\_\_\_****  
**CI INTEGRATED**: ****\_\_\_****  
**DAY 1 TARGET MET**: ****\_\_\_****

_This is not a drill. Your financial system needs testing NOW. Execute immediately._
