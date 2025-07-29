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
  Modal,
  message,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  SwapOutlined,
  InfoCircleOutlined,
  BankOutlined,
  TransactionOutlined,
  DeleteOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import TransactionDetails from './TransactionDetails';
import ImportTransactionsModal from './ImportTransactionsModal';

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
  gocardlessData?: {
    valueDate?: string;
    bookingDate?: string;
    [key: string]: string | undefined;
  };
}

interface Account {
  id: string;
  account_id: string;
  name?: string;
  type?: string;
  institution?: string;
  iban?: string;
  currency_id?: string;
  currencies?: {
    code: string;
    symbol: string;
  };
}

interface TransactionsListProps {
  transactions: Transaction[];
  loading: boolean;
  pagination: TablePaginationConfig;
  accounts: Account[];
  onRefresh?: () => void;
  onTableChange?: (pagination: TablePaginationConfig, filters: any, sorter: any) => void;
}

const TransactionsList: React.FC<TransactionsListProps> = ({
  transactions,
  loading,
  pagination,
  accounts,
  onRefresh,
  onTableChange,
}) => {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);

  // Helper function to get the most accurate date
  const getTransactionDate = (transaction: Transaction): string => {
    // Priority: valueDate > bookingDate > date
    if (transaction.gocardlessData?.valueDate) {
      return transaction.gocardlessData.valueDate;
    }
    if (transaction.gocardlessData?.bookingDate) {
      return transaction.gocardlessData.bookingDate;
    }
    return transaction.date;
  };

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

  const handleDeleteClick = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setDeleteModalVisible(true);
  };

  const handleDelete = async () => {
    if (!transactionToDelete) return;

    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/financial/transactions/${transactionToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al eliminar la transacción');
      }

      message.success('Transacción eliminada correctamente');
      setDeleteModalVisible(false);
      setTransactionToDelete(null);
      
      // Refresh the data
      if (onRefresh) {
        onRefresh();
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      message.error('Error al eliminar la transacción');
    } finally {
      setDeleting(false);
    }
  };

  const columns: ColumnsType<Transaction> = [
    {
      title: 'Fecha Valor',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      sorter: true,
      render: (_, record) => {
        const displayDate = getTransactionDate(record);
        const isValueDate = record.gocardlessData?.valueDate;
        return (
          <Space direction="vertical" size={0}>
            <Text>{dayjs(displayDate).format('DD/MM/YYYY')}</Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {dayjs(displayDate).format('HH:mm')}
              {isValueDate && ' (valor)'}
            </Text>
          </Space>
        );
      },
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
            <Text ellipsis={{ tooltip: account?.institution }}>
              {account?.institution || 'Desconocida'}
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
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Ver detalles">
            <Button
              type="link"
              size="small"
              icon={<InfoCircleOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleRowClick(record);
              }}
            />
          </Tooltip>
          <Tooltip title="Eliminar">
            <Button
              type="link"
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick(record);
              }}
            />
          </Tooltip>
        </Space>
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
        extra={
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={() => setImportModalVisible(true)}
          >
            Importar desde JSON
          </Button>
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
          onChange={onTableChange}
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

      <Modal
        title="Confirmar eliminación"
        open={deleteModalVisible}
        onOk={handleDelete}
        onCancel={() => {
          setDeleteModalVisible(false);
          setTransactionToDelete(null);
        }}
        confirmLoading={deleting}
        okText="Eliminar"
        cancelText="Cancelar"
        okButtonProps={{ danger: true }}
      >
        <p>¿Está seguro de que desea eliminar esta transacción?</p>
        {transactionToDelete && (
          <div style={{ marginTop: 16, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
            <p><strong>Descripción:</strong> {transactionToDelete.description}</p>
            <p><strong>Monto:</strong> {formatAmount(transactionToDelete.amount, transactionToDelete.currency)}</p>
            <p><strong>Fecha:</strong> {dayjs(getTransactionDate(transactionToDelete)).format('DD/MM/YYYY')}</p>
          </div>
        )}
        <p style={{ marginTop: 16, color: '#ff4d4f' }}>Esta acción no se puede deshacer.</p>
      </Modal>

      <ImportTransactionsModal
        visible={importModalVisible}
        accounts={accounts}
        defaultAccountId={
          transactions.length > 0 && 
          transactions.every(t => t.accountId === transactions[0].accountId) 
            ? transactions[0].accountId 
            : undefined
        }
        onClose={() => setImportModalVisible(false)}
        onSuccess={() => {
          setImportModalVisible(false);
          if (onRefresh) {
            onRefresh();
          } else {
            window.location.reload();
          }
        }}
      />

    </>
  );
};

export default TransactionsList;