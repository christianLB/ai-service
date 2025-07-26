import React, { useState } from "react";
import {
  Typography,
  Row,
  Col,
  Card,
  Button,
  Space,
  Steps,
  Tabs,
  List,
  Timeline,
  Alert,
  Collapse,
  Badge,
} from "antd";
import {
  FileTextOutlined,
  SearchOutlined,
  BulbOutlined,
  ApiOutlined,
  MessageOutlined,
  CloudUploadOutlined,
  CheckCircleOutlined,
  RocketOutlined,
  SafetyOutlined,
  ThunderboltOutlined,
  CodeOutlined,
  DatabaseOutlined,
  LineChartOutlined,
  BookOutlined,
  SyncOutlined,
  EyeOutlined,
  QuestionCircleOutlined,
  HistoryOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import "./DocumentIntelligence.css";

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;
const { Panel } = Collapse;

const DocumentIntelligence: React.FC = () => {
  const [activeTab, setActiveTab] = useState("1");

  const features = [
    {
      icon: <FileTextOutlined />,
      title: "Soporte Multi-Formato",
      description: "Procesa PDF, DOCX, TXT, HTML, Markdown, CSV, Excel y más",
      color: "#1890ff",
    },
    {
      icon: <BulbOutlined />,
      title: "Análisis con IA",
      description: "GPT-4 para resumir, extraer entidades y análisis profundo",
      color: "#52c41a",
    },
    {
      icon: <SearchOutlined />,
      title: "Búsqueda Semántica",
      description: "Encuentra información con búsqueda natural inteligente",
      color: "#722ed1",
    },
    {
      icon: <QuestionCircleOutlined />,
      title: "Sistema Q&A",
      description:
        "Haz preguntas sobre tus documentos y obtén respuestas precisas",
      color: "#fa8c16",
    },
    {
      icon: <HistoryOutlined />,
      title: "Memoria Universal",
      description: "Recuerda TODO - documentos, decisiones, ideas y más",
      color: "#eb2f96",
    },
    {
      icon: <SyncOutlined />,
      title: "Auto-Documentación",
      description: "El sistema se documenta automáticamente mientras trabajas",
      color: "#13c2c2",
    },
  ];

  const useCases = [
    {
      title: "Procesamiento Financiero",
      icon: <DatabaseOutlined />,
      items: [
        "Análisis de facturas y extracción de datos",
        "Revisión de contratos e identificación de términos clave",
        "Resumen de reportes financieros",
        "Verificación de documentos de cumplimiento",
      ],
    },
    {
      title: "Gestión del Conocimiento",
      icon: <BookOutlined />,
      items: [
        "Búsqueda en documentación de la empresa",
        "Q&A sobre políticas y procedimientos",
        "Análisis de materiales de capacitación",
        "Resumen de notas de reuniones",
      ],
    },
    {
      title: "Investigación y Análisis",
      icon: <LineChartOutlined />,
      items: [
        "Resumen de papers académicos",
        "Organización de documentos de investigación",
        "Asistencia en revisión de literatura",
        "Extracción de datos de reportes",
      ],
    },
    {
      title: "Segundo Cerebro Digital",
      icon: <BulbOutlined />,
      items: [
        "Captura de ideas y pensamientos",
        "Seguimiento de decisiones del proyecto",
        "Documentación automática de cambios",
        "Memoria contextual perfecta",
      ],
    },
  ];

  const integrations = [
    {
      name: "Telegram Bot",
      description: "Interacción fácil vía chat",
      icon: <MessageOutlined />,
    },
    {
      name: "REST API",
      description: "Integración programática completa",
      icon: <ApiOutlined />,
    },
    {
      name: "MCP Bridge",
      description: "25+ herramientas para IA",
      icon: <LinkOutlined />,
    },
    {
      name: "Claude AI",
      description: "Contexto optimizado para Claude",
      icon: <RocketOutlined />,
    },
  ];

  const memoryCommands = [
    {
      command: "/remember",
      description: "Guardar cualquier pensamiento o idea",
    },
    { command: "/todo", description: "Crear una tarea pendiente" },
    { command: "/decision", description: "Documentar una decisión importante" },
    { command: "/question", description: "Guardar preguntas sin responder" },
    {
      command: "/recall",
      description: "Buscar en tu memoria con lenguaje natural",
    },
    { command: "/gendoc", description: "Generar documentación automática" },
  ];

  return (
    <div className="document-intelligence-page">
      {/* Hero Section */}
      <section className="hero-section">
        <Row
          justify="center"
          align="middle"
          style={{ minHeight: "60vh", padding: "40px 20px" }}
        >
          <Col xs={24} sm={24} md={20} lg={16} xl={14}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Space
                direction="vertical"
                size="large"
                style={{ width: "100%", textAlign: "center" }}
              >
                <Badge.Ribbon text="v3.0" color="green">
                  <Title level={1} style={{ marginBottom: 0 }}>
                    <BulbOutlined
                      style={{ color: "#1890ff", marginRight: 16 }}
                    />
                    Document Intelligence
                  </Title>
                </Badge.Ribbon>
                <Title level={2} style={{ marginTop: 0, fontWeight: "normal" }}>
                  Tu Segundo Cerebro Digital con IA
                </Title>
                <Paragraph
                  style={{
                    fontSize: "18px",
                    maxWidth: "800px",
                    margin: "0 auto",
                  }}
                >
                  Sistema inteligente que transforma documentos en conocimiento
                  estructurado. Procesa, analiza, recuerda y conecta toda tu
                  información automáticamente.
                </Paragraph>
                <Space size="large" wrap>
                  <Button type="primary" size="large" icon={<RocketOutlined />}>
                    Comenzar Ahora
                  </Button>
                  <Button size="large" icon={<EyeOutlined />}>
                    Ver Demo
                  </Button>
                </Space>
              </Space>
            </motion.div>
          </Col>
        </Row>
      </section>

      {/* Features Section */}
      <section style={{ padding: "60px 20px", background: "#f0f2f5" }}>
        <Row justify="center">
          <Col xs={24} sm={24} md={22} lg={20} xl={18}>
            <Title level={2} style={{ textAlign: "center", marginBottom: 48 }}>
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
                      style={{ height: "100%", textAlign: "center" }}
                      bodyStyle={{ padding: "32px" }}
                    >
                      <div
                        style={{
                          fontSize: 48,
                          color: feature.color,
                          marginBottom: 16,
                        }}
                      >
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

      {/* How it Works */}
      <section style={{ padding: "60px 20px" }}>
        <Row justify="center">
          <Col xs={24} sm={24} md={22} lg={20} xl={18}>
            <Title level={2} style={{ textAlign: "center", marginBottom: 48 }}>
              ¿Cómo Funciona?
            </Title>
            <Steps
              current={-1}
              direction="vertical"
              style={{ maxWidth: "800px", margin: "0 auto" }}
            >
              <Steps.Step
                title="1. Ingesta de Documentos"
                description="Sube documentos en cualquier formato: PDF, Word, Excel, texto plano, HTML, etc."
                icon={<CloudUploadOutlined />}
              />
              <Steps.Step
                title="2. Procesamiento Inteligente"
                description="La IA extrae contenido, identifica estructura y genera embeddings semánticos"
                icon={<ThunderboltOutlined />}
              />
              <Steps.Step
                title="3. Análisis Profundo"
                description="GPT-4 analiza, resume, extrae entidades y detecta patrones importantes"
                icon={<ThunderboltOutlined />}
              />
              <Steps.Step
                title="4. Almacenamiento Estructurado"
                description="Toda la información se guarda con metadatos ricos y conexiones inteligentes"
                icon={<DatabaseOutlined />}
              />
              <Steps.Step
                title="5. Búsqueda y Q&A"
                description="Encuentra información instantáneamente y haz preguntas en lenguaje natural"
                icon={<SearchOutlined />}
              />
              <Steps.Step
                title="6. Memoria Continua"
                description="El sistema recuerda todo y se auto-documenta mientras trabajas"
                icon={<SyncOutlined />}
              />
            </Steps>
          </Col>
        </Row>
      </section>

      {/* Use Cases */}
      <section style={{ padding: "60px 20px", background: "#f0f2f5" }}>
        <Row justify="center">
          <Col xs={24} sm={24} md={22} lg={20} xl={18}>
            <Title level={2} style={{ textAlign: "center", marginBottom: 48 }}>
              Casos de Uso
            </Title>
            <Tabs activeKey={activeTab} onChange={setActiveTab} centered>
              {useCases.map((useCase, index) => (
                <TabPane
                  tab={
                    <span>
                      {useCase.icon}
                      <span style={{ marginLeft: 8 }}>{useCase.title}</span>
                    </span>
                  }
                  key={String(index + 1)}
                >
                  <Card>
                    <List
                      dataSource={useCase.items}
                      renderItem={(item) => (
                        <List.Item>
                          <Space>
                            <CheckCircleOutlined style={{ color: "#52c41a" }} />
                            {item}
                          </Space>
                        </List.Item>
                      )}
                    />
                  </Card>
                </TabPane>
              ))}
            </Tabs>
          </Col>
        </Row>
      </section>

      {/* Memory System */}
      <section style={{ padding: "60px 20px" }}>
        <Row justify="center">
          <Col xs={24} sm={24} md={22} lg={20} xl={18}>
            <Title level={2} style={{ textAlign: "center", marginBottom: 48 }}>
              <BulbOutlined style={{ color: "#faad14", marginRight: 16 }} />
              Sistema de Memoria Universal
            </Title>
            <Alert
              message="Nueva Funcionalidad: Segundo Cerebro"
              description="Transforma Document Intelligence en tu memoria perfecta que captura, organiza y recuerda TODO"
              type="success"
              showIcon
              style={{ marginBottom: 32 }}
            />
            <Row gutter={[24, 24]}>
              <Col xs={24} md={12}>
                <Card title="Comandos de Memoria" extra={<MessageOutlined />}>
                  <List
                    dataSource={memoryCommands}
                    renderItem={(item) => (
                      <List.Item>
                        <Space direction="vertical" style={{ width: "100%" }}>
                          <Text code>{item.command}</Text>
                          <Text type="secondary">{item.description}</Text>
                        </Space>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card
                  title="Capacidades de Auto-Documentación"
                  extra={<SyncOutlined spin />}
                >
                  <Timeline>
                    <Timeline.Item color="green">
                      Observa cambios en archivos en tiempo real
                    </Timeline.Item>
                    <Timeline.Item color="blue">
                      Genera documentación automáticamente
                    </Timeline.Item>
                    <Timeline.Item color="orange">
                      Crea ADRs para decisiones arquitectónicas
                    </Timeline.Item>
                    <Timeline.Item color="purple">
                      Actualiza READMEs con cada cambio
                    </Timeline.Item>
                    <Timeline.Item>
                      Genera reportes de progreso diarios
                    </Timeline.Item>
                  </Timeline>
                </Card>
              </Col>
            </Row>
          </Col>
        </Row>
      </section>

      {/* Integration Section */}
      <section style={{ padding: "60px 20px", background: "#f0f2f5" }}>
        <Row justify="center">
          <Col xs={24} sm={24} md={22} lg={20} xl={18}>
            <Title level={2} style={{ textAlign: "center", marginBottom: 48 }}>
              Integraciones Disponibles
            </Title>
            <Row gutter={[24, 24]}>
              {integrations.map((integration, index) => (
                <Col xs={24} sm={12} md={6} key={index}>
                  <Card
                    hoverable
                    style={{ textAlign: "center" }}
                    bodyStyle={{ padding: "24px" }}
                  >
                    <div
                      style={{
                        fontSize: 36,
                        color: "#1890ff",
                        marginBottom: 16,
                      }}
                    >
                      {integration.icon}
                    </div>
                    <Title level={5}>{integration.name}</Title>
                    <Text type="secondary">{integration.description}</Text>
                  </Card>
                </Col>
              ))}
            </Row>
          </Col>
        </Row>
      </section>

      {/* API Examples */}
      <section style={{ padding: "60px 20px" }}>
        <Row justify="center">
          <Col xs={24} sm={24} md={22} lg={20} xl={18}>
            <Title level={2} style={{ textAlign: "center", marginBottom: 48 }}>
              Ejemplos de Integración
            </Title>
            <Collapse defaultActiveKey={["1"]}>
              <Panel
                header="REST API - Subir y Analizar Documento"
                key="1"
                extra={<CodeOutlined />}
              >
                <pre
                  style={{
                    background: "#f6f6f6",
                    padding: 16,
                    borderRadius: 4,
                    overflow: "auto",
                  }}
                >
                  {`# Subir documento
curl -X POST http://localhost:3001/api/documents/upload \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -F "file=@documento.pdf"

# Analizar documento
curl -X POST http://localhost:3001/api/documents/{id}/analyze \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"analysisType": "full"}'

# Hacer pregunta
curl -X POST http://localhost:3001/api/documents/{id}/ask \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"question": "¿Cuáles son los puntos principales?"}'`}
                </pre>
              </Panel>
              <Panel
                header="Telegram Bot - Comandos de Memoria"
                key="2"
                extra={<MessageOutlined />}
              >
                <pre
                  style={{
                    background: "#f6f6f6",
                    padding: 16,
                    borderRadius: 4,
                    overflow: "auto",
                  }}
                >
                  {`# Guardar un pensamiento
/remember Necesito refactorizar el servicio de autenticación

# Crear una tarea
/todo Agregar tests para el servicio de memoria

# Documentar una decisión
/decision Usar PostgreSQL para almacenamiento principal

# Guardar una pregunta
/question ¿Deberíamos migrar a microservicios?

# Buscar en tu memoria
/recall servicio de autenticación

# Generar documentación
/gendoc readme`}
                </pre>
              </Panel>
              <Panel
                header="Node.js - Integración Programática"
                key="3"
                extra={<ApiOutlined />}
              >
                <pre
                  style={{
                    background: "#f6f6f6",
                    padding: 16,
                    borderRadius: 4,
                    overflow: "auto",
                  }}
                >
                  {`import { DocumentIntelligenceClient } from '@ai-service/client';

const client = new DocumentIntelligenceClient({
  apiKey: process.env.AI_SERVICE_TOKEN,
  baseURL: 'http://localhost:3001'
});

// Procesar documento
const document = await client.documents.upload({
  file: './contrato.pdf',
  metadata: {
    type: 'contract',
    client: 'ACME Corp'
  }
});

// Analizar contenido
const analysis = await client.documents.analyze(document.id, {
  summarize: true,
  extractEntities: true,
  generateQuestions: true
});

// Buscar información
const results = await client.search.query(
  '¿Cuáles son las cláusulas de penalización?'
);`}
                </pre>
              </Panel>
            </Collapse>
          </Col>
        </Row>
      </section>

      {/* Getting Started */}
      <section
        style={{ padding: "60px 20px", background: "#001529", color: "white" }}
      >
        <Row justify="center">
          <Col xs={24} sm={24} md={22} lg={20} xl={18}>
            <Title
              level={2}
              style={{ textAlign: "center", color: "white", marginBottom: 48 }}
            >
              Comienza en 3 Pasos
            </Title>
            <Row gutter={[32, 32]}>
              <Col xs={24} md={8}>
                <Card
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    border: "none",
                  }}
                  bodyStyle={{ textAlign: "center" }}
                >
                  <div style={{ fontSize: 48, marginBottom: 16 }}>
                    <SafetyOutlined style={{ color: "#52c41a" }} />
                  </div>
                  <Title level={4} style={{ color: "white" }}>
                    1. Configura las Claves
                  </Title>
                  <Paragraph style={{ color: "rgba(255,255,255,0.8)" }}>
                    Agrega tu API key de OpenAI y configura Telegram si lo
                    deseas
                  </Paragraph>
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    border: "none",
                  }}
                  bodyStyle={{ textAlign: "center" }}
                >
                  <div style={{ fontSize: 48, marginBottom: 16 }}>
                    <CloudUploadOutlined style={{ color: "#1890ff" }} />
                  </div>
                  <Title level={4} style={{ color: "white" }}>
                    2. Sube Documentos
                  </Title>
                  <Paragraph style={{ color: "rgba(255,255,255,0.8)" }}>
                    Carga tus documentos vía API, Telegram o la interfaz web
                  </Paragraph>
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    border: "none",
                  }}
                  bodyStyle={{ textAlign: "center" }}
                >
                  <div style={{ fontSize: 48, marginBottom: 16 }}>
                    <BulbOutlined style={{ color: "#faad14" }} />
                  </div>
                  <Title level={4} style={{ color: "white" }}>
                    3. Explora y Pregunta
                  </Title>
                  <Paragraph style={{ color: "rgba(255,255,255,0.8)" }}>
                    Busca información, haz preguntas y deja que el sistema
                    aprenda
                  </Paragraph>
                </Card>
              </Col>
            </Row>
            <div style={{ textAlign: "center", marginTop: 48 }}>
              <Space size="large">
                <Button type="primary" size="large" icon={<RocketOutlined />}>
                  Empezar Ahora
                </Button>
                <Button
                  size="large"
                  ghost
                  style={{ color: "white", borderColor: "white" }}
                >
                  Ver Documentación
                </Button>
              </Space>
            </div>
          </Col>
        </Row>
      </section>
    </div>
  );
};

export default DocumentIntelligence;
