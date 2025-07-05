import React from 'react';
import { Card, Row, Col, Statistic, Progress, List, Space, Tag } from 'antd';
import { 
  FileTextOutlined, 
  FolderOutlined, 
  CloudServerOutlined,
  ClockCircleOutlined 
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import documentService from '../../services/documentService';
import { 
  formatFileSize, 
  getDocumentTypeLabel, 
  getFileFormatLabel,
  DocumentType,
  FileFormat
} from '../../types/document.types';

const DocumentStats: React.FC = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['document-stats'],
    queryFn: documentService.getDocumentStats,
    refetchInterval: 60000 // Refresh every minute
  });

  if (isLoading || !stats) {
    return (
      <Card loading={true} />
    );
  }

  // Calculate percentages for document types
  const typePercentages = Object.entries(stats.documentsByType).map(([type, count]) => ({
    type: type as DocumentType,
    count,
    percentage: Math.round((count / stats.totalDocuments) * 100)
  })).sort((a, b) => b.count - a.count);

  // Calculate percentages for formats
  const formatPercentages = Object.entries(stats.documentsByFormat).map(([format, count]) => ({
    format: format as FileFormat,
    count,
    percentage: Math.round((count / stats.totalDocuments) * 100)
  })).sort((a, b) => b.count - a.count).slice(0, 5); // Top 5 formats

  // Colors for different types
  const typeColors: Record<DocumentType, string> = {
    [DocumentType.REPORT]: '#1890ff',
    [DocumentType.INVOICE]: '#52c41a',
    [DocumentType.CONTRACT]: '#fa8c16',
    [DocumentType.RESEARCH]: '#722ed1',
    [DocumentType.PRESENTATION]: '#eb2f96',
    [DocumentType.MANUAL]: '#13c2c2',
    [DocumentType.EMAIL]: '#faad14',
    [DocumentType.OTHER]: '#8c8c8c'
  };

  return (
    <div className="document-stats">
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total de Documentos"
              value={stats.totalDocuments}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Espacio Utilizado"
              value={formatFileSize(stats.totalSize)}
              prefix={<CloudServerOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tipos de Documento"
              value={Object.keys(stats.documentsByType).length}
              prefix={<FolderOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Documentos Recientes"
              value={stats.recentDocuments.length}
              prefix={<ClockCircleOutlined />}
              suffix="/ últimos 7 días"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Distribución por Tipo">
            <List
              size="small"
              dataSource={typePercentages}
              renderItem={(item) => (
                <List.Item>
                  <div style={{ width: '100%' }}>
                    <Space style={{ marginBottom: 8 }}>
                      <Tag color={typeColors[item.type]}>
                        {getDocumentTypeLabel(item.type)}
                      </Tag>
                      <span>{item.count} documentos</span>
                    </Space>
                    <Progress 
                      percent={item.percentage} 
                      strokeColor={typeColors[item.type]}
                      format={(percent) => `${percent}%`}
                    />
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Formatos Más Comunes">
            <List
              size="small"
              dataSource={formatPercentages}
              renderItem={(item) => (
                <List.Item>
                  <div style={{ width: '100%' }}>
                    <Space style={{ marginBottom: 8 }}>
                      <Tag>{getFileFormatLabel(item.format)}</Tag>
                      <span>{item.count} archivos</span>
                    </Space>
                    <Progress 
                      percent={item.percentage} 
                      format={(percent) => `${percent}%`}
                    />
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {stats.recentDocuments.length > 0 && (
        <Card title="Documentos Recientes" style={{ marginTop: 16 }}>
          <List
            size="small"
            dataSource={stats.recentDocuments.slice(0, 5)}
            renderItem={(doc) => (
              <List.Item
                actions={[
                  <Tag color="blue">{getDocumentTypeLabel(doc.type)}</Tag>,
                  <span>{new Date(doc.createdAt).toLocaleDateString('es-ES')}</span>
                ]}
              >
                <List.Item.Meta
                  title={doc.title}
                  description={`${getFileFormatLabel(doc.format)} - ${formatFileSize(doc.metadata.fileSize)}`}
                />
              </List.Item>
            )}
          />
        </Card>
      )}
    </div>
  );
};

export default DocumentStats;