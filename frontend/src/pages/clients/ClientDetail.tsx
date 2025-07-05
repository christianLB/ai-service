import React from 'react';
import { Card, Button, Space } from 'antd';
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';

const ClientDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/clients')}>
          Volver
        </Button>
        <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/clients/${id}/edit`)}>
          Editar Cliente
        </Button>
      </Space>
      
      <Card title={`Detalles del Cliente: ${id}`}>
        <p>Vista detallada del cliente (En desarrollo)</p>
      </Card>
    </div>
  );
};

export default ClientDetail;