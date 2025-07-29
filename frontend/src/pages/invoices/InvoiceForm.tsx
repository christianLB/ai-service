import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Button,
  Space,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Spin,
  Row,
  Col,
  Table,
  Divider,
  Typography,
  App,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  PlusOutlined,
  DeleteOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import invoiceService from '../../services/invoiceService';
import clientService from '../../services/clientService';
import { useInvoiceTemplates } from '../../hooks/use-invoice-template';
import type { InvoiceFormData, InvoiceItem, Client } from '../../types';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

interface LineItem extends InvoiceItem {
  key?: string;
}

interface LineItemErrors {
  [key: string]: {
    description?: boolean;
    quantity?: boolean;
    unitPrice?: boolean;
  };
}

const InvoiceForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const preselectedClientId = searchParams.get('clientId');
  const isEdit = !!id;
  const { message } = App.useApp();
  
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      key: '1',
      description: '',
      quantity: 1,
      unitPrice: 0,
      amount: 0,
      taxRate: 21,
      taxAmount: 0,
      total: 0,
    },
  ]);
  const [totals, setTotals] = useState({
    subtotal: 0,
    taxAmount: 0,
    total: 0,
  });
  const [lineItemErrors, setLineItemErrors] = useState<LineItemErrors>({});
  
  // Invoice templates
  const { data: templatesData, isLoading: loadingTemplates } = useInvoiceTemplates({
    limit: 100,
    sortBy: 'name',
    sortOrder: 'asc',
  });

  const loadClients = useCallback(async () => {
    try {
      setLoadingClients(true);
      const response = await clientService.getClients({ limit: 1000 });
      if (response.success && response.data) {
        setClients(response.data.clients || []);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      message.error('No se pudieron cargar los clientes');
    } finally {
      setLoadingClients(false);
    }
  }, [message]);

  const loadInvoice = useCallback(async () => {
    try {
      setLoading(true);
      const response = await invoiceService.getInvoice(id!);
      if (response.success && response.data) {
        const invoice = response.data.invoice;
        
        // Set form values
        form.setFieldsValue({
          clientId: invoice.clientId,
          type: invoice.type,
          issueDate: dayjs(invoice.issueDate),
          dueDate: dayjs(invoice.dueDate),
          paymentTerms: invoice.paymentTerms,
          currency: invoice.currency,
          taxRate: invoice.taxRate,
          taxType: invoice.taxType,
          notes: invoice.notes,
          termsAndConditions: invoice.termsAndConditions,
          templateId: invoice.templateId,
        });

        // Set line items
        if (invoice.items && Array.isArray(invoice.items)) {
          const items: LineItem[] = invoice.items.map((item: InvoiceItem, index: number) => ({
            key: String(index + 1),
            description: item.description || '',
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            amount: item.amount || 0,
            taxRate: item.taxRate || 0,
            taxAmount: item.taxAmount || 0,
            total: item.total || 0,
            unit: item.unit,
            discount: item.discount,
          }));
          setLineItems(items);
        }
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
      message.error('No se pudo cargar la factura');
      navigate('/invoices');
    } finally {
      setLoading(false);
    }
  }, [id, form, navigate, message]);

  const handleClientChange = useCallback(async (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      form.setFieldsValue({
        currency: client.currency,
        paymentTerms: client.paymentTerms,
      });
      
      // Calculate due date based on payment terms
      const issueDate = form.getFieldValue('issueDate') || dayjs();
      const dueDate = issueDate.add(client.paymentTerms, 'days');
      // Clone the dayjs object to avoid circular references
      form.setFieldValue('dueDate', dueDate.clone());
    }
  }, [clients, form]);

  const calculateLineItemTotal = (item: LineItem) => {
    const amount = item.quantity * item.unitPrice;
    const taxAmount = (amount * item.taxRate) / 100;
    const total = amount + taxAmount;
    
    return {
      ...item,
      amount,
      taxAmount,
      total,
    };
  };

  const handleLineItemChange = (key: string, field: string, value: string | number) => {
    const newItems = lineItems.map(item => {
      if (item.key === key) {
        const updatedItem = { ...item, [field]: value };
        return calculateLineItemTotal(updatedItem);
      }
      return item;
    });
    setLineItems(newItems);
  };

  const addLineItem = () => {
    const newKey = String(lineItems.length + 1);
    const taxRate = form.getFieldValue('taxRate') || 21;
    setLineItems([
      ...lineItems,
      {
        key: newKey,
        description: '',
        quantity: 1,
        unitPrice: 0,
        amount: 0,
        taxRate,
        taxAmount: 0,
        total: 0,
      },
    ]);
  };

  const removeLineItem = (key: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.key !== key));
    }
  };

  const calculateTotals = useCallback(() => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = lineItems.reduce((sum, item) => sum + item.taxAmount, 0);
    const total = subtotal + taxAmount;
    
    setTotals({ subtotal, taxAmount, total });
  }, [lineItems]);

  useEffect(() => {
    loadClients();
    if (isEdit && id) {
      loadInvoice();
    } else if (preselectedClientId) {
      form.setFieldsValue({ clientId: preselectedClientId });
      handleClientChange(preselectedClientId);
    }
  }, [id, isEdit, preselectedClientId, handleClientChange, loadClients, loadInvoice, form]);

  useEffect(() => {
    calculateTotals();
  }, [calculateTotals]);

  const validateLineItem = (item: LineItem) => {
    const errors: { description?: boolean; quantity?: boolean; unitPrice?: boolean } = {};
    
    if (!item.description || item.description.trim() === '') {
      errors.description = true;
    }
    if (!item.quantity || item.quantity <= 0) {
      errors.quantity = true;
    }
    if (!item.unitPrice || item.unitPrice <= 0) {
      errors.unitPrice = true;
    }
    
    return errors;
  };

  const validateAllLineItems = () => {
    const errors: LineItemErrors = {};
    let hasErrors = false;
    
    lineItems.forEach(item => {
      const itemErrors = validateLineItem(item);
      if (Object.keys(itemErrors).length > 0) {
        errors[item.key!] = itemErrors;
        hasErrors = true;
      }
    });
    
    setLineItemErrors(errors);
    return !hasErrors;
  };

  const onFinish = async (values: { clientId: string; type: string; issueDate: dayjs.Dayjs; dueDate: dayjs.Dayjs; paymentTerms: number; currency: string; taxRate: number; taxType: string; notes?: string; termsAndConditions?: string; templateId?: string }) => {
    // Validate all line items first
    const isValid = validateAllLineItems();
    
    if (!isValid) {
      message.error('Por favor complete todos los campos obligatorios marcados en rojo');
      // Scroll to the table
      const tableElement = document.querySelector('.ant-table');
      if (tableElement) {
        tableElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    try {
      setSubmitting(true);

      // Get client info
      const client = clients.find(c => c.id === values.clientId);
      if (!client) {
        message.error('Cliente no encontrado');
        return;
      }

      // Build invoice data
      const invoiceData: InvoiceFormData = {
        clientId: values.clientId,
        clientName: client.name,
        clientTaxId: client.taxId,
        clientAddress: client.address 
          ? [
              client.address.street,
              client.address.city,
              client.address.state,
              client.address.postalCode,
              client.address.country,
            ]
              .filter(Boolean)
              .join(', ')
          : '',
        type: (values.type || 'invoice') as 'invoice' | 'credit_note' | 'proforma' | 'receipt',
        issueDate: values.issueDate.format('YYYY-MM-DD'),
        dueDate: values.dueDate.format('YYYY-MM-DD'),
        currency: values.currency,
        items: lineItems.map((item) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { key, ...rest } = item;
          return rest;
        }),
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        taxRate: values.taxRate,
        taxType: values.taxType as 'IVA' | 'VAT' | 'GST' | 'NONE',
        total: totals.total,
        paymentTerms: values.paymentTerms,
        notes: values.notes,
        termsAndConditions: values.termsAndConditions,
        templateId: values.templateId || undefined,
      };

      let response;
      if (isEdit) {
        response = await invoiceService.updateInvoice(id!, invoiceData);
      } else {
        response = await invoiceService.createInvoice(invoiceData);
      }

      if (response.success) {
        message.success(`Factura ${isEdit ? 'actualizada' : 'creada'} correctamente`);
        navigate('/invoices');
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      const errorMessage = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || `No se pudo ${isEdit ? 'actualizar' : 'crear'} la factura`;
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: <span>Descripción <span style={{ color: 'red' }}>*</span></span>,
      dataIndex: 'description',
      key: 'description',
      width: '40%',
      render: (_: unknown, record: LineItem) => (
        <Input.TextArea
          value={record.description}
          onChange={(e) => handleLineItemChange(record.key!, 'description', e.target.value)}
          placeholder="Descripción del servicio o producto (obligatorio)"
          autoSize={{ minRows: 1, maxRows: 3 }}
          status={lineItemErrors[record.key!]?.description ? 'error' : ''}
          onBlur={() => {
            const errors = validateLineItem(record);
            if (errors.description) {
              setLineItemErrors(prev => ({
                ...prev,
                [record.key!]: { ...prev[record.key!], description: true }
              }));
            } else {
              setLineItemErrors(prev => {
                const newErrors = { ...prev };
                if (newErrors[record.key!]) {
                  delete newErrors[record.key!].description;
                  if (Object.keys(newErrors[record.key!]).length === 0) {
                    delete newErrors[record.key!];
                  }
                }
                return newErrors;
              });
            }
          }}
        />
      ),
    },
    {
      title: <span>Cantidad <span style={{ color: 'red' }}>*</span></span>,
      dataIndex: 'quantity',
      key: 'quantity',
      width: '10%',
      render: (_: unknown, record: LineItem) => (
        <InputNumber
          value={record.quantity}
          onChange={(value) => handleLineItemChange(record.key!, 'quantity', value || 0)}
          min={0.01}
          style={{ width: '100%' }}
          status={lineItemErrors[record.key!]?.quantity ? 'error' : ''}
          placeholder="Obligatorio"
          onBlur={() => {
            const errors = validateLineItem(record);
            if (errors.quantity) {
              setLineItemErrors(prev => ({
                ...prev,
                [record.key!]: { ...prev[record.key!], quantity: true }
              }));
            } else {
              setLineItemErrors(prev => {
                const newErrors = { ...prev };
                if (newErrors[record.key!]) {
                  delete newErrors[record.key!].quantity;
                  if (Object.keys(newErrors[record.key!]).length === 0) {
                    delete newErrors[record.key!];
                  }
                }
                return newErrors;
              });
            }
          }}
        />
      ),
    },
    {
      title: <span>Precio Unit. <span style={{ color: 'red' }}>*</span></span>,
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: '15%',
      render: (_: unknown, record: LineItem) => (
        <InputNumber
          value={record.unitPrice}
          onChange={(value) => handleLineItemChange(record.key!, 'unitPrice', value || 0)}
          min={0.01}
          formatter={value => `€ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(value) => {
            const num = value!.replace(/€\s?|(,*)/g, '');
            return parseFloat(num) || 0;
          }}
          style={{ width: '100%' }}
          status={lineItemErrors[record.key!]?.unitPrice ? 'error' : ''}
          placeholder="€ 0.00"
          onBlur={() => {
            const errors = validateLineItem(record);
            if (errors.unitPrice) {
              setLineItemErrors(prev => ({
                ...prev,
                [record.key!]: { ...prev[record.key!], unitPrice: true }
              }));
            } else {
              setLineItemErrors(prev => {
                const newErrors = { ...prev };
                if (newErrors[record.key!]) {
                  delete newErrors[record.key!].unitPrice;
                  if (Object.keys(newErrors[record.key!]).length === 0) {
                    delete newErrors[record.key!];
                  }
                }
                return newErrors;
              });
            }
          }}
        />
      ),
    },
    {
      title: 'IVA %',
      dataIndex: 'taxRate',
      key: 'taxRate',
      width: '10%',
      render: (_: unknown, record: LineItem) => (
        <InputNumber
          value={record.taxRate}
          onChange={(value) => handleLineItemChange(record.key!, 'taxRate', value || 0)}
          min={0}
          max={100}
          formatter={value => `${value}%`}
          parser={(value) => {
            const num = value!.replace('%', '');
            return parseFloat(num) || 0;
          }}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: '15%',
      render: (_: unknown, record: LineItem) => (
        <Text strong>€ {record.total.toFixed(2)}</Text>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: '10%',
      render: (_: unknown, record: LineItem) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeLineItem(record.key!)}
          disabled={lineItems.length === 1}
        />
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" tip="Cargando factura..." />
      </div>
    );
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/invoices')}>
          Volver
        </Button>
      </Space>

      <Card title={isEdit ? 'Editar Factura' : 'Nueva Factura'}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            type: 'invoice',
            currency: 'EUR',
            issueDate: dayjs(),
            dueDate: dayjs().add(30, 'days'),
            paymentTerms: 30,
            taxRate: 21,
            taxType: 'IVA',
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Cliente"
                name="clientId"
                rules={[{ required: true, message: 'Por favor, selecciona un cliente' }]}
              >
                <Select
                  showSearch
                  placeholder="Seleccionar cliente"
                  optionFilterProp="children"
                  onChange={handleClientChange}
                  loading={loadingClients}
                  filterOption={(input, option) => {
                    const text = `${clients.find(c => c.id === option?.value)?.name || ''} - ${clients.find(c => c.id === option?.value)?.taxId || ''}`;
                    return text.toLowerCase().includes(input.toLowerCase());
                  }}
                >
                  {clients.map(client => (
                    <Option key={client.id} value={client.id}>
                      {client.name} - {client.taxId}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Tipo de Documento" name="type">
                <Select>
                  <Option value="invoice">Factura</Option>
                  <Option value="credit_note">Nota de Crédito</Option>
                  <Option value="proforma">Proforma</Option>
                  <Option value="receipt">Recibo</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                label="Plantilla de Factura" 
                name="templateId"
                tooltip="Selecciona una plantilla personalizada para el formato de la factura"
              >
                <Select
                  placeholder="Seleccionar plantilla (opcional)"
                  allowClear
                  loading={loadingTemplates}
                  suffixIcon={<FileTextOutlined />}
                >
                  {templatesData?.items?.map(template => (
                    <Option key={template.id} value={template.id}>
                      {template.name}
                      {template.isDefault && ' (Por defecto)'}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Button
                type="link"
                icon={<FileTextOutlined />}
                onClick={() => navigate('/invoice-templates')}
              >
                Gestionar Plantillas
              </Button>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={6}>
              <Form.Item
                label="Fecha de Emisión"
                name="issueDate"
                rules={[{ required: true }]}
              >
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                label="Fecha de Vencimiento"
                name="dueDate"
                rules={[{ required: true }]}
              >
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Términos de Pago (días)" name="paymentTerms">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Moneda" name="currency">
                <Select>
                  <Option value="EUR">EUR</Option>
                  <Option value="USD">USD</Option>
                  <Option value="GBP">GBP</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Tipo de Impuesto" name="taxType">
                <Select>
                  <Option value="IVA">IVA</Option>
                  <Option value="VAT">VAT</Option>
                  <Option value="GST">GST</Option>
                  <Option value="NONE">Sin impuesto</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Tasa de Impuesto (%)" name="taxRate">
                <InputNumber
                  min={0}
                  max={100}
                  formatter={value => `${value}%`}
                  parser={(value) => {
                    if (!value) return 0;
                    const num = value.replace('%', '');
                    return parseFloat(num) || 0;
                  }}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Líneas de Factura</Divider>

          <div style={{ marginBottom: 8 }}>
            <Text type="secondary">
              Los campos marcados con <span style={{ color: 'red' }}>*</span> son obligatorios
            </Text>
          </div>

          <Table
            dataSource={lineItems}
            columns={columns}
            pagination={false}
            size="small"
            footer={() => (
              <Button
                type="dashed"
                onClick={addLineItem}
                icon={<PlusOutlined />}
                style={{ width: '100%' }}
              >
                Agregar línea
              </Button>
            )}
          />

          <Row justify="end" style={{ marginTop: 24 }}>
            <Col span={8}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Row justify="space-between">
                  <Text>Subtotal:</Text>
                  <Text strong>€ {totals.subtotal.toFixed(2)}</Text>
                </Row>
                <Row justify="space-between">
                  <Text>Impuestos:</Text>
                  <Text strong>€ {totals.taxAmount.toFixed(2)}</Text>
                </Row>
                <Divider style={{ margin: '8px 0' }} />
                <Row justify="space-between">
                  <Title level={4}>Total:</Title>
                  <Title level={4}>€ {totals.total.toFixed(2)}</Title>
                </Row>
              </Space>
            </Col>
          </Row>

          <Divider />

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Notas" name="notes">
                <TextArea
                  rows={3}
                  placeholder="Notas adicionales para el cliente"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Términos y Condiciones" name="termsAndConditions">
                <TextArea
                  rows={3}
                  placeholder="Términos y condiciones de la factura"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={submitting}
                disabled={submitting}
              >
                {isEdit ? 'Actualizar' : 'Crear'} Factura
              </Button>
              <Button onClick={() => navigate('/invoices')} disabled={submitting}>
                Cancelar
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default InvoiceForm;