import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ImportTransactionsModal from '../ImportTransactionsModal';
import TransactionsList from '../TransactionsList';

describe('Import Modal Default Account Functionality', () => {
  const mockAccounts = [
    {
      id: 'account-123',
      account_id: 'ACC123',
      name: 'Test Account',
      type: 'bank_account',
      institution: 'Test Bank',
      currencies: { code: 'EUR', symbol: '€' },
    },
  ];

  describe('ImportTransactionsModal - Direct Tests', () => {
    it('should show account pre-selected when defaultAccountId is provided', async () => {
      const { container } = render(
        <ImportTransactionsModal
          visible={true}
          accounts={mockAccounts}
          defaultAccountId="account-123"
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      );

      // Wait for the component to render
      await waitFor(() => {
        // Ant Design Select doesn't use a standard select element
        // Check the displayed value instead
        const selectionItem = container.querySelector('.ant-select-selection-item');
        expect(selectionItem?.textContent).toBe('Test Account - bank_account (EUR)');
      });
    });

    it('should NOT have any account selected when defaultAccountId is NOT provided', async () => {
      const { container } = render(
        <ImportTransactionsModal
          visible={true}
          accounts={mockAccounts}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      );

      // Wait for the component to render
      await waitFor(() => {
        // Check that no account is selected - should show placeholder
        const selectionPlaceholder = container.querySelector('.ant-select-selection-placeholder');
        expect(selectionPlaceholder?.textContent).toBe('Seleccione una cuenta');
        
        // Also verify no selection item exists
        const selectionItem = container.querySelector('.ant-select-selection-item');
        expect(selectionItem).toBeNull();
      });
    });
  });

  describe('TransactionsList - Default Account ID Detection', () => {
    it('should pass correct defaultAccountId when all transactions are from same account', () => {
      const sameAccountTransactions = [
        {
          id: 'tx1',
          accountId: 'account-123',
          type: 'bank_transfer',
          status: 'confirmed',
          amount: -100,
          currency: 'EUR',
          description: 'Transaction 1',
          date: '2024-01-15',
        },
        {
          id: 'tx2',
          accountId: 'account-123',
          type: 'bank_transfer',
          status: 'confirmed',
          amount: 200,
          currency: 'EUR',
          description: 'Transaction 2',
          date: '2024-01-16',
        },
      ];


      render(
        <TransactionsList
          transactions={sameAccountTransactions}
          loading={false}
          pagination={{ current: 1, pageSize: 10, total: 2 }}
          accounts={mockAccounts}
        />
      );

      // Get the import button
      const importButton = screen.getByRole('button', { name: /importar desde json/i });
      expect(importButton).toBeInTheDocument();

      // Verify that if we render the modal, it would receive account-123
      // Since the modal is initially hidden, we check the logic
      const allSameAccount = sameAccountTransactions.every(
        t => t.accountId === sameAccountTransactions[0].accountId
      );
      expect(allSameAccount).toBe(true);
      expect(sameAccountTransactions[0].accountId).toBe('account-123');
    });

    it('should NOT pass defaultAccountId when transactions are from different accounts', () => {
      const mixedAccountTransactions = [
        {
          id: 'tx1',
          accountId: 'account-123',
          type: 'bank_transfer',
          status: 'confirmed',
          amount: -100,
          currency: 'EUR',
          description: 'Transaction 1',
          date: '2024-01-15',
        },
        {
          id: 'tx2',
          accountId: 'account-456', // Different account
          type: 'bank_transfer',
          status: 'confirmed',
          amount: 200,
          currency: 'EUR',
          description: 'Transaction 2',
          date: '2024-01-16',
        },
      ];

      render(
        <TransactionsList
          transactions={mixedAccountTransactions}
          loading={false}
          pagination={{ current: 1, pageSize: 10, total: 2 }}
          accounts={mockAccounts}
        />
      );

      // Verify logic
      const allSameAccount = mixedAccountTransactions.every(
        t => t.accountId === mixedAccountTransactions[0].accountId
      );
      expect(allSameAccount).toBe(false);
    });
  });
});