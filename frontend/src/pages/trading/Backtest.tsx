import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Form,
  Select,
  InputNumber,
  DatePicker,
  Tag,
  Spin,
  Alert,
  Tabs,
  Table,
  Statistic,
  Space,
  Typography,
  Progress,
  Empty
} from 'antd';
import {
  PlayCircleOutlined,
  DownloadOutlined,
  RiseOutlined,
  FallOutlined,
  LineChartOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tradingService } from '../../services/tradingService';
import type { BacktestRequest, BacktestResult } from '../../services/tradingService';
import { formatCurrency, formatPercentage, formatDate } from '../../utils/formatters';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

export default function Backtest() {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('1');
  const [selectedStrategy, setSelectedStrategy] = useState<string>('');
  const queryClient = useQueryClient();

  // Queries
  const { data: strategies } = useQuery({
    queryKey: ['strategies'],
    queryFn: tradingService.getStrategies
  });

  const { data: backtestResults } = useQuery({
    queryKey: ['backtest-results'],
    queryFn: tradingService.getBacktestResults
  });

  // Mutations
  const runBacktestMutation = useMutation({
    mutationFn: (params: BacktestRequest) => tradingService.runBacktest(params),
    onSuccess: () => {
      // Refresh results
      queryClient.invalidateQueries({ queryKey: ['backtest-results'] });
    }
  });

  const handleRunBacktest = (values: any) => {
    const [startDate, endDate] = values.dateRange;
    const backtestParams: BacktestRequest = {
      strategyId: values.strategy,
      startDate: startDate.format('YYYY-MM-DD'),
      endDate: endDate.format('YYYY-MM-DD'),
      symbols: values.symbols,
      initialCapital: values.initialCapital
    };
    runBacktestMutation.mutate(backtestParams);
  };

  const renderPerformanceMetrics = (result: BacktestResult) => {
    if (!result) return null;

    const metrics = [
      {
        title: 'Total Return',
        value: formatPercentage(result.metrics.totalReturn),
        color: result.metrics.totalReturn >= 0 ? '#3f8600' : '#cf1322'
      },
      {
        title: 'Sharpe Ratio',
        value: result.metrics.sharpeRatio.toFixed(2),
        color: result.metrics.sharpeRatio >= 1 ? '#3f8600' : '#fa8c16'
      },
      {
        title: 'Max Drawdown',
        value: formatPercentage(result.metrics.maxDrawdown),
        color: '#cf1322'
      },
      {
        title: 'Win Rate',
        value: formatPercentage(result.metrics.winRate),
        color: result.metrics.winRate >= 0.5 ? '#3f8600' : '#cf1322'
      }
    ];

    return (
      <Row gutter={16}>
        {metrics.map((metric, index) => (
          <Col span={6} key={index}>
            <Card>
              <Statistic
                title={metric.title}
                value={metric.value}
                valueStyle={{ color: metric.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => formatDate(date)
    },
    {
      title: 'Symbol',
      dataIndex: 'symbol',
      key: 'symbol'
    },
    {
      title: 'Side',
      dataIndex: 'side',
      key: 'side',
      render: (side: string) => (
        <Tag color={side === 'buy' ? 'green' : 'red'}>
          {side.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Entry Price',
      dataIndex: 'entryPrice',
      key: 'entryPrice',
      render: (price: number) => formatCurrency(price)
    },
    {
      title: 'Exit Price',
      dataIndex: 'exitPrice',
      key: 'exitPrice',
      render: (price: number) => formatCurrency(price)
    },
    {
      title: 'P&L',
      dataIndex: 'pnl',
      key: 'pnl',
      render: (pnl: number) => (
        <Text type={pnl >= 0 ? 'success' : 'danger'}>
          {formatCurrency(pnl)}
        </Text>
      )
    },
    {
      title: 'Return',
      dataIndex: 'returnPct',
      key: 'returnPct',
      render: (pct: number) => (
        <Text type={pct >= 0 ? 'success' : 'danger'}>
          {formatPercentage(pct)}
        </Text>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <BarChartOutlined /> Strategy Backtesting
      </Title>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="Backtest Configuration">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleRunBacktest}
              initialValues={{
                initialCapital: 10000,
                symbols: ['BTC/USDT', 'ETH/USDT']
              }}
            >
              <Row gutter={16}>
                <Col span={6}>
                  <Form.Item
                    name="strategy"
                    label="Strategy"
                    rules={[{ required: true, message: 'Please select a strategy' }]}
                  >
                    <Select
                      placeholder="Select strategy"
                      onChange={setSelectedStrategy}
                    >
                      {strategies?.map((strategy: any) => (
                        <Option key={strategy.id} value={strategy.id}>
                          {strategy.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>

                <Col span={6}>
                  <Form.Item
                    name="dateRange"
                    label="Date Range"
                    rules={[{ required: true, message: 'Please select date range' }]}
                  >
                    <RangePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>

                <Col span={6}>
                  <Form.Item
                    name="symbols"
                    label="Symbols"
                    rules={[{ required: true, message: 'Please select symbols' }]}
                  >
                    <Select
                      mode="multiple"
                      placeholder="Select symbols"
                    >
                      <Option value="BTC/USDT">BTC/USDT</Option>
                      <Option value="ETH/USDT">ETH/USDT</Option>
                      <Option value="BNB/USDT">BNB/USDT</Option>
                      <Option value="SOL/USDT">SOL/USDT</Option>
                    </Select>
                  </Form.Item>
                </Col>

                <Col span={6}>
                  <Form.Item
                    name="initialCapital"
                    label="Initial Capital"
                    rules={[{ required: true, message: 'Please enter initial capital' }]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={value => value!.replace(/\$\s?|(,*)/g, '')}
                      min={1000}
                      step={1000}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<PlayCircleOutlined />}
                  loading={runBacktestMutation.isPending}
                  size="large"
                >
                  Run Backtest
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {runBacktestMutation.data && (
          <Col span={24}>
            <Card title="Backtest Results">
              <Tabs activeKey={activeTab} onChange={setActiveTab}>
                <TabPane tab="Overview" key="1">
                  <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    {renderPerformanceMetrics(runBacktestMutation.data)}
                    
                    <Card title="Equity Curve">
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={runBacktestMutation.data.equityCurve}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#1890ff"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </Card>
                  </Space>
                </TabPane>

                <TabPane tab="Trades" key="2">
                  <Table
                    columns={columns}
                    dataSource={runBacktestMutation.data.trades}
                    rowKey="id"
                    pagination={{ pageSize: 20 }}
                  />
                </TabPane>

                <TabPane tab="Statistics" key="3">
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <Card title="Trade Statistics">
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Statistic
                            title="Total Trades"
                            value={runBacktestMutation.data.metrics.totalTrades}
                          />
                          <Statistic
                            title="Winning Trades"
                            value={runBacktestMutation.data.metrics.winningTrades}
                            suffix={`/ ${runBacktestMutation.data.metrics.totalTrades}`}
                          />
                          <Statistic
                            title="Average Win"
                            value={formatCurrency(runBacktestMutation.data.metrics.avgWin)}
                            valueStyle={{ color: '#3f8600' }}
                          />
                          <Statistic
                            title="Average Loss"
                            value={formatCurrency(runBacktestMutation.data.metrics.avgLoss)}
                            valueStyle={{ color: '#cf1322' }}
                          />
                        </Space>
                      </Card>
                    </Col>

                    <Col span={12}>
                      <Card title="Risk Metrics">
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Statistic
                            title="Profit Factor"
                            value={runBacktestMutation.data.metrics.profitFactor.toFixed(2)}
                          />
                          <Statistic
                            title="Recovery Factor"
                            value={runBacktestMutation.data.metrics.recoveryFactor.toFixed(2)}
                          />
                          <Statistic
                            title="Expectancy"
                            value={formatCurrency(runBacktestMutation.data.metrics.expectancy)}
                          />
                          <Statistic
                            title="Max Consecutive Losses"
                            value={runBacktestMutation.data.metrics.maxConsecutiveLosses}
                          />
                        </Space>
                      </Card>
                    </Col>
                  </Row>
                </TabPane>
              </Tabs>
            </Card>
          </Col>
        )}

        <Col span={24}>
          <Card title="Previous Backtests">
            {backtestResults && backtestResults.length > 0 ? (
              <Table
                columns={[
                  {
                    title: 'Strategy',
                    dataIndex: 'strategyName',
                    key: 'strategyName'
                  },
                  {
                    title: 'Period',
                    key: 'period',
                    render: (_, record) => `${record.startDate} - ${record.endDate}`
                  },
                  {
                    title: 'Return',
                    dataIndex: ['metrics', 'totalReturn'],
                    key: 'return',
                    render: (value: number) => (
                      <Text type={value >= 0 ? 'success' : 'danger'}>
                        {formatPercentage(value)}
                      </Text>
                    )
                  },
                  {
                    title: 'Sharpe',
                    dataIndex: ['metrics', 'sharpeRatio'],
                    key: 'sharpe',
                    render: (value: number) => value.toFixed(2)
                  },
                  {
                    title: 'Actions',
                    key: 'actions',
                    render: () => (
                      <Button
                        type="link"
                        icon={<DownloadOutlined />}
                        size="small"
                      >
                        Export
                      </Button>
                    )
                  }
                ]}
                dataSource={backtestResults}
                rowKey="id"
              />
            ) : (
              <Empty description="No backtest results yet" />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}