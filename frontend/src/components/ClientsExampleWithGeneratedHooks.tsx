/**
 * Example component demonstrating usage of generated hooks
 * Shows both queries and mutations with proper TypeScript types
 */

import React, { useState } from 'react';
import {
  useClientsServiceListClients,
  useClientsServiceCreateClient,
  useClientsServiceUpdateClient,
  useClientsServiceDeleteClient,
  useClientsServiceGetClientStats,
} from '../generated/hooks';
import { Client, CreateClient } from '../generated/hooks/financial/requests';

export function ClientsExampleWithGeneratedHooks() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Query hooks - automatically typed!
  const {
    data: clientsData,
    isLoading,
    error,
    refetch,
  } = useClientsServiceListClients({
    page: 1,
    limit: 10,
    name: undefined,
    email: undefined,
  });

  // Get client stats for selected client
  const { data: statsData } = useClientsServiceGetClientStats(
    { id: selectedClientId || '' },
    undefined,
    {
      enabled: !!selectedClientId, // Only fetch when client is selected
    }
  );

  // Mutation hooks with automatic invalidation
  const createClientMutation = useClientsServiceCreateClient({
    onSuccess: () => {
      refetch(); // Refresh the list after creation
      console.log('Client created successfully!');
    },
    onError: (error) => {
      console.error('Failed to create client:', error);
    },
  });

  const updateClientMutation = useClientsServiceUpdateClient({
    onSuccess: () => {
      refetch();
      console.log('Client updated successfully!');
    },
  });

  const deleteClientMutation = useClientsServiceDeleteClient({
    onSuccess: () => {
      refetch();
      setSelectedClientId(null);
      console.log('Client deleted successfully!');
    },
  });

  // Handle create new client
  const handleCreateClient = () => {
    const newClient: CreateClient = {
      name: 'New Client ' + Date.now(),
      email: 'client@example.com',
      phone: '+1234567890',
      taxId: 'TAX' + Date.now(),
      address: '123 Main St',
      city: 'New York',
      postalCode: '10001',
      country: 'USA',
      defaultCurrency: 'USD',
      paymentTerms: 30,
      notes: 'Created with generated hooks',
      isActive: true,
    };

    createClientMutation.mutate({ requestBody: newClient });
  };

  // Handle update client
  const handleUpdateClient = (client: Client) => {
    updateClientMutation.mutate({
      id: client.id,
      requestBody: {
        ...client,
        name: client.name + ' (Updated)',
        notes: 'Updated at ' + new Date().toISOString(),
      },
    });
  };

  // Handle delete client
  const handleDeleteClient = (id: string) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      deleteClientMutation.mutate({ id });
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading clients...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">Error loading clients: {String(error)}</div>;
  }

  const clients = clientsData?.data || [];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Clients Management (Generated Hooks)</h1>

        <div className="mb-4 flex gap-2">
          <button
            onClick={handleCreateClient}
            disabled={createClientMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {createClientMutation.isPending ? 'Creating...' : 'Create New Client'}
          </button>

          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Refresh List
          </button>
        </div>

        {/* Show mutation status */}
        {createClientMutation.isError && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            Failed to create client: {String(createClientMutation.error)}
          </div>
        )}

        {updateClientMutation.isError && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            Failed to update client: {String(updateClientMutation.error)}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client List */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Client List</h2>
          <div className="space-y-2">
            {clients.length === 0 ? (
              <p className="text-gray-500">No clients found</p>
            ) : (
              clients.map((client) => (
                <div
                  key={client.id}
                  className={`p-4 border rounded cursor-pointer hover:bg-gray-50 ${
                    selectedClientId === client.id ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedClientId(client.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{client.name}</h3>
                      <p className="text-sm text-gray-600">{client.email}</p>
                      {client.taxId && (
                        <p className="text-xs text-gray-500">Tax ID: {client.taxId}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateClient(client);
                        }}
                        disabled={updateClientMutation.isPending}
                        className="px-2 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
                      >
                        {updateClientMutation.isPending &&
                        updateClientMutation.variables?.id === client.id
                          ? 'Updating...'
                          : 'Update'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClient(client.id);
                        }}
                        disabled={deleteClientMutation.isPending}
                        className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                      >
                        {deleteClientMutation.isPending &&
                        deleteClientMutation.variables?.id === client.id
                          ? 'Deleting...'
                          : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Client Stats */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Client Statistics</h2>
          {selectedClientId && statsData ? (
            <div className="p-4 border rounded bg-gray-50">
              <h3 className="font-medium mb-3">
                Stats for: {clients.find((c) => c.id === selectedClientId)?.name}
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Invoices:</span>
                  <span className="font-medium">{statsData.totalInvoices || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Revenue:</span>
                  <span className="font-medium">
                    ${statsData.totalRevenue?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Outstanding Amount:</span>
                  <span className="font-medium text-orange-600">
                    ${statsData.outstandingAmount?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Invoice Date:</span>
                  <span className="font-medium">
                    {statsData.lastInvoiceDate
                      ? new Date(statsData.lastInvoiceDate).toLocaleDateString()
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Select a client to view statistics</p>
          )}
        </div>
      </div>

      {/* Pagination Info */}
      <div className="mt-6 text-sm text-gray-600">
        Showing {clients.length} of {clientsData?.pagination?.total || 0} clients
        {clientsData?.pagination && (
          <span className="ml-2">
            (Page {clientsData.pagination.page} of {clientsData.pagination.pages})
          </span>
        )}
      </div>
    </div>
  );
}
