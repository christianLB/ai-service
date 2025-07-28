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
  notification,
  Collapse,
  Tooltip,
  Input
} from 'antd';
import {
  TagsOutlined,
  AimOutlined,
  ThunderboltOutlined,
  GlobalOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  RocketOutlined,
  SafetyOutlined,
  CodeOutlined,
  DatabaseOutlined,
  LineChartOutlined,
  BookOutlined,
  ApiOutlined,
  CloudServerOutlined,
  BulbOutlined,
  RobotOutlined,
  FilterOutlined,
  TranslationOutlined,
  BarChartOutlined,
  ExperimentOutlined,
  TeamOutlined,
  FolderOutlined,
  CalendarOutlined,
  LockOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import './TaggingIntelligence.css';

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;
const { Panel } = Collapse;

const TaggingIntelligence: React.FC = () => {
  const [activeTab, setActiveTab] = useState('1');
  const [showDemoModal, setShowDemoModal] = useState(false);

  // Sample data for charts
  const accuracyData = [
    { month: 'Ene', accuracy: 75 },
    { month: 'Feb', accuracy: 78 },
    { month: 'Mar', accuracy: 82 },
    { month: 'Abr', accuracy: 85 },
    { month: 'May', accuracy: 88 },
    { month: 'Jun', accuracy: 92 }
  ];

  const entityDistribution = [
    { name: 'Transacciones', value: 45, color: '#1890ff' },
    { name: 'Clientes', value: 25, color: '#52c41a' },
    { name: 'Facturas', value: 20, color: '#faad14' },
    { name: 'Documentos', value: 10, color: '#722ed1' }
  ];

  const aiProviderMetrics = [
    { provider: 'Claude AI', accuracy: 94, speed: 250, cost: 0.02 },
    { provider: 'OpenAI', accuracy: 91, speed: 180, cost: 0.03 },
    { provider: 'Patrones', accuracy: 78, speed: 50, cost: 0 }
  ];

  const features = [
    {
      icon: <BulbOutlined />,
      title: 'Dual AI Intelligence',
      description: 'Claude AI + OpenAI para máxima precisión en el etiquetado',
      color: '#722ed1'
    },
    {
      icon: <GlobalOutlined />,
      title: 'Multi-Entidad',
      description: 'Etiqueta transacciones, clientes, facturas y documentos',
      color: '#1890ff'
    },
    {
      icon: <FilterOutlined />,
      title: 'Pattern Matching',
      description: 'Reglas y patrones personalizables con regex avanzado',
      color: '#52c41a'
    },
    {
      icon: <SyncOutlined />,
      title: 'Aprendizaje Continuo',
      description: 'Mejora automática basada en feedback del usuario',
      color: '#fa8c16'
    },
    {
      icon: <TranslationOutlined />,
      title: 'Multi-Idioma',
      description: 'Soporte para etiquetado en múltiples idiomas',
      color: '#13c2c2'
    },
    {
      icon: <BarChartOutlined />,
      title: 'Analytics & Insights',
      description: 'Métricas detalladas de rendimiento y precisión',
      color: '#eb2f96'
    }
  ];

  const taggingMethods = [
    {
      name: 'AI Intelligence',
      icon: <RobotOutlined />,
      accuracy: '92-95%',
      speed: '200-300ms',
      description: 'Análisis profundo con Claude AI y OpenAI',
      features: [
        'Comprensión semántica del contexto',
        'Detección de entidades y relaciones',
        'Análisis multi-idioma',
        'Confianza calibrada'
      ]
    },
    {
      name: 'Pattern Matching',
      icon: <FilterOutlined />,
      accuracy: '75-85%',
      speed: '10-50ms',
      description: 'Reglas y patrones predefinidos',
      features: [
        'Regex avanzado',
        'Keywords y frases clave',
        'Rangos numéricos',
        'Patrones de fecha'
      ]
    },
    {
      name: 'Rule-Based',
      icon: <BookOutlined />,
      accuracy: '80-90%',
      speed: '5-20ms',
      description: 'Lógica de negocio personalizada',
      features: [
        'Reglas if-then-else',
        'Condiciones complejas',
        'Validaciones cruzadas',
        'Herencia de tags'
      ]
    },
    {
      name: 'Manual Review',
      icon: <CheckCircleOutlined />,
      accuracy: '95-99%',
      speed: 'Variable',
      description: 'Validación y corrección humana',
      features: [
        'Interfaz intuitiva',
        'Sugerencias asistidas',
        'Aprobación en lote',
        'Historial de cambios'
      ]
    }
  ];

  const architectureDiagram = `
┌─────────────────────────────────────────────────────────────────┐
│                     AI Universal Tagging System                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Entities    │    │ AI Providers │    │   Patterns   │       │
│  ├──────────────┤    ├──────────────┤    ├──────────────┤       │
│  │ Transactions │    │  Claude AI   │    │    Regex     │       │
│  │   Clients    │───▶│   OpenAI     │◀───│   Keywords   │       │
│  │   Invoices   │    │  Embeddings  │    │    Rules     │       │
│  │  Documents   │    └──────────────┘    └──────────────┘       │
│  └──────────────┘            │                    │              │
│         │                    ▼                    ▼              │
│         │         ┌──────────────────────────────────┐          │
│         └────────▶│    Tagging Engine & Scoring     │          │
│                   └──────────────────────────────────┘          │
│                              │                                   │
│                              ▼                                   │
│                   ┌──────────────────────────────────┐          │
│                   │   Learning & Feedback System     │          │
│                   └──────────────────────────────────┘          │
│                              │                                   │
│                              ▼                                   │
│                   ┌──────────────────────────────────┐          │
│                   │    Analytics & Reporting         │          │
│                   └──────────────────────────────────┘          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘`;

  const apiExamples = {
    suggest: `# Sugerir tags usando AI
curl -X POST http://localhost:3001/api/tags/suggest \\
  -H "Authorization: Bearer TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "Pago de nómina mensual empleados",
    "entityType": "transaction",
    "method": "ai",
    "options": {
      "provider": "claude",
      "maxTags": 5,
      "confidenceThreshold": 0.8
    }
  }'`,
    
    batch: `# Etiquetar múltiples entidades
curl -X POST http://localhost:3001/api/tags/batch \\
  -H "Authorization: Bearer TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "entities": [
      {
        "entityType": "transaction",
        "entityId": "123",
        "content": "Compra en Amazon"
      },
      {
        "entityType": "invoice",
        "entityId": "456",
        "content": "Factura servicios consultoría"
      }
    ],
    "method": "auto"
  }'`,
    
    feedback: `# Enviar feedback para mejorar el sistema
curl -X POST http://localhost:3001/api/tags/feedback \\
  -H "Authorization: Bearer TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "entityType": "transaction",
    "entityId": "123",
    "entityTagId": "tag-123",
    "feedback": {
      "isCorrect": false,
      "suggestedTagId": "correct-tag-456",
      "reason": "Categoría incorrecta"
    }
  }'`
  };

  const performanceRadarData = [
    {
      metric: 'Precisión',
      Claude: 94,
      OpenAI: 91,
      Pattern: 78,
      fullMark: 100
    },
    {
      metric: 'Velocidad',
      Claude: 85,
      OpenAI: 90,
      Pattern: 98,
      fullMark: 100
    },
    {
      metric: 'Costo',
      Claude: 70,
      OpenAI: 65,
      Pattern: 100,
      fullMark: 100
    },
    {
      metric: 'Contexto',
      Claude: 98,
      OpenAI: 92,
      Pattern: 60,
      fullMark: 100
    },
    {
      metric: 'Escalabilidad',
      Claude: 88,
      OpenAI: 85,
      Pattern: 95,
      fullMark: 100
    }
  ];

  return (
    <div className="tagging-intelligence-page">
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
                <Badge.Ribbon text="v2.0 Live" color="green">
                  <Title level={1} style={{ marginBottom: 0 }}>
                    <TagsOutlined style={{ color: '#52c41a', marginRight: 16 }} />
                    AI Universal Tagging
                  </Title>
                </Badge.Ribbon>
                <Title level={2} style={{ marginTop: 0, fontWeight: 'normal' }}>
                  Sistema Inteligente de Etiquetado Automático
                </Title>
                <Paragraph style={{ fontSize: '18px', maxWidth: '800px', margin: '0 auto' }}>
                  Categorización automática multi-entidad con doble IA (Claude + OpenAI). 
                  Pattern matching avanzado, aprendizaje continuo y soporte multi-idioma 
                  para etiquetar transacciones, clientes, facturas y documentos con 92%+ de precisión.
                </Paragraph>

                {/* Live Metrics */}
                <Row gutter={[16, 16]} justify="center" style={{ marginTop: 32 }}>
                  <Col xs={12} sm={6}>
                    <Card className="metric-card">
                      <Statistic
                        title="Precisión Global"
                        value={92.5}
                        suffix="%"
                        valueStyle={{ color: '#52c41a' }}
                        prefix={<AimOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Card className="metric-card">
                      <Statistic
                        title="Tags Activos"
                        value={1847}
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Card className="metric-card">
                      <Statistic
                        title="Entidades/Día"
                        value={5420}
                        valueStyle={{ color: '#722ed1' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Card className="metric-card">
                      <Statistic
                        title="Tiempo Resp."
                        value={180}
                        suffix="ms"
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
                    onClick={() => setShowDemoModal(true)}
                  >
                    Ver Demo en Vivo
                  </Button>
                  <Button size="large" icon={<ApiOutlined />}>
                    Documentación API
                  </Button>
                </Space>
              </Space>
            </motion.div>
          </Col>
        </Row>
      </section>

      {/* Performance Charts Section */}
      <section style={{ padding: '60px 20px', background: '#f0f2f5' }}>
        <Row justify="center">
          <Col xs={24} sm={24} md={22} lg={20} xl={18}>
            <Title level={2} style={{ textAlign: 'center', marginBottom: 48 }}>
              Rendimiento del Sistema
            </Title>
            <Row gutter={[24, 24]}>
              <Col xs={24} lg={12}>
                <Card title="Evolución de Precisión" extra={<LineChartOutlined />}>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={accuracyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <RechartsTooltip formatter={(value) => `${value}%`} />
                      <Area type="monotone" dataKey="accuracy" stroke="#52c41a" fill="#52c41a" fillOpacity={0.2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card title="Distribución por Entidad" extra={<DatabaseOutlined />}>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={entityDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={(entry) => `${entry.name}: ${entry.value}%`}
                      >
                        {entityDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
            </Row>
            <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
              <Col xs={24}>
                <Card title="Comparación de Proveedores AI" extra={<RobotOutlined />}>
                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={performanceRadarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} />
                      <Radar name="Claude AI" dataKey="Claude" stroke="#722ed1" fill="#722ed1" fillOpacity={0.3} />
                      <Radar name="OpenAI" dataKey="OpenAI" stroke="#52c41a" fill="#52c41a" fillOpacity={0.3} />
                      <Radar name="Pattern" dataKey="Pattern" stroke="#fa8c16" fill="#fa8c16" fillOpacity={0.3} />
                      <RechartsTooltip />
                    </RadarChart>
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

      {/* Architecture Section */}
      <section style={{ padding: '60px 20px', background: '#f0f2f5' }}>
        <Row justify="center">
          <Col xs={24} sm={24} md={22} lg={20} xl={18}>
            <Title level={2} style={{ textAlign: 'center', marginBottom: 48 }}>
              <CloudServerOutlined style={{ marginRight: 16 }} />
              Arquitectura del Sistema
            </Title>
            <Card>
              <Alert
                message="Arquitectura Multi-Capa con AI"
                description="Sistema modular que combina múltiples proveedores de IA, pattern matching y aprendizaje continuo"
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
              />
              <pre style={{ 
                background: '#f6f6f6', 
                padding: 24, 
                borderRadius: 8, 
                overflow: 'auto',
                fontSize: '12px',
                lineHeight: '1.4'
              }}>
                {architectureDiagram}
              </pre>
              <Divider />
              <Title level={4}>Flujo de Procesamiento</Title>
              <Timeline mode="alternate">
                <Timeline.Item 
                  dot={<DatabaseOutlined style={{ fontSize: '20px' }} />}
                  color="blue"
                >
                  <Card>
                    <Title level={5}>1. Ingesta de Entidad</Title>
                    <Paragraph>
                      Recepción de transacción, cliente, factura o documento con su contenido y metadata
                    </Paragraph>
                  </Card>
                </Timeline.Item>
                <Timeline.Item 
                  dot={<FilterOutlined style={{ fontSize: '20px' }} />}
                  color="green"
                >
                  <Card>
                    <Title level={5}>2. Pattern Matching</Title>
                    <Paragraph>
                      Análisis rápido con regex, keywords y reglas predefinidas (10-50ms)
                    </Paragraph>
                  </Card>
                </Timeline.Item>
                <Timeline.Item 
                  dot={<BulbOutlined style={{ fontSize: '20px' }} />}
                  color="purple"
                >
                  <Card>
                    <Title level={5}>3. Análisis AI</Title>
                    <Paragraph>
                      Claude AI y OpenAI analizan el contexto semántico y sugieren tags con confianza
                    </Paragraph>
                  </Card>
                </Timeline.Item>
                <Timeline.Item 
                  dot={<AimOutlined style={{ fontSize: '20px' }} />}
                  color="orange"
                >
                  <Card>
                    <Title level={5}>4. Scoring & Ranking</Title>
                    <Paragraph>
                      Combinación de resultados y cálculo de confianza ponderada (0.0-1.0)
                    </Paragraph>
                  </Card>
                </Timeline.Item>
                <Timeline.Item 
                  dot={<SyncOutlined style={{ fontSize: '20px' }} />}
                  color="red"
                >
                  <Card>
                    <Title level={5}>5. Aplicación & Feedback</Title>
                    <Paragraph>
                      Tags aplicados automáticamente o sugeridos. Sistema aprende del feedback
                    </Paragraph>
                  </Card>
                </Timeline.Item>
              </Timeline>
            </Card>
          </Col>
        </Row>
      </section>

      {/* Tagging Methods */}
      <section style={{ padding: '60px 20px' }}>
        <Row justify="center">
          <Col xs={24} sm={24} md={22} lg={20} xl={18}>
            <Title level={2} style={{ textAlign: 'center', marginBottom: 48 }}>
              Métodos de Etiquetado
            </Title>
            <Row gutter={[24, 24]}>
              {taggingMethods.map((method, index) => (
                <Col xs={24} sm={12} lg={6} key={index}>
                  <Card 
                    hoverable
                    style={{ height: '100%' }}
                    actions={[
                      <Tooltip title="Precisión">
                        <Space>
                          <AimOutlined />
                          <Text>{method.accuracy}</Text>
                        </Space>
                      </Tooltip>,
                      <Tooltip title="Velocidad">
                        <Space>
                          <ThunderboltOutlined />
                          <Text>{method.speed}</Text>
                        </Space>
                      </Tooltip>
                    ]}
                  >
                    <Card.Meta
                      avatar={<div style={{ fontSize: 36, color: '#1890ff' }}>{method.icon}</div>}
                      title={method.name}
                      description={
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Paragraph>{method.description}</Paragraph>
                        </Space>
                      }
                    />
                    <Divider />
                    <List
                      size="small"
                      dataSource={method.features}
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

      {/* Technical Details */}
      <section style={{ padding: '60px 20px', background: '#f0f2f5' }}>
        <Row justify="center">
          <Col xs={24} sm={24} md={22} lg={20} xl={18}>
            <Title level={2} style={{ textAlign: 'center', marginBottom: 48 }}>
              <CodeOutlined style={{ marginRight: 16 }} />
              Detalles Técnicos
            </Title>
            <Tabs activeKey={activeTab} onChange={setActiveTab} centered>
              <TabPane tab="Database Schema" key="1">
                <Card>
                  <Title level={4}>Estructura de Datos</Title>
                  <pre style={{ background: '#f6f6f6', padding: 16, borderRadius: 4, overflow: 'auto' }}>
{`// Universal Tags
model UniversalTag {
  id               String   @id @default(uuid())
  code             String   @unique
  name             String
  description      String?
  entityTypes      String[] // ['transaction', 'client', 'invoice', 'document']
  
  // Pattern Configuration
  patterns         Json?    // { keywords: [], regex: '', merchants: [] }
  rules            Json?    // Business logic rules
  
  // AI/ML
  confidence       Float    @default(0.5)
  embeddingModel   String?  // 'ada-002', 'claude-3'
  
  // Hierarchy
  parentId         String?
  path             String   // '/category/subcategory/tag'
  level            Int      @default(0)
}

// Entity-Tag Relationships
model EntityTag {
  id               String   @id @default(uuid())
  tagId            String
  entityType       String   // 'transaction', 'client', 'invoice', 'document'
  entityId         String
  
  // Tagging Metadata
  method           String   // 'AI', 'PATTERN', 'RULE', 'MANUAL', 'INFERRED'
  confidence       Float    @default(0.5)
  appliedBy        String?  // User or system
  
  // AI Results
  aiProvider       String?  // 'claude', 'openai'
  aiModel          String?  // 'claude-3-opus', 'gpt-4'
  aiResponse       Json?    // Full AI response
  aiReasoning      String?  // Human-readable explanation
}`}
                  </pre>
                </Card>
              </TabPane>
              <TabPane tab="AI Integration" key="2">
                <Card>
                  <Title level={4}>Proveedores de IA</Title>
                  <Table 
                    dataSource={aiProviderMetrics}
                    columns={[
                      { title: 'Proveedor', dataIndex: 'provider', key: 'provider' },
                      { 
                        title: 'Precisión', 
                        dataIndex: 'accuracy', 
                        key: 'accuracy',
                        render: (val) => <Progress percent={val} size="small" />
                      },
                      { 
                        title: 'Velocidad (ms)', 
                        dataIndex: 'speed', 
                        key: 'speed',
                        render: (val) => <Tag color="blue">{val}ms</Tag>
                      },
                      { 
                        title: 'Costo/1K', 
                        dataIndex: 'cost', 
                        key: 'cost',
                        render: (val) => val > 0 ? `$${val}` : 'Gratis'
                      }
                    ]}
                    pagination={false}
                    size="small"
                  />
                  <Divider />
                  <Title level={5}>Flujo de Decisión AI</Title>
                  <List>
                    <List.Item>
                      <Space>
                        <Badge status="processing" />
                        <Text>Claude AI analiza contexto complejo y semántica profunda</Text>
                      </Space>
                    </List.Item>
                    <List.Item>
                      <Space>
                        <Badge status="processing" />
                        <Text>OpenAI genera embeddings y calcula similitud vectorial</Text>
                      </Space>
                    </List.Item>
                    <List.Item>
                      <Space>
                        <Badge status="processing" />
                        <Text>Sistema combina resultados con pesos ponderados</Text>
                      </Space>
                    </List.Item>
                    <List.Item>
                      <Space>
                        <Badge status="success" />
                        <Text>Tags finales con confianza calibrada (0.0-1.0)</Text>
                      </Space>
                    </List.Item>
                  </List>
                </Card>
              </TabPane>
              <TabPane tab="Pattern System" key="3">
                <Card>
                  <Title level={4}>Sistema de Patrones</Title>
                  <Alert
                    message="Pattern Matching Avanzado"
                    description="Combina regex, keywords, rangos numéricos y lógica fuzzy para detección rápida"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  <pre style={{ background: '#f6f6f6', padding: 16, borderRadius: 4, overflow: 'auto' }}>
{`// Ejemplo de configuración de patrones
{
  "patterns": {
    "keywords": ["nómina", "salario", "sueldo", "payroll"],
    "regex": "/(pago|transferencia).*(empleado|personal)/i",
    "merchants": ["ADP", "Payroll Inc", "Nominex"],
    "amountRange": { "min": 1000, "max": 50000 },
    "datePatterns": ["último día del mes", "día 15"]
  },
  "rules": {
    "requiredKeywords": 2,
    "confidenceBoost": 0.2,
    "exclusions": ["reembolso", "devolución"]
  }
}`}
                  </pre>
                  <Divider />
                  <Title level={5}>Tipos de Patrones</Title>
                  <List>
                    <List.Item>
                      <Text><strong>KEYWORD:</strong> Búsqueda de palabras clave con stemming</Text>
                    </List.Item>
                    <List.Item>
                      <Text><strong>REGEX:</strong> Expresiones regulares avanzadas</Text>
                    </List.Item>
                    <List.Item>
                      <Text><strong>SEMANTIC:</strong> Similitud semántica con embeddings</Text>
                    </List.Item>
                    <List.Item>
                      <Text><strong>NUMERIC:</strong> Rangos y fórmulas numéricas</Text>
                    </List.Item>
                    <List.Item>
                      <Text><strong>DATE:</strong> Patrones temporales y recurrencia</Text>
                    </List.Item>
                    <List.Item>
                      <Text><strong>COMPOSITE:</strong> Combinación de múltiples patrones</Text>
                    </List.Item>
                  </List>
                </Card>
              </TabPane>
            </Tabs>
          </Col>
        </Row>
      </section>

      {/* API Examples */}
      <section style={{ padding: '60px 20px' }}>
        <Row justify="center">
          <Col xs={24} sm={24} md={22} lg={20} xl={18}>
            <Title level={2} style={{ textAlign: 'center', marginBottom: 48 }}>
              Ejemplos de Integración API
            </Title>
            <Collapse defaultActiveKey={['1']}>
              <Panel 
                header="Sugerir Tags con AI" 
                key="1"
                extra={<RobotOutlined />}
              >
                <pre style={{ background: '#f6f6f6', padding: 16, borderRadius: 4, overflow: 'auto' }}>
                  {apiExamples.suggest}
                </pre>
                <Divider />
                <Title level={5}>Respuesta Esperada</Title>
                <pre style={{ background: '#f6f6f6', padding: 16, borderRadius: 4, overflow: 'auto' }}>
{`{
  "success": true,
  "data": {
    "suggestions": [
      {
        "tagId": "tag-payroll-001",
        "tagCode": "PAYROLL",
        "tagName": "Nómina",
        "confidence": 0.95,
        "method": "AI",
        "reasoning": "Detectado patrón de pago de nómina mensual con alta confianza"
      },
      {
        "tagId": "tag-expense-salary",
        "tagCode": "SALARY_EXPENSE",
        "tagName": "Gasto Salarial",
        "confidence": 0.88,
        "method": "AI",
        "reasoning": "Identificado como gasto relacionado con salarios de empleados"
      }
    ],
    "processingTime": 187,
    "aiProvider": "claude"
  }
}`}
                </pre>
              </Panel>
              <Panel 
                header="Procesamiento en Lote" 
                key="2"
                extra={<ThunderboltOutlined />}
              >
                <pre style={{ background: '#f6f6f6', padding: 16, borderRadius: 4, overflow: 'auto' }}>
                  {apiExamples.batch}
                </pre>
              </Panel>
              <Panel 
                header="Sistema de Feedback" 
                key="3"
                extra={<SyncOutlined />}
              >
                <pre style={{ background: '#f6f6f6', padding: 16, borderRadius: 4, overflow: 'auto' }}>
                  {apiExamples.feedback}
                </pre>
              </Panel>
              <Panel 
                header="Webhooks & Eventos" 
                key="4"
                extra={<ApiOutlined />}
              >
                <pre style={{ background: '#f6f6f6', padding: 16, borderRadius: 4, overflow: 'auto' }}>
{`# Configurar webhook para notificaciones
curl -X POST http://localhost:3001/api/tags/webhooks \\
  -H "Authorization: Bearer TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://your-app.com/webhook",
    "events": ["tag.applied", "tag.confidence.low", "tag.feedback.received"],
    "secret": "your-webhook-secret"
  }'

# Eventos disponibles:
- tag.applied: Cuando se aplica un tag a una entidad
- tag.suggested: Cuando se generan sugerencias
- tag.confidence.low: Tags aplicados con baja confianza (<0.7)
- tag.feedback.received: Cuando se recibe feedback del usuario
- tag.learning.improved: Cuando el sistema mejora sus patrones`}
                </pre>
              </Panel>
            </Collapse>
          </Col>
        </Row>
      </section>

      {/* Learning System */}
      <section style={{ padding: '60px 20px', background: '#f0f2f5' }}>
        <Row justify="center">
          <Col xs={24} sm={24} md={22} lg={20} xl={18}>
            <Title level={2} style={{ textAlign: 'center', marginBottom: 48 }}>
              <BulbOutlined style={{ color: '#faad14', marginRight: 16 }} />
              Sistema de Aprendizaje Continuo
            </Title>
            <Row gutter={[24, 24]}>
              <Col xs={24} md={12}>
                <Card title="Fuentes de Aprendizaje" extra={<SyncOutlined spin />}>
                  <Timeline>
                    <Timeline.Item color="green">
                      <strong>Feedback Directo:</strong> Usuarios corrigen tags incorrectos
                    </Timeline.Item>
                    <Timeline.Item color="blue">
                      <strong>Validación Manual:</strong> Aprobación/rechazo de sugerencias
                    </Timeline.Item>
                    <Timeline.Item color="orange">
                      <strong>Patrones Exitosos:</strong> Tags con alta tasa de aceptación
                    </Timeline.Item>
                    <Timeline.Item color="purple">
                      <strong>Análisis Contextual:</strong> Relaciones entre entidades similares
                    </Timeline.Item>
                    <Timeline.Item>
                      <strong>Métricas de Uso:</strong> Frecuencia y contexto de aplicación
                    </Timeline.Item>
                  </Timeline>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card title="Métricas de Aprendizaje" extra={<BarChartOutlined />}>
                  <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div>
                      <Text>Precisión Base → Actual</Text>
                      <Progress 
                        percent={92.5} 
                        success={{ percent: 75 }}
                        format={() => '75% → 92.5%'}
                      />
                    </div>
                    <div>
                      <Text>Patterns Aprendidos</Text>
                      <Progress percent={68} strokeColor="#722ed1" format={() => '3,247'} />
                    </div>
                    <div>
                      <Text>Feedback Procesado</Text>
                      <Progress percent={85} strokeColor="#13c2c2" format={() => '12.8K'} />
                    </div>
                    <div>
                      <Text>Confianza Promedio</Text>
                      <Progress percent={88} strokeColor="#fa8c16" />
                    </div>
                  </Space>
                </Card>
              </Col>
            </Row>
            <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
              <Col xs={24}>
                <Card>
                  <Title level={4}>Ciclo de Mejora Continua</Title>
                  <Alert
                    message="Machine Learning Pipeline"
                    description="El sistema mejora automáticamente basándose en el uso real y feedback"
                    type="success"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  <List grid={{ gutter: 16, xs: 1, sm: 2, md: 4 }}>
                    <List.Item>
                      <Card size="small" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 32, color: '#1890ff', marginBottom: 8 }}>
                          <DatabaseOutlined />
                        </div>
                        <Text strong>Recolección</Text>
                        <br />
                        <Text type="secondary">Datos de uso y feedback</Text>
                      </Card>
                    </List.Item>
                    <List.Item>
                      <Card size="small" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 32, color: '#52c41a', marginBottom: 8 }}>
                          <FilterOutlined />
                        </div>
                        <Text strong>Análisis</Text>
                        <br />
                        <Text type="secondary">Identificar patrones</Text>
                      </Card>
                    </List.Item>
                    <List.Item>
                      <Card size="small" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 32, color: '#722ed1', marginBottom: 8 }}>
                          <ExperimentOutlined />
                        </div>
                        <Text strong>Entrenamiento</Text>
                        <br />
                        <Text type="secondary">Actualizar modelos</Text>
                      </Card>
                    </List.Item>
                    <List.Item>
                      <Card size="small" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 32, color: '#fa8c16', marginBottom: 8 }}>
                          <RocketOutlined />
                        </div>
                        <Text strong>Despliegue</Text>
                        <br />
                        <Text type="secondary">Mejoras en producción</Text>
                      </Card>
                    </List.Item>
                  </List>
                </Card>
              </Col>
            </Row>
          </Col>
        </Row>
      </section>

      {/* Use Cases */}
      <section style={{ padding: '60px 20px' }}>
        <Row justify="center">
          <Col xs={24} sm={24} md={22} lg={20} xl={18}>
            <Title level={2} style={{ textAlign: 'center', marginBottom: 48 }}>
              Casos de Uso
            </Title>
            <Tabs centered>
              <TabPane tab={<span><DatabaseOutlined /> Transacciones</span>} key="transactions">
                <Card>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                      <Title level={5}>Categorización Automática</Title>
                      <List size="small">
                        <List.Item>• Gastos operativos vs. inversiones</List.Item>
                        <List.Item>• Identificación de proveedores recurrentes</List.Item>
                        <List.Item>• Detección de pagos de nómina</List.Item>
                        <List.Item>• Clasificación fiscal automática</List.Item>
                      </List>
                    </Col>
                    <Col xs={24} md={12}>
                      <Title level={5}>Ejemplo Real</Title>
                      <Card size="small" style={{ background: '#f6f8fa' }}>
                        <Text strong>Transacción:</Text> "Transferencia SEPA - Pago fact. 2024/001 - Consultoria IT"
                        <Divider style={{ margin: '8px 0' }} />
                        <Text strong>Tags Sugeridos:</Text>
                        <br />
                        <Space wrap style={{ marginTop: 8 }}>
                          <Tag color="blue">SERVICIOS_PROFESIONALES (95%)</Tag>
                          <Tag color="green">CONSULTORIA_IT (92%)</Tag>
                          <Tag color="orange">GASTO_DEDUCIBLE (88%)</Tag>
                        </Space>
                      </Card>
                    </Col>
                  </Row>
                </Card>
              </TabPane>
              <TabPane tab={<span><TeamOutlined /> Clientes</span>} key="clients">
                <Card>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                      <Title level={5}>Segmentación Inteligente</Title>
                      <List size="small">
                        <List.Item>• Clasificación por industria</List.Item>
                        <List.Item>• Nivel de actividad y engagement</List.Item>
                        <List.Item>• Potencial de crecimiento</List.Item>
                        <List.Item>• Riesgo crediticio</List.Item>
                      </List>
                    </Col>
                    <Col xs={24} md={12}>
                      <Title level={5}>Ejemplo Real</Title>
                      <Card size="small" style={{ background: '#f6f8fa' }}>
                        <Text strong>Cliente:</Text> "Tech Solutions SL - Software Development"
                        <Divider style={{ margin: '8px 0' }} />
                        <Text strong>Tags Sugeridos:</Text>
                        <br />
                        <Space wrap style={{ marginTop: 8 }}>
                          <Tag color="purple">TECH_INDUSTRY (98%)</Tag>
                          <Tag color="blue">B2B_SOFTWARE (94%)</Tag>
                          <Tag color="green">HIGH_VALUE (90%)</Tag>
                        </Space>
                      </Card>
                    </Col>
                  </Row>
                </Card>
              </TabPane>
              <TabPane tab={<span><FileTextOutlined /> Facturas</span>} key="invoices">
                <Card>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                      <Title level={5}>Análisis de Facturas</Title>
                      <List size="small">
                        <List.Item>• Tipo de servicio/producto</List.Item>
                        <List.Item>• Urgencia de cobro</List.Item>
                        <List.Item>• Categoría fiscal</List.Item>
                        <List.Item>• Recurrencia del servicio</List.Item>
                      </List>
                    </Col>
                    <Col xs={24} md={12}>
                      <Title level={5}>Ejemplo Real</Title>
                      <Card size="small" style={{ background: '#f6f8fa' }}>
                        <Text strong>Factura:</Text> "Desarrollo web e-commerce + hosting anual"
                        <Divider style={{ margin: '8px 0' }} />
                        <Text strong>Tags Sugeridos:</Text>
                        <br />
                        <Space wrap style={{ marginTop: 8 }}>
                          <Tag color="blue">WEB_DEVELOPMENT (96%)</Tag>
                          <Tag color="green">RECURRING_SERVICE (91%)</Tag>
                          <Tag color="orange">DIGITAL_SERVICES (89%)</Tag>
                        </Space>
                      </Card>
                    </Col>
                  </Row>
                </Card>
              </TabPane>
              <TabPane tab={<span><FolderOutlined /> Documentos</span>} key="documents">
                <Card>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                      <Title level={5}>Clasificación Documental</Title>
                      <List size="small">
                        <List.Item>• Tipo de documento</List.Item>
                        <List.Item>• Nivel de confidencialidad</List.Item>
                        <List.Item>• Departamento relevante</List.Item>
                        <List.Item>• Requisitos de retención</List.Item>
                      </List>
                    </Col>
                    <Col xs={24} md={12}>
                      <Title level={5}>Ejemplo Real</Title>
                      <Card size="small" style={{ background: '#f6f8fa' }}>
                        <Text strong>Documento:</Text> "Contrato de servicios cloud computing 2024-2026"
                        <Divider style={{ margin: '8px 0' }} />
                        <Text strong>Tags Sugeridos:</Text>
                        <br />
                        <Space wrap style={{ marginTop: 8 }}>
                          <Tag color="red">LEGAL_CONTRACT (97%)</Tag>
                          <Tag color="blue">IT_INFRASTRUCTURE (93%)</Tag>
                          <Tag color="purple">MULTI_YEAR (90%)</Tag>
                        </Space>
                      </Card>
                    </Col>
                  </Row>
                </Card>
              </TabPane>
            </Tabs>
          </Col>
        </Row>
      </section>

      {/* Getting Started */}
      <section style={{ padding: '60px 20px', background: '#001529', color: 'white' }}>
        <Row justify="center">
          <Col xs={24} sm={24} md={22} lg={20} xl={18}>
            <Title level={2} style={{ textAlign: 'center', color: 'white', marginBottom: 48 }}>
              Comenzar es Fácil
            </Title>
            <Row gutter={[32, 32]}>
              <Col xs={24} md={8}>
                <Card 
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none' }}
                  bodyStyle={{ textAlign: 'center' }}
                >
                  <div style={{ fontSize: 48, marginBottom: 16 }}>
                    <SafetyOutlined style={{ color: '#52c41a' }} />
                  </div>
                  <Title level={4} style={{ color: 'white' }}>
                    1. Configura Proveedores AI
                  </Title>
                  <Paragraph style={{ color: 'rgba(255,255,255,0.8)' }}>
                    Añade tus API keys de Claude AI y/o OpenAI para máxima precisión
                  </Paragraph>
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card 
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none' }}
                  bodyStyle={{ textAlign: 'center' }}
                >
                  <div style={{ fontSize: 48, marginBottom: 16 }}>
                    <TagsOutlined style={{ color: '#1890ff' }} />
                  </div>
                  <Title level={4} style={{ color: 'white' }}>
                    2. Define tus Tags
                  </Title>
                  <Paragraph style={{ color: 'rgba(255,255,255,0.8)' }}>
                    Crea tu taxonomía o usa nuestros tags predefinidos por industria
                  </Paragraph>
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card 
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none' }}
                  bodyStyle={{ textAlign: 'center' }}
                >
                  <div style={{ fontSize: 48, marginBottom: 16 }}>
                    <ThunderboltOutlined style={{ color: '#faad14' }} />
                  </div>
                  <Title level={4} style={{ color: 'white' }}>
                    3. Activa y Aprende
                  </Title>
                  <Paragraph style={{ color: 'rgba(255,255,255,0.8)' }}>
                    El sistema empieza a etiquetar y mejora con cada interacción
                  </Paragraph>
                </Card>
              </Col>
            </Row>
            <div style={{ textAlign: 'center', marginTop: 48 }}>
              <Space size="large">
                <Button type="primary" size="large" icon={<RocketOutlined />}>
                  Activar Sistema
                </Button>
                <Button 
                  size="large" 
                  ghost 
                  style={{ color: 'white', borderColor: 'white' }}
                  icon={<BookOutlined />}
                >
                  Ver Documentación
                </Button>
              </Space>
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
                  Transforma tu Gestión con AI Universal Tagging
                </Title>
                <Paragraph style={{ fontSize: 18, marginBottom: 32 }}>
                  Ahorra horas de trabajo manual y mejora la precisión de tu categorización 
                  con el poder de la inteligencia artificial dual
                </Paragraph>
                <Row gutter={[16, 16]} justify="center" style={{ marginBottom: 32 }}>
                  <Col xs={12} sm={6}>
                    <Statistic 
                      title="Ahorro de Tiempo" 
                      value={85} 
                      suffix="%" 
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Col>
                  <Col xs={12} sm={6}>
                    <Statistic 
                      title="Precisión" 
                      value={92.5} 
                      suffix="%" 
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Col>
                  <Col xs={12} sm={6}>
                    <Statistic 
                      title="ROI" 
                      value={320} 
                      suffix="%" 
                      valueStyle={{ color: '#722ed1' }}
                    />
                  </Col>
                  <Col xs={12} sm={6}>
                    <Statistic 
                      title="Satisfacción" 
                      value={4.8} 
                      suffix="/5" 
                      valueStyle={{ color: '#fa8c16' }}
                    />
                  </Col>
                </Row>
                <Space size="large" wrap>
                  <Button 
                    type="primary" 
                    size="large" 
                    icon={<RocketOutlined />}
                    style={{ height: 48, fontSize: 16 }}
                    onClick={() => setShowDemoModal(true)}
                  >
                    Probar Ahora Gratis
                  </Button>
                  <Button 
                    size="large" 
                    icon={<CalendarOutlined />}
                    style={{ height: 48, fontSize: 16 }}
                  >
                    Agendar Demo
                  </Button>
                </Space>
                <Divider />
                <Space>
                  <LockOutlined style={{ color: '#52c41a' }} />
                  <Text type="secondary">
                    Tus datos están seguros y encriptados. GDPR compliant.
                  </Text>
                </Space>
              </Card>
            </motion.div>
          </Col>
        </Row>
      </section>

      {/* Demo Modal */}
      <Modal
        title={
          <Space>
            <TagsOutlined style={{ color: '#52c41a' }} />
            <span>Demo en Vivo - AI Universal Tagging</span>
          </Space>
        }
        visible={showDemoModal}
        onCancel={() => setShowDemoModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowDemoModal(false)}>
            Cerrar
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            icon={<RocketOutlined />}
            onClick={() => {
              notification.success({
                message: 'Demo Completada',
                description: 'El sistema de tagging está listo para usar. Configura tus API keys para comenzar.',
              });
              setShowDemoModal(false);
            }}
          >
            Activar en mi Sistema
          </Button>
        ]}
        width={800}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Alert
            message="Prueba el Sistema en Tiempo Real"
            description="Escribe o pega cualquier texto y ve cómo el AI sugiere tags automáticamente"
            type="info"
            showIcon
          />
          
          <Card title="Ejemplo: Transacción Bancaria" style={{ background: '#f6f8fa' }}>
            <Input.TextArea 
              defaultValue="Transferencia recibida - Factura 2024/0156 - Servicios de consultoría tecnológica - Cliente: Tech Innovations SL"
              rows={3}
              style={{ marginBottom: 16 }}
            />
            <Divider />
            <Title level={5}>Tags Sugeridos por AI:</Title>
            <Space wrap>
              <Tag color="blue" icon={<CheckCircleOutlined />}>
                INGRESO_SERVICIOS (96%)
              </Tag>
              <Tag color="green" icon={<CheckCircleOutlined />}>
                CONSULTORIA_IT (94%)
              </Tag>
              <Tag color="purple" icon={<CheckCircleOutlined />}>
                CLIENTE_B2B (91%)
              </Tag>
              <Tag color="orange" icon={<CheckCircleOutlined />}>
                FACTURA_COBRADA (89%)
              </Tag>
            </Space>
            <Divider />
            <Row gutter={[16, 8]}>
              <Col xs={12}>
                <Text type="secondary">Método:</Text> <Tag>Claude AI</Tag>
              </Col>
              <Col xs={12}>
                <Text type="secondary">Tiempo:</Text> <Tag>187ms</Tag>
              </Col>
              <Col xs={12}>
                <Text type="secondary">Confianza Global:</Text> <Tag color="green">92.5%</Tag>
              </Col>
              <Col xs={12}>
                <Text type="secondary">Idioma Detectado:</Text> <Tag>ES</Tag>
              </Col>
            </Row>
          </Card>

          <Card style={{ background: '#e6f7ff', border: '1px solid #91d5ff' }}>
            <Space>
              <BulbOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              <div>
                <Text strong>¿Cómo funciona?</Text>
                <br />
                <Text type="secondary">
                  El AI analiza el contexto, identifica entidades clave, y sugiere tags basándose 
                  en miles de ejemplos previos y patrones aprendidos
                </Text>
              </div>
            </Space>
          </Card>
        </Space>
      </Modal>
    </div>
  );
};

// Import these from antd and ant-design/icons at the top of the file instead

export default TaggingIntelligence;