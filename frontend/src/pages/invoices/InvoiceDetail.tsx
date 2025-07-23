import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  Descriptions,
  Tag,
  Table,
  Spin,
  Empty,
  Row,
  Col,
  Divider,
  Typography,
  Timeline,
  Popconfirm,
  Dropdown,
  Menu,
  App,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  PrinterOutlined,
  MailOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FilePdfOutlined,
  CopyOutlined,
  EyeOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import invoiceService from '../../services/invoiceService';
import type { Invoice } from '../../types';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

const InvoiceDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { message } = App.useApp();

  // Helper function to safely convert values to numbers
  const toNumber = (value: any): number => {
    if (typeof value === 'object' && value) {
      return parseFloat(value.toString());
    }
    return parseFloat(value || 0);
  };

  useEffect(() => {
    if (id) {
      loadInvoice();
    }
  }, [id]);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      const response = await invoiceService.getInvoice(id!);
      if (response.success && response.data) {
        setInvoice(response.data.invoice);
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
      message.error('No se pudo cargar la factura');
      navigate('/invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const response = await invoiceService.deleteInvoice(id!);
      if (response.success) {
        message.success('La factura se ha eliminado correctamente');
        navigate('/invoices');
      }
    } catch (error) {
      message.error('No se pudo eliminar la factura');
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      setUpdating(true);
      const response = await invoiceService.updateInvoiceStatus(id!, newStatus);
      if (response.success) {
        message.success(`La factura se ha marcado como ${getStatusLabel(newStatus)}`);
        loadInvoice();
      }
    } catch (error) {
      message.error('No se pudo actualizar el estado');
    } finally {
      setUpdating(false);
    }
  };

  const handleCopyInvoiceNumber = () => {
    if (invoice?.invoiceNumber) {
      navigator.clipboard.writeText(invoice.invoiceNumber);
      message.success('Número de factura copiado');
    }
  };

  const handleSendInvoice = async () => {
    // TODO: Implement email sending
    message.info('Funcionalidad de envío por email en desarrollo');
  };

  const handleDownloadPDF = async () => {
    // TODO: Implement PDF generation
    message.info('Funcionalidad de descarga PDF en desarrollo');
  };

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'default',
      sent: 'blue',
      viewed: 'cyan',
      paid: 'green',
      overdue: 'red',
      cancelled: 'red',
      refunded: 'purple',
    };
    return colors[status as keyof typeof colors] || 'default';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      draft: 'Borrador',
      sent: 'Enviada',
      viewed: 'Vista',
      paid: 'Pagada',
      overdue: 'Vencida',
      cancelled: 'Cancelada',
      refunded: 'Reembolsada',
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      invoice: 'Factura',
      credit_note: 'Nota de Crédito',
      proforma: 'Proforma',
      receipt: 'Recibo',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const lineItemColumns = [
    {
      title: 'Descripción',
      dataIndex: 'description',
      key: 'description',
      width: '40%',
    },
    {
      title: 'Cantidad',
      dataIndex: 'quantity',
      key: 'quantity',
      width: '10%',
      align: 'center' as const,
    },
    {
      title: 'Precio Unit.',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: '15%',
      align: 'right' as const,
      render: (value: any) => `€ ${toNumber(value).toFixed(2)}`,
    },
    {
      title: 'Importe',
      dataIndex: 'amount',
      key: 'amount',
      width: '15%',
      align: 'right' as const,
      render: (value: any) => `€ ${toNumber(value).toFixed(2)}`,
    },
    {
      title: `IVA (${invoice?.taxRate || 0}%)`,
      dataIndex: 'taxAmount',
      key: 'taxAmount',
      width: '10%',
      align: 'right' as const,
      render: (value: any) => `€ ${toNumber(value).toFixed(2)}`,
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: '10%',
      align: 'right' as const,
      render: (value: any) => <Text strong>€ {toNumber(value).toFixed(2)}</Text>,
    },
  ];

  const moreActionsMenu = (
    <Menu>
      <Menu.Item key="duplicate" icon={<CopyOutlined />}>
        Duplicar factura
      </Menu.Item>
      <Menu.Item key="convert" icon={<FilePdfOutlined />}>
        Convertir a nota de crédito
      </Menu.Item>
      <Menu.Item key="void" icon={<CloseCircleOutlined />} danger>
        Anular factura
      </Menu.Item>
    </Menu>
  );

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" tip="Cargando factura..." />
      </div>
    );
  }

  if (!invoice) {
    return <Empty description="Factura no encontrada" />;
  }

  const isOverdue = dayjs(invoice.dueDate).isBefore(dayjs()) && invoice.status !== 'paid';
  const canEdit = invoice.status === 'draft';
  const canDelete = invoice.status !== 'paid';

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/invoices')}>
          Volver
        </Button>
        {canEdit && (
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => navigate(`/invoices/${id}/edit`)}
          >
            Editar Factura
          </Button>
        )}
        <Button icon={<MailOutlined />} onClick={handleSendInvoice}>
          Enviar por Email
        </Button>
        <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
          Imprimir
        </Button>
        <Button icon={<FilePdfOutlined />} onClick={handleDownloadPDF}>
          Descargar PDF
        </Button>
        {canDelete && (
          <Popconfirm
            title="¿Estás seguro de eliminar esta factura?"
            description="Esta acción no se puede deshacer."
            onConfirm={handleDelete}
            okText="Sí, eliminar"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<DeleteOutlined />} loading={deleting}>
              Eliminar
            </Button>
          </Popconfirm>
        )}
        <Dropdown overlay={moreActionsMenu} placement="bottomRight">
          <Button icon={<MoreOutlined />} />
        </Dropdown>
      </Space>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card>
            <Row>
              <Col span={12}>
                <Title level={2} style={{ margin: 0 }}>
                  {getTypeLabel(invoice.type)} #{invoice.invoiceNumber}
                  <Button
                    type="text"
                    icon={<CopyOutlined />}
                    size="small"
                    onClick={handleCopyInvoiceNumber}
                    style={{ marginLeft: 8 }}
                  />
                </Title>
                <Space style={{ marginTop: 8 }}>
                  <Tag color={getStatusColor(invoice.status)}>
                    {getStatusLabel(invoice.status)}
                  </Tag>
                  {isOverdue && <Tag color="red">VENCIDA</Tag>}
                </Space>
              </Col>
              <Col span={12} style={{ textAlign: 'right' }}>
                <Space direction="vertical" align="end">
                  <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
                    € {toNumber(invoice.total).toFixed(2)}
                  </Title>
                  <Text type="secondary">{invoice.currency}</Text>
                </Space>
              </Col>
            </Row>

            <Divider />

            <Row gutter={[24, 24]}>
              <Col span={12}>
                <Title level={5}>Datos del Cliente</Title>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Nombre">
                    <a onClick={() => navigate(`/clients/${invoice.clientId}`)}>
                      {invoice.clientName}
                    </a>
                  </Descriptions.Item>
                  <Descriptions.Item label="Tax ID">
                    {invoice.clientTaxId}
                  </Descriptions.Item>
                  <Descriptions.Item label="Dirección">
                    {typeof invoice.clientAddress === 'string' 
                      ? invoice.clientAddress 
                      : invoice.clientAddress 
                        ? [
                            invoice.clientAddress.street,
                            invoice.clientAddress.city,
                            invoice.clientAddress.state,
                            invoice.clientAddress.postalCode,
                            invoice.clientAddress.country,
                          ]
                            .filter(Boolean)
                            .join(', ')
                        : 'No especificada'}
                  </Descriptions.Item>
                </Descriptions>
              </Col>
              <Col span={12}>
                <Title level={5}>Información de la Factura</Title>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Fecha de Emisión">
                    {dayjs(invoice.issueDate).format('DD/MM/YYYY')}
                  </Descriptions.Item>
                  <Descriptions.Item label="Fecha de Vencimiento">
                    <span style={{ color: isOverdue ? 'red' : undefined }}>
                      {dayjs(invoice.dueDate).format('DD/MM/YYYY')}
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label="Términos de Pago">
                    {invoice.paymentTerms} días
                  </Descriptions.Item>
                  <Descriptions.Item label="Método de Pago">
                    {invoice.paymentMethod || 'No especificado'}
                  </Descriptions.Item>
                </Descriptions>
              </Col>
            </Row>
          </Card>
        </Col>

        <Col span={24}>
          <Card title="Líneas de Factura">
            <Table
              dataSource={invoice.items}
              columns={lineItemColumns}
              rowKey={(_, index) => index?.toString() || '0'}
              pagination={false}
              size="small"
              footer={() => (
                <Row>
                  <Col span={18} style={{ textAlign: 'right', paddingRight: 24 }}>
                    <Space direction="vertical" align="end" style={{ width: '100%' }}>
                      <Row style={{ width: '100%' }}>
                        <Col span={20}>Subtotal:</Col>
                        <Col span={4} style={{ textAlign: 'right' }}>
                          <Text>€ {toNumber(invoice.subtotal).toFixed(2)}</Text>
                        </Col>
                      </Row>
                      <Row style={{ width: '100%' }}>
                        <Col span={20}>{invoice.taxType} ({invoice.taxRate}%):</Col>
                        <Col span={4} style={{ textAlign: 'right' }}>
                          <Text>€ {toNumber(invoice.taxAmount).toFixed(2)}</Text>
                        </Col>
                      </Row>
                      <Divider style={{ margin: '8px 0' }} />
                      <Row style={{ width: '100%' }}>
                        <Col span={20}>
                          <Title level={4} style={{ margin: 0 }}>Total:</Title>
                        </Col>
                        <Col span={4} style={{ textAlign: 'right' }}>
                          <Title level={4} style={{ margin: 0 }}>
                            € {toNumber(invoice.total).toFixed(2)}
                          </Title>
                        </Col>
                      </Row>
                    </Space>
                  </Col>
                </Row>
              )}
            />
          </Card>
        </Col>

        {(invoice.notes || invoice.termsAndConditions) && (
          <Col span={24}>
            <Card>
              <Row gutter={[24, 16]}>
                {invoice.notes && (
                  <Col span={12}>
                    <Title level={5}>Notas</Title>
                    <Paragraph>{invoice.notes}</Paragraph>
                  </Col>
                )}
                {invoice.termsAndConditions && (
                  <Col span={12}>
                    <Title level={5}>Términos y Condiciones</Title>
                    <Paragraph>{invoice.termsAndConditions}</Paragraph>
                  </Col>
                )}
              </Row>
            </Card>
          </Col>
        )}

        <Col span={24}>
          <Card title="Acciones Rápidas">
            <Space size="large" wrap>
              {invoice.status === 'draft' && (
                <Button
                  icon={<MailOutlined />}
                  onClick={() => handleStatusUpdate('sent')}
                  loading={updating}
                >
                  Marcar como Enviada
                </Button>
              )}
              {(invoice.status === 'sent' || invoice.status === 'viewed') && (
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleStatusUpdate('paid')}
                  loading={updating}
                >
                  Marcar como Pagada
                </Button>
              )}
              {invoice.status === 'sent' && (
                <Button
                  icon={<EyeOutlined />}
                  onClick={() => handleStatusUpdate('viewed')}
                  loading={updating}
                >
                  Marcar como Vista
                </Button>
              )}
              {invoice.status !== 'cancelled' && invoice.status !== 'paid' && (
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={() => handleStatusUpdate('cancelled')}
                  loading={updating}
                >
                  Cancelar Factura
                </Button>
              )}
            </Space>
          </Card>
        </Col>

        <Col span={24}>
          <Card title="Historial">
            <Timeline>
              {invoice.paidDate && (
                <Timeline.Item color="green">
                  <p>
                    <strong>Pagada:</strong>{' '}
                    {dayjs(invoice.paidDate).format('DD/MM/YYYY HH:mm')}
                  </p>
                </Timeline.Item>
              )}
              {invoice.sentDate && (
                <Timeline.Item color="blue">
                  <p>
                    <strong>Enviada:</strong>{' '}
                    {dayjs(invoice.sentDate).format('DD/MM/YYYY HH:mm')}
                  </p>
                </Timeline.Item>
              )}
              <Timeline.Item>
                <p>
                  <strong>Creada:</strong>{' '}
                  {dayjs(invoice.createdAt).format('DD/MM/YYYY HH:mm')}
                </p>
              </Timeline.Item>
            </Timeline>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default InvoiceDetail;