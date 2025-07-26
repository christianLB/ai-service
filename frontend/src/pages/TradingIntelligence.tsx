import React, { useState } from 'react';
import { 
  Typography, 
  Row, 
  Col, 
  Card, 
  Button, 
  Space, 
  Tag,
  Tabs,
  List,
  Progress,
  Divider,
  Alert,
  Statistic,
  Badge,
  Timeline,
  Table,
  Modal,
  notification
} from 'antd';
import {
  LineChartOutlined,
  AimOutlined,
  DollarOutlined,
  SafetyOutlined,
  ThunderboltOutlined,
  GlobalOutlined,
  SwapOutlined,
  RiseOutlined,
  FundOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  TrophyOutlined,
  SettingOutlined,
  RocketOutlined,
  DashboardOutlined,
  ExperimentOutlined,
  LockOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import CountUp from 'react-countup';
import './TradingIntelligence.css';

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;

const TradingIntelligence: React.FC = () => {
  const [activeTab, setActiveTab] = useState('1');
  const [showArbitrageModal, setShowArbitrageModal] = useState(false);

  // Datos de ejemplo para gráficos
  const performanceData = [
    { month: 'Ene', profit: 450 },
    { month: 'Feb', profit: 680 },
    { month: 'Mar', profit: 890 },
    { month: 'Abr', profit: 1250 },
    { month: 'May', profit: 1580 },
    { month: 'Jun', profit: 2100 }
  ];

  const exchangeDistribution = [
    { name: 'Binance', value: 40, color: '#F0B90B' },
    { name: 'Coinbase', value: 30, color: '#0052FF' },
    { name: 'Alpaca', value: 20, color: '#3FB984' },
    { name: 'Kraken', value: 10, color: '#5741D9' }
  ];

  const features = [
    {
      icon: <AimOutlined />,
      title: 'Trading Brain con IA',
      description: 'Claude AI analiza mercados y toma decisiones inteligentes',
      color: '#722ed1'
    },
    {
      icon: <GlobalOutlined />,
      title: 'Multi-Exchange',
      description: 'Opera en Binance, Coinbase, Alpaca y más exchanges',
      color: '#1890ff'
    },
    {
      icon: <SwapOutlined />,
      title: 'Arbitraje Automático',
      description: 'Detecta y ejecuta oportunidades de arbitraje 24/7',
      color: '#52c41a'
    },
    {
      icon: <SafetyOutlined />,
      title: 'Gestión de Riesgo',
      description: 'Límites estrictos y stop-loss automático',
      color: '#fa8c16'
    },
    {
      icon: <BarChartOutlined />,
      title: 'Backtesting',
      description: 'Prueba estrategias con datos históricos',
      color: '#13c2c2'
    },
    {
      icon: <DashboardOutlined />,
      title: 'Dashboard en Tiempo Real',
      description: 'Monitorea posiciones y rendimiento al instante',
      color: '#eb2f96'
    }
  ];

  const strategies = [
    {
      name: 'Arbitraje Cross-Exchange',
      icon: <SwapOutlined />,
      profit: '$500-$1,000/mes',
      risk: 'Bajo',
      description: 'Aprovecha diferencias de precio entre exchanges',
      features: [
        'Detección automática de oportunidades',
        'Ejecución en milisegundos',
        'Cálculo de fees incluido',
        'Monitoreo 24/7'
      ]
    },
    {
      name: 'Grid Trading',
      icon: <FundOutlined />,
      profit: '$300-$700/mes',
      risk: 'Medio',
      description: 'Coloca órdenes en niveles de precio predefinidos',
      features: [
        'Ideal para mercados laterales',
        'Toma de ganancias automática',
        'Ajuste dinámico de grids',
        'Control de exposición'
      ]
    },
    {
      name: 'DCA Inteligente',
      icon: <LineChartOutlined />,
      profit: '15-25% anual',
      risk: 'Bajo',
      description: 'Compra sistemática con análisis de mercado',
      features: [
        'Reduce volatilidad',
        'Acumulación a largo plazo',
        'Ajuste por condiciones',
        'Stop-loss opcional'
      ]
    },
    {
      name: 'AI Momentum',
      icon: <RocketOutlined />,
      profit: '$800-$1,500/mes',
      risk: 'Alto',
      description: 'IA detecta y sigue tendencias fuertes',
      features: [
        'Análisis con GPT-4',
        'Indicadores técnicos',
        'Sentiment analysis',
        'Trailing stop dinámico'
      ]
    }
  ];

  const quickStartSteps = [
    {
      title: 'Configura Exchanges',
      description: 'Agrega tus API keys de forma segura',
      code: `curl -X POST http://localhost:3001/api/connectors/binance/configure \\
  -H "Authorization: Bearer TOKEN" \\
  -d '{"apiKey": "...", "apiSecret": "...", "testnet": true}'`
    },
    {
      title: 'Despliega Bot de Arbitraje',
      description: 'Inicia el bot con configuración básica',
      code: `curl -X POST http://localhost:3001/api/arbitrage/deploy \\
  -H "Authorization: Bearer TOKEN" \\
  -d '{"exchanges": ["binance", "coinbase"], "maxPosition": 1000}'`
    },
    {
      title: 'Monitorea Ganancias',
      description: 'Revisa el rendimiento en tiempo real',
      code: `curl http://localhost:3001/api/arbitrage/profits?period=24h \\
  -H "Authorization: Bearer TOKEN"`
    }
  ];

  const riskManagementFeatures = [
    { feature: 'Límite por posición', value: 'Max 10% del capital' },
    { feature: 'Stop-loss obligatorio', value: '3-5% por trade' },
    { feature: 'Diversificación', value: 'Max 3 posiciones por activo' },
    { feature: 'Daily loss limit', value: 'Max 2% diario' },
    { feature: 'Modo Paper Trading', value: 'Prueba sin riesgo' },
    { feature: 'Circuit breakers', value: 'Detención de emergencia' }
  ];

  return (
    <div className="trading-intelligence-page">
      {/* Hero Section */}
      <section className="hero-section">
        <Row justify="center" align="middle" style={{ minHeight: '70vh', padding: '40px 20px' }}>
          <Col xs={24} sm={24} md={20} lg={16} xl={14}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
                <Badge.Ribbon text="v3.0 Live" color="green">
                  <Title level={1} style={{ marginBottom: 0 }}>
                    <LineChartOutlined style={{ color: '#52c41a', marginRight: 16 }} />
                    Trading Intelligence
                  </Title>
                </Badge.Ribbon>
                <Title level={2} style={{ marginTop: 0, fontWeight: 'normal' }}>
                  Sistema de Trading Algorítmico con IA
                </Title>
                <Paragraph style={{ fontSize: '18px', maxWidth: '800px', margin: '0 auto' }}>
                  Bot de trading inteligente que opera 24/7 en múltiples exchanges. 
                  Arbitraje automático, gestión de riesgo y estrategias impulsadas por Claude AI.
                </Paragraph>
                
                {/* Live Metrics */}
                <Row gutter={[16, 16]} justify="center" style={{ marginTop: 32 }}>
                  <Col xs={12} sm={8} md={6}>
                    <Card className="metric-card">
                      <Statistic
                        title="Ganancia Mensual"
                        value={2580}
                        prefix="$"
                        valueStyle={{ color: '#52c41a' }}
                        suffix={<RiseOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col xs={12} sm={8} md={6}>
                    <Card className="metric-card">
                      <Statistic
                        title="Win Rate"
                        value={68.5}
                        suffix="%"
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={12} sm={8} md={6}>
                    <Card className="metric-card">
                      <Statistic
                        title="Trades Hoy"
                        value={47}
                        valueStyle={{ color: '#722ed1' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={12} sm={8} md={6}>
                    <Card className="metric-card">
                      <Statistic
                        title="ROI"
                        value={24.8}
                        suffix="%"
                        valueStyle={{ color: '#fa8c16' }}
                      />
                    </Card>
                  </Col>
                </Row>

                <Space size="large" wrap style={{ marginTop: 32 }}>
                  <Button 
                    type="primary" 
                    size="large" 
                    icon={<RocketOutlined />}
                    onClick={() => setShowArbitrageModal(true)}
                  >
                    Activar Bot de Arbitraje
                  </Button>
                  <Button size="large" icon={<BarChartOutlined />}>
                    Ver Dashboard Live
                  </Button>
                </Space>
              </Space>
            </motion.div>
          </Col>
        </Row>
      </section>

      {/* Performance Chart Section */}
      <section style={{ padding: '60px 20px', background: '#f0f2f5' }}>
        <Row justify="center">
          <Col xs={24} sm={24} md={22} lg={20} xl={18}>
            <Title level={2} style={{ textAlign: 'center', marginBottom: 48 }}>
              Rendimiento del Sistema
            </Title>
            <Row gutter={[24, 24]}>
              <Col xs={24} lg={16}>
                <Card title="Ganancias Mensuales" extra={<DollarOutlined />}>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => `$${value}`} />
                      <Area type="monotone" dataKey="profit" stroke="#52c41a" fill="#52c41a" fillOpacity={0.2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
              <Col xs={24} lg={8}>
                <Card title="Distribución por Exchange" extra={<GlobalOutlined />}>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={exchangeDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={(entry) => `${entry.name}: ${entry.value}%`}
                      >
                        {exchangeDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
            </Row>
          </Col>
        </Row>
      </section>

      {/* Features Section */}
      <section style={{ padding: '60px 20px' }}>
        <Row justify="center">
          <Col xs={24} sm={24} md={22} lg={20} xl={18}>
            <Title level={2} style={{ textAlign: 'center', marginBottom: 48 }}>
              Características Principales
            </Title>
            <Row gutter={[24, 24]}>
              {features.map((feature, index) => (
                <Col xs={24} sm={12} md={8} key={index}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card 
                      hoverable
                      style={{ height: '100%', textAlign: 'center' }}
                      bodyStyle={{ padding: '32px' }}
                    >
                      <div style={{ fontSize: 48, color: feature.color, marginBottom: 16 }}>
                        {feature.icon}
                      </div>
                      <Title level={4}>{feature.title}</Title>
                      <Paragraph>{feature.description}</Paragraph>
                    </Card>
                  </motion.div>
                </Col>
              ))}
            </Row>
          </Col>
        </Row>
      </section>

      {/* Trading Strategies */}
      <section style={{ padding: '60px 20px', background: '#f0f2f5' }}>
        <Row justify="center">
          <Col xs={24} sm={24} md={22} lg={20} xl={18}>
            <Title level={2} style={{ textAlign: 'center', marginBottom: 48 }}>
              Estrategias de Trading
            </Title>
            <Alert
              message="💰 Bot de Arbitraje Activo"
              description="Genera $500-$1,000 mensuales aprovechando diferencias de precio entre exchanges"
              type="success"
              showIcon
              style={{ marginBottom: 32 }}
              action={
                <Button size="small" type="primary" onClick={() => setShowArbitrageModal(true)}>
                  Configurar Ahora
                </Button>
              }
            />
            <Row gutter={[24, 24]}>
              {strategies.map((strategy, index) => (
                <Col xs={24} sm={12} lg={6} key={index}>
                  <Card 
                    hoverable
                    style={{ height: '100%' }}
                    actions={[
                      <Button type="link" icon={<SettingOutlined />}>Configurar</Button>
                    ]}
                  >
                    <Card.Meta
                      avatar={<div style={{ fontSize: 36, color: '#1890ff' }}>{strategy.icon}</div>}
                      title={strategy.name}
                      description={
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Text type="success" strong>{strategy.profit}</Text>
                          <Tag color={strategy.risk === 'Bajo' ? 'green' : strategy.risk === 'Medio' ? 'orange' : 'red'}>
                            Riesgo {strategy.risk}
                          </Tag>
                        </Space>
                      }
                    />
                    <Divider />
                    <Paragraph>{strategy.description}</Paragraph>
                    <List
                      size="small"
                      dataSource={strategy.features}
                      renderItem={item => (
                        <List.Item style={{ padding: '4px 0' }}>
                          <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                          {item}
                        </List.Item>
                      )}
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          </Col>
        </Row>
      </section>

      {/* How it Works */}
      <section style={{ padding: '60px 20px' }}>
        <Row justify="center">
          <Col xs={24} sm={24} md={22} lg={20} xl={18}>
            <Title level={2} style={{ textAlign: 'center', marginBottom: 48 }}>
              ¿Cómo Funciona?
            </Title>
            <Timeline mode="alternate">
              <Timeline.Item 
                dot={<GlobalOutlined style={{ fontSize: '20px' }} />}
                color="blue"
              >
                <Card>
                  <Title level={5}>1. Recolección de Datos</Title>
                  <Paragraph>
                    Conecta con múltiples exchanges vía API y recolecta datos de mercado en tiempo real
                  </Paragraph>
                </Card>
              </Timeline.Item>
              <Timeline.Item 
                dot={<AimOutlined style={{ fontSize: '20px' }} />}
                color="purple"
              >
                <Card>
                  <Title level={5}>2. Análisis con IA</Title>
                  <Paragraph>
                    Claude AI analiza patrones, tendencias y oportunidades usando indicadores técnicos
                  </Paragraph>
                </Card>
              </Timeline.Item>
              <Timeline.Item 
                dot={<SafetyOutlined style={{ fontSize: '20px' }} />}
                color="orange"
              >
                <Card>
                  <Title level={5}>3. Gestión de Riesgo</Title>
                  <Paragraph>
                    Evalúa el riesgo y ajusta el tamaño de posición según límites predefinidos
                  </Paragraph>
                </Card>
              </Timeline.Item>
              <Timeline.Item 
                dot={<ThunderboltOutlined style={{ fontSize: '20px' }} />}
                color="green"
              >
                <Card>
                  <Title level={5}>4. Ejecución Automática</Title>
                  <Paragraph>
                    Ejecuta trades automáticamente con stop-loss y take-profit configurados
                  </Paragraph>
                </Card>
              </Timeline.Item>
              <Timeline.Item 
                dot={<BarChartOutlined style={{ fontSize: '20px' }} />}
                color="red"
              >
                <Card>
                  <Title level={5}>5. Monitoreo y Aprendizaje</Title>
                  <Paragraph>
                    Monitorea resultados y ajusta estrategias basándose en el rendimiento
                  </Paragraph>
                </Card>
              </Timeline.Item>
            </Timeline>
          </Col>
        </Row>
      </section>

      {/* Risk Management */}
      <section style={{ padding: '60px 20px', background: '#f0f2f5' }}>
        <Row justify="center">
          <Col xs={24} sm={24} md={22} lg={20} xl={18}>
            <Title level={2} style={{ textAlign: 'center', marginBottom: 48 }}>
              <SafetyOutlined style={{ color: '#fa8c16', marginRight: 16 }} />
              Gestión de Riesgo Integrada
            </Title>
            <Row gutter={[24, 24]}>
              <Col xs={24} md={12}>
                <Card title="Límites de Protección">
                  <Table
                    dataSource={riskManagementFeatures}
                    columns={[
                      { title: 'Característica', dataIndex: 'feature', key: 'feature' },
                      { title: 'Configuración', dataIndex: 'value', key: 'value' }
                    ]}
                    pagination={false}
                    size="small"
                  />
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card title="Métricas de Riesgo en Tiempo Real">
                  <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div>
                      <Text>Exposición Total</Text>
                      <Progress percent={45} status="active" />
                    </div>
                    <div>
                      <Text>Drawdown Actual</Text>
                      <Progress percent={12} status="normal" strokeColor="#52c41a" />
                    </div>
                    <div>
                      <Text>Volatilidad del Portfolio</Text>
                      <Progress percent={28} status="normal" strokeColor="#1890ff" />
                    </div>
                    <div>
                      <Text>Límite Diario Usado</Text>
                      <Progress percent={35} status="normal" strokeColor="#fa8c16" />
                    </div>
                  </Space>
                </Card>
              </Col>
            </Row>
          </Col>
        </Row>
      </section>

      {/* Quick Start Guide */}
      <section style={{ padding: '60px 20px' }}>
        <Row justify="center">
          <Col xs={24} sm={24} md={22} lg={20} xl={18}>
            <Title level={2} style={{ textAlign: 'center', marginBottom: 48 }}>
              Comienza a Operar en 3 Pasos
            </Title>
            <Tabs activeKey={activeTab} onChange={setActiveTab} centered>
              {quickStartSteps.map((step, index) => (
                <TabPane 
                  tab={
                    <span>
                      <Badge count={index + 1} style={{ backgroundColor: '#52c41a' }}>
                        <span style={{ marginRight: 30 }}>{step.title}</span>
                      </Badge>
                    </span>
                  }
                  key={String(index + 1)}
                >
                  <Card>
                    <Title level={4}>{step.title}</Title>
                    <Paragraph>{step.description}</Paragraph>
                    <pre style={{ background: '#f6f6f6', padding: 16, borderRadius: 4, overflow: 'auto' }}>
                      {step.code}
                    </pre>
                  </Card>
                </TabPane>
              ))}
            </Tabs>
          </Col>
        </Row>
      </section>

      {/* Expected Returns */}
      <section style={{ padding: '60px 20px', background: '#001529', color: 'white' }}>
        <Row justify="center">
          <Col xs={24} sm={24} md={22} lg={20} xl={18}>
            <Title level={2} style={{ textAlign: 'center', color: 'white', marginBottom: 48 }}>
              <TrophyOutlined style={{ color: '#faad14', marginRight: 16 }} />
              Retornos Esperados
            </Title>
            <Row gutter={[32, 32]} justify="center">
              <Col xs={24} sm={12} md={6}>
                <Card 
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', textAlign: 'center' }}
                  bodyStyle={{ padding: '24px' }}
                >
                  <div style={{ fontSize: 36, color: '#52c41a', marginBottom: 16 }}>
                    <CountUp end={500} prefix="$" suffix="+" duration={2} />
                  </div>
                  <Title level={4} style={{ color: 'white' }}>Por Mes</Title>
                  <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
                    Con bot de arbitraje básico
                  </Text>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card 
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', textAlign: 'center' }}
                  bodyStyle={{ padding: '24px' }}
                >
                  <div style={{ fontSize: 36, color: '#1890ff', marginBottom: 16 }}>
                    <CountUp end={68} suffix="%" duration={2} />
                  </div>
                  <Title level={4} style={{ color: 'white' }}>Win Rate</Title>
                  <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
                    Promedio de operaciones exitosas
                  </Text>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card 
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', textAlign: 'center' }}
                  bodyStyle={{ padding: '24px' }}
                >
                  <div style={{ fontSize: 36, color: '#fa8c16', marginBottom: 16 }}>
                    <CountUp end={15} suffix="%" duration={2} />
                  </div>
                  <Title level={4} style={{ color: 'white' }}>Max Drawdown</Title>
                  <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
                    Pérdida máxima controlada
                  </Text>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card 
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', textAlign: 'center' }}
                  bodyStyle={{ padding: '24px' }}
                >
                  <div style={{ fontSize: 36, color: '#faad14', marginBottom: 16 }}>
                    24/7
                  </div>
                  <Title level={4} style={{ color: 'white' }}>Operación</Title>
                  <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
                    Trading automatizado continuo
                  </Text>
                </Card>
              </Col>
            </Row>
            <div style={{ textAlign: 'center', marginTop: 48 }}>
              <Alert
                message="Comienza con Paper Trading"
                description="Prueba todas las estrategias con dinero virtual antes de operar con fondos reales"
                type="info"
                showIcon
                style={{ maxWidth: 600, margin: '0 auto' }}
              />
            </div>
          </Col>
        </Row>
      </section>

      {/* CTA Section */}
      <section style={{ padding: '80px 20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Row justify="center">
          <Col xs={24} sm={24} md={20} lg={16} xl={14}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
            >
              <Card 
                style={{ 
                  background: 'rgba(255,255,255,0.95)', 
                  textAlign: 'center',
                  borderRadius: 16,
                  boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
                }}
                bodyStyle={{ padding: '48px' }}
              >
                <Title level={2}>
                  Comienza a Generar Ingresos Pasivos Hoy
                </Title>
                <Paragraph style={{ fontSize: 18, marginBottom: 32 }}>
                  Únete a cientos de traders que ya están generando ganancias automáticas 
                  con nuestro sistema de trading inteligente
                </Paragraph>
                <Space size="large" wrap>
                  <Button 
                    type="primary" 
                    size="large" 
                    icon={<RocketOutlined />}
                    style={{ height: 48, fontSize: 16 }}
                    onClick={() => setShowArbitrageModal(true)}
                  >
                    Activar Trading Bot
                  </Button>
                  <Button 
                    size="large" 
                    icon={<ExperimentOutlined />}
                    style={{ height: 48, fontSize: 16 }}
                  >
                    Probar Paper Trading
                  </Button>
                </Space>
                <Divider />
                <Space>
                  <LockOutlined style={{ color: '#52c41a' }} />
                  <Text type="secondary">
                    Tus API keys se almacenan de forma segura y encriptada
                  </Text>
                </Space>
              </Card>
            </motion.div>
          </Col>
        </Row>
      </section>

      {/* Arbitrage Modal */}
      <Modal
        title={
          <Space>
            <SwapOutlined style={{ color: '#52c41a' }} />
            <span>Configurar Bot de Arbitraje</span>
          </Space>
        }
        visible={showArbitrageModal}
        onCancel={() => setShowArbitrageModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowArbitrageModal(false)}>
            Cancelar
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            icon={<RocketOutlined />}
            onClick={() => {
              notification.success({
                message: 'Bot Activado',
                description: 'El bot de arbitraje está buscando oportunidades. Recibirás notificaciones de trades.',
              });
              setShowArbitrageModal(false);
            }}
          >
            Activar Bot
          </Button>
        ]}
        width={600}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Alert
            message="Configuración Recomendada para Principiantes"
            type="info"
            showIcon
          />
          <div>
            <Title level={5}>Exchanges a Monitorear</Title>
            <Space wrap>
              <Tag color="gold" icon={<CheckCircleOutlined />}>Binance</Tag>
              <Tag color="blue" icon={<CheckCircleOutlined />}>Coinbase</Tag>
              <Tag color="green" icon={<CheckCircleOutlined />}>Alpaca</Tag>
            </Space>
          </div>
          <div>
            <Title level={5}>Configuración de Riesgo</Title>
            <List size="small">
              <List.Item>
                <Text>Capital inicial: </Text>
                <Text strong>$1,000 (recomendado)</Text>
              </List.Item>
              <List.Item>
                <Text>Tamaño máximo por operación: </Text>
                <Text strong>$100</Text>
              </List.Item>
              <List.Item>
                <Text>Ganancia mínima por arbitraje: </Text>
                <Text strong>0.5%</Text>
              </List.Item>
              <List.Item>
                <Text>Modo: </Text>
                <Tag color="green">Paper Trading</Tag>
              </List.Item>
            </List>
          </div>
          <Card style={{ background: '#f0f9ff', border: '1px solid #91d5ff' }}>
            <Space>
              <DollarOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              <div>
                <Text strong>Ganancia Estimada</Text>
                <br />
                <Text type="success" style={{ fontSize: 18 }}>$500-$1,000/mes</Text>
              </div>
            </Space>
          </Card>
        </Space>
      </Modal>
    </div>
  );
};

export default TradingIntelligence;