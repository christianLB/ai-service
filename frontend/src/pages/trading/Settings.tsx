import React, { useState } from 'react';
import {
  Card,
  Typography,
  Row,
  Col,
  Input,
  InputNumber,
  Button,
  Switch,
  Form,
  Select,
  Divider,
  Alert,
  Tag,
  List,
  Modal,
  Space,
  Tabs,
  message
} from 'antd';
import {
  SaveOutlined,
  PlusOutlined,
  DeleteOutlined,
  WarningOutlined,
  SafetyOutlined,
  NotificationOutlined,
  ApiOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tradingService } from '../../services/tradingService';

const { Title, Text } = Typography;
const { Option } = Select;

interface RiskSettings {
  maxPositionSize: number;
  maxDailyLoss: number;
  maxDrawdown: number;
  maxLeverage: number;
  stopLossRequired: boolean;
  defaultStopLoss: number;
  defaultTakeProfit: number;
}


interface ExchangeCredential {
  id: string;
  exchange: string;
  name: string;
  testnet: boolean;
  active: boolean;
}

export const Settings: React.FC = () => {
  const [riskForm] = Form.useForm();
  const [notificationForm] = Form.useForm();
  const [exchangeForm] = Form.useForm();
  const [addExchangeModal, setAddExchangeModal] = useState(false);

  const queryClient = useQueryClient();

  const { data: exchanges } = useQuery({
    queryKey: ['exchange-credentials'],
    queryFn: async () => {
      // Mock data - replace with actual API call
      return [
        { id: '1', exchange: 'binance', name: 'Binance Main', testnet: false, active: true },
        { id: '2', exchange: 'binance', name: 'Binance Testnet', testnet: true, active: true }
      ] as ExchangeCredential[];
    }
  });

  const updateRiskSettingsMutation = useMutation({
    mutationFn: (settings: RiskSettings) => tradingService.updateRiskParams(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-settings'] });
      message.success('Configuración de riesgo actualizada');
    },
    onError: () => {
      message.error('Error al actualizar configuración de riesgo');
    }
  });

  const handleSaveRiskSettings = () => {
    riskForm.validateFields().then((values) => {
      updateRiskSettingsMutation.mutate(values);
    });
  };

  const handleSaveNotificationSettings = () => {
    notificationForm.validateFields().then((values) => {
      console.log('Save notification settings:', values);
      message.success('Configuración de notificaciones actualizada');
    });
  };

  const handleAddExchange = () => {
    exchangeForm.validateFields().then((values) => {
      console.log('Add exchange:', values);
      message.success('Exchange agregado exitosamente');
      setAddExchangeModal(false);
      exchangeForm.resetFields();
    });
  };

  const handleDeleteExchange = (id: string) => {
    Modal.confirm({
      title: '¿Eliminar exchange?',
      content: '¿Está seguro de eliminar esta configuración de exchange?',
      okText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      onOk: () => {
        console.log('Delete exchange:', id);
        message.success('Exchange eliminado');
      }
    });
  };

  const tabItems = [
    {
      key: 'risk',
      label: (
        <Space>
          <SafetyOutlined />
          Gestión de Riesgo
        </Space>
      ),
      children: (
        <Form
          form={riskForm}
          layout="vertical"
          initialValues={{
            maxPositionSize: 10,
            maxDailyLoss: 5,
            maxDrawdown: 20,
            maxLeverage: 3,
            stopLossRequired: true,
            defaultStopLoss: 2,
            defaultTakeProfit: 3
          }}
        >
          <Alert
            message="Los límites de riesgo son críticos para proteger tu capital. Configúralos cuidadosamente según tu tolerancia al riesgo."
            type="warning"
            icon={<WarningOutlined />}
            showIcon
            style={{ marginBottom: 24 }}
          />

          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="maxPositionSize"
                label="Tamaño Máximo de Posición (%)"
                tooltip="Porcentaje máximo del capital por posición"
                rules={[{ required: true, min: 1, max: 100, type: 'number' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={1}
                  max={100}
                  step={1}
                  suffix="%"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="maxDailyLoss"
                label="Pérdida Máxima Diaria (%)"
                tooltip="Se detendrá el trading al alcanzar este límite"
                rules={[{ required: true, min: 0.1, max: 20, type: 'number' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0.1}
                  max={20}
                  step={0.1}
                  suffix="%"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="maxDrawdown"
                label="Drawdown Máximo (%)"
                tooltip="Pérdida máxima desde el pico de equity"
                rules={[{ required: true, min: 5, max: 50, type: 'number' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={5}
                  max={50}
                  step={1}
                  suffix="%"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="maxLeverage"
                label="Apalancamiento Máximo"
                tooltip="Apalancamiento máximo permitido"
                rules={[{ required: true, min: 1, max: 10, type: 'number' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={1}
                  max={10}
                  step={1}
                  suffix="x"
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Title level={5}>Configuración de Stop Loss / Take Profit</Title>

          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <Form.Item
                name="stopLossRequired"
                valuePropName="checked"
              >
                <Switch checkedChildren="Sí" unCheckedChildren="No" />
                <Text style={{ marginLeft: 12 }}>Requerir Stop Loss en todas las operaciones</Text>
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="defaultStopLoss"
                label="Stop Loss por Defecto (%)"
                rules={[{ required: true, min: 0.1, max: 10, type: 'number' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0.1}
                  max={10}
                  step={0.1}
                  suffix="%"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="defaultTakeProfit"
                label="Take Profit por Defecto (%)"
                rules={[{ required: true, min: 0.1, max: 50, type: 'number' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0.1}
                  max={50}
                  step={0.1}
                  suffix="%"
                />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ textAlign: 'right', marginTop: 24 }}>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSaveRiskSettings}
              loading={updateRiskSettingsMutation.isPending}
            >
              Guardar Configuración de Riesgo
            </Button>
          </div>
        </Form>
      ),
    },
    {
      key: 'notifications',
      label: (
        <Space>
          <NotificationOutlined />
          Notificaciones
        </Space>
      ),
      children: (
        <Form
          form={notificationForm}
          layout="vertical"
          initialValues={{
            telegramEnabled: false,
            telegramChatId: '',
            emailEnabled: false,
            emailAddress: '',
            trades: true,
            errors: true,
            dailyReport: true,
            riskAlerts: true
          }}
        >
          <Title level={5}>Telegram</Title>

          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <Form.Item
                name="telegramEnabled"
                valuePropName="checked"
              >
                <Switch checkedChildren="Habilitado" unCheckedChildren="Deshabilitado" />
                <Text style={{ marginLeft: 12 }}>Habilitar notificaciones por Telegram</Text>
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) => 
                  prevValues.telegramEnabled !== currentValues.telegramEnabled
                }
              >
                {({ getFieldValue }) =>
                  getFieldValue('telegramEnabled') && (
                    <Form.Item
                      name="telegramChatId"
                      label="Chat ID de Telegram"
                      tooltip="Obtén tu Chat ID del bot @userinfobot"
                      rules={[{ required: true, message: 'Chat ID requerido' }]}
                    >
                      <Input />
                    </Form.Item>
                  )
                }
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Title level={5}>Email</Title>

          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <Form.Item
                name="emailEnabled"
                valuePropName="checked"
              >
                <Switch checkedChildren="Habilitado" unCheckedChildren="Deshabilitado" />
                <Text style={{ marginLeft: 12 }}>Habilitar notificaciones por email</Text>
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) => 
                  prevValues.emailEnabled !== currentValues.emailEnabled
                }
              >
                {({ getFieldValue }) =>
                  getFieldValue('emailEnabled') && (
                    <Form.Item
                      name="emailAddress"
                      label="Dirección de Email"
                      rules={[
                        { required: true, message: 'Email requerido' },
                        { type: 'email', message: 'Email inválido' }
                      ]}
                    >
                      <Input type="email" />
                    </Form.Item>
                  )
                }
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Title level={5}>Tipos de Alertas</Title>

          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="trades"
                valuePropName="checked"
              >
                <Switch />
                <Text style={{ marginLeft: 12 }}>Ejecución de trades</Text>
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="errors"
                valuePropName="checked"
              >
                <Switch />
                <Text style={{ marginLeft: 12 }}>Errores y fallos</Text>
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="dailyReport"
                valuePropName="checked"
              >
                <Switch />
                <Text style={{ marginLeft: 12 }}>Reporte diario</Text>
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="riskAlerts"
                valuePropName="checked"
              >
                <Switch />
                <Text style={{ marginLeft: 12 }}>Alertas de riesgo</Text>
              </Form.Item>
            </Col>
          </Row>

          <div style={{ textAlign: 'right', marginTop: 24 }}>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSaveNotificationSettings}
            >
              Guardar Configuración de Notificaciones
            </Button>
          </div>
        </Form>
      ),
    },
    {
      key: 'exchanges',
      label: (
        <Space>
          <ApiOutlined />
          Exchanges
        </Space>
      ),
      children: (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <Title level={5}>Credenciales de Exchange</Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setAddExchangeModal(true)}
            >
              Agregar Exchange
            </Button>
          </div>

          <List
            dataSource={exchanges}
            renderItem={(exchange) => (
              <List.Item
                actions={[
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteExchange(exchange.id)}
                  />
                ]}
              >
                <List.Item.Meta
                  title={exchange.name}
                  description={
                    <Space wrap>
                      <Tag>{exchange.exchange.toUpperCase()}</Tag>
                      {exchange.testnet && <Tag color="warning">TESTNET</Tag>}
                      <Tag color={exchange.active ? 'success' : 'default'}>
                        {exchange.active ? 'Activo' : 'Inactivo'}
                      </Tag>
                    </Space>
                  }
                />
              </List.Item>
            )}
            locale={{ emptyText: 'No hay exchanges configurados. Agrega uno para comenzar a operar.' }}
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>Configuración de Trading</Title>

      <Card>
        <Tabs items={tabItems} />
      </Card>

      {/* Add Exchange Modal */}
      <Modal
        title="Agregar Exchange"
        open={addExchangeModal}
        onOk={handleAddExchange}
        onCancel={() => {
          setAddExchangeModal(false);
          exchangeForm.resetFields();
        }}
        width={600}
      >
        <Form
          form={exchangeForm}
          layout="vertical"
          initialValues={{ testnet: true }}
        >
          <Form.Item
            name="exchange"
            label="Exchange"
            rules={[{ required: true, message: 'Selecciona un exchange' }]}
          >
            <Select placeholder="Selecciona un exchange">
              <Option value="binance">Binance</Option>
              <Option value="coinbase">Coinbase</Option>
              <Option value="kraken">Kraken</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="name"
            label="Nombre de la conexión"
            tooltip="Ej: Binance Principal, Binance Test"
            rules={[{ required: true, message: 'Ingresa un nombre' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="apiKey"
            label="API Key"
            rules={[{ required: true, message: 'API Key requerida' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="apiSecret"
            label="API Secret"
            rules={[{ required: true, message: 'API Secret requerida' }]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item
            name="testnet"
            valuePropName="checked"
          >
            <Switch checkedChildren="Testnet" unCheckedChildren="Mainnet" />
            <Text style={{ marginLeft: 12 }}>Usar Testnet (recomendado para pruebas)</Text>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Settings;