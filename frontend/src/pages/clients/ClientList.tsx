import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Space,
  Card,
  Input,
  Select,
  Tag,
  Popconfirm,
  notification,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import clientService from '../../services/clientService';
import type { Client } from '../../types';
import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;

const ClientList: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const navigate = useNavigate();

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const response = await clientService.getClients({
        search: searchText || undefined,
        status: statusFilter,
        limit: pagination.pageSize,
        offset: (pagination.current - 1) * pagination.pageSize,
      });

      if (response.success && response.data) {
        setClients(response.data.clients || []);
        setPagination(prev => ({
          ...prev,
          total: response.data?.pagination.total || 0,
        }));
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      notification.error({
        message: 'Error',
        description: 'No se pudieron cargar los clientes',
      });
    } finally {
      setLoading(false);
    }
  }, [searchText, statusFilter, pagination]);

  const handleDelete = async (id: string) => {
    try {
      const response = await clientService.deleteClient(id);
      if (response.success) {
        notification.success({
          message: 'Cliente eliminado',
          description: 'El cliente se ha eliminado correctamente',
        });
        fetchClients();
      }
    } catch {
      notification.error({
        message: 'Error',
        description: 'No se pudo eliminar el cliente',
      });
    }
  };

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const columns = [
    {
      title: 'Nombre',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Client) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          {record.businessName && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              {record.businessName}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Tax ID',
      dataIndex: 'taxId',
      key: 'taxId',
      render: (text: string, record: Client) => (
        <div>
          <div>{text}</div>
          <Tag>{record.taxIdType}</Tag>
        </div>
      ),
    },
    {
      title: 'Tipo',
      dataIndex: 'clientType',
      key: 'clientType',
      render: (type: string) => (
        <Tag color={type === 'business' ? 'blue' : 'green'}>
          {type === 'business' ? 'Empresa' : 'Particular'}
        </Tag>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors = {
          active: 'green',
          inactive: 'red',
          suspended: 'orange',
          prospect: 'blue',
        };
        const labels = {
          active: 'Activo',
          inactive: 'Inactivo',
          suspended: 'Suspendido',
          prospect: 'Prospecto',
        };
        return (
          <Tag color={colors[status as keyof typeof colors]}>
            {labels[status as keyof typeof labels]}
          </Tag>
        );
      },
    },
    {
      title: 'Ingresos',
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      render: (value: number, record: Client) => (
        <div>
          <div>{value != null && !isNaN(value) ? value.toFixed(2) : '0.00'} {record.currency}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.totalInvoices} facturas
          </div>
        </div>
      ),
    },
    {
      title: 'Creado',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_: unknown, record: Client) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/clients/${record.id}`)}
          >
            Ver
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => navigate(`/clients/${record.id}/edit`)}
          >
            Editar
          </Button>
          <Popconfirm
            title="¿Estás seguro de eliminar este cliente?"
            onConfirm={() => handleDelete(record.id)}
            okText="Sí"
            cancelText="No"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
            >
              Eliminar
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <h1 style={{ margin: 0 }}>Gestión de Clientes</h1>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/clients/new')}
          >
            Nuevo Cliente
          </Button>
        </Col>
      </Row>

      {/* Summary Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Clientes"
              value={pagination.total}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Clientes Activos"
              value={clients.filter(c => c.status === 'active').length}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Ingresos Totales"
              value={clients.reduce((sum, c) => sum + (c.totalRevenue || 0), 0).toFixed(2)}
              suffix="EUR"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Facturas Totales"
              value={clients.reduce((sum, c) => sum + c.totalInvoices, 0)}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Search
              placeholder="Buscar clientes..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={fetchClients}
              enterButton
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="Estado"
              value={statusFilter}
              onChange={setStatusFilter}
              allowClear
              style={{ width: '100%' }}
            >
              <Option value="active">Activo</Option>
              <Option value="inactive">Inactivo</Option>
              <Option value="suspended">Suspendido</Option>
              <Option value="prospect">Prospecto</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Button onClick={fetchClients}>Actualizar</Button>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={clients}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} de ${total} clientes`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({
                ...prev,
                current: page,
                pageSize: pageSize || 10,
              }));
            },
          }}
        />
      </Card>
    </div>
  );
};

export default ClientList;