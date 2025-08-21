/**
 * Client List Component using Generated Hooks
 * 
 * This component demonstrates using the auto-generated React Query hooks
 * from openapi-react-query-codegen instead of manual hooks.
 */

import React, { useEffect } from 'react';
import { Card, Table, Button, Space, Tag, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useDefaultServiceGetApiFinancialClients } from '../generated/hooks/queries/queries';
import { useDefaultServicePostApiFinancialClients } from '../generated/hooks/queries/mutations';
import '../generated/hooks/sdk-adapter'; // Import to configure the API

export const ClientListGenerated: React.FC = () => {
  // Use the generated query hook
  const { data, isLoading, error, refetch } = useDefaultServiceGetApiFinancialClients({
    page: 1,
    limit: 10,
  });

  // Use the generated mutation hook for creating clients
  const createClientMutation = useDefaultServicePostApiFinancialClients({
    onSuccess: () => {
      message.success('Client created successfully');
      refetch();
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to create client');
    },
  });

  useEffect(() => {
    if (error) {
      message.error('Failed to load clients');
    }
  }, [error]);

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Business Name',
      dataIndex: 'businessName',
      key: 'businessName',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button 
            icon={<EditOutlined />} 
            size="small"
            onClick={() => handleEdit(record)}
          />
          <Button 
            icon={<DeleteOutlined />} 
            size="small" 
            danger
            onClick={() => handleDelete(record.id)}
          />
        </Space>
      ),
    },
  ];

  const handleEdit = (client: any) => {
    // Edit logic here
    console.log('Edit client:', client);
  };

  const handleDelete = (id: string) => {
    // Delete logic here
    console.log('Delete client:', id);
  };

  const handleCreate = () => {
    // Example of using the mutation
    createClientMutation.mutate({
      requestBody: {
        name: 'Test Client',
        email: 'test@example.com',
        businessName: 'Test Business',
        vatNumber: 'VAT123456',
        address: '123 Test St',
        city: 'Test City',
        postalCode: '12345',
        country: 'Test Country',
        phone: '+1234567890',
      }
    });
  };

  return (
    <Card 
      title="Clients (Generated Hooks)"
      extra={
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          Add Client
        </Button>
      }
    >
      <Table
        columns={columns}
        dataSource={data?.clients || []}
        loading={isLoading}
        rowKey="id"
        pagination={{
          current: 1,
          pageSize: 10,
          total: data?.total || 0,
        }}
      />
    </Card>
  );
};