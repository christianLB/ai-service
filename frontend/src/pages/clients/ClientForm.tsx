import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Space, Form, Input, Select, InputNumber, notification, Spin, Row, Col } from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import clientService from '../../services/clientService';
import type { ClientFormData } from '../../types';

const { TextArea } = Input;

const ClientForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadClient = useCallback(async () => {
    try {
      setLoading(true);
      const response = await clientService.getClient(id!);
      if (response.success && response.data) {
        const client = response.data.client;
        form.setFieldsValue({
          name: client.name,
          businessName: client.businessName,
          email: client.email,
          phone: client.phone,
          taxId: client.taxId,
          taxIdType: client.taxIdType,
          clientType: client.clientType,
          currency: client.currency,
          language: client.language,
          paymentTerms: client.paymentTerms,
          creditLimit: client.creditLimit,
          paymentMethod: client.paymentMethod,
          bankAccount: client.bankAccount,
          notes: client.notes,
          // Address fields
          street: client.address?.street,
          city: client.address?.city,
          state: client.address?.state,
          country: client.address?.country,
          postalCode: client.address?.postalCode,
        });
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
  }, [id, form, navigate]);

  useEffect(() => {
    if (isEdit && id) {
      loadClient();
    }
  }, [id, isEdit, loadClient]);


  const onFinish = async (values: ClientFormData) => {
    try {
      setSubmitting(true);
      
      // Build the client data
      const clientData: ClientFormData = {
        name: values.name,
        businessName: values.businessName,
        email: values.email,
        phone: values.phone,
        taxId: values.taxId,
        taxIdType: values.taxIdType,
        clientType: values.clientType,
        currency: values.currency,
        language: values.language,
        paymentTerms: values.paymentTerms,
        creditLimit: values.creditLimit,
        paymentMethod: values.paymentMethod,
        bankAccount: values.bankAccount,
        notes: values.notes,
        address: values.street || values.city || values.country || values.postalCode ? {
          street: values.street || '',
          city: values.city || '',
          state: values.state,
          country: values.country || '',
          postalCode: values.postalCode || '',
        } : undefined,
      };

      let response;
      if (isEdit) {
        response = await clientService.updateClient(id!, clientData);
      } else {
        response = await clientService.createClient(clientData);
      }

      if (response.success) {
        notification.success({
          message: 'Éxito',
          description: `Cliente ${isEdit ? 'actualizado' : 'creado'} correctamente`,
        });
        navigate('/clients');
      }
    } catch (error) {
      console.error('Error saving client:', error);
      notification.error({
        message: 'Error',
        description: (error as { response?: { data?: { error?: string } } }).response?.data?.error || `No se pudo ${isEdit ? 'actualizar' : 'crear'} el cliente`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" tip="Cargando datos del cliente..." />
      </div>
    );
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/clients')}>
          Volver
        </Button>
      </Space>
      
      <Card title={isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            clientType: 'business',
            currency: 'EUR',
            language: 'es',
            paymentTerms: 30,
            creditLimit: 0,
            taxIdType: 'CIF',
            country: 'España',
          }}
        >
          <Row gutter={16}>
            <Col span={24}>
              <h3>Información Básica</h3>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Nombre"
                name="name"
                rules={[{ required: true, message: 'Por favor, ingresa el nombre' }]}
              >
                <Input placeholder="Nombre del cliente" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Nombre Comercial" name="businessName">
                <Input placeholder="Nombre comercial (opcional)" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: 'Por favor, ingresa el email' },
                  { type: 'email', message: 'Por favor, ingresa un email válido' },
                ]}
              >
                <Input placeholder="email@ejemplo.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Teléfono" name="phone">
                <Input placeholder="+34 600 123 456" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <h3>Información Fiscal</h3>
            </Col>
            <Col span={8}>
              <Form.Item label="Tipo de Tax ID" name="taxIdType" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="RFC">RFC</Select.Option>
                  <Select.Option value="CIF">CIF</Select.Option>
                  <Select.Option value="NIT">NIT</Select.Option>
                  <Select.Option value="VAT">VAT</Select.Option>
                  <Select.Option value="OTHER">Otro</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Tax ID"
                name="taxId"
                rules={[{ required: true, message: 'Por favor, ingresa el Tax ID' }]}
              >
                <Input placeholder="B12345678" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Tipo de Cliente" name="clientType" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="business">Empresa</Select.Option>
                  <Select.Option value="individual">Particular</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <h3>Dirección</h3>
            </Col>
            <Col span={24}>
              <Form.Item label="Calle" name="street">
                <Input placeholder="Calle Principal 123" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Ciudad" name="city">
                <Input placeholder="Madrid" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Estado/Provincia" name="state">
                <Input placeholder="Madrid" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Código Postal" name="postalCode">
                <Input placeholder="28001" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="País" name="country">
                <Input placeholder="España" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <h3>Configuración de Pagos</h3>
            </Col>
            <Col span={6}>
              <Form.Item label="Moneda" name="currency">
                <Select>
                  <Select.Option value="EUR">EUR</Select.Option>
                  <Select.Option value="USD">USD</Select.Option>
                  <Select.Option value="GBP">GBP</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Idioma" name="language">
                <Select>
                  <Select.Option value="es">Español</Select.Option>
                  <Select.Option value="en">English</Select.Option>
                  <Select.Option value="fr">Français</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Términos de Pago (días)" name="paymentTerms">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Límite de Crédito" name="creditLimit">
                <InputNumber<number>
                  min={0} 
                  style={{ width: '100%' }} 
                  formatter={value => `€ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => {
                    if (!value) return 0;
                    const num = value.replace(/€\s?|(,*)/g, '');
                    return parseFloat(num) || 0;
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Método de Pago" name="paymentMethod">
                <Select allowClear>
                  <Select.Option value="transfer">Transferencia</Select.Option>
                  <Select.Option value="cash">Efectivo</Select.Option>
                  <Select.Option value="card">Tarjeta</Select.Option>
                  <Select.Option value="crypto">Crypto</Select.Option>
                  <Select.Option value="other">Otro</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Cuenta Bancaria" name="bankAccount">
                <Input placeholder="IBAN o número de cuenta" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item label="Notas" name="notes">
                <TextArea 
                  rows={3} 
                  placeholder="Notas adicionales sobre el cliente"
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
                {isEdit ? 'Actualizar' : 'Crear'} Cliente
              </Button>
              <Button onClick={() => navigate('/clients')} disabled={submitting}>
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