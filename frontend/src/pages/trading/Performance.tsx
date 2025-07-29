import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Select,
  Radio,
  Button,
  Space,
  Typography,
  Statistic
} from 'antd';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  RiseOutlined,
  FallOutlined,
  BarChartOutlined,
  DownloadOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { tradingService } from '../../services/tradingService';
import type { PerformanceMetrics } from '../../services/tradingService';
import { formatCurrency, formatPercentage } from '../../utils/formatters';

const { Title, Text } = Typography;
const { Option } = Select;

type TimeRange = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';


export default function Performance() {
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');
  const [selectedStrategy, setSelectedStrategy] = useState<string>('all');
  const [chartType, setChartType] = useState<'line' | 'area'>('area');

  // Queries
  const { data: strategies } = useQuery({
    queryKey: ['strategies'],
    queryFn: tradingService.getStrategies
  });

  const { data: performanceMetrics } = useQuery<PerformanceMetrics>({
    queryKey: ['performance', timeRange, selectedStrategy],
    queryFn: () => tradingService.getPerformanceMetrics(),
    refetchInterval: 60000 // Refresh every minute
  });

  const colors = ['#52c41a', '#ff4d4f', '#1890ff', '#faad14', '#722ed1', '#eb2f96'];

  const renderMetricCard = (title: string, value: string | number, icon: React.ReactNode, color?: string) => (
    <Card>
      <Statistic
        title={title}
        value={value}
        prefix={icon}
        valueStyle={{ color }}
      />
    </Card>
  );

  const renderPerformanceOverview = () => {
    if (!performanceMetrics) return null;

    const isPositive = performanceMetrics.totalReturn >= 0;

    return (
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          {renderMetricCard(
            'Total Return',
            formatCurrency(performanceMetrics.totalReturn),
            isPositive ? <RiseOutlined /> : <FallOutlined />,
            isPositive ? '#52c41a' : '#ff4d4f'
          )}
        </Col>
        <Col xs={24} sm={12} md={6}>
          {renderMetricCard(
            'Return %',
            formatPercentage(performanceMetrics.totalReturnPercent),
            <BarChartOutlined />,
            isPositive ? '#52c41a' : '#ff4d4f'
          )}
        </Col>
        <Col xs={24} sm={12} md={6}>
          {renderMetricCard(
            'Sharpe Ratio',
            performanceMetrics.sharpeRatio.toFixed(2),
            <InfoCircleOutlined />,
            performanceMetrics.sharpeRatio >= 1 ? '#52c41a' : '#faad14'
          )}
        </Col>
        <Col xs={24} sm={12} md={6}>
          {renderMetricCard(
            'Max Drawdown',
            formatPercentage(performanceMetrics.maxDrawdown),
            <FallOutlined />,
            '#ff4d4f'
          )}
        </Col>
      </Row>
    );
  };

  const renderTradeStatistics = () => {
    if (!performanceMetrics) return null;

    const data = [
      { label: 'Total Trades', value: performanceMetrics.totalTrades },
      { label: 'Winning Trades', value: performanceMetrics.winningTrades, color: '#52c41a' },
      { label: 'Losing Trades', value: performanceMetrics.losingTrades, color: '#ff4d4f' },
      { label: 'Win Rate', value: formatPercentage(performanceMetrics.winRate) },
      { label: 'Profit Factor', value: performanceMetrics.profitFactor.toFixed(2) },
      { label: 'Expectancy', value: formatCurrency(performanceMetrics.expectancy) },
      { label: 'Average Win', value: formatCurrency(performanceMetrics.avgWin), color: '#52c41a' },
      { label: 'Average Loss', value: formatCurrency(performanceMetrics.avgLoss), color: '#ff4d4f' }
    ];

    return (
      <Card title="Trade Statistics">
        <Row gutter={[16, 16]}>
          {data.map((item, index) => (
            <Col span={12} key={index}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <Text type="secondary">{item.label}</Text>
                <Text strong style={{ color: item.color }}>{item.value}</Text>
              </div>
            </Col>
          ))}
        </Row>
      </Card>
    );
  };

  const renderEquityCurve = () => {
    if (!performanceMetrics?.equity) return null;

    return (
      <Card 
        title="Equity Curve"
        extra={
          <Radio.Group value={chartType} onChange={(e) => setChartType(e.target.value)} size="small">
            <Radio.Button value="line">Line</Radio.Button>
            <Radio.Button value="area">Area</Radio.Button>
          </Radio.Group>
        }
      >
        <ResponsiveContainer width="100%" height={400}>
          {chartType === 'area' ? (
            <AreaChart data={performanceMetrics.equity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
              <Area type="monotone" dataKey="value" stroke="#1890ff" fill="#1890ff" fillOpacity={0.3} />
            </AreaChart>
          ) : (
            <LineChart data={performanceMetrics.equity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
              <Line type="monotone" dataKey="value" stroke="#1890ff" strokeWidth={2} dot={false} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </Card>
    );
  };

  const renderMonthlyReturns = () => {
    if (!performanceMetrics?.monthlyReturns) return null;

    return (
      <Card title="Monthly Returns">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={performanceMetrics.monthlyReturns}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <RechartsTooltip formatter={(value: number) => formatPercentage(value)} />
            <Bar dataKey="return">
              {performanceMetrics.monthlyReturns.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.return >= 0 ? '#52c41a' : '#ff4d4f'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    );
  };

  const renderTradeDistribution = () => {
    if (!performanceMetrics?.tradeDistribution) return null;

    return (
      <Card title="P&L Distribution">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={performanceMetrics.tradeDistribution}
              dataKey="count"
              nameKey="range"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label
            >
              {performanceMetrics.tradeDistribution.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <RechartsTooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2}>
            <BarChartOutlined /> Trading Performance
          </Title>
        </Col>
        <Col>
          <Space>
            <Select
              value={selectedStrategy}
              onChange={setSelectedStrategy}
              style={{ width: 200 }}
            >
              <Option value="all">All Strategies</Option>
              {strategies?.map((strategy) => (
                <Option key={strategy.id} value={strategy.id}>
                  {strategy.name}
                </Option>
              ))}
            </Select>
            <Radio.Group value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
              <Radio.Button value="1D">1D</Radio.Button>
              <Radio.Button value="1W">1W</Radio.Button>
              <Radio.Button value="1M">1M</Radio.Button>
              <Radio.Button value="3M">3M</Radio.Button>
              <Radio.Button value="6M">6M</Radio.Button>
              <Radio.Button value="1Y">1Y</Radio.Button>
              <Radio.Button value="ALL">ALL</Radio.Button>
            </Radio.Group>
            <Button icon={<DownloadOutlined />}>Export</Button>
          </Space>
        </Col>
      </Row>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {renderPerformanceOverview()}

        <Row gutter={[16, 16]}>
          <Col span={24}>
            {renderEquityCurve()}
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            {renderTradeStatistics()}
          </Col>
          <Col xs={24} lg={12}>
            {renderTradeDistribution()}
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col span={24}>
            {renderMonthlyReturns()}
          </Col>
        </Row>
      </Space>
    </div>
  );
}