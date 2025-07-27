import React, { useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Space,
  Typography,
  Tooltip,
  Button,
  Drawer,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  SwapOutlined,
  InfoCircleOutlined,
  BankOutlined,
  TransactionOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import TransactionDetails from './TransactionDetails';

const { Text } = Typography;

interface Transaction {
  id: string;
  accountId: string;
  accountName?: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  description: string;
  reference?: string;
  date: string;
  counterpartyName?: string;
  counterpartyAccount?: string;
  metadata?: Record<string, unknown>;
}

interface Account {
  id: string;
  account_id: string;
  iban?: string;
  name?: string;
  currency?: string;
  institution_name?: string;
}

interface TransactionsListProps {
  transactions: Transaction[];
  loading: boolean;
  pagination: TablePaginationConfig;
  accounts: Account[];
}

const TransactionsList: React.FC<TransactionsListProps> = ({
  transactions,
  loading,
  pagination,
  accounts,
}) => {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'bank_transfer':
        return <SwapOutlined />;
      case 'income':
        return <ArrowDownOutlined style={{ color: '#52c41a' }} />;
      case 'expense':
        return <ArrowUpOutlined style={{ color: '#f5222d' }} />;
      default:
        return <BankOutlined />;
    }
  };

  const getStatusTag = (status: string) => {
    const statusConfig: Record<string, { color: string; text: string }> = {
      confirmed: { color: 'success', text: 'Confirmada' },
      pending: { color: 'processing', text: 'Pendiente' },
      failed: { color: 'error', text: 'Fallida' },
      cancelled: { color: 'default', text: 'Cancelada' },
    };

    const config = statusConfig[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const formatAmount = (amount: number, currency: string) => {
    const absAmount = Math.abs(amount);
    const formatted = new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency || 'EUR',
    }).format(absAmount);

    const isNegative = amount < 0;
    return (
      <Text
        strong
        style={{
          color: isNegative ? '#f5222d' : '#52c41a',
          fontSize: '14px',
        }}
      >
        {isNegative ? '-' : '+'}{formatted}
      </Text>
    );
  };

  const handleRowClick = (record: Transaction) => {
    setSelectedTransaction(record);
    setDetailsVisible(true);
  };

  const columns: ColumnsType<Transaction> = [
    {
      title: 'Fecha',
      dataIndex: 'date',
      key: 'date',
      width: 100,
      sorter: true,
      render: (date: string) => (
        <Space direction="vertical" size={0}>
          <Text>{dayjs(date).format('DD/MM/YYYY')}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {dayjs(date).format('HH:mm')}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Tipo',
      dataIndex: 'type',
      key: 'type',
      width: 60,
      align: 'center',
      render: (type: string) => (
        <Tooltip title={type}>
          {getTransactionIcon(type)}
        </Tooltip>
      ),
    },
    {
      title: 'Descripción',
      key: 'description',
      width: 300,
      render: (_, record) => (
        <Space direction="vertical" size={0} style={{ width: '100%' }}>
          <Text ellipsis={{ tooltip: record.description }}>
            {record.description}
          </Text>
          {record.counterpartyName && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.counterpartyName}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Cuenta',
      key: 'account',
      width: 150,
      render: (_, record) => {
        const account = accounts.find(a => a.id === record.accountId);
        return (
          <Space>
            <BankOutlined />
            <Text ellipsis={{ tooltip: account?.institution_name }}>
              {account?.institution_name || 'Desconocida'}
            </Text>
          </Space>
        );
      },
    },
    {
      title: 'Importe',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right',
      sorter: true,
      render: (amount: number, record) => formatAmount(amount, record.currency),
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<InfoCircleOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            handleRowClick(record);
          }}
        >
          Detalles
        </Button>
      ),
    },
  ];

  return (
    <>
      <Card
        title={
          <Space>
            <TransactionOutlined />
            <span>Lista de Transacciones</span>
            {pagination.total && <Tag>{pagination.total} transacciones</Tag>}
          </Space>
        }
        bodyStyle={{ padding: 0 }}
      >
        <Table
          columns={columns}
          dataSource={transactions}
          loading={loading}
          rowKey="id"
          pagination={pagination}
          size="middle"
          scroll={{ x: 900 }}
          onRow={(record) => ({
            onClick: () => handleRowClick(record),
            style: { cursor: 'pointer' },
          })}
          rowClassName="transaction-row"
        />
      </Card>

      <Drawer
        title="Detalles de la Transacción"
        width={600}
        open={detailsVisible}
        onClose={() => {
          setDetailsVisible(false);
          setSelectedTransaction(null);
        }}
        destroyOnClose
      >
        {selectedTransaction && (
          <TransactionDetails
            transaction={selectedTransaction}
            account={accounts.find(a => a.id === selectedTransaction.accountId)}
          />
        )}
      </Drawer>

    </>
  );
};

export default TransactionsList;