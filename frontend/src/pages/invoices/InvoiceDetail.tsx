import React from 'react';
import { Card, Button, Space } from 'antd';
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';

const InvoiceDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/invoices')}>
          Volver
        </Button>
        <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/invoices/${id}/edit`)}>
          Editar Factura
        </Button>
      </Space>
      
      <Card title={`Detalles de la Factura: ${id}`}>
        <p>Vista detallada de la factura (En desarrollo)</p>
      </Card>
    </div>
  );
};

export default InvoiceDetail;