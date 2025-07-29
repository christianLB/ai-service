import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ImportTransactionsModal from '../ImportTransactionsModal';
import { message } from 'antd';

// Mock antd message
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
    },
  };
});

// Mock fetch
global.fetch = vi.fn();

const mockAccounts = [
  {
    id: 'acc1',
    account_id: 'ACC001',
    name: 'Test Account 1',
    type: 'bank_account',
    institution: 'Bank A',
    currencies: { code: 'EUR', symbol: '€' },
  },
  {
    id: 'acc2',
    account_id: 'ACC002',
    name: 'Test Account 2',
    type: 'bank_account',
    institution: 'Bank B',
    currencies: { code: 'USD', symbol: '$' },
  },
];

describe('ImportTransactionsModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'test-token');
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Default Account Selection', () => {
    it('should pre-select account when defaultAccountId is provided', () => {
      render(
        <ImportTransactionsModal
          visible={true}
          accounts={mockAccounts}
          defaultAccountId="acc1"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Check that the select has the default value
      const select = screen.getByRole('combobox');
      expect(select).toHaveValue('acc1');
      expect(screen.getByText('Test Account 1 - bank_account (EUR)')).toBeInTheDocument();
    });

    it('should not have any account selected when defaultAccountId is not provided', () => {
      render(
        <ImportTransactionsModal
          visible={true}
          accounts={mockAccounts}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const select = screen.getByRole('combobox');
      expect(select).toHaveValue('');
      expect(screen.getByText('Seleccione una cuenta')).toBeInTheDocument();
    });
  });

  describe('Import Button State', () => {
    it('should have import button enabled when account is pre-selected and file is uploaded', async () => {
      const user = userEvent.setup();

      render(
        <ImportTransactionsModal
          visible={true}
          accounts={mockAccounts}
          defaultAccountId="acc1"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Create a valid JSON file
      const jsonContent = {
        transactions: [
          {
            amount: '-100.00',
            date: '2024-01-15T00:00:00Z',
            description: 'Test transaction',
          },
        ],
      };
      const file = new File([JSON.stringify(jsonContent)], 'test.json', {
        type: 'application/json',
      });

      // Upload file
      const input = screen.getByLabelText(/haga clic o arrastre/i).parentElement?.querySelector('input[type="file"]');
      if (input) {
        await user.upload(input as HTMLElement, file);
      }

      // Wait for file processing
      await waitFor(() => {
        expect(screen.getByText('Vista previa de transacciones')).toBeInTheDocument();
      });

      // Check that import button is enabled
      const importButton = screen.getByRole('button', { name: /importar 1 transacciones/i });
      expect(importButton).not.toBeDisabled();
    });

    it('should have import button disabled when no account is selected even with file uploaded', async () => {
      const user = userEvent.setup();

      render(
        <ImportTransactionsModal
          visible={true}
          accounts={mockAccounts}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Create a valid JSON file
      const jsonContent = {
        transactions: [
          {
            amount: '-100.00',
            date: '2024-01-15T00:00:00Z',
            description: 'Test transaction',
          },
        ],
      };
      const file = new File([JSON.stringify(jsonContent)], 'test.json', {
        type: 'application/json',
      });

      // Upload file without selecting account
      const input = screen.getByLabelText(/haga clic o arrastre/i).parentElement?.querySelector('input[type="file"]');
      if (input) {
        await user.upload(input as HTMLElement, file);
      }

      // Wait for file processing
      await waitFor(() => {
        expect(screen.getByText('Vista previa de transacciones')).toBeInTheDocument();
      });

      // Check that import button is disabled
      const importButton = screen.getByRole('button', { name: /importar 1 transacciones/i });
      expect(importButton).toBeDisabled();
    });

    it('should enable import button when account is selected after file upload', async () => {
      const user = userEvent.setup();

      render(
        <ImportTransactionsModal
          visible={true}
          accounts={mockAccounts}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Create a valid JSON file
      const jsonContent = {
        transactions: [
          {
            amount: '-100.00',
            date: '2024-01-15T00:00:00Z',
            description: 'Test transaction',
          },
        ],
      };
      const file = new File([JSON.stringify(jsonContent)], 'test.json', {
        type: 'application/json',
      });

      // Upload file first
      const input = screen.getByLabelText(/haga clic o arrastre/i).parentElement?.querySelector('input[type="file"]');
      if (input) {
        await user.upload(input as HTMLElement, file);
      }

      // Wait for preview
      await waitFor(() => {
        expect(screen.getByText('Vista previa de transacciones')).toBeInTheDocument();
      });

      // Go back to select account
      const backButton = screen.getByRole('button', { name: /atrás/i });
      await user.click(backButton);

      // Select account
      const select = screen.getByRole('combobox');
      await user.click(select);
      const option = screen.getByText('Test Account 1 - bank_account (EUR)');
      await user.click(option);

      // Upload file again
      const input2 = screen.getByLabelText(/haga clic o arrastre/i).parentElement?.querySelector('input[type="file"]');
      if (input2) {
        await user.upload(input2 as HTMLElement, file);
      }

      // Wait for preview again
      await waitFor(() => {
        expect(screen.getByText('Vista previa de transacciones')).toBeInTheDocument();
      });

      // Now import button should be enabled
      const importButton = screen.getByRole('button', { name: /importar 1 transacciones/i });
      expect(importButton).not.toBeDisabled();
    });
  });

  describe('Full Import Flow', () => {
    it('should complete import successfully with pre-selected account', async () => {
      const user = userEvent.setup();

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        new Response(JSON.stringify({
          success: true,
          data: {
            imported: 1,
            skipped: 0,
            errors: [],
            duplicates: [],
            accountId: 'acc1',
          },
        }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      );

      render(
        <ImportTransactionsModal
          visible={true}
          accounts={mockAccounts}
          defaultAccountId="acc1"
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Account should be pre-selected
      expect(screen.getByRole('combobox')).toHaveValue('acc1');

      // Create and upload file
      const jsonContent = {
        transactions: [
          {
            amount: '-100.00',
            date: '2024-01-15T00:00:00Z',
            description: 'Test transaction',
          },
        ],
      };
      const file = new File([JSON.stringify(jsonContent)], 'test.json', {
        type: 'application/json',
      });

      const input = screen.getByLabelText(/haga clic o arrastre/i).parentElement?.querySelector('input[type="file"]');
      if (input) {
        await user.upload(input as HTMLElement, file);
      }

      // Wait for preview
      await waitFor(() => {
        expect(screen.getByText('Vista previa de transacciones')).toBeInTheDocument();
      });

      // Click import button (should be enabled)
      const importButton = screen.getByRole('button', { name: /importar 1 transacciones/i });
      expect(importButton).not.toBeDisabled();
      await user.click(importButton);

      // Wait for success
      await waitFor(() => {
        expect(screen.getByText('1 transacciones importadas exitosamente')).toBeInTheDocument();
      });

      expect(mockOnSuccess).toHaveBeenCalled();
      expect(message.success).toHaveBeenCalledWith('1 transacciones importadas correctamente');
    });
  });
});