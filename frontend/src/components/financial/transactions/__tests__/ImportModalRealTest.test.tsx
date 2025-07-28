import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ImportTransactionsModal from '../ImportTransactionsModal';

describe('Import Modal - Real Integration Test', () => {
  const mockAccounts = [
    {
      id: 'account-1',
      account_id: 'ACC001',
      name: 'Account One',
      type: 'bank_account',
      institution: 'Bank A',
      currencies: { code: 'EUR', symbol: '€' },
    },
    {
      id: 'account-2',
      account_id: 'ACC002',
      name: 'Account Two',
      type: 'bank_account',
      institution: 'Bank B',
      currencies: { code: 'USD', symbol: '$' },
    },
  ];

  it('should allow import when account is pre-selected via defaultAccountId', async () => {
    const user = userEvent.setup();
    const mockOnSuccess = vi.fn();
    
    // Mock successful import response
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          imported: 2,
          skipped: 0,
          errors: [],
          duplicates: [],
          accountId: 'account-1',
        },
      }),
    });

    render(
      <ImportTransactionsModal
        visible={true}
        accounts={mockAccounts}
        defaultAccountId="account-1"
        onClose={vi.fn()}
        onSuccess={mockOnSuccess}
      />
    );

    // Step 1: Verify account is pre-selected
    // Since Ant Design uses custom selects, we check for the displayed text
    await waitFor(() => {
      const selectedText = screen.queryByText('Account One - bank_account (EUR)');
      expect(selectedText).toBeInTheDocument();
    });

    // Step 2: Upload a file
    const fileContent = {
      transactions: [
        {
          amount: '-50.00',
          date: '2024-01-15T00:00:00Z',
          description: 'Test transaction 1',
        },
        {
          amount: '100.00',
          date: '2024-01-16T00:00:00Z',
          description: 'Test transaction 2',
        },
      ],
    };
    
    const file = new File([JSON.stringify(fileContent)], 'test-transactions.json', {
      type: 'application/json',
    });

    // Find the file input
    const fileInput = screen.getByLabelText(/haga clic o arrastre/i).parentElement?.querySelector('input[type="file"]');
    if (fileInput) {
      await user.upload(fileInput as HTMLElement, file);
    }

    // Step 3: Wait for preview screen
    await waitFor(() => {
      expect(screen.getByText('Vista previa de transacciones')).toBeInTheDocument();
    });

    // Step 4: Find and click the import button - IT SHOULD BE ENABLED
    const importButton = screen.getByRole('button', { name: /importar 2 transacciones/i });
    
    // THIS IS THE KEY TEST - The button should NOT be disabled
    expect(importButton).not.toBeDisabled();
    
    // Step 5: Click import
    await user.click(importButton);

    // Step 6: Verify success
    await waitFor(() => {
      expect(screen.getByText('2 transacciones importadas exitosamente')).toBeInTheDocument();
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('should NOT allow import when NO account is selected', async () => {
    const user = userEvent.setup();
    
    render(
      <ImportTransactionsModal
        visible={true}
        accounts={mockAccounts}
        // NO defaultAccountId provided
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    // Verify no account is pre-selected
    expect(screen.getByText('Seleccione una cuenta')).toBeInTheDocument();

    // Upload a file without selecting account
    const fileContent = {
      transactions: [
        {
          amount: '-50.00',
          date: '2024-01-15T00:00:00Z',
          description: 'Test transaction',
        },
      ],
    };
    
    const file = new File([JSON.stringify(fileContent)], 'test.json', {
      type: 'application/json',
    });

    const fileInput = screen.getByLabelText(/haga clic o arrastre/i).parentElement?.querySelector('input[type="file"]');
    if (fileInput) {
      await user.upload(fileInput as HTMLElement, file);
    }

    // Wait for preview
    await waitFor(() => {
      expect(screen.getByText('Vista previa de transacciones')).toBeInTheDocument();
    });

    // The import button SHOULD BE DISABLED
    const importButton = screen.getByRole('button', { name: /importar 1 transacciones/i });
    expect(importButton).toBeDisabled();
  });

  it('should enable import button after selecting account manually', async () => {
    const user = userEvent.setup();
    
    render(
      <ImportTransactionsModal
        visible={true}
        accounts={mockAccounts}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    // Select an account manually
    const selectTrigger = screen.getByText('Seleccione una cuenta');
    await user.click(selectTrigger);
    
    // Click on an account option
    const accountOption = await screen.findByText('Account One - bank_account (EUR)');
    await user.click(accountOption);

    // Upload file
    const fileContent = {
      transactions: [{ amount: '-50.00', date: '2024-01-15T00:00:00Z', description: 'Test' }],
    };
    const file = new File([JSON.stringify(fileContent)], 'test.json', { type: 'application/json' });
    const fileInput = screen.getByLabelText(/haga clic o arrastre/i).parentElement?.querySelector('input[type="file"]');
    if (fileInput) {
      await user.upload(fileInput as HTMLElement, file);
    }

    // Wait for preview
    await waitFor(() => {
      expect(screen.getByText('Vista previa de transacciones')).toBeInTheDocument();
    });

    // Button should be ENABLED now
    const importButton = screen.getByRole('button', { name: /importar 1 transacciones/i });
    expect(importButton).not.toBeDisabled();
  });
});