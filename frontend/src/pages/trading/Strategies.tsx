import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  Alert,
  Spin,
  Progress,
  Divider,
  TimePicker,
  message,
  Statistic
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  SettingOutlined,
  BarChartOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tradingService, type Strategy, type StrategyParams } from '../../services/tradingService';
import { formatCurrency, formatPercentage } from '../../utils/formatters';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

interface StrategyCardProps {
  strategy: Strategy;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onPause: (id: string) => void;
  onConfigure: (strategy: Strategy) => void;
  onBacktest: (id: string) => void;
}

const StrategyCard: React.FC<StrategyCardProps> = ({
  strategy,
  onStart,
  onStop,
  onPause,
  onConfigure,
  onBacktest
}) => {
  const getStatusColor = () => {
    switch (strategy.status) {
      case 'active': return 'success';
      case 'paused': return 'warning';
      case 'stopped': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = () => {
    switch (strategy.status) {
      case 'active': return <PlayCircleOutlined />;
      case 'paused': return <PauseCircleOutlined />;
      case 'stopped': return <StopOutlined />;
      default: return null;
    }
  };

  return (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text strong>{strategy.name}</Text>
          <Tag icon={getStatusIcon()} color={getStatusColor()}>
            {strategy.status.toUpperCase()}
          </Tag>
        </div>
      }
      actions={[
        strategy.status === 'stopped' ? (
          <Button
            key="start"
            type="text"
            icon={<PlayCircleOutlined />}
            onClick={() => onStart(strategy.id)}
            style={{ color: '#52c41a' }}
          >
            Iniciar
          </Button>
        ) : strategy.status === 'active' ? (
          <Button
            key="pause"
            type="text"
            icon={<PauseCircleOutlined />}
            onClick={() => onPause(strategy.id)}
            style={{ color: '#faad14' }}
          >
            Pausar
          </Button>
        ) : (
          <Button
            key="resume"
            type="text"
            icon={<PlayCircleOutlined />}
            onClick={() => onStart(strategy.id)}
            style={{ color: '#52c41a' }}
          >
            Reanudar
          </Button>
        ),
        strategy.status !== 'stopped' && (
          <Button
            key="stop"
            type="text"
            icon={<StopOutlined />}
            onClick={() => onStop(strategy.id)}
            danger
          >
            Detener
          </Button>
        ),
        <Button
          key="settings"
          type="text"
          icon={<SettingOutlined />}
          onClick={() => onConfigure(strategy)}
        />,
        <Button
          key="backtest"
          type="text"
          icon={<BarChartOutlined />}
          onClick={() => onBacktest(strategy.id)}
        />
      ].filter(Boolean)}
    >
      <Paragraph type="secondary" style={{ marginBottom: 16 }}>
        {strategy.description}
      </Paragraph>

      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Statistic
            title="Trades"
            value={strategy.performance?.totalTrades || 0}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title="Win Rate"
            value={(strategy.performance?.winRate || 0) * 100}
            suffix="%"
            precision={1}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title="P&L Total"
            value={strategy.performance?.totalPnL || 0}
            valueStyle={{ color: (strategy.performance?.totalPnL || 0) > 0 ? '#52c41a' : '#ff4d4f' }}
            formatter={(value) => formatCurrency(Number(value))}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title="Sharpe Ratio"
            value={strategy.performance?.sharpeRatio || 0}
            precision={2}
          />
        </Col>
      </Row>

      {strategy.performance?.maxDrawdown && (
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Max Drawdown</Text>
          <Progress
            percent={Math.abs(strategy.performance?.maxDrawdown || 0)}
            strokeColor="#ff4d4f"
            format={(percent) => formatPercentage(-(percent || 0))}
          />
        </div>
      )}
    </Card>
  );
};

interface ConfigureStrategyModalProps {
  open: boolean;
  strategy: Strategy | null;
  onClose: () => void;
  onSave: (strategyId: string, params: StrategyParams) => void;
}

const ConfigureStrategyModal: React.FC<ConfigureStrategyModalProps> = ({
  open,
  strategy,
  onClose,
  onSave
}) => {
  const [form] = Form.useForm();

  React.useEffect(() => {
    if (strategy) {
      form.setFieldsValue({
        ...strategy.parameters,
        scheduleTime: strategy.parameters.scheduleEnabled && strategy.parameters.startTime && strategy.parameters.endTime
          ? [dayjs(String(strategy.parameters.startTime), 'HH:mm'), dayjs(String(strategy.parameters.endTime), 'HH:mm')]
          : undefined
      });
    }
  }, [strategy, form]);

  const handleSave = () => {
    form.validateFields().then((values) => {
      if (strategy) {
        const params = { ...values };
        
        // Handle time range
        if (values.scheduleTime && values.scheduleTime.length === 2) {
          params.startTime = values.scheduleTime[0].format('HH:mm');
          params.endTime = values.scheduleTime[1].format('HH:mm');
        }
        delete params.scheduleTime;
        
        onSave(strategy.id, params);
      }
    });
  };

  if (!strategy) return null;

  return (
    <Modal
      title={`Configurar ${strategy.name}`}
      open={open}
      onOk={handleSave}
      onCancel={onClose}
      width={800}
    >
      <Form form={form} layout="vertical">
        <Title level={5}>Parámetros de la Estrategia</Title>
        
        <Row gutter={16}>
          {Object.entries(strategy.parameterSchema || {}).map(([key, schema]) => (
            <Col span={12} key={key}>
              {schema.type === 'boolean' ? (
                <Form.Item
                  name={key}
                  label={schema.label}
                  valuePropName="checked"
                  tooltip={schema.description}
                >
                  <Switch />
                </Form.Item>
              ) : schema.type === 'number' ? (
                <Form.Item
                  name={key}
                  label={schema.label}
                  tooltip={schema.description}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    min={schema.min}
                    max={schema.max}
                    step={schema.step}
                  />
                </Form.Item>
              ) : (
                <Form.Item
                  name={key}
                  label={schema.label}
                  tooltip={schema.description}
                >
                  <Input />
                </Form.Item>
              )}
            </Col>
          ))}
        </Row>

        <Divider />

        <Title level={5}>Configuración de Riesgo</Title>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="maxLossPerTrade"
              label="Max Pérdida por Trade (%)"
              initialValue={1}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0.1}
                max={5}
                step={0.1}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="maxExposure"
              label="Max Exposición (%)"
              initialValue={10}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={1}
                max={100}
                step={1}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="defaultStopLoss"
              label="Stop Loss por Defecto (%)"
              initialValue={2}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0.1}
                max={10}
                step={0.1}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="defaultTakeProfit"
              label="Take Profit por Defecto (%)"
              initialValue={3}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0.1}
                max={50}
                step={0.1}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider />

        <Title level={5}>Horario de Trading</Title>
        <Form.Item
          name="scheduleEnabled"
          valuePropName="checked"
          label="Habilitar horario específico"
        >
          <Switch />
        </Form.Item>
        
        <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.scheduleEnabled !== currentValues.scheduleEnabled}>
          {({ getFieldValue }) =>
            getFieldValue('scheduleEnabled') && (
              <Form.Item
                name="scheduleTime"
                label="Horario de Trading (UTC)"
              >
                <TimePicker.RangePicker
                  format="HH:mm"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            )
          }
        </Form.Item>
      </Form>
    </Modal>
  );
};

export const Strategies: React.FC = () => {
  const [configureModal, setConfigureModal] = useState<{
    open: boolean;
    strategy: Strategy | null;
  }>({ open: false, strategy: null });

  const queryClient = useQueryClient();

  const { data: strategies, isLoading, error } = useQuery({
    queryKey: ['strategies'],
    queryFn: () => tradingService.getStrategies(),
    refetchInterval: 10000,
  });

  const startStrategyMutation = useMutation({
    mutationFn: (strategyId: string) => tradingService.startStrategy(strategyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
      message.success('Estrategia iniciada');
    },
    onError: () => {
      message.error('Error al iniciar la estrategia');
    },
  });

  const stopStrategyMutation = useMutation({
    mutationFn: (strategyId: string) => tradingService.stopStrategy(strategyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
      message.success('Estrategia detenida');
    },
    onError: () => {
      message.error('Error al detener la estrategia');
    },
  });

  const pauseStrategyMutation = useMutation({
    mutationFn: (strategyId: string) => tradingService.pauseStrategy(strategyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
      message.success('Estrategia pausada');
    },
    onError: () => {
      message.error('Error al pausar la estrategia');
    },
  });

  const updateStrategyMutation = useMutation({
    mutationFn: ({ strategyId, params }: { strategyId: string; params: StrategyParams }) =>
      tradingService.updateStrategyParams(strategyId, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
      setConfigureModal({ open: false, strategy: null });
      message.success('Configuración actualizada');
    },
    onError: () => {
      message.error('Error al actualizar la configuración');
    },
  });

  const handleBacktest = (strategyId: string) => {
    // Navigate to backtest page
    window.location.href = `/trading/backtest?strategy=${strategyId}`;
  };

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
        message="Error al cargar las estrategias"
        style={{ margin: 16 }}
      />
    );
  }

  const activeStrategies = strategies?.filter(s => s.status === 'active').length || 0;
  const totalPnL = strategies?.reduce((sum, s) => sum + (s.performance?.totalPnL || 0), 0) || 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2}>Gestión de Estrategias</Title>
        <Space size="large">
          <Tag icon={<PlayCircleOutlined />} color="success">
            {activeStrategies} Activas
          </Tag>
          <Statistic
            title="P&L Total"
            value={totalPnL}
            valueStyle={{ color: totalPnL > 0 ? '#52c41a' : '#ff4d4f' }}
            formatter={(value) => formatCurrency(Number(value))}
          />
        </Space>
      </div>

      <Alert
        message={
          <Space>
            <InfoCircleOutlined />
            <span>
              Las estrategias se ejecutan automáticamente según sus parámetros configurados.
              Puedes pausar o detener una estrategia en cualquier momento.
              Las posiciones abiertas no se cerrarán automáticamente al detener una estrategia.
            </span>
          </Space>
        }
        type="info"
        showIcon={false}
        style={{ marginBottom: 24 }}
      />

      <Row gutter={[16, 16]}>
        {strategies?.map((strategy) => (
          <Col xs={24} md={12} lg={8} key={strategy.id}>
            <StrategyCard
              strategy={strategy}
              onStart={startStrategyMutation.mutate}
              onStop={stopStrategyMutation.mutate}
              onPause={pauseStrategyMutation.mutate}
              onConfigure={(s) => setConfigureModal({ open: true, strategy: s })}
              onBacktest={handleBacktest}
            />
          </Col>
        ))}
      </Row>

      <ConfigureStrategyModal
        open={configureModal.open}
        strategy={configureModal.strategy}
        onClose={() => setConfigureModal({ open: false, strategy: null })}
        onSave={(strategyId, params) => {
          updateStrategyMutation.mutate({ strategyId, params });
        }}
      />
    </div>
  );
};

export default Strategies;