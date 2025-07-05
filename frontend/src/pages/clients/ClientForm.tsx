import React from 'react';
import { Card, Button, Space, Form, Input, Select, InputNumber } from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';

const ClientForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const onFinish = (values: any) => {
    console.log('Form values:', values);
    // TODO: Implement save logic
    navigate('/clients');
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/clients')}>
          Volver
        </Button>
      </Space>
      
      <Card title={isEdit ? `Editar Cliente: ${id}` : 'Nuevo Cliente'}>
        <Form
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            clientType: 'business',
            currency: 'EUR',
            language: 'es',
            paymentTerms: 30,
            creditLimit: 0,
            taxIdType: 'CIF',
          }}
        >
          <Form.Item
            label="Nombre"
            name="name"
            rules={[{ required: true, message: 'Por favor, ingresa el nombre' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item label="Nombre Comercial" name="businessName">
            <Input />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Por favor, ingresa el email' },
              { type: 'email', message: 'Por favor, ingresa un email válido' },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Tax ID"
            name="taxId"
            rules={[{ required: true, message: 'Por favor, ingresa el Tax ID' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item label="Tipo de Tax ID" name="taxIdType">
            <Select>
              <Select.Option value="RFC">RFC</Select.Option>
              <Select.Option value="CIF">CIF</Select.Option>
              <Select.Option value="NIT">NIT</Select.Option>
              <Select.Option value="VAT">VAT</Select.Option>
              <Select.Option value="OTHER">Otro</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="Tipo de Cliente" name="clientType">
            <Select>
              <Select.Option value="business">Empresa</Select.Option>
              <Select.Option value="individual">Particular</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="Moneda" name="currency">
            <Select>
              <Select.Option value="EUR">EUR</Select.Option>
              <Select.Option value="USD">USD</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="Términos de Pago (días)" name="paymentTerms">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="Límite de Crédito" name="creditLimit">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                {isEdit ? 'Actualizar' : 'Crear'} Cliente
              </Button>
              <Button onClick={() => navigate('/clients')}>
                Cancelar
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default ClientForm;