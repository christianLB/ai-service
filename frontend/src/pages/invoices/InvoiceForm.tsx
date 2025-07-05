import React from 'react';
import { Card, Button, Space } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';

const InvoiceForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/invoices')}>
          Volver
        </Button>
      </Space>
      
      <Card title={isEdit ? `Editar Factura: ${id}` : 'Nueva Factura'}>
        <p>Formulario de factura (En desarrollo)</p>
      </Card>
    </div>
  );
};

export default InvoiceForm;