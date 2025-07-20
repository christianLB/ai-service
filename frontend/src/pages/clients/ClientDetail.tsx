import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  Descriptions,
  Tag,
  Statistic,
  Row,
  Col,
  Table,
  Spin,
  notification,
  Tabs,
  Empty,
  Timeline,
  Popconfirm,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  DollarOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  BankOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import clientService from '../../services/clientService';
import invoiceService from '../../services/invoiceService';
import type { Client, Invoice } from '../../types';
import dayjs from 'dayjs';

const { TabPane } = Tabs;

const ClientDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      loadClient();
      loadClientInvoices();
    }
  }, [id]);

  const loadClient = async () => {
    try {
      setLoading(true);
      const response = await clientService.getClient(id!);
      if (response.success && response.data) {
        setClient(response.data.client);
      }
    } catch (error) {
      console.error('Error loading client:', error);
      notification.error({
        message: 'Error',
        description: 'No se pudo cargar los datos del cliente',
      });
      navigate('/clients');
    } finally {
      setLoading(false);
    }
  };

  const loadClientInvoices = async () => {
    try {
      setLoadingInvoices(true);
      const response = await invoiceService.getInvoices({
        clientId: id,
        limit: 100,
      });
      if (response.success && response.data) {
        setInvoices(response.data.invoices || []);
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const response = await clientService.deleteClient(id!);
      if (response.success) {
        notification.success({
          message: 'Cliente eliminado',
          description: 'El cliente se ha eliminado correctamente',
        });
        navigate('/clients');
      }
    } catch (error) {
      notification.error({
        message: 'Error',
        description: 'No se pudo eliminar el cliente',
      });
    } finally {
      setDeleting(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'green',
      inactive: 'red',
      suspended: 'orange',
      prospect: 'blue',
    };
    return colors[status as keyof typeof colors] || 'default';
  };

  const getClientTypeLabel = (type: string) => {
    return type === 'business' ? 'Empresa' : 'Particular';
  };

  const invoiceColumns = [
    {
      title: 'Número',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      render: (text: string, record: Invoice) => (
        <a onClick={() => navigate(`/invoices/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'issueDate',
      key: 'issueDate',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Vencimiento',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors = {
          draft: 'default',
          sent: 'blue',
          paid: 'green',
          overdue: 'red',
          cancelled: 'red',
        };
        const labels = {
          draft: 'Borrador',
          sent: 'Enviada',
          paid: 'Pagada',
          overdue: 'Vencida',
          cancelled: 'Cancelada',
        };
        return (
          <Tag color={colors[status as keyof typeof colors]}>
            {labels[status as keyof typeof labels] || status}
          </Tag>
        );
      },
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      align: 'right' as const,
      render: (value: number, record: Invoice) => 
        `${value?.toFixed(2) || '0.00'} ${record.currency || 'EUR'}`,
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_: any, record: Invoice) => (
        <Button
          type="link"
          size="small"
          onClick={() => navigate(`/invoices/${record.id}`)}
        >
          Ver detalle
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" tip="Cargando datos del cliente..." />
      </div>
    );
  }

  if (!client) {
    return <Empty description="Cliente no encontrado" />;
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/clients')}>
          Volver
        </Button>
        <Button
          type="primary"
          icon={<EditOutlined />}
          onClick={() => navigate(`/clients/${id}/edit`)}
        >
          Editar Cliente
        </Button>
        <Popconfirm
          title="¿Estás seguro de eliminar este cliente?"
          description="Esta acción no se puede deshacer y eliminará toda la información asociada."
          onConfirm={handleDelete}
          okText="Sí, eliminar"
          cancelText="Cancelar"
          okButtonProps={{ danger: true }}
        >
          <Button
            danger
            icon={<DeleteOutlined />}
            loading={deleting}
            disabled={client.totalInvoices > 0}
          >
            Eliminar Cliente
          </Button>
        </Popconfirm>
      </Space>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card>
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="Ingresos Totales"
                  value={client.totalRevenue}
                  prefix={<DollarOutlined />}
                  suffix={client.currency}
                  precision={2}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Facturas Totales"
                  value={client.totalInvoices}
                  prefix={<FileTextOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Balance Pendiente"
                  value={client.outstandingBalance}
                  prefix={<DollarOutlined />}
                  suffix={client.currency}
                  precision={2}
                  valueStyle={{ color: client.outstandingBalance > 0 ? '#cf1322' : '#3f8600' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Promedio por Factura"
                  value={client.averageInvoiceAmount || 0}
                  prefix={<DollarOutlined />}
                  suffix={client.currency}
                  precision={2}
                />
              </Col>
            </Row>
          </Card>
        </Col>

        <Col span={24}>
          <Card>
            <Tabs defaultActiveKey="info">
              <TabPane tab="Información General" key="info">
                <Descriptions bordered column={2}>
                  <Descriptions.Item label="Nombre" span={1}>
                    <Space>
                      <UserOutlined />
                      {client.name}
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="Nombre Comercial" span={1}>
                    {client.businessName || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Email" span={1}>
                    <Space>
                      <MailOutlined />
                      <a href={`mailto:${client.email}`}>{client.email}</a>
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="Teléfono" span={1}>
                    <Space>
                      <PhoneOutlined />
                      {client.phone || '-'}
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="Tax ID" span={1}>
                    {client.taxIdType}: {client.taxId}
                  </Descriptions.Item>
                  <Descriptions.Item label="Tipo de Cliente" span={1}>
                    <Tag color={client.clientType === 'business' ? 'blue' : 'green'}>
                      {getClientTypeLabel(client.clientType)}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Estado" span={1}>
                    <Tag color={getStatusColor(client.status)}>
                      {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Moneda" span={1}>
                    {client.currency}
                  </Descriptions.Item>
                  <Descriptions.Item label="Idioma" span={1}>
                    {client.language.toUpperCase()}
                  </Descriptions.Item>
                  <Descriptions.Item label="Términos de Pago" span={1}>
                    {client.paymentTerms} días
                  </Descriptions.Item>
                  <Descriptions.Item label="Límite de Crédito" span={1}>
                    {client.creditLimit?.toFixed(2) || '0.00'} {client.currency}
                  </Descriptions.Item>
                  <Descriptions.Item label="Método de Pago" span={1}>
                    {client.paymentMethod || '-'}
                  </Descriptions.Item>
                  {client.address && (
                    <Descriptions.Item label="Dirección" span={2}>
                      <Space>
                        <EnvironmentOutlined />
                        {[
                          client.address.street,
                          client.address.city,
                          client.address.state,
                          client.address.postalCode,
                          client.address.country,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </Space>
                    </Descriptions.Item>
                  )}
                  {client.bankAccount && (
                    <Descriptions.Item label="Cuenta Bancaria" span={2}>
                      <Space>
                        <BankOutlined />
                        {client.bankAccount}
                      </Space>
                    </Descriptions.Item>
                  )}
                  {client.notes && (
                    <Descriptions.Item label="Notas" span={2}>
                      {client.notes}
                    </Descriptions.Item>
                  )}
                  <Descriptions.Item label="Cliente desde" span={1}>
                    <Space>
                      <ClockCircleOutlined />
                      {dayjs(client.createdAt).format('DD/MM/YYYY HH:mm')}
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="Última actualización" span={1}>
                    {dayjs(client.updatedAt).format('DD/MM/YYYY HH:mm')}
                  </Descriptions.Item>
                </Descriptions>
              </TabPane>

              <TabPane tab={`Facturas (${invoices.length})`} key="invoices">
                <Space style={{ marginBottom: 16 }}>
                  <Button
                    type="primary"
                    onClick={() => navigate(`/invoices/new?clientId=${id}`)}
                  >
                    Nueva Factura
                  </Button>
                </Space>
                <Table
                  columns={invoiceColumns}
                  dataSource={invoices}
                  rowKey="id"
                  loading={loadingInvoices}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total, range) =>
                      `${range[0]}-${range[1]} de ${total} facturas`,
                  }}
                />
              </TabPane>

              <TabPane tab="Actividad" key="activity">
                <Timeline>
                  {client.lastInvoiceDate && (
                    <Timeline.Item color="blue">
                      <p>
                        <strong>Última factura:</strong>{' '}
                        {dayjs(client.lastInvoiceDate).format('DD/MM/YYYY')}
                      </p>
                    </Timeline.Item>
                  )}
                  {client.lastContactDate && (
                    <Timeline.Item color="green">
                      <p>
                        <strong>Último contacto:</strong>{' '}
                        {dayjs(client.lastContactDate).format('DD/MM/YYYY')}
                      </p>
                    </Timeline.Item>
                  )}
                  <Timeline.Item>
                    <p>
                      <strong>Cliente creado:</strong>{' '}
                      {dayjs(client.createdAt).format('DD/MM/YYYY HH:mm')}
                    </p>
                  </Timeline.Item>
                </Timeline>
              </TabPane>
            </Tabs>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ClientDetail;