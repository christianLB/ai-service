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
  Progress,
  Tabs,
} from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  DollarOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  TeamOutlined,
  LineChartOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  BankOutlined,
} from '@ant-design/icons';
import { 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import dashboardService from '../services/dashboardService';
import BankAccounts from './BankAccounts';
import type { 
  RevenueMetrics, 
  ClientMetrics
} from '../types';
import dayjs from 'dayjs';
import VersionIndicator from '../components/VersionIndicator';

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics | null>(null);
  const [invoiceStats, setInvoiceStats] = useState<any>(null);
  const [clientMetrics, setClientMetrics] = useState<ClientMetrics | null>(null);
  const [cashFlow, setCashFlow] = useState<any>(null);
  const [currency, setCurrency] = useState('EUR');
  const [activeTab, setActiveTab] = useState('overview');
  const [errors, setErrors] = useState<{
    revenue?: string;
    invoice?: string;
    client?: string;
    cashFlow?: string;
  }>({});

  const fetchDashboardData = async () => {
    setLoading(true);
    const newErrors: typeof errors = {};

    // Fetch revenue metrics
    try {
      const revenueResponse = await dashboardService.getRevenueMetrics({ currency, period: 'monthly' });
      if (revenueResponse.success && revenueResponse.data) {
        setRevenueMetrics(revenueResponse.data);
      }
    } catch (error) {
      console.error('Error fetching revenue metrics:', error);
      newErrors.revenue = 'No se pudieron cargar las métricas de ingresos';
    }

    // Fetch invoice stats
    try {
      const invoiceResponse = await dashboardService.getInvoiceStats({ currency });
      if (invoiceResponse.success && invoiceResponse.data) {
        setInvoiceStats(invoiceResponse.data);
      }
    } catch (error) {
      console.error('Error fetching invoice stats:', error);
      newErrors.invoice = 'No se pudieron cargar las estadísticas de facturas';
    }

    // Fetch client metrics
    try {
      const clientResponse = await dashboardService.getClientMetrics({});
      if (clientResponse.success && clientResponse.data) {
        setClientMetrics(clientResponse.data);
      }
    } catch (error) {
      console.error('Error fetching client metrics:', error);
      newErrors.client = 'No se pudieron cargar las métricas de clientes';
    }

    // Fetch cash flow
    try {
      const cashFlowResponse = await dashboardService.getCashFlowProjections({ currency });
      if (cashFlowResponse.success && cashFlowResponse.data) {
        setCashFlow(cashFlowResponse.data);
      }
    } catch (error) {
      console.error('Error fetching cash flow:', error);
      newErrors.cashFlow = 'No se pudieron cargar las proyecciones de flujo de caja';
    }

    setErrors(newErrors);
    setLoading(false);

    // Show notification only if there are errors
    if (Object.keys(newErrors).length > 0) {
      notification.warning({
        message: 'Algunos datos no se pudieron cargar',
        description: 'Mostrando información disponible. Algunas secciones pueden estar incompletas.',
        duration: 0,
        btn: (
          <Button size="small" type="primary" onClick={fetchDashboardData}>
            Reintentar
          </Button>
        ),
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
  }, [currency]);

  const categoryColors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#fa8c16'];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>Cargando dashboard...</p>
      </div>
    );
  }

  // Helper function to format currency
  const formatCurrency = (amount: string | number, currencyCode = currency) => {
    if (amount == null) return `0.00 ${currencyCode}`;
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return `0.00 ${currencyCode}`;
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const getGrowthColor = (growth: number) => {
    return growth >= 0 ? '#52c41a' : '#ff4d4f';
  };

  const getGrowthIcon = (growth: number) => {
    return growth >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />;
  };

  return (
    <div>
      {/* Header Actions */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }} className="dashboard-header">
        <Col>
          <Space direction="vertical" size="small">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ margin: 0 }}>Dashboard Financiero</h1>
              <VersionIndicator />
            </div>
            <p style={{ margin: 0, color: '#666' }}>
              Última actualización: {revenueMetrics?.generatedAt ? dayjs(revenueMetrics.generatedAt).format('DD/MM/YYYY HH:mm') : 'N/A'}
            </p>
          </Space>
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

      {/* Tabs Container */}
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={[
          {
            key: 'overview',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DollarOutlined />
                Vista General
              </span>
            ),
            children: (
              <div>
                {/* Quick Revenue Stats */}
                <Row gutter={16} className="dashboard-metric-row">
                  <Col xs={24} sm={12} md={6}>
                    <Card className="metric-card">
                      <Statistic
                        title="Ingresos del Mes"
                        value={revenueMetrics?.currentPeriod.totalRevenue || '0'}
                        formatter={(value) => formatCurrency(value as string)}
                        prefix={<LineChartOutlined style={{ color: '#52c41a' }} />}
                        valueStyle={{ color: '#52c41a' }}
                      />
                      {revenueMetrics?.growth && (
                        <div style={{ marginTop: 8 }}>
                          <Tag color={getGrowthColor(revenueMetrics.growth.revenueGrowth)}>
                            {getGrowthIcon(revenueMetrics.growth.revenueGrowth)}
                            {revenueMetrics.growth.revenueGrowth != null && !isNaN(revenueMetrics.growth.revenueGrowth) ? revenueMetrics.growth.revenueGrowth.toFixed(1) : '0.0'}%
                          </Tag>
                        </div>
                      )}
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card className="metric-card">
                      <Statistic
                        title="Facturas Pagadas"
                        value={revenueMetrics?.currentPeriod.paidRevenue || '0'}
                        formatter={(value) => formatCurrency(value as string)}
                        prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                        valueStyle={{ color: '#52c41a' }}
                      />
                      <div style={{ marginTop: 8 }}>
                        <Tag color="green">
                          {revenueMetrics?.currentPeriod.paidInvoices || 0} facturas
                        </Tag>
                      </div>
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card className="metric-card">
                      <Statistic
                        title="Pendientes de Cobro"
                        value={revenueMetrics?.currentPeriod.pendingRevenue || '0'}
                        formatter={(value) => formatCurrency(value as string)}
                        prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
                        valueStyle={{ color: '#faad14' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card className="metric-card">
                      <Statistic
                        title="Vencidas"
                        value={revenueMetrics?.currentPeriod.overdueRevenue || '0'}
                        formatter={(value) => formatCurrency(value as string)}
                        prefix={<WarningOutlined style={{ color: '#ff4d4f' }} />}
                        valueStyle={{ color: '#ff4d4f' }}
                      />
                    </Card>
                  </Col>
                </Row>

                {/* Revenue Trends Chart */}
                {revenueMetrics?.trends?.monthlyRevenue && (
                  <Card title="Tendencia de Ingresos" style={{ marginBottom: 24 }}>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={revenueMetrics.trends.monthlyRevenue}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(value) => formatCurrency(value)} />
                        <RechartsTooltip formatter={(value: any) => [formatCurrency(value), 'Ingresos']} />
                        <Area 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="#1890ff" 
                          fill="#1890ff" 
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Card>
                )}

                {/* Top Clients */}
                {revenueMetrics?.topClients && (
                  <Card title="Mejores Clientes">
                    <Table
                      dataSource={revenueMetrics.topClients}
                      rowKey="id"
                      pagination={false}
                      size="small"
                      columns={[
                        {
                          title: 'Cliente',
                          dataIndex: 'name',
                          key: 'name',
                          render: (text, record) => (
                            <div>
                              <div style={{ fontWeight: 'bold' }}>{text}</div>
                              {record.businessName && (
                                <div style={{ fontSize: '12px', color: '#666' }}>{record.businessName}</div>
                              )}
                            </div>
                          ),
                        },
                        {
                          title: 'Ingresos Totales',
                          dataIndex: 'totalRevenue',
                          key: 'totalRevenue',
                          render: (value) => formatCurrency(value),
                        },
                        {
                          title: 'Facturas',
                          dataIndex: 'totalInvoices',
                          key: 'totalInvoices',
                        },
                        {
                          title: 'Promedio por Factura',
                          dataIndex: 'avgInvoiceAmount',
                          key: 'avgInvoiceAmount',
                          render: (value) => formatCurrency(value),
                        },
                      ]}
                    />
                  </Card>
                )}
              </div>
            ),
          },
          {
            key: 'invoices',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileTextOutlined />
                Facturas
              </span>
            ),
            children: (
              <div>
                {/* Invoice Status Distribution */}
                {invoiceStats && (
                  <Row gutter={16} className="dashboard-metric-row">
                    <Col xs={24} sm={12} md={6}>
                      <Card className="metric-card">
                        <Statistic
                          title="Total Facturas"
                          value={invoiceStats.overview?.totalInvoices || 0}
                          prefix={<FileTextOutlined />}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Card className="metric-card">
                        <Statistic
                          title="Pagadas"
                          value={invoiceStats.overview?.paidInvoices || 0}
                          prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                          valueStyle={{ color: '#52c41a' }}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Card className="metric-card">
                        <Statistic
                          title="Pendientes"
                          value={(invoiceStats.overview?.sentInvoices || 0) + (invoiceStats.overview?.viewedInvoices || 0)}
                          prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
                          valueStyle={{ color: '#faad14' }}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Card className="metric-card">
                        <Statistic
                          title="Vencidas"
                          value={invoiceStats.overview?.overdueInvoices || 0}
                          prefix={<WarningOutlined style={{ color: '#ff4d4f' }} />}
                          valueStyle={{ color: '#ff4d4f' }}
                        />
                      </Card>
                    </Col>
                  </Row>
                )}

                {/* Invoice Status Chart */}
                {invoiceStats?.overview && (
                  <Row gutter={16} style={{ marginBottom: 24 }}>
                    <Col xs={24} lg={12}>
                      <Card title="Distribución por Estado">
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Borradores', value: invoiceStats.overview.draftInvoices || 0 },
                                { name: 'Enviadas', value: invoiceStats.overview.sentInvoices || 0 },
                                { name: 'Vistas', value: invoiceStats.overview.viewedInvoices || 0 },
                                { name: 'Pagadas', value: invoiceStats.overview.paidInvoices || 0 },
                                { name: 'Vencidas', value: invoiceStats.overview.overdueInvoices || 0 },
                                { name: 'Canceladas', value: invoiceStats.overview.cancelledInvoices || 0 },
                              ].filter(item => item.value > 0)}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              dataKey="value"
                              nameKey="name"
                            >
                              {[0, 1, 2, 3, 4, 5].map((index) => (
                                <Cell key={`cell-${index}`} fill={categoryColors[index % categoryColors.length]} />
                              ))}
                            </Pie>
                            <RechartsTooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                      <Card title="Creación Mensual">
                        {invoiceStats.trends?.monthlyCreation && (
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={invoiceStats.trends.monthlyCreation}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="month" />
                              <YAxis />
                              <RechartsTooltip />
                              <Bar dataKey="invoicesCreated" fill="#1890ff" />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </Card>
                    </Col>
                  </Row>
                )}

                {/* Overdue Invoices */}
                {invoiceStats?.topOverdueInvoices && (
                  <Card title="Facturas Vencidas" style={{ marginBottom: 24 }}>
                    <Table
                      dataSource={invoiceStats.topOverdueInvoices}
                      rowKey="id"
                      pagination={false}
                      size="small"
                      columns={[
                        {
                          title: 'Número',
                          dataIndex: 'invoiceNumber',
                          key: 'invoiceNumber',
                        },
                        {
                          title: 'Cliente',
                          dataIndex: 'clientName',
                          key: 'clientName',
                        },
                        {
                          title: 'Importe',
                          dataIndex: 'total',
                          key: 'total',
                          render: (value) => formatCurrency(value),
                        },
                        {
                          title: 'Fecha Vencimiento',
                          dataIndex: 'dueDate',
                          key: 'dueDate',
                          render: (date) => dayjs(date).format('DD/MM/YYYY'),
                        },
                        {
                          title: 'Días Vencidos',
                          dataIndex: 'daysOverdue',
                          key: 'daysOverdue',
                          render: (days) => (
                            <Tag color={days > 30 ? 'red' : days > 15 ? 'orange' : 'yellow'}>
                              {days} días
                            </Tag>
                          ),
                        },
                      ]}
                    />
                  </Card>
                )}
              </div>
            ),
          },
          {
            key: 'clients',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TeamOutlined />
                Clientes
              </span>
            ),
            children: (
              <div>
                {/* Client Summary Stats */}
                {clientMetrics && (
                  <Row gutter={16} className="dashboard-metric-row">
                    <Col xs={24} sm={12} md={6}>
                      <Card className="metric-card">
                        <Statistic
                          title="Total Clientes"
                          value={clientMetrics.summary.totalClients}
                          prefix={<TeamOutlined />}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Card className="metric-card">
                        <Statistic
                          title="Clientes Activos"
                          value={clientMetrics.summary.activeClients}
                          prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                          valueStyle={{ color: '#52c41a' }}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Card className="metric-card">
                        <Statistic
                          title="Ingresos Promedio"
                          value={clientMetrics.summary.avgClientRevenue}
                          formatter={(value) => formatCurrency(value as string)}
                          prefix={<DollarOutlined />}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Card className="metric-card">
                        <Statistic
                          title="Balance Pendiente Total"
                          value={clientMetrics.summary.totalOutstandingBalance}
                          formatter={(value) => formatCurrency(value as string)}
                          prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
                          valueStyle={{ color: '#faad14' }}
                        />
                      </Card>
                    </Col>
                  </Row>
                )}

                {/* Risk Distribution */}
                {clientMetrics?.riskDistribution && (
                  <Row gutter={16} style={{ marginBottom: 24 }}>
                    <Col xs={24} md={8}>
                      <Card title="Distribución de Riesgo">
                        {clientMetrics.riskDistribution.map((riskLevel) => (
                          <div key={riskLevel.riskScore} style={{ marginBottom: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                              <span>
                                {riskLevel.riskScore === 'low' ? 'Bajo Riesgo' : 
                                 riskLevel.riskScore === 'medium' ? 'Riesgo Medio' : 'Alto Riesgo'}
                              </span>
                              <span>{riskLevel.count} clientes</span>
                            </div>
                            <Progress 
                              percent={(riskLevel.count / clientMetrics.summary.totalClients) * 100} 
                              strokeColor={
                                riskLevel.riskScore === 'low' ? '#52c41a' :
                                riskLevel.riskScore === 'medium' ? '#faad14' : '#ff4d4f'
                              }
                              showInfo={false}
                            />
                          </div>
                        ))}
                      </Card>
                    </Col>
                    <Col xs={24} md={16}>
                      <Card title="Mejores Clientes por Ingresos">
                        {clientMetrics.topRevenueClients && (
                          <Table
                            dataSource={clientMetrics.topRevenueClients}
                            rowKey="id"
                            pagination={false}
                            size="small"
                            columns={[
                              {
                                title: 'Cliente',
                                dataIndex: 'name',
                                key: 'name',
                                render: (text, record) => (
                                  <div>
                                    <div style={{ fontWeight: 'bold' }}>{text}</div>
                                    {record.businessName && (
                                      <div style={{ fontSize: '12px', color: '#666' }}>{record.businessName}</div>
                                    )}
                                  </div>
                                ),
                              },
                              {
                                title: 'Ingresos',
                                dataIndex: 'totalRevenue',
                                key: 'totalRevenue',
                                render: (value) => formatCurrency(value),
                              },
                              {
                                title: 'Facturas',
                                dataIndex: 'totalInvoices',
                                key: 'totalInvoices',
                              },
                              {
                                title: '% del Total',
                                dataIndex: 'revenuePercentage',
                                key: 'revenuePercentage',
                                render: (value) => {
                                const parsed = parseFloat(value);
                                return `${!isNaN(parsed) ? parsed.toFixed(1) : '0.0'}%`;
                              },
                              },
                              {
                                title: 'Estado',
                                dataIndex: 'status',
                                key: 'status',
                                render: (status) => (
                                  <Tag color={status === 'active' ? 'green' : 'orange'}>
                                    {status === 'active' ? 'Activo' : status}
                                  </Tag>
                                ),
                              },
                            ]}
                          />
                        )}
                      </Card>
                    </Col>
                  </Row>
                )}
              </div>
            ),
          },
          {
            key: 'cashflow',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LineChartOutlined />
                Flujo de Caja
              </span>
            ),
            children: (
              <div>
                {/* Current Cash Position */}
                {cashFlow && (
                  <Row gutter={16} className="dashboard-metric-row">
                    <Col xs={24} sm={12} md={6}>
                      <Card className="metric-card">
                        <Statistic
                          title="Posición Actual"
                          value={cashFlow.currentPosition?.currentCashBalance || '0'}
                          formatter={(value) => formatCurrency(value as string)}
                          prefix={<DollarOutlined />}
                          valueStyle={{ 
                            color: parseFloat(cashFlow.currentPosition?.currentCashBalance || '0') >= 0 ? '#52c41a' : '#ff4d4f' 
                          }}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Card className="metric-card">
                        <Statistic
                          title="Ingresos Esperados (30d)"
                          value={cashFlow.currentPosition?.expectedCollections || '0'}
                          formatter={(value) => formatCurrency(value as string)}
                          prefix={<ArrowUpOutlined style={{ color: '#52c41a' }} />}
                          valueStyle={{ color: '#52c41a' }}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Card className="metric-card">
                        <Statistic
                          title="Con Riesgo"
                          value={cashFlow.riskAnalysis?.highRisk?.amount || '0'}
                          formatter={(value) => formatCurrency(value as string)}
                          prefix={<WarningOutlined style={{ color: '#ff4d4f' }} />}
                          valueStyle={{ color: '#ff4d4f' }}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Card className="metric-card">
                        <Statistic
                          title="Tasa de Cobranza"
                          value={cashFlow.currentPosition?.collectionRate || '0%'}
                          prefix={<LineChartOutlined />}
                        />
                      </Card>
                    </Col>
                  </Row>
                )}

                {/* Weekly Projections Chart */}
                {cashFlow?.weeklyProjections && (
                  <Card title="Proyección Semanal de Flujo de Caja" style={{ marginBottom: 24 }}>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={cashFlow.weeklyProjections}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="weekStart" 
                          tickFormatter={(value) => dayjs(value).format('DD/MM')}
                        />
                        <YAxis tickFormatter={(value) => formatCurrency(value)} />
                        <RechartsTooltip 
                          formatter={(value: any, name: string) => [
                            formatCurrency(value), 
                            name === 'expectedReceipts' ? 'Ingresos Esperados' : 
                            name === 'projectedBalance' ? 'Balance Proyectado' : name
                          ]}
                          labelFormatter={(value) => `Semana del ${dayjs(value).format('DD/MM/YYYY')}`}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="expectedReceipts" 
                          stroke="#1890ff" 
                          strokeWidth={2}
                          name="expectedReceipts"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="projectedBalance" 
                          stroke="#52c41a" 
                          strokeWidth={2}
                          name="projectedBalance"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                )}

                {/* Risk Analysis */}
                {cashFlow?.riskAnalysis && (
                  <Card title="Análisis de Riesgo">
                    <Row gutter={16}>
                      <Col xs={24} md={8}>
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span>Bajo Riesgo ({cashFlow.riskAnalysis.lowRisk?.count || 0} facturas)</span>
                            <span>{formatCurrency(cashFlow.riskAnalysis.lowRisk?.amount || '0')}</span>
                          </div>
                          <Progress 
                            percent={75} 
                            strokeColor="#52c41a"
                            showInfo={false}
                          />
                        </div>
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span>Riesgo Medio ({cashFlow.riskAnalysis.mediumRisk?.count || 0} facturas)</span>
                            <span>{formatCurrency(cashFlow.riskAnalysis.mediumRisk?.amount || '0')}</span>
                          </div>
                          <Progress 
                            percent={50} 
                            strokeColor="#faad14"
                            showInfo={false}
                          />
                        </div>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span>Alto Riesgo ({cashFlow.riskAnalysis.highRisk?.count || 0} facturas)</span>
                            <span>{formatCurrency(cashFlow.riskAnalysis.highRisk?.amount || '0')}</span>
                          </div>
                          <Progress 
                            percent={25} 
                            strokeColor="#ff4d4f"
                            showInfo={false}
                          />
                        </div>
                      </Col>
                      <Col xs={24} md={16}>
                        <div style={{ padding: '20px', backgroundColor: '#fafafa', borderRadius: '6px' }}>
                          <h4>Recomendaciones</h4>
                          <ul style={{ marginBottom: 0 }}>
                            <li>Realizar seguimiento proactivo de facturas con riesgo medio-alto</li>
                            <li>Considerar descuentos por pago anticipado para mejorar el flujo</li>
                            <li>Revisar términos de pago con clientes de alto riesgo</li>
                            <li>Mantener reserva de efectivo para cubrir gastos operativos</li>
                          </ul>
                        </div>
                      </Col>
                    </Row>
                  </Card>
                )}
              </div>
            ),
          },
          {
            key: 'bank-accounts',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BankOutlined />
                Cuentas Bancarias
              </span>
            ),
            children: <BankAccounts />,
          },
        ]}
      />
    </div>
  );
};

export default Dashboard;