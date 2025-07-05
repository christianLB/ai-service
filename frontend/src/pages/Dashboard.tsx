import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Table,
  Tag,
  Spin,
  Button,
  Select,
  Space,
  notification,
} from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  DollarOutlined,
  ShoppingOutlined,
  UserOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import dashboardService from '../services/dashboardService';
import type { DashboardMetrics, HealthStatus } from '../types';
import dayjs from 'dayjs';

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardMetrics | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [quickStats, setQuickStats] = useState<any>(null);
  const [currency, setCurrency] = useState('EUR');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [dashboardResponse, quickStatsResponse] = await Promise.all([
        dashboardService.getDashboardOverview(currency),
        dashboardService.getQuickStats({ currency }),
      ]);

      if (dashboardResponse.success && dashboardResponse.data) {
        setDashboardData(dashboardResponse.data);
      }

      if (quickStatsResponse.success) {
        setQuickStats(quickStatsResponse.data);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      notification.error({
        message: 'Error',
        description: 'No se pudieron cargar los datos del dashboard',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchHealthStatus = async () => {
    try {
      const response = await dashboardService.getHealthCheck();
      setHealthStatus(response);
    } catch (error) {
      console.error('Error fetching health status:', error);
      setHealthStatus({
        success: false,
        status: 'unhealthy',
        services: {
          database: 'error',
          gocardless: 'error',
          scheduler: 'error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  };

  const handleManualSync = async () => {
    try {
      const response = await dashboardService.performManualSync();
      if (response.success) {
        notification.success({
          message: 'Sincronización completada',
          description: 'Los datos se han actualizado correctamente',
        });
        fetchDashboardData();
      }
    } catch (error) {
      notification.error({
        message: 'Error de sincronización',
        description: 'No se pudo completar la sincronización',
      });
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchHealthStatus();
  }, [currency]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'authenticated':
      case 'running':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'warning':
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
      default:
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
    }
  };

  const transactionColumns = [
    {
      title: 'Fecha',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
      width: 100,
    },
    {
      title: 'Descripción',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Contrapartida',
      dataIndex: 'counterpartyName',
      key: 'counterpartyName',
      ellipsis: true,
    },
    {
      title: 'Importe',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: string) => (
        <span style={{ color: parseFloat(amount) >= 0 ? '#52c41a' : '#ff4d4f' }}>
          {parseFloat(amount).toFixed(2)} €
        </span>
      ),
      width: 120,
    },
    {
      title: 'Categoría',
      dataIndex: 'categoryName',
      key: 'categoryName',
      render: (category: string) => category ? <Tag>{category}</Tag> : <Tag color="default">Sin categoría</Tag>,
      width: 150,
    },
  ];

  const categoryColors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#fa8c16'];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>Cargando dashboard...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header Actions */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <h1 style={{ margin: 0 }}>Dashboard Financiero</h1>
          <p style={{ margin: 0, color: '#666' }}>
            Última actualización: {dashboardData?.lastUpdated ? dayjs(dashboardData.lastUpdated).format('DD/MM/YYYY HH:mm') : 'N/A'}
          </p>
        </Col>
        <Col>
          <Space>
            <Select
              value={currency}
              onChange={setCurrency}
              style={{ width: 80 }}
            >
              <Select.Option value="EUR">EUR</Select.Option>
              <Select.Option value="USD">USD</Select.Option>
            </Select>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchDashboardData}
              loading={loading}
            >
              Actualizar
            </Button>
            <Button 
              type="primary"
              onClick={handleManualSync}
            >
              Sincronizar
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Health Status */}
      <Card title="Estado del Sistema" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Estado General"
                value={healthStatus?.status === 'healthy' ? 'Saludable' : 'Con problemas'}
                prefix={getStatusIcon(healthStatus?.status || 'error')}
                valueStyle={{ color: healthStatus?.status === 'healthy' ? '#52c41a' : '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Base de Datos"
                value={healthStatus?.services.database || 'Error'}
                prefix={getStatusIcon(healthStatus?.services.database || 'error')}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="GoCardless"
                value={healthStatus?.services.gocardless || 'Error'}
                prefix={getStatusIcon(healthStatus?.services.gocardless || 'error')}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Scheduler"
                value={healthStatus?.services.scheduler || 'Error'}
                prefix={getStatusIcon(healthStatus?.services.scheduler || 'error')}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Key Metrics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Ingresos del Mes"
              value={dashboardData?.currentMonth.income || '0'}
              precision={2}
              suffix={currency}
              prefix={<ArrowUpOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
            {quickStats?.changes.income !== undefined && (
              <div style={{ marginTop: 8 }}>
                <Tag color={quickStats.changes.income >= 0 ? 'green' : 'red'}>
                  {quickStats.changes.income >= 0 ? '+' : ''}{quickStats.changes.income.toFixed(1)}%
                </Tag>
              </div>
            )}
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Gastos del Mes"
              value={dashboardData?.currentMonth.expenses || '0'}
              precision={2}
              suffix={currency}
              prefix={<ArrowDownOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f' }}
            />
            {quickStats?.changes.expenses !== undefined && (
              <div style={{ marginTop: 8 }}>
                <Tag color={quickStats.changes.expenses >= 0 ? 'red' : 'green'}>
                  {quickStats.changes.expenses >= 0 ? '+' : ''}{quickStats.changes.expenses.toFixed(1)}%
                </Tag>
              </div>
            )}
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Balance"
              value={dashboardData?.currentMonth.balance || '0'}
              precision={2}
              suffix={currency}
              prefix={<DollarOutlined />}
              valueStyle={{ 
                color: parseFloat(dashboardData?.currentMonth.balance || '0') >= 0 ? '#52c41a' : '#ff4d4f'
              }}
            />
            {quickStats?.changes.net !== undefined && (
              <div style={{ marginTop: 8 }}>
                <Tag color={quickStats.changes.net >= 0 ? 'green' : 'red'}>
                  {quickStats.changes.net >= 0 ? '+' : ''}{quickStats.changes.net.toFixed(1)}%
                </Tag>
              </div>
            )}
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Transacciones"
              value={dashboardData?.currentMonth.transactionCount || 0}
              prefix={<ShoppingOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={16}>
          <Card title="Categorías de Gastos">
            {dashboardData?.topExpenseCategories && dashboardData.topExpenseCategories.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dashboardData.topExpenseCategories}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                    label={({ categoryName, amount }) => `${categoryName}: ${amount}€`}
                  >
                    {dashboardData.topExpenseCategories.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={categoryColors[index % categoryColors.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: any) => [`${value}€`, 'Importe']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
                No hay datos de categorías disponibles
              </div>
            )}
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Cuentas">
            <Statistic
              title="Total de Cuentas"
              value={dashboardData?.accounts.total || 0}
              prefix={<UserOutlined />}
            />
            <Statistic
              title="Balance Total"
              value={dashboardData?.accounts.totalBalance || '0'}
              precision={2}
              suffix={currency}
              style={{ marginTop: 16 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Recent Transactions */}
      <Card title="Transacciones Recientes">
        <Table
          columns={transactionColumns}
          dataSource={dashboardData?.recentTransactions || []}
          rowKey="id"
          pagination={false}
          size="small"
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  );
};

export default Dashboard;