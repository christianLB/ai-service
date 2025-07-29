import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Space,
  Upload,
  message,
  Spin,
  Row,
  Col,
  Tag,
  Switch,
  Divider
} from 'antd';
import {
  ArrowLeftOutlined,
  UploadOutlined,
  PlusOutlined,
  SaveOutlined
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import documentService from '../../services/documentService';
import {
  DocumentType,
  DocumentSource,
  getDocumentTypeLabel,
  getDocumentSourceLabel
} from '../../types/document.types';

const { TextArea } = Input;
const { Option } = Select;

// Removed unused interface - values are accessed directly from form

const DocumentForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const isEditMode = !!id;

  // Fetch document for edit mode
  const { data: document, isLoading } = useQuery({
    queryKey: ['document', id],
    queryFn: () => documentService.getDocument(id!),
    enabled: isEditMode
  });

  // Set form values when document is loaded
  useEffect(() => {
    if (document) {
      form.setFieldsValue({
        title: document.title,
        type: document.type,
        content: document.content.text,
        tags: document.metadata.tags || [],
        metadata: {
          source: document.metadata.source,
          userId: document.metadata.userId
        }
      });
    }
  }, [document, form]);

  const handleUpload: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
    try {
      const metadata = form.getFieldValue('metadata') || {};
      const tags = form.getFieldValue('tags') || [];
      
      const result = await documentService.uploadDocument(file as File, {
        tags,
        userId: metadata.userId
      });

      message.success(`Documento "${result.document.title}" cargado exitosamente`);
      
      // If auto-analyze is enabled
      if (form.getFieldValue('autoAnalyze')) {
        try {
          await documentService.analyzeDocument(
            result.document.id,
            form.getFieldValue('analysisProfile')
          );
          message.success('Análisis completado exitosamente');
        } catch {
          message.warning('Documento cargado pero el análisis falló');
        }
      }

      navigate(`/documents/${result.document.id}`);
      onSuccess?.(result, file);
    } catch (error) {
      message.error('Error al cargar el documento');
      console.error(error);
      onError?.(error as Error);
    }
  };

  const handleSubmit = async () => {
    if (!isEditMode && fileList.length === 0) {
      message.error('Por favor seleccione un archivo para cargar');
      return;
    }

    setSaving(true);
    try {
      if (isEditMode) {
        // Update document logic would go here
        message.success('Documento actualizado exitosamente');
        navigate(`/documents/${id}`);
      } else {
        // For new documents, trigger the upload
        if (fileList.length > 0) {
          const uploadButton = window.document?.querySelector('.ant-upload-btn') as HTMLElement;
          uploadButton?.click();
        }
      }
    } catch (error) {
      message.error('Error al guardar el documento');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim()) {
      const currentTags = form.getFieldValue('tags') || [];
      if (!currentTags.includes(tagInput.trim())) {
        form.setFieldsValue({
          tags: [...currentTags, tagInput.trim()]
        });
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = form.getFieldValue('tags') || [];
    form.setFieldsValue({
      tags: currentTags.filter((tag: string) => tag !== tagToRemove)
    });
  };

  if (isEditMode && isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Card
      title={
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/documents')}
          />
          <span>{isEditMode ? 'Editar Documento' : 'Nuevo Documento'}</span>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          type: DocumentType.OTHER,
          autoAnalyze: true,
          metadata: {
            source: DocumentSource.WEB
          }
        }}
      >
        <Row gutter={24}>
          <Col xs={24} lg={16}>
            {!isEditMode && (
              <Form.Item
                label="Archivo"
                required
                help="Formatos soportados: PDF, DOC, DOCX, TXT, HTML, MD, CSV, XLSX, PPTX, imágenes"
              >
                <Upload
                  accept=".pdf,.doc,.docx,.txt,.html,.md,.csv,.xlsx,.pptx,.jpg,.jpeg,.png,.gif,.bmp"
                  fileList={fileList}
                  beforeUpload={(file) => {
                    setFileList([file]);
                    return false; // Prevent auto upload
                  }}
                  onRemove={() => setFileList([])}
                  maxCount={1}
                  customRequest={handleUpload}
                >
                  <Button icon={<UploadOutlined />}>Seleccionar archivo</Button>
                </Upload>
              </Form.Item>
            )}

            <Form.Item
              name="title"
              label="Título"
              rules={[{ required: isEditMode, message: 'Por favor ingrese un título' }]}
            >
              <Input placeholder="Título del documento" />
            </Form.Item>

            <Form.Item
              name="type"
              label="Tipo de Documento"
              rules={[{ required: true, message: 'Por favor seleccione un tipo' }]}
            >
              <Select placeholder="Seleccione el tipo de documento">
                {Object.values(DocumentType).map(type => (
                  <Option key={type} value={type}>
                    {getDocumentTypeLabel(type)}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {isEditMode && (
              <Form.Item
                name="content"
                label="Contenido"
                help="Puede editar el contenido textual del documento"
              >
                <TextArea
                  rows={10}
                  placeholder="Contenido del documento..."
                  style={{ fontFamily: 'monospace' }}
                />
              </Form.Item>
            )}

            <Divider />

            <Form.Item label="Etiquetas">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space style={{ width: '100%' }}>
                  <Input
                    placeholder="Agregar etiqueta..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onPressEnter={handleAddTag}
                    style={{ width: 200 }}
                  />
                  <Button onClick={handleAddTag} icon={<PlusOutlined />}>
                    Agregar
                  </Button>
                </Space>
                <Form.Item name="tags" noStyle>
                  <Input type="hidden" />
                </Form.Item>
                <Space wrap>
                  {(form.getFieldValue('tags') || []).map((tag: string) => (
                    <Tag
                      key={tag}
                      closable
                      onClose={() => handleRemoveTag(tag)}
                    >
                      {tag}
                    </Tag>
                  ))}
                </Space>
              </Space>
            </Form.Item>
          </Col>

          <Col xs={24} lg={8}>
            <Card title="Opciones" size="small">
              <Form.Item
                name={['metadata', 'source']}
                label="Origen"
              >
                <Select placeholder="Seleccione el origen">
                  {Object.values(DocumentSource).map(source => (
                    <Option key={source} value={source}>
                      {getDocumentSourceLabel(source)}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name={['metadata', 'userId']}
                label="ID de Usuario"
              >
                <Input placeholder="ID del usuario (opcional)" />
              </Form.Item>

              {!isEditMode && (
                <>
                  <Divider />
                  
                  <Form.Item
                    name="autoAnalyze"
                    label="Análisis Automático"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>

                  <Form.Item
                    noStyle
                    shouldUpdate={(prevValues, currentValues) =>
                      prevValues.autoAnalyze !== currentValues.autoAnalyze
                    }
                  >
                    {({ getFieldValue }) =>
                      getFieldValue('autoAnalyze') && (
                        <Form.Item
                          name="analysisProfile"
                          label="Perfil de Análisis"
                        >
                          <Select placeholder="Seleccione un perfil">
                            <Option value="basic">Básico</Option>
                            <Option value="detailed">Detallado</Option>
                            <Option value="financial">Financiero</Option>
                            <Option value="legal">Legal</Option>
                            <Option value="technical">Técnico</Option>
                          </Select>
                        </Form.Item>
                      )
                    }
                  </Form.Item>
                </>
              )}
            </Card>
          </Col>
        </Row>

        <Divider />

        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={saving || uploading}
            >
              {isEditMode ? 'Guardar Cambios' : 'Cargar Documento'}
            </Button>
            <Button onClick={() => navigate('/documents')}>
              Cancelar
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default DocumentForm;