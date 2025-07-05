import React, { useState } from 'react';
import { 
  Card, 
  Input, 
  Select, 
  DatePicker, 
  Tag, 
  Space, 
  Button, 
  Row, 
  Col,
  Collapse,
  Form
} from 'antd';
import { SearchOutlined, FilterOutlined, ClearOutlined } from '@ant-design/icons';
import {
  DocumentType,
  FileFormat,
  DocumentSource,
  getDocumentTypeLabel,
  getFileFormatLabel,
  getDocumentSourceLabel
} from '../../types/document.types';
import type {
  SearchRequest,
  SearchFilters
} from '../../types/document.types';

const { Search } = Input;
const { RangePicker } = DatePicker;
const { Panel } = Collapse;
const { Option } = Select;

interface DocumentSearchProps {
  onSearch: (request: SearchRequest) => void;
  loading?: boolean;
}

const DocumentSearch: React.FC<DocumentSearchProps> = ({ onSearch, loading }) => {
  const [form] = Form.useForm();
  const [advancedVisible, setAdvancedVisible] = useState(false);

  const handleSearch = (values: any) => {
    const filters: SearchFilters = {};

    // Add filters only if they have values
    if (values.types && values.types.length > 0) {
      filters.type = values.types;
    }
    if (values.formats && values.formats.length > 0) {
      filters.format = values.formats;
    }
    if (values.sources && values.sources.length > 0) {
      filters.source = values.sources;
    }
    if (values.dateRange && values.dateRange[0] && values.dateRange[1]) {
      filters.dateRange = {
        start: values.dateRange[0].toISOString(),
        end: values.dateRange[1].toISOString()
      };
    }
    if (values.tags && values.tags.length > 0) {
      filters.tags = values.tags.split(',').map((tag: string) => tag.trim());
    }

    const searchRequest: SearchRequest = {
      query: values.query || '',
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      limit: 50,
      offset: 0
    };

    onSearch(searchRequest);
  };

  const handleClearFilters = () => {
    form.resetFields();
    handleSearch({ query: '' });
  };

  const handleQuickSearch = (query: string) => {
    form.setFieldsValue({ query });
    form.submit();
  };

  return (
    <Card className="document-search">
      <Form
        form={form}
        onFinish={handleSearch}
        layout="vertical"
      >
        <Row gutter={16}>
          <Col flex="auto">
            <Form.Item name="query" noStyle>
              <Search
                placeholder="Buscar en documentos..."
                enterButton={<SearchOutlined />}
                size="large"
                loading={loading}
                allowClear
              />
            </Form.Item>
          </Col>
          <Col>
            <Button
              type="text"
              icon={<FilterOutlined />}
              size="large"
              onClick={() => setAdvancedVisible(!advancedVisible)}
            >
              Filtros avanzados
            </Button>
          </Col>
        </Row>

        <Collapse
          activeKey={advancedVisible ? ['filters'] : []}
          ghost
          style={{ marginTop: 16 }}
        >
          <Panel header="" key="filters" showArrow={false}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} lg={6}>
                <Form.Item name="types" label="Tipos de documento">
                  <Select
                    mode="multiple"
                    placeholder="Seleccionar tipos"
                    allowClear
                  >
                    {Object.values(DocumentType).map(type => (
                      <Option key={type} value={type}>
                        {getDocumentTypeLabel(type)}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} lg={6}>
                <Form.Item name="formats" label="Formatos">
                  <Select
                    mode="multiple"
                    placeholder="Seleccionar formatos"
                    allowClear
                  >
                    {Object.values(FileFormat).map(format => (
                      <Option key={format} value={format}>
                        {getFileFormatLabel(format)}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} lg={6}>
                <Form.Item name="sources" label="Origen">
                  <Select
                    mode="multiple"
                    placeholder="Seleccionar origen"
                    allowClear
                  >
                    {Object.values(DocumentSource).map(source => (
                      <Option key={source} value={source}>
                        {getDocumentSourceLabel(source)}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} lg={6}>
                <Form.Item name="dateRange" label="Rango de fechas">
                  <RangePicker
                    style={{ width: '100%' }}
                    format="DD/MM/YYYY"
                  />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item name="tags" label="Etiquetas (separadas por comas)">
                  <Input placeholder="ej: importante, urgente, revisar" />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Space>
                  <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                    Buscar
                  </Button>
                  <Button onClick={handleClearFilters} icon={<ClearOutlined />}>
                    Limpiar filtros
                  </Button>
                </Space>
              </Col>
            </Row>
          </Panel>
        </Collapse>

        <div style={{ marginTop: 16 }}>
          <Space wrap>
            <span style={{ marginRight: 8 }}>Búsquedas rápidas:</span>
            <Tag 
              color="blue" 
              style={{ cursor: 'pointer' }}
              onClick={() => handleQuickSearch('factura')}
            >
              Facturas
            </Tag>
            <Tag 
              color="green" 
              style={{ cursor: 'pointer' }}
              onClick={() => handleQuickSearch('contrato')}
            >
              Contratos
            </Tag>
            <Tag 
              color="orange" 
              style={{ cursor: 'pointer' }}
              onClick={() => handleQuickSearch('reporte')}
            >
              Reportes
            </Tag>
            <Tag 
              color="purple" 
              style={{ cursor: 'pointer' }}
              onClick={() => handleQuickSearch('email')}
            >
              Emails
            </Tag>
          </Space>
        </div>
      </Form>
    </Card>
  );
};

export default DocumentSearch;