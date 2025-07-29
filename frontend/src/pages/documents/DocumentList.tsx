import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Button,
  Space,
  Card,
  Tag,
  Input,
  Select,
  Row,
  Col,
  Upload,
  message,
  Tooltip,
  Badge,
  Empty,
  Spin
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  FileImageOutlined,
  FileUnknownOutlined,
  DownloadOutlined,
  DeleteOutlined,
  EyeOutlined,
  ExperimentOutlined,
  UploadOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd';
import documentService from '../../services/documentService';
import { 
  DocumentType, 
  FileFormat,
  DocumentSource,
  getDocumentTypeLabel,
  getFileFormatLabel,
  getDocumentSourceLabel,
  formatFileSize
} from '../../types/document.types';
import type { Document } from '../../types/document.types';

const { Search } = Input;
const { Option } = Select;

const DocumentList: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all');
  const [formatFilter, setFormatFilter] = useState<FileFormat | 'all'>('all');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Fetch documents
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['documents', searchTerm, typeFilter, formatFilter],
    queryFn: () => documentService.listDocuments({
      limit: 50,
      offset: 0,
      ...(typeFilter !== 'all' && { type: typeFilter }),
      ...(formatFilter !== 'all' && { format: formatFilter })
    })
  });

  // Get file icon based on format
  const getFileIcon = (format: FileFormat) => {
    const iconProps = { style: { fontSize: '16px' } };
    switch (format) {
      case FileFormat.PDF:
        return <FilePdfOutlined {...iconProps} style={{ color: '#ff4d4f' }} />;
      case FileFormat.DOCX:
      case FileFormat.DOC:
        return <FileWordOutlined {...iconProps} style={{ color: '#1890ff' }} />;
      case FileFormat.XLSX:
      case FileFormat.CSV:
        return <FileExcelOutlined {...iconProps} style={{ color: '#52c41a' }} />;
      case FileFormat.PPTX:
        return <FilePptOutlined {...iconProps} style={{ color: '#fa8c16' }} />;
      case FileFormat.IMAGE:
        return <FileImageOutlined {...iconProps} style={{ color: '#eb2f96' }} />;
      case FileFormat.TXT:
      case FileFormat.MARKDOWN:
        return <FileTextOutlined {...iconProps} />;
      default:
        return <FileUnknownOutlined {...iconProps} />;
    }
  };

  // Handle file upload
  const handleUpload = async (file: UploadFile) => {
    setUploadLoading(true);
    try {
      // Access the actual File object from UploadFile
      const actualFile = file.originFileObj || file as unknown as File;
      const result = await documentService.uploadDocument(actualFile);
      message.success(`Documento "${result.document.title}" cargado exitosamente`);
      refetch();
      return false; // Prevent default upload behavior
    } catch (error) {
      message.error('Error al cargar el documento');
      console.error(error);
      return false;
    } finally {
      setUploadLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      await documentService.deleteDocument(id);
      message.success('Documento eliminado exitosamente');
      refetch();
    } catch (error) {
      message.error('Error al eliminar el documento');
      console.error(error);
    }
  };

  // Handle analyze
  const handleAnalyze = async (id: string) => {
    try {
      message.loading('Analizando documento...', 0);
      await documentService.analyzeDocument(id);
      message.destroy();
      message.success('Análisis completado exitosamente');
      refetch();
    } catch (error) {
      message.destroy();
      message.error('Error al analizar el documento');
      console.error(error);
    }
  };

  const columns: ColumnsType<Document> = [
    {
      title: 'Nombre',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <Space>
          {getFileIcon(record.format)}
          <a onClick={() => navigate(`/documents/${record.id}`)}>{text}</a>
        </Space>
      ),
      sorter: (a, b) => a.title.localeCompare(b.title),
    },
    {
      title: 'Tipo',
      dataIndex: 'type',
      key: 'type',
      render: (type: DocumentType) => (
        <Tag color="blue">{getDocumentTypeLabel(type)}</Tag>
      ),
      filters: Object.values(DocumentType).map(type => ({
        text: getDocumentTypeLabel(type),
        value: type,
      })),
      onFilter: (value, record) => record.type === value,
    },
    {
      title: 'Formato',
      dataIndex: 'format',
      key: 'format',
      render: (format: FileFormat) => (
        <Tag>{getFileFormatLabel(format)}</Tag>
      ),
      filters: Object.values(FileFormat).map(format => ({
        text: getFileFormatLabel(format),
        value: format,
      })),
      onFilter: (value, record) => record.format === value,
    },
    {
      title: 'Tamaño',
      dataIndex: ['metadata', 'fileSize'],
      key: 'fileSize',
      render: (size: number) => formatFileSize(size),
      sorter: (a, b) => a.metadata.fileSize - b.metadata.fileSize,
    },
    {
      title: 'Origen',
      dataIndex: ['metadata', 'source'],
      key: 'source',
      render: (source: DocumentSource) => (
        <Tag color="green">{getDocumentSourceLabel(source)}</Tag>
      ),
    },
    {
      title: 'Análisis',
      key: 'analysis',
      render: (_, record) => (
        <Badge 
          status={record.analysis ? 'success' : 'default'} 
          text={record.analysis ? 'Completado' : 'Pendiente'} 
        />
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString('es-ES'),
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Ver detalles">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/documents/${record.id}`)}
            />
          </Tooltip>
          {!record.analysis && (
            <Tooltip title="Analizar documento">
              <Button
                type="text"
                icon={<ExperimentOutlined />}
                onClick={() => handleAnalyze(record.id)}
              />
            </Tooltip>
          )}
          <Tooltip title="Descargar">
            <Button
              type="text"
              icon={<DownloadOutlined />}
              onClick={async () => {
                try {
                  const blob = await documentService.downloadFile(record.metadata.fileName);
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = record.metadata.fileName;
                  a.click();
                  window.URL.revokeObjectURL(url);
                } catch {
                  message.error('Error al descargar el documento');
                }
              }}
            />
          </Tooltip>
          <Tooltip title="Eliminar">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  const filteredDocuments = data?.documents.filter(doc => {
    if (searchTerm && !doc.title.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  }) || [];

  return (
    <div className="document-list">
      <Card 
        title="Gestión de Documentos"
        extra={
          <Space>
            <Upload
              accept=".pdf,.doc,.docx,.txt,.html,.md,.csv,.xlsx,.pptx,.jpg,.jpeg,.png,.gif,.bmp"
              showUploadList={false}
              beforeUpload={handleUpload}
              disabled={uploadLoading}
            >
              <Button 
                type="primary" 
                icon={uploadLoading ? <Spin size="small" /> : <UploadOutlined />}
                loading={uploadLoading}
              >
                Cargar Documento
              </Button>
            </Upload>
            <Button
              icon={<PlusOutlined />}
              onClick={() => navigate('/documents/new')}
            >
              Nuevo Documento
            </Button>
          </Space>
        }
      >
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={10}>
            <Search
              placeholder="Buscar documentos..."
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Tipo"
              value={typeFilter}
              onChange={setTypeFilter}
              size="large"
            >
              <Option value="all">Todos los tipos</Option>
              {Object.values(DocumentType).map(type => (
                <Option key={type} value={type}>
                  {getDocumentTypeLabel(type)}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Formato"
              value={formatFilter}
              onChange={setFormatFilter}
              size="large"
            >
              <Option value="all">Todos los formatos</Option>
              {Object.values(FileFormat).map(format => (
                <Option key={format} value={format}>
                  {getFileFormatLabel(format)}
                </Option>
              ))}
            </Select>
          </Col>
        </Row>

        {selectedRowKeys.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <span style={{ marginRight: 8 }}>
              {selectedRowKeys.length} documentos seleccionados
            </span>
            <Button 
              danger
              onClick={async () => {
                try {
                  await Promise.all(
                    selectedRowKeys.map(key => documentService.deleteDocument(key as string))
                  );
                  message.success('Documentos eliminados exitosamente');
                  setSelectedRowKeys([]);
                  refetch();
                } catch {
                  message.error('Error al eliminar documentos');
                }
              }}
            >
              Eliminar seleccionados
            </Button>
          </div>
        )}

        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={filteredDocuments}
          loading={isLoading}
          rowKey="id"
          pagination={{
            total: data?.pagination.total || 0,
            pageSize: data?.pagination.limit || 50,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} documentos`,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No hay documentos"
              />
            ),
          }}
        />
      </Card>
    </div>
  );
};

export default DocumentList;