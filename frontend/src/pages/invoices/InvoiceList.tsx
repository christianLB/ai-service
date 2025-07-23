import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Tag, Space, Row, Col, Input, Select, DatePicker, Statistic, App } from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined, FileTextOutlined, DollarOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import invoiceService from '../../services/invoiceService';
import type { Invoice } from '../../types';
import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const InvoiceList: React.FC = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [stats, setStats] = useState({
    totalInvoices: 0,
    totalRevenue: 0,
    paidInvoices: 0,
    overdueInvoices: 0,
  });

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await invoiceService.getInvoices({
        search: searchText || undefined,
        status: statusFilter,
        type: typeFilter,
        startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
        limit: pagination.pageSize,
        offset: (pagination.current - 1) * pagination.pageSize,
      });

      if (response.success && response.data) {
        setInvoices(response.data.invoices || []);
        setPagination(prev => ({
          ...prev,
          total: response.data?.pagination.total || 0,
        }));
        
        // Calculate stats - ensure numeric values
        const invoiceList = response.data.invoices || [];
        const totalRevenue = invoiceList.reduce((sum, inv) => {
          // Convert to number if it's a Decimal object or string
          let total = 0;
          if (typeof inv.total === 'object' && inv.total && 'toString' in inv.total) {
            total = parseFloat((inv.total as any).toString());
          } else if (typeof inv.total === 'string' || typeof inv.total === 'number') {
            total = parseFloat(String(inv.total));
          }
          return sum + (isNaN(total) ? 0 : total);
        }, 0);
        
        setStats({
          totalInvoices: response.data.pagination.total || 0,
          totalRevenue: totalRevenue,
          paidInvoices: invoiceList.filter(inv => inv.status === 'paid').length,
          overdueInvoices: invoiceList.filter(inv => inv.status === 'overdue').length,
        });
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      message.error('No se pudieron cargar las facturas');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await invoiceService.deleteInvoice(id);
      if (response.success) {
        message.success('La factura se ha eliminado correctamente');
        fetchInvoices();
      }
    } catch (error) {
      message.error('No se pudo eliminar la factura');
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [searchText, statusFilter, typeFilter, dateRange, pagination.current, pagination.pageSize]);

  const columns = [
    {
      title: 'Número',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
    },
    {
      title: 'Cliente',
      dataIndex: 'clientName',
      key: 'clientName',
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors = {
          draft: 'default',
          sent: 'blue',
          viewed: 'cyan',
          paid: 'green',
          overdue: 'red',
          cancelled: 'red',
          refunded: 'purple',
        };
        const labels = {
          draft: 'Borrador',
          sent: 'Enviada',
          viewed: 'Vista',
          paid: 'Pagada',
          overdue: 'Vencida',
          cancelled: 'Cancelada',
          refunded: 'Reembolsada',
        };
        return <Tag color={colors[status as keyof typeof colors]}>{labels[status as keyof typeof labels] || status}</Tag>;
      },
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
      render: (date: string, record: Invoice) => {
        const due = dayjs(date);
        const isOverdue = due.isBefore(dayjs()) && record.status !== 'paid';
        return (
          <span style={{ color: isOverdue ? 'red' : undefined }}>
            {due.format('DD/MM/YYYY')}
          </span>
        );
      },
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (value: any, record: Invoice) => {
        // Convert to number if it's a Decimal object or string
        const numValue = typeof value === 'object' && value ? 
          parseFloat(value.toString()) : 
          parseFloat(value || 0);
        return `${!isNaN(numValue) ? numValue.toFixed(2) : '0.00'} ${record.currency || 'EUR'}`;
      },
      align: 'right' as const,
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_: any, record: Invoice) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/invoices/${record.id}`)}
          />
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => navigate(`/invoices/${record.id}/edit`)}
            disabled={record.status === 'paid' || record.status === 'cancelled'}
          />
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
            disabled={record.status === 'paid'}
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <h1 style={{ margin: 0 }}>Gestión de Facturas</h1>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/invoices/new')}
          >
            Nueva Factura
          </Button>
        </Col>
      </Row>

      {/* Summary Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Facturas"
              value={stats.totalInvoices}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Ingresos Totales"
              value={stats.totalRevenue.toFixed(2)}
              suffix="EUR"
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Facturas Pagadas"
              value={stats.paidInvoices}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Facturas Vencidas"
              value={stats.overdueInvoices}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Search
              placeholder="Buscar facturas..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={fetchInvoices}
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
              <Option value="draft">Borrador</Option>
              <Option value="sent">Enviada</Option>
              <Option value="viewed">Vista</Option>
              <Option value="paid">Pagada</Option>
              <Option value="overdue">Vencida</Option>
              <Option value="cancelled">Cancelada</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="Tipo"
              value={typeFilter}
              onChange={setTypeFilter}
              allowClear
              style={{ width: '100%' }}
            >
              <Option value="invoice">Factura</Option>
              <Option value="credit_note">Nota de Crédito</Option>
              <Option value="proforma">Proforma</Option>
              <Option value="receipt">Recibo</Option>
            </Select>
          </Col>
          <Col span={6}>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates)}
              format="DD/MM/YYYY"
              placeholder={['Fecha inicio', 'Fecha fin']}
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={4}>
            <Button onClick={fetchInvoices}>Actualizar</Button>
          </Col>
        </Row>
      </Card>
      
      {/* Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={invoices}
          loading={loading}
          rowKey="id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} de ${total} facturas`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({
                ...prev,
                current: page,
                pageSize: pageSize || 10,
              }));
            },
          }}
          locale={{
            emptyText: 'No hay facturas disponibles',
          }}
        />
      </Card>
    </div>
  );
};

export default InvoiceList;