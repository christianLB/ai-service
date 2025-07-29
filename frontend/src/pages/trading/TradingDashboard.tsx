import React, { useEffect, useState } from 'react';
import {
  Card,
  Col,
  Row,
  Typography,
  Spin,
  Alert,
  Tag,
  Button,
  Space,
  Statistic,
  Tooltip,
  Switch,
  Badge,
  Divider,
  Progress
} from 'antd';
import {
  RiseOutlined,
  FallOutlined,
  StopOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  WarningOutlined,
  DollarOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { tradingService } from '../../services/tradingService';
import type { DashboardData } from '../../services/tradingService';
import { formatCurrency, formatPercentage } from '../../utils/formatters';

const { Title, Text } = Typography;

export const TradingDashboard: React.FC = () => {
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: dashboard, isLoading, error, refetch } = useQuery<DashboardData>({
    queryKey: ['trading-dashboard'],
    queryFn: () => tradingService.getDashboard(),
    refetchInterval: autoRefresh ? 5000 : false,
  });

  useEffect(() => {
    const ws = tradingService.connectWebSocket();
    
    ws.subscribe(['dashboard']);
    
    ws.on('dashboard_update', () => {
      // Handle real-time updates
      refetch();
    });

    return () => {
      ws.disconnect();
    };
  }, [refetch]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        type="error"
        message="Error al cargar el dashboard de trading"
        style={{ margin: 16 }}
      />
    );
  }

  const getPnLColor = (value: number) => {
    if (value > 0) return '#52c41a';
    if (value < 0) return '#ff4d4f';
    return '#8c8c8c';
  };

  const getPnLIcon = (value: number) => {
    if (value > 0) return <RiseOutlined />;
    if (value < 0) return <FallOutlined />;
    return null;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2}>Trading Dashboard</Title>
        <Space>
          <Button
            type="primary"
            danger
            icon={<StopOutlined />}
            onClick={() => tradingService.emergencyStop()}
            size="large"
          >
            EMERGENCY STOP
          </Button>
          <Tooltip title="Actualizar">
            <Button icon={<ReloadOutlined />} onClick={() => refetch()} />
          </Tooltip>
        </Space>
      </div>

      {/* Alerts */}
      {dashboard?.alerts && dashboard.alerts.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          {dashboard.alerts.map((alert) => (
            <Alert
              key={alert.id}
              type={alert.type}
              message={alert.message}
              icon={alert.type === 'warning' ? <WarningOutlined /> : undefined}
              style={{ marginBottom: 8 }}
              showIcon
            />
          ))}
        </div>
      )}

      {/* Portfolio Overview */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={6}>
          <Card>
            <Statistic
              title="Valor Total Portfolio"
              value={dashboard?.portfolio.totalValue || 0}
              prefix={<DollarOutlined />}
              formatter={(value) => formatCurrency(Number(value))}
            />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic
              title="P&L Diario"
              value={dashboard?.portfolio.dailyPnL || 0}
              prefix={getPnLIcon(dashboard?.portfolio.dailyPnL || 0)}
              valueStyle={{ color: getPnLColor(dashboard?.portfolio.dailyPnL || 0) }}
              formatter={(value) => formatCurrency(Number(value))}
              suffix={
                <Text type="secondary" style={{ fontSize: 14 }}>
                  ({formatPercentage((dashboard?.portfolio.dailyPnL || 0) / (dashboard?.portfolio.totalValue || 1))})
                </Text>
              }
            />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic
              title="P&L Semanal"
              value={dashboard?.portfolio.weeklyPnL || 0}
              prefix={getPnLIcon(dashboard?.portfolio.weeklyPnL || 0)}
              valueStyle={{ color: getPnLColor(dashboard?.portfolio.weeklyPnL || 0) }}
              formatter={(value) => formatCurrency(Number(value))}
            />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic
              title="P&L Mensual"
              value={dashboard?.portfolio.monthlyPnL || 0}
              prefix={getPnLIcon(dashboard?.portfolio.monthlyPnL || 0)}
              valueStyle={{ color: getPnLColor(dashboard?.portfolio.monthlyPnL || 0) }}
              formatter={(value) => formatCurrency(Number(value))}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Content Grid */}
      <Row gutter={[16, 16]}>
        {/* Positions Summary */}
        <Col xs={24} md={12}>
          <Card title="Resumen de Posiciones">
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Statistic
                  title="Posiciones Abiertas"
                  value={dashboard?.positions.open || 0}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="En Ganancia"
                  value={dashboard?.positions.profitable || 0}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="En Pérdida"
                  value={dashboard?.positions.losing || 0}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Col>
            </Row>
            <Divider />
            <Statistic
              title="P&L Total Abierto"
              value={dashboard?.positions.totalPnL || 0}
              prefix={getPnLIcon(dashboard?.positions.totalPnL || 0)}
              valueStyle={{ color: getPnLColor(dashboard?.positions.totalPnL || 0) }}
              formatter={(value) => formatCurrency(Number(value))}
            />
          </Card>
        </Col>

        {/* Strategy Status */}
        <Col xs={24} md={12}>
          <Card title="Estado de Estrategias">
            <Space size="middle" style={{ marginBottom: 16 }}>
              <Tag icon={<PlayCircleOutlined />} color="success">
                {dashboard?.strategies.active || 0} Activas
              </Tag>
              <Tag icon={<PauseCircleOutlined />} color="warning">
                {dashboard?.strategies.paused || 0} Pausadas
              </Tag>
              <Tag icon={<StopOutlined />} color="default">
                {dashboard?.strategies.stopped || 0} Detenidas
              </Tag>
            </Space>
            <Divider />
            <Title level={5}>Rendimiento por Estrategia</Title>
            {dashboard?.strategies.performance && 
              Object.entries(dashboard.strategies.performance).map(([strategy, pnl]) => (
                <div key={strategy} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text>{strategy}</Text>
                    <Text style={{ color: getPnLColor(Number(pnl)) }}>
                      {formatCurrency(Number(pnl))}
                    </Text>
                  </div>
                  <Progress
                    percent={Math.abs(Number(pnl)) / 1000 * 100}
                    showInfo={false}
                    strokeColor={getPnLColor(Number(pnl))}
                    size="small"
                  />
                </div>
              ))
            }
          </Card>
        </Col>

        {/* Market Overview */}
        <Col xs={24}>
          <Card title="Vista General del Mercado">
            <Row gutter={[16, 16]}>
              <Col xs={12} md={6}>
                <Statistic
                  title="BTC/USDT"
                  value={dashboard?.marketOverview.btcPrice || 0}
                  prefix={<DollarOutlined />}
                  formatter={(value) => formatCurrency(Number(value))}
                />
                <Space align="center" style={{ marginTop: 8 }}>
                  {(dashboard?.marketOverview.btcChange24h || 0) > 0 ? 
                    <RiseOutlined style={{ color: '#52c41a' }} /> : 
                    <FallOutlined style={{ color: '#ff4d4f' }} />
                  }
                  <Text style={{ color: getPnLColor(dashboard?.marketOverview.btcChange24h || 0) }}>
                    {formatPercentage(dashboard?.marketOverview.btcChange24h || 0)}
                  </Text>
                </Space>
              </Col>
              <Col xs={12} md={6}>
                <Statistic
                  title="Market Cap Total"
                  value={`${((dashboard?.marketOverview.marketCap || 0) / 1e9).toFixed(1)}B`}
                  prefix="$"
                />
              </Col>
              <Col xs={12} md={6}>
                <div>
                  <Text type="secondary">Fear & Greed Index</Text>
                  <div style={{ marginTop: 8 }}>
                    <Badge
                      count={dashboard?.marketOverview.fearGreedIndex || 0}
                      style={{ backgroundColor: getFearGreedColor(dashboard?.marketOverview.fearGreedIndex || 0) }}
                      showZero
                    />
                    <Text style={{ marginLeft: 12 }}>
                      {getFearGreedLabel(dashboard?.marketOverview.fearGreedIndex || 0)}
                    </Text>
                  </div>
                  <Progress
                    percent={dashboard?.marketOverview.fearGreedIndex || 0}
                    strokeColor={getFearGreedColor(dashboard?.marketOverview.fearGreedIndex || 0)}
                    showInfo={false}
                    style={{ marginTop: 8 }}
                  />
                </div>
              </Col>
              <Col xs={12} md={6}>
                <div>
                  <Text type="secondary">Auto-Refresh</Text>
                  <div style={{ marginTop: 8 }}>
                    <Switch
                      checked={autoRefresh}
                      onChange={setAutoRefresh}
                      checkedChildren="ON"
                      unCheckedChildren="OFF"
                    />
                  </div>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

function getFearGreedLabel(value: number): string {
  if (value < 20) return 'Extreme Fear';
  if (value < 40) return 'Fear';
  if (value < 60) return 'Neutral';
  if (value < 80) return 'Greed';
  return 'Extreme Greed';
}

function getFearGreedColor(value: number): string {
  if (value < 20) return '#ff4d4f';
  if (value < 40) return '#ffa940';
  if (value < 60) return '#fadb14';
  if (value < 80) return '#95de64';
  return '#52c41a';
}

export default TradingDashboard;