import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Typography, 
  Form, 
  Input, 
  Button, 
  Switch, 
  message, 
  Spin, 
  Alert,
  Space,
  Tabs,
  Row,
  Col
} from 'antd';
import { 
  BellOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  SaveOutlined
} from '@ant-design/icons';
import { integrationService } from '../services/integrationService';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface NotificationConfig {
  bot_token: string;
  chat_id: string;
  webhook_url: string;
  alerts_enabled: string;
}

export const NotificationSettings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  
  const [telegramConfig, setTelegramConfig] = useState<NotificationConfig>({
    bot_token: '',
    chat_id: '',
    webhook_url: '',
    alerts_enabled: 'true'
  });

  const loadConfiguration = useCallback(async () => {
    setLoading(true);
    try {
      const config = await integrationService.getConfiguration('telegram');
      const formattedConfig = {
        bot_token: config.bot_token || '',
        chat_id: config.chat_id || '',
        webhook_url: config.webhook_url || '',
        alerts_enabled: config.alerts_enabled || 'true'
      };
      setTelegramConfig(formattedConfig);
      form.setFieldsValue(formattedConfig);
    } catch (error) {
      console.error('Error loading configuration:', error);
      message.error('Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    loadConfiguration();
  }, [loadConfiguration]);


  const handleSaveTelegram = async (values: NotificationConfig) => {
    setSaving(true);
    try {
      const configToSave = {
        ...values,
        alerts_enabled: values.alerts_enabled ? 'true' : 'false'
      };
      
      await integrationService.setConfiguration('telegram', configToSave);
      message.success('Configuración de Telegram guardada exitosamente');
    } catch (error) {
      console.error('Error saving configuration:', error);
      message.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2}>
            <BellOutlined style={{ marginRight: '8px' }} />
            Configuración de Notificaciones
          </Title>
          <Paragraph>
            Configura los canales de notificación para recibir alertas del sistema
          </Paragraph>
        </div>

        <Card>
          <Tabs defaultActiveKey="telegram" type="card">
            <TabPane 
              tab={
                <Space>
                  <BellOutlined />
                  <span>Telegram</span>
                </Space>
              } 
              key="telegram"
            >
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSaveTelegram}
                initialValues={telegramConfig}
              >
                <Row gutter={16}>
                  <Col span={24}>
                    <Title level={4}>
                      <BellOutlined style={{ marginRight: '8px' }} />
                      Configuración de Telegram
                    </Title>
                    <Paragraph type="secondary">
                      Configura tu bot de Telegram para recibir notificaciones y comandos
                    </Paragraph>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item
                      name="bot_token"
                      label="Bot Token"
                      rules={[{ required: true, message: 'El token del bot es requerido' }]}
                      extra="Obtén el token desde @BotFather en Telegram"
                    >
                      <Input.Password
                        placeholder="Ingresa el token de tu bot de Telegram"
                        iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item
                      name="chat_id"
                      label="Chat ID"
                      rules={[{ required: true, message: 'El Chat ID es requerido' }]}
                      extra="ID del chat donde se enviarán las notificaciones"
                    >
                      <Input placeholder="Ingresa el ID del chat" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item
                      name="webhook_url"
                      label="Webhook URL"
                      extra="URL donde Telegram enviará las actualizaciones"
                    >
                      <Input placeholder="https://tu-dominio.com/api/webhook/telegram" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item
                      name="alerts_enabled"
                      label="Habilitar notificaciones automáticas"
                      valuePropName="checked"
                    >
                      <Switch />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={saving}
                        icon={<SaveOutlined />}
                      >
                        Guardar Configuración
                      </Button>
                    </Form.Item>
                  </Col>
                </Row>

                {form.getFieldValue('bot_token') && form.getFieldValue('chat_id') && (
                  <Alert
                    message="Comandos disponibles en Telegram"
                    description={
                      <div>
                        <Text>• /start - Iniciar el bot</Text><br />
                        <Text>• /help - Ver todos los comandos</Text><br />
                        <Text>• /status - Estado del sistema</Text><br />
                        <Text>• /balance - Balance de cuentas</Text><br />
                        <Text>• /sync - Sincronizar datos bancarios</Text><br />
                        <Text>• /invoice - Gestión de facturas</Text><br />
                        <Text>• /revenue - Análisis de ingresos</Text>
                      </div>
                    }
                    type="info"
                    showIcon
                    style={{ marginTop: '16px' }}
                  />
                )}
              </Form>
            </TabPane>
          </Tabs>
        </Card>
      </Space>
    </div>
  );
};

export default NotificationSettings;