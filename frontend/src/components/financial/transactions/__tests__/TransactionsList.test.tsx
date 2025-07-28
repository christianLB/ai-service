import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import TransactionsList from '../TransactionsList';
import { message } from 'antd';
import '@testing-library/jest-dom';

// Mock modules
jest.mock('antd', () => {
  const actual = jest.requireActual('antd');
  return {
    ...actual,
    message: {
      success: jest.fn(),
      error: jest.fn(),
    },
  };
});

// Mock fetch
global.fetch = jest.fn();

// Test data
const mockTransactions = [
  {
    id: '1',
    accountId: 'account-1',
    accountName: 'Test Account',
    description: 'Test Transaction 1',
    amount: 100.50,
    date: '2025-01-27',
    type: 'debit',
    status: 'confirmed',
    currency: 'EUR',
    reference: 'REF001',
    counterpartyName: 'Test Store',
    metadata: {},
  },
  {
    id: '2',
    accountId: 'account-1',
    accountName: 'Test Account',
    description: 'Test Transaction 2',
    amount: -50.25,
    date: '2025-01-26',
    type: 'credit',
    status: 'confirmed',
    currency: 'EUR',
    reference: 'REF002',
    counterpartyName: 'Transport Co',
    metadata: {},
  },
];

// Helper to wrap component with providers
const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('TransactionsList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('token', 'test-token');
  });

  afterEach(() => {
    localStorage.clear();
  });

  const mockAccounts = [
    {
      id: 'account-1',
      account_id: 'account-1',
      iban: 'ES123456789',
      name: 'Test Account',
      currency: 'EUR',
      institution_name: 'Test Bank',
    },
  ];

  const mockPagination = {
    current: 1,
    pageSize: 10,
    total: 2,
  };

  describe('Delete functionality', () => {
    it('should display delete button for each transaction', () => {
      renderWithProviders(
        <TransactionsList 
          transactions={mockTransactions} 
          loading={false}
          accounts={mockAccounts}
          pagination={mockPagination}
        />
      );

      // Check that delete buttons are rendered
      const deleteButtons = screen.getAllByLabelText('Eliminar');
      expect(deleteButtons).toHaveLength(mockTransactions.length);
    });

    it('should show confirmation modal when delete button is clicked', () => {
      renderWithProviders(
        <TransactionsList 
          transactions={mockTransactions} 
          loading={false}
          accounts={mockAccounts}
          pagination={mockPagination}
        />
      );

      // Click first delete button
      const deleteButtons = screen.getAllByLabelText('Eliminar');
      fireEvent.click(deleteButtons[0]);

      // Check modal is displayed
      expect(screen.getByText('Confirmar eliminación')).toBeInTheDocument();
      expect(screen.getByText('¿Está seguro de que desea eliminar esta transacción?')).toBeInTheDocument();
      expect(screen.getByText('Esta acción no se puede deshacer.')).toBeInTheDocument();
      
      // Check transaction details in modal
      expect(screen.getByText('Test Transaction 1')).toBeInTheDocument();
      expect(screen.getByText(/100.50/)).toBeInTheDocument();
    });

    it('should close modal when cancel is clicked', () => {
      renderWithProviders(
        <TransactionsList 
          transactions={mockTransactions} 
          loading={false}
          accounts={mockAccounts}
          pagination={mockPagination}
        />
      );

      // Open modal
      const deleteButtons = screen.getAllByLabelText('Eliminar');
      fireEvent.click(deleteButtons[0]);

      // Click cancel
      const cancelButton = screen.getByText('Cancelar');
      fireEvent.click(cancelButton);

      // Modal should be closed
      expect(screen.queryByText('Confirmar eliminación')).not.toBeInTheDocument();
    });

    it('should call API and show success message on successful deletion', async () => {
      const onRefresh = jest.fn();
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      renderWithProviders(
        <TransactionsList 
          transactions={mockTransactions} 
          loading={false} 
          onRefresh={onRefresh}
          accounts={mockAccounts}
          pagination={mockPagination}
        />
      );

      // Open modal
      const deleteButtons = screen.getAllByLabelText('Eliminar');
      fireEvent.click(deleteButtons[0]);

      // Click confirm
      const confirmButton = screen.getByText('Eliminar');
      fireEvent.click(confirmButton);

      // Wait for API call
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/transactions/1', {
          method: 'DELETE',
          headers: {
            'Authorization': 'Bearer test-token',
          },
        });
      });

      // Check success message
      await waitFor(() => {
        expect(message.success).toHaveBeenCalledWith('Transacción eliminada correctamente');
      });

      // Check onRefresh was called
      expect(onRefresh).toHaveBeenCalled();

      // Modal should be closed
      expect(screen.queryByText('Confirmar eliminación')).not.toBeInTheDocument();
    });

    it('should show error message on failed deletion', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      renderWithProviders(
        <TransactionsList 
          transactions={mockTransactions} 
          loading={false}
          accounts={mockAccounts}
          pagination={mockPagination}
        />
      );

      // Open modal and confirm deletion
      const deleteButtons = screen.getAllByLabelText('Eliminar');
      fireEvent.click(deleteButtons[0]);
      
      const confirmButton = screen.getByText('Eliminar');
      fireEvent.click(confirmButton);

      // Wait for API call
      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });

      // Check error message
      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('Error al eliminar la transacción');
      });

      // Modal should still be open
      expect(screen.getByText('Confirmar eliminación')).toBeInTheDocument();
    });

    it('should handle network errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      renderWithProviders(
        <TransactionsList 
          transactions={mockTransactions} 
          loading={false}
          accounts={mockAccounts}
          pagination={mockPagination}
        />
      );

      // Open modal and confirm deletion
      const deleteButtons = screen.getAllByLabelText('Eliminar');
      fireEvent.click(deleteButtons[0]);
      
      const confirmButton = screen.getByText('Eliminar');
      fireEvent.click(confirmButton);

      // Wait for error handling
      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('Error al eliminar la transacción');
      });
    });

    it('should show loading state during deletion', async () => {
      // Mock a delayed response
      (fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ ok: true, status: 204 }), 100)
        )
      );

      renderWithProviders(
        <TransactionsList 
          transactions={mockTransactions} 
          loading={false}
          accounts={mockAccounts}
          pagination={mockPagination}
        />
      );

      // Open modal and click confirm
      const deleteButtons = screen.getAllByLabelText('Eliminar');
      fireEvent.click(deleteButtons[0]);
      
      const confirmButton = screen.getByText('Eliminar');
      fireEvent.click(confirmButton);

      // Check for loading state (button should be disabled or show loading)
      await waitFor(() => {
        const deleteBtn = screen.getByRole('button', { name: /Eliminar/i });
        expect(deleteBtn).toHaveAttribute('disabled');
      });
    });
  });

  describe('Table rendering', () => {
    it('should render all transactions in the table', () => {
      renderWithProviders(
        <TransactionsList 
          transactions={mockTransactions} 
          loading={false}
          accounts={mockAccounts}
          pagination={mockPagination}
        />
      );

      // Check that all transactions are rendered
      expect(screen.getByText('Test Transaction 1')).toBeInTheDocument();
      expect(screen.getByText('Test Transaction 2')).toBeInTheDocument();
    });

    it('should show info and delete buttons for each row', () => {
      renderWithProviders(
        <TransactionsList 
          transactions={mockTransactions} 
          loading={false}
          accounts={mockAccounts}
          pagination={mockPagination}
        />
      );

      // Each transaction should have both buttons
      const infoButtons = screen.getAllByLabelText('Ver detalles');
      const deleteButtons = screen.getAllByLabelText('Eliminar');
      
      expect(infoButtons).toHaveLength(mockTransactions.length);
      expect(deleteButtons).toHaveLength(mockTransactions.length);
    });
  });
});