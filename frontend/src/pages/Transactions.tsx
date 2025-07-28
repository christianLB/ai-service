import { useState, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Space,
  Button,
  Statistic,
} from 'antd';
import {
  TransactionOutlined,
  FilterOutlined,
  DownloadOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import TransactionsList from '../components/financial/transactions/TransactionsList';
import TransactionFilters from '../components/financial/transactions/TransactionFilters';

const { Title, Text } = Typography;

interface ITransactionFilters {
  accountIds?: string[];
  dateRange?: [string, string];
  amountRange?: [number, number];
  type?: string[];
  status?: string[];
  searchTerm?: string;
}

interface TransactionStats {
  totalCount: number;
  totalIncome: number;
  totalExpenses: number;
  filteredCount: number;
}

const Transactions: FC = () => {
  const [searchParams] = useSearchParams();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ITransactionFilters>({});
  const [stats, setStats] = useState<TransactionStats>({
    totalCount: 0,
    totalIncome: 0,
    totalExpenses: 0,
    filteredCount: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [sortField, setSortField] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend'>('descend');
  
  const { subscribe } = useWebSocket();

  // Initialize filters from URL params
  useEffect(() => {
    const accountId = searchParams.get('accountId');
    if (accountId) {
      setFilters(prev => ({ ...prev, accountIds: [accountId] }));
    }
  }, [searchParams]);

  // Fetch accounts for filter options
  const fetchAccounts = useCallback(async () => {
    try {
      const response = await api.get('/financial/accounts');
      setAccounts(response.data.data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  }, []);

  // Fetch transactions with filters
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', pageSize.toString());
      params.append('sortBy', sortField);
      params.append('sortOrder', sortOrder === 'ascend' ? 'asc' : 'desc');
      
      if (filters.accountIds?.length) {
        filters.accountIds.forEach(id => params.append('accountIds[]', id));
      }
      if (filters.dateRange) {
        params.append('startDate', filters.dateRange[0]);
        params.append('endDate', filters.dateRange[1]);
      }
      if (filters.amountRange) {
        params.append('minAmount', filters.amountRange[0].toString());
        params.append('maxAmount', filters.amountRange[1].toString());
      }
      if (filters.type?.length) {
        filters.type.forEach(t => params.append('types[]', t));
      }
      if (filters.status?.length) {
        filters.status.forEach(s => params.append('statuses[]', s));
      }
      if (filters.searchTerm) {
        params.append('search', filters.searchTerm);
      }

      const response = await api.get(`/financial/transactions?${params.toString()}`);
      const data = response.data.data;
      
      setTransactions(data.items || []);
      setStats({
        totalCount: data.total || 0,
        totalIncome: data.totalIncome || 0,
        totalExpenses: data.totalExpenses || 0,
        filteredCount: data.filteredCount || data.total || 0,
      });
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, filters, sortField, sortOrder]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Subscribe to WebSocket events
  useEffect(() => {
    const unsubscribeNewTransaction = subscribe('financial:transaction:new', () => {
      // Refresh transactions when a new transaction is received
      fetchTransactions();
    });

    const unsubscribeSyncCompleted = subscribe('financial:sync:completed', () => {
      // Refresh transactions when sync is completed
      fetchTransactions();
      fetchAccounts();
    });

    return () => {
      unsubscribeNewTransaction();
      unsubscribeSyncCompleted();
    };
  }, [subscribe, fetchTransactions, fetchAccounts]);

  const handleFiltersChange = (newFilters: ITransactionFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleRefresh = () => {
    fetchTransactions();
  };

  const handleTableChange = (pagination: any, _filters: any, sorter: any) => {
    // Handle pagination changes
    if (pagination.current !== currentPage || pagination.pageSize !== pageSize) {
      setCurrentPage(pagination.current);
      setPageSize(pagination.pageSize);
    }

    // Handle sorting changes
    if (sorter.field && sorter.order) {
      setSortField(sorter.field);
      setSortOrder(sorter.order);
      setCurrentPage(1); // Reset to first page when sorting changes
    } else if (!sorter.order) {
      // Reset to default sorting
      setSortField('date');
      setSortOrder('descend');
      setCurrentPage(1);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      // Add same filters as fetchTransactions
      if (filters.accountIds?.length) {
        filters.accountIds.forEach(id => params.append('accountIds[]', id));
      }
      if (filters.dateRange) {
        params.append('startDate', filters.dateRange[0]);
        params.append('endDate', filters.dateRange[1]);
      }
      if (filters.searchTerm) {
        params.append('search', filters.searchTerm);
      }
      
      const response = await api.get(`/financial/transactions/export?${params.toString()}`, {
        responseType: 'blob',
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transacciones_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting transactions:', error);
    }
  };

  return (
    <div>
      {/* Header */}
      <Card style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ marginBottom: 8 }}>
              <TransactionOutlined style={{ marginRight: 12 }} />
              Transacciones
            </Title>
            <Text type="secondary" style={{ fontSize: 16 }}>
              Visualiza y gestiona todas tus transacciones bancarias
            </Text>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<FilterOutlined />}
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={loading}
              >
                Actualizar
              </Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleExport}
                disabled={transactions.length === 0}
              >
                Exportar CSV
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Transacciones"
              value={stats.filteredCount}
              suffix={stats.filteredCount !== stats.totalCount ? `/ ${stats.totalCount}` : ''}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Ingresos"
              value={stats.totalIncome}
              precision={2}
              prefix="€"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Gastos"
              value={Math.abs(stats.totalExpenses)}
              precision={2}
              prefix="€"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Balance"
              value={stats.totalIncome + stats.totalExpenses}
              precision={2}
              prefix="€"
              valueStyle={{ 
                color: (stats.totalIncome + stats.totalExpenses) >= 0 ? '#3f8600' : '#cf1322' 
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Content */}
      <Row gutter={[24, 24]}>
        {showFilters && (
          <Col xs={24} md={6}>
            <TransactionFilters
              filters={filters}
              onChange={handleFiltersChange}
              accounts={accounts}
              loading={loading}
            />
          </Col>
        )}
        <Col xs={24} md={showFilters ? 18 : 24}>
          <TransactionsList
            transactions={transactions}
            loading={loading}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: stats.filteredCount,
              onChange: (page, size) => {
                setCurrentPage(page);
                if (size) setPageSize(size);
              },
            }}
            accounts={accounts}
            onTableChange={handleTableChange}
          />
        </Col>
      </Row>
    </div>
  );
};

export default Transactions;