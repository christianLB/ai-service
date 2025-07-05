import React from 'react';
import { Card, Button, Table, Tag, Space } from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const InvoiceList: React.FC = () => {
  const navigate = useNavigate();

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
        };
        return <Tag color={colors[status as keyof typeof colors]}>{status.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (value: number) => `${value.toFixed(2)} EUR`,
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => navigate(`/invoices/${record.id}`)}>
            Ver
          </Button>
          <Button type="link" icon={<EditOutlined />} onClick={() => navigate(`/invoices/${record.id}/edit`)}>
            Editar
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1>Gestión de Facturas</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/invoices/new')}>
          Nueva Factura
        </Button>
      </div>
      
      <Card>
        <Table
          columns={columns}
          dataSource={[]}
          loading={false}
          rowKey="id"
          locale={{
            emptyText: 'No hay facturas disponibles',
          }}
        />
      </Card>
    </div>
  );
};

export default InvoiceList;