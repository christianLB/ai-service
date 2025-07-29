import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import TransactionsList from '../TransactionsList';
import ImportTransactionsModal from '../ImportTransactionsModal';

// Mock the ImportTransactionsModal to check props
vi.mock('../ImportTransactionsModal', () => {
  return {
    default: vi.fn((props) => {
    if (!props.visible) return null;
    return (
      <div data-testid="import-modal">
        <div data-testid="default-account-id">{props.defaultAccountId || 'no-default'}</div>
        <button onClick={props.onClose}>Close</button>
        <button onClick={props.onSuccess}>Success</button>
      </div>
    );
  })
  };
});

describe('TransactionsList - Import Modal Integration', () => {
  const mockAccounts = [
    {
      id: 'acc1',
      account_id: 'ACC001',
      name: 'Account 1',
      type: 'bank_account',
      institution: 'Bank A',
    },
    {
      id: 'acc2',
      account_id: 'ACC002',
      name: 'Account 2',
      type: 'bank_account',
      institution: 'Bank B',
    },
  ];

  const defaultProps = {
    loading: false,
    pagination: { current: 1, pageSize: 10, total: 0 },
    accounts: mockAccounts,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Default Account Detection', () => {
    it('should pass the account ID when all transactions are from the same account', () => {
      const singleAccountTransactions = [
        {
          id: 'tx1',
          accountId: 'acc1',
          type: 'bank_transfer',
          status: 'confirmed',
          amount: -100,
          currency: 'EUR',
          description: 'Transaction 1',
          date: '2024-01-15',
        },
        {
          id: 'tx2',
          accountId: 'acc1',
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
          {...defaultProps}
          transactions={singleAccountTransactions}
        />
      );

      // Click import button
      const importButton = screen.getByRole('button', { name: /importar desde json/i });
      fireEvent.click(importButton);

      // Check that modal receives correct defaultAccountId
      expect(screen.getByTestId('default-account-id')).toHaveTextContent('acc1');
    });

    it('should not pass account ID when transactions are from multiple accounts', () => {
      const multiAccountTransactions = [
        {
          id: 'tx1',
          accountId: 'acc1',
          type: 'bank_transfer',
          status: 'confirmed',
          amount: -100,
          currency: 'EUR',
          description: 'Transaction 1',
          date: '2024-01-15',
        },
        {
          id: 'tx2',
          accountId: 'acc2',
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
          {...defaultProps}
          transactions={multiAccountTransactions}
        />
      );

      // Click import button
      const importButton = screen.getByRole('button', { name: /importar desde json/i });
      fireEvent.click(importButton);

      // Check that modal doesn't receive defaultAccountId
      expect(screen.getByTestId('default-account-id')).toHaveTextContent('no-default');
    });

    it('should not pass account ID when there are no transactions', () => {
      render(
        <TransactionsList
          {...defaultProps}
          transactions={[]}
        />
      );

      // Click import button
      const importButton = screen.getByRole('button', { name: /importar desde json/i });
      fireEvent.click(importButton);

      // Check that modal doesn't receive defaultAccountId
      expect(screen.getByTestId('default-account-id')).toHaveTextContent('no-default');
    });
  });

  describe('Modal Props Verification', () => {
    it('should pass all required props to ImportTransactionsModal', () => {
      const mockOnRefresh = vi.fn();
      const transactions = [
        {
          id: 'tx1',
          accountId: 'acc1',
          type: 'bank_transfer',
          status: 'confirmed',
          amount: -100,
          currency: 'EUR',
          description: 'Transaction 1',
          date: '2024-01-15',
        },
      ];

      render(
        <TransactionsList
          {...defaultProps}
          transactions={transactions}
          onRefresh={mockOnRefresh}
        />
      );

      // Click import button
      const importButton = screen.getByRole('button', { name: /importar desde json/i });
      fireEvent.click(importButton);

      // Verify modal is rendered with correct props
      const modalMock = ImportTransactionsModal as jest.MockedFunction<typeof ImportTransactionsModal>;
      expect(modalMock).toHaveBeenCalledWith(
        expect.objectContaining({
          visible: true,
          accounts: mockAccounts,
          defaultAccountId: 'acc1',
          onClose: expect.any(Function),
          onSuccess: expect.any(Function),
        }),
        expect.any(Object)
      );

      // Test onSuccess callback
      const successButton = screen.getByText('Success');
      fireEvent.click(successButton);
      expect(mockOnRefresh).toHaveBeenCalled();
    });

    it('should handle modal close correctly', () => {
      render(
        <TransactionsList
          {...defaultProps}
          transactions={[]}
        />
      );

      // Open modal
      const importButton = screen.getByRole('button', { name: /importar desde json/i });
      fireEvent.click(importButton);
      expect(screen.getByTestId('import-modal')).toBeInTheDocument();

      // Close modal
      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);
      
      // Modal should be closed
      expect(screen.queryByTestId('import-modal')).not.toBeInTheDocument();
    });
  });
});