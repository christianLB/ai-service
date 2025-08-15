import { useState, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { Card, Row, Col, Typography, Space, Button, Statistic, message } from 'antd';
// TODO: Restore when pagination is implemented
// import type { TablePaginationConfig } from 'antd/es/table';
import {
  TransactionOutlined,
  FilterOutlined,
  DownloadOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { gatewayClient, handleApiError } from '../services/contractsApi';
import type { Account } from '../services/contractsApi';

// Define Transaction type locally since contractsApi doesn't export it
// TODO: Uncomment when Transaction type is needed
// interface Transaction {
//   id: string;
//   account_id: string;
//   amount: number;
//   description?: string;
//   date: string;
//   [key: string]: unknown;
// }
import { useWebSocket } from '../hooks/useWebSocket';
// import TransactionsList from '../components/financial/transactions/TransactionsList';
// import TransactionFilters from '../components/financial/transactions/TransactionFilters';

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

const TransactionsWithContracts: FC = () => {
  const [searchParams] = useSearchParams();
  // TODO: Uncomment when TransactionsList component is implemented
  // const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters] = useState<ITransactionFilters>({}); // TODO: Add setFilters when filter functionality is implemented
  const [stats, setStats] = useState<TransactionStats>({
    totalCount: 0,
    totalIncome: 0,
    totalExpenses: 0,
    filteredCount: 0,
  });
  const [currentPage] = useState(1); // TODO: Add setCurrentPage when pagination is implemented
  const [pageSize] = useState(20); // TODO: Add setPageSize when pagination is implemented
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filtersVisible, setFiltersVisible] = useState(false);
  // TODO: Uncomment when pagination is implemented
  // const [pagination, setPagination] = useState<TablePaginationConfig>({
  //   current: 1,
  //   pageSize: 20,
  //   total: 0,
  //   showSizeChanger: true,
  //   showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} transactions`,
  // });

  const { subscribe } = useWebSocket();

  // Fetch accounts for filter dropdown
  const fetchAccounts = useCallback(async () => {
    try {
      const result = await gatewayClient.GET('/api/financial/accounts', {
        params: { query: { limit: 100 } },
      });

      if (result.data) {
        setAccounts(result.data.accounts);
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    }
  }, []);

  // Fetch transactions with filters using typed contracts
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      // Build query parameters
      const query: Record<string, string | number> = {
        page: currentPage,
        limit: pageSize,
      };

      // Add filters
      if (filters.accountIds?.length) {
        query.accountId = filters.accountIds[0]; // API supports single account for now
      }
      if (filters.type?.length === 1) {
        query.type = filters.type[0];
      }
      if (filters.status?.length === 1) {
        query.status = filters.status[0];
      }
      if (filters.dateRange) {
        query.dateFrom = filters.dateRange[0];
        query.dateTo = filters.dateRange[1];
      }
      if (filters.amountRange) {
        query.minAmount = filters.amountRange[0].toString();
        query.maxAmount = filters.amountRange[1].toString();
      }
      if (filters.searchTerm) {
        query.search = filters.searchTerm;
      }

      const result = await gatewayClient.GET('/api/financial/transactions', {
        params: { query },
      });

      if (result.data) {
        // TODO: Uncomment when transactions state is restored
        // Map transactions with account names
        // const mappedTransactions = result.data.transactions.map((t: Transaction) => ({
        //   ...t,
        //   accountName: accounts.find((a) => a.id === t.account_id)?.name,
        // }));
        // setTransactions(mappedTransactions);
        setStats({
          totalCount: result.data.total,
          totalIncome: result.data.stats?.totalIncome || 0,
          totalExpenses: result.data.stats?.totalExpenses || 0,
          filteredCount: result.data.total,
        });
        // TODO: Uncomment when pagination state is restored
        // setPagination((prev) => ({
        //   ...prev,
        //   total: result.data!.total,
        //   current: result.data!.page,
        //   pageSize: result.data!.limit,
        // }));
      } else if (result.error) {
        const apiError = handleApiError(result.error);
        message.error(apiError.message);
      }
    } catch (error) {
      const apiError = handleApiError(error);
      message.error(apiError.message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, filters, accounts]);

  // Handle pagination changes
  // TODO: Uncomment when TransactionsList component is implemented
  // const handleTableChange = (paginationConfig: TablePaginationConfig) => {
  //   setCurrentPage(paginationConfig.current || 1);
  //   setPageSize(paginationConfig.pageSize || 20);
  // };

  // Handle filter changes
  // TODO: Uncomment when TransactionFilters component is implemented
  // const handleFilterChange = (newFilters: ITransactionFilters) => {
  //   setFilters(newFilters);
  //   setCurrentPage(1); // Reset to first page when filters change
  // };

  // Handle export using typed contracts
  const handleExport = async (format: 'csv' | 'json' = 'csv') => {
    try {
      const query: Record<string, string> = { format };

      // Add same filters as fetchTransactions
      if (filters.accountIds?.length) {
        query.accountId = filters.accountIds[0];
      }
      if (filters.dateRange) {
        query.dateFrom = filters.dateRange[0];
        query.dateTo = filters.dateRange[1];
      }

      const result = await gatewayClient.GET('/api/financial/transactions/export', {
        params: { query },
      });

      if (result.data) {
        if (format === 'csv') {
          // Create a blob and download
          const blob = new Blob([result.data as string], { type: 'text/csv' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          message.success('Transactions exported successfully');
        } else {
          // JSON export
          const blob = new Blob([JSON.stringify(result.data, null, 2)], {
            type: 'application/json',
          });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `transactions_${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          message.success('Transactions exported successfully');
        }
      } else if (result.error) {
        const apiError = handleApiError(result.error);
        message.error(apiError.message);
      }
    } catch (error) {
      const apiError = handleApiError(error);
      message.error(`Export failed: ${apiError.message}`);
    }
  };

  // Initialize from URL params
  useEffect(() => {
    const accountId = searchParams.get('accountId');
    if (accountId) {
      // TODO: Uncomment when setFilters is restored
      // setFilters((prev) => ({ ...prev, accountIds: [accountId] }));
    }
  }, [searchParams]);

  // Fetch initial data
  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    if (accounts.length > 0) {
      fetchTransactions();
    }
  }, [fetchTransactions, accounts.length]);

  // Subscribe to WebSocket updates
  useEffect(() => {
    const unsubscribe = subscribe('transaction.synced', () => {
      fetchTransactions();
    });

    return unsubscribe;
  }, [subscribe, fetchTransactions, fetchAccounts]);

  // Refresh data
  const handleRefresh = () => {
    fetchTransactions();
  };

  return (
    <div className="transactions-page">
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card>
            <Row justify="space-between" align="middle">
              <Col>
                <Space direction="vertical" size={0}>
                  <Title level={2} style={{ margin: 0 }}>
                    <TransactionOutlined /> Transactions
                  </Title>
                  <Text type="secondary">Manage and analyze your financial transactions</Text>
                </Space>
              </Col>
              <Col>
                <Space>
                  <Button
                    icon={<FilterOutlined />}
                    onClick={() => setFiltersVisible(!filtersVisible)}
                  >
                    Filters {Object.keys(filters).length > 0 && `(${Object.keys(filters).length})`}
                  </Button>
                  <Button icon={<DownloadOutlined />} onClick={() => handleExport('csv')}>
                    Export CSV
                  </Button>
                  <Button icon={<DownloadOutlined />} onClick={() => handleExport('json')}>
                    Export JSON
                  </Button>
                  <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
                    Refresh
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* Statistics */}
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Transactions"
              value={stats.totalCount}
              prefix={<TransactionOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Filtered Count"
              value={stats.filteredCount}
              prefix={<FilterOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Income"
              value={stats.totalIncome}
              precision={2}
              prefix="€"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Expenses"
              value={stats.totalExpenses}
              precision={2}
              prefix="€"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>

        {/* Filters */}
        {filtersVisible && (
          <Col span={24}>
            <Card>
              {/* <TransactionFilters
                accounts={accounts}
                filters={filters}
                onChange={handleFilterChange} // TODO: Uncomment when function is restored
              /> */}
              <div>Filters component not implemented yet</div>
            </Card>
          </Col>
        )}

        {/* Transactions List */}
        <Col span={24}>
          <Card>
            {/* <TransactionsList
              transactions={transactions}
              loading={loading}
              pagination={pagination}
              onChange={handleTableChange} // TODO: Uncomment when function is restored
            /> */}
            <div>Transactions list component not implemented yet</div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TransactionsWithContracts;
