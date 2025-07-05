import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  Descriptions,
  Button,
  Space,
  Tag,
  Tabs,
  Spin,
  Empty,
  message,
  Input,
  List,
  Typography,
  Row,
  Col,
  Progress,
  Alert,
  Modal
} from 'antd';
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  DeleteOutlined,
  ExperimentOutlined,
  EditOutlined,
  QuestionCircleOutlined,
  TagsOutlined,
  BarsOutlined
} from '@ant-design/icons';
import documentService from '../../services/documentService';
import {
  getDocumentTypeLabel,
  getFileFormatLabel,
  getDocumentSourceLabel,
  formatFileSize,
  EntityType
} from '../../types/document.types';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

const DocumentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [questionInput, setQuestionInput] = useState('');
  const [questionLoading, setQuestionLoading] = useState(false);
  const [answer, setAnswer] = useState<{ answer: string; confidence: number } | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  // Fetch document
  const { data: document, isLoading, refetch } = useQuery({
    queryKey: ['document', id],
    queryFn: () => documentService.getDocument(id!),
    enabled: !!id
  });

  // Fetch analysis if available
  const { data: analysis } = useQuery({
    queryKey: ['document-analysis', id],
    queryFn: () => documentService.getDocumentAnalysis(id!),
    enabled: !!id && !!document?.analysis
  });

  // Handle analyze
  const handleAnalyze = async () => {
    try {
      message.loading('Analizando documento...', 0);
      await documentService.analyzeDocument(id!);
      message.destroy();
      message.success('Análisis completado exitosamente');
      refetch();
    } catch (error) {
      message.destroy();
      message.error('Error al analizar el documento');
      console.error(error);
    }
  };

  // Handle question
  const handleQuestion = async () => {
    if (!questionInput.trim()) {
      message.warning('Por favor ingrese una pregunta');
      return;
    }

    setQuestionLoading(true);
    try {
      const result = await documentService.answerQuestion(id!, questionInput);
      setAnswer(result);
      message.success('Respuesta generada exitosamente');
    } catch (error) {
      message.error('Error al procesar la pregunta');
      console.error(error);
    } finally {
      setQuestionLoading(false);
    }
  };

  // Handle download
  const handleDownload = async () => {
    if (!document) return;
    
    try {
      const blob = await documentService.downloadFile(document.metadata.fileName);
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.metadata.fileName;
      a.click();
      window.URL.revokeObjectURL(url);
      message.success('Documento descargado exitosamente');
    } catch (error) {
      message.error('Error al descargar el documento');
      console.error(error);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    try {
      await documentService.deleteDocument(id!);
      message.success('Documento eliminado exitosamente');
      navigate('/documents');
    } catch (error) {
      message.error('Error al eliminar el documento');
      console.error(error);
    }
  };

  // Get entity type icon and color
  const getEntityTypeConfig = (type: EntityType) => {
    const config: Record<EntityType, { color: string; icon: string }> = {
      [EntityType.PERSON]: { color: 'blue', icon: '👤' },
      [EntityType.ORGANIZATION]: { color: 'green', icon: '🏢' },
      [EntityType.LOCATION]: { color: 'orange', icon: '📍' },
      [EntityType.DATE]: { color: 'purple', icon: '📅' },
      [EntityType.MONEY]: { color: 'gold', icon: '💰' },
      [EntityType.PHONE]: { color: 'cyan', icon: '📞' },
      [EntityType.EMAIL]: { color: 'magenta', icon: '📧' },
      [EntityType.URL]: { color: 'lime', icon: '🔗' },
      [EntityType.PRODUCT]: { color: 'volcano', icon: '📦' },
      [EntityType.EVENT]: { color: 'geekblue', icon: '🎉' },
      [EntityType.OTHER]: { color: 'default', icon: '🏷️' }
    };
    return config[type] || config[EntityType.OTHER];
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!document) {
    return (
      <Card>
        <Empty description="Documento no encontrado" />
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button onClick={() => navigate('/documents')}>
            Volver a documentos
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="document-detail">
      <Card
        title={
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/documents')}
            />
            <Title level={4} style={{ margin: 0 }}>{document.title}</Title>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleDownload}
            >
              Descargar
            </Button>
            {!document.analysis && (
              <Button
                type="primary"
                icon={<ExperimentOutlined />}
                onClick={handleAnalyze}
              >
                Analizar
              </Button>
            )}
            <Button
              icon={<EditOutlined />}
              onClick={() => navigate(`/documents/${id}/edit`)}
            >
              Editar
            </Button>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => setDeleteModalVisible(true)}
            >
              Eliminar
            </Button>
          </Space>
        }
      >
        <Tabs defaultActiveKey="info">
          <TabPane tab="Información" key="info">
            <Descriptions bordered column={{ xs: 1, sm: 2, md: 2 }}>
              <Descriptions.Item label="Tipo">
                <Tag color="blue">{getDocumentTypeLabel(document.type)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Formato">
                <Tag>{getFileFormatLabel(document.format)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Nombre de archivo">
                {document.metadata.fileName}
              </Descriptions.Item>
              <Descriptions.Item label="Tamaño">
                {formatFileSize(document.metadata.fileSize)}
              </Descriptions.Item>
              <Descriptions.Item label="Origen">
                <Tag color="green">{getDocumentSourceLabel(document.metadata.source)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Fecha de creación">
                {new Date(document.createdAt).toLocaleString('es-ES')}
              </Descriptions.Item>
              {document.content.pages && (
                <Descriptions.Item label="Páginas">
                  {document.content.pages}
                </Descriptions.Item>
              )}
              {document.content.wordCount && (
                <Descriptions.Item label="Palabras">
                  {document.content.wordCount.toLocaleString()}
                </Descriptions.Item>
              )}
              {document.content.language && (
                <Descriptions.Item label="Idioma">
                  {document.content.language.toUpperCase()}
                </Descriptions.Item>
              )}
              {document.metadata.tags && document.metadata.tags.length > 0 && (
                <Descriptions.Item label="Etiquetas" span={2}>
                  <Space wrap>
                    {document.metadata.tags.map(tag => (
                      <Tag key={tag} icon={<TagsOutlined />}>{tag}</Tag>
                    ))}
                  </Space>
                </Descriptions.Item>
              )}
            </Descriptions>
          </TabPane>

          <TabPane tab="Contenido" key="content">
            <Card>
              <Paragraph
                style={{
                  maxHeight: 400,
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  lineHeight: '1.6'
                }}
              >
                {document.content.text.substring(0, 5000)}
                {document.content.text.length > 5000 && '...'}
              </Paragraph>
              {document.content.text.length > 5000 && (
                <Alert
                  message="Contenido truncado"
                  description={`Mostrando los primeros 5,000 caracteres de ${document.content.text.length.toLocaleString()} caracteres totales.`}
                  type="info"
                  showIcon
                  style={{ marginTop: 16 }}
                />
              )}
            </Card>
          </TabPane>

          {document.analysis && (
            <TabPane tab="Análisis" key="analysis">
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Card title="Resumen">
                    <Paragraph>{analysis?.summary || document.analysis.summary}</Paragraph>
                  </Card>
                </Col>

                {document.analysis.entities && document.analysis.entities.length > 0 && (
                  <Col xs={24} md={12}>
                    <Card title="Entidades Detectadas">
                      <List
                        size="small"
                        dataSource={document.analysis.entities}
                        renderItem={(entity) => {
                          const config = getEntityTypeConfig(entity.type);
                          return (
                            <List.Item>
                              <Space>
                                <span>{config.icon}</span>
                                <Tag color={config.color}>{entity.type}</Tag>
                                <Text>{entity.text}</Text>
                                <Text type="secondary">
                                  ({Math.round(entity.confidence * 100)}%)
                                </Text>
                              </Space>
                            </List.Item>
                          );
                        }}
                      />
                    </Card>
                  </Col>
                )}

                {document.analysis.topics && document.analysis.topics.length > 0 && (
                  <Col xs={24} md={12}>
                    <Card title="Temas Principales">
                      <List
                        size="small"
                        dataSource={document.analysis.topics}
                        renderItem={(topic) => (
                          <List.Item>
                            <div style={{ width: '100%' }}>
                              <Space direction="vertical" style={{ width: '100%' }}>
                                <Space>
                                  <BarsOutlined />
                                  <Text strong>{topic.name}</Text>
                                </Space>
                                <Progress
                                  percent={Math.round(topic.confidence * 100)}
                                  size="small"
                                  status="active"
                                />
                                <Space wrap>
                                  {topic.keywords.slice(0, 3).map(keyword => (
                                    <Tag key={keyword}>{keyword}</Tag>
                                  ))}
                                </Space>
                              </Space>
                            </div>
                          </List.Item>
                        )}
                      />
                    </Card>
                  </Col>
                )}

                {document.analysis.questions && document.analysis.questions.length > 0 && (
                  <Col span={24}>
                    <Card title="Preguntas Sugeridas">
                      <List
                        dataSource={document.analysis.questions}
                        renderItem={(question) => (
                          <List.Item
                            actions={[
                              <Button
                                size="small"
                                onClick={() => {
                                  setQuestionInput(question);
                                  window.document.getElementById('question-input')?.focus();
                                }}
                              >
                                Usar
                              </Button>
                            ]}
                          >
                            <QuestionCircleOutlined style={{ marginRight: 8 }} />
                            {question}
                          </List.Item>
                        )}
                      />
                    </Card>
                  </Col>
                )}
              </Row>
            </TabPane>
          )}

          <TabPane tab="Preguntas y Respuestas" key="qa">
            <Card>
              <Space direction="vertical" style={{ width: '100%' }}>
                <TextArea
                  id="question-input"
                  placeholder="Haga una pregunta sobre este documento..."
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  onPressEnter={(e) => {
                    if (!e.shiftKey) {
                      e.preventDefault();
                      handleQuestion();
                    }
                  }}
                  rows={3}
                />
                <Button
                  type="primary"
                  icon={<QuestionCircleOutlined />}
                  onClick={handleQuestion}
                  loading={questionLoading}
                  disabled={!document.analysis}
                >
                  Preguntar
                </Button>

                {!document.analysis && (
                  <Alert
                    message="Análisis requerido"
                    description="Debe analizar el documento antes de hacer preguntas."
                    type="warning"
                    showIcon
                  />
                )}

                {answer && (
                  <Card
                    title="Respuesta"
                    extra={
                      <Tag color={answer.confidence > 0.8 ? 'green' : answer.confidence > 0.5 ? 'orange' : 'red'}>
                        Confianza: {Math.round(answer.confidence * 100)}%
                      </Tag>
                    }
                  >
                    <Paragraph>{answer.answer}</Paragraph>
                  </Card>
                )}
              </Space>
            </Card>
          </TabPane>
        </Tabs>
      </Card>

      <Modal
        title="Confirmar eliminación"
        visible={deleteModalVisible}
        onOk={handleDelete}
        onCancel={() => setDeleteModalVisible(false)}
        okText="Eliminar"
        cancelText="Cancelar"
        okButtonProps={{ danger: true }}
      >
        <p>¿Está seguro de que desea eliminar el documento "{document.title}"?</p>
        <p>Esta acción no se puede deshacer.</p>
      </Modal>
    </div>
  );
};

export default DocumentDetail;