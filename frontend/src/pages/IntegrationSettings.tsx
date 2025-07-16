import React, { useEffect, useState } from 'react';
import { 
  Card, 
  Tabs, 
  Form, 
  Input, 
  Button, 
  Switch, 
  message, 
  Spin, 
  Alert,
  Typography,
  Space,
  Divider,
  Tooltip
} from 'antd';
import { 
  BankOutlined, 
  ApiOutlined, 
  MailOutlined, 
  DollarOutlined,
  SaveOutlined,
  ReloadOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import integrationService from '../services/integrationService';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface IntegrationType {
  type: string;
  name: string;
  description: string;
  configKeys: ConfigKey[];
}

interface ConfigKey {
  key: string;
  required: boolean;
  encrypted: boolean;
  description: string;
}

interface ConfigValue {
  [key: string]: string;
}

const IntegrationSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [integrationTypes, setIntegrationTypes] = useState<IntegrationType[]>([]);
  const [configs, setConfigs] = useState<{ [type: string]: ConfigValue }>({});

  useEffect(() => {
    loadIntegrationTypes();
  }, []);

  const loadIntegrationTypes = async () => {
    try {
      setLoading(true);
      const types = await integrationService.getIntegrationTypes('integrations');
      setIntegrationTypes(types);
      
      // Load existing configs
      const existingConfigs = await integrationService.getAllConfigs();
      const configsByType: { [type: string]: ConfigValue } = {};
      
      existingConfigs.forEach(config => {
        if (!configsByType[config.integrationType]) {
          configsByType[config.integrationType] = {};
        }
        // Para valores encriptados, usamos un placeholder especial
        configsByType[config.integrationType][config.configKey] = 
          config.isEncrypted ? '***CONFIGURED***' : config.configValue;
      });
      
      setConfigs(configsByType);
    } catch (error: any) {
      console.error('Error loading integrations:', error);
      if (error.response?.status === 401) {
        message.error('Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.');
        // Opcional: redirigir al login
        // window.location.href = '/login';
      } else {
        message.error('Error al cargar las integraciones. Por favor, intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (integrationType: string, values: ConfigValue) => {
    try {
      setSaving(true);
      
      // Get original values
      const originalValues = configs[integrationType] || {};
      
      // Save each config key
      for (const [key, value] of Object.entries(values)) {
        // Skip if value hasn't changed or is the placeholder
        if (value === '***CONFIGURED***' || value === originalValues[key]) {
          continue;
        }
        
        // Only save non-empty values or if explicitly cleared
        if (value !== '' || originalValues[key]) {
          const configKey = integrationTypes
            .find(t => t.type === integrationType)
            ?.configKeys.find(k => k.key === key);
          
          // For encrypted fields, only save if user entered a new value
          if (configKey?.encrypted && !value) {
            continue;
          }
          
          await integrationService.saveConfig({
            integrationType,
            configKey: key,
            configValue: value,
            encrypt: configKey?.encrypted || false,
            isGlobal: true
          });
        }
      }
      
      message.success(`Configuración de ${integrationType} guardada correctamente`);
      
      // Reload configs
      await loadIntegrationTypes();
    } catch (error) {
      console.error('Error saving config:', error);
      message.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'gocardless':
        return <BankOutlined />;
      case 'crypto':
        return <DollarOutlined />;
      case 'email':
        return <MailOutlined />;
      case 'openai':
        return <ApiOutlined />;
      default:
        return <ApiOutlined />;
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <Title level={2}>Configuración de Integraciones</Title>
      
      <Paragraph>
        Configura las claves API y credenciales para las diferentes integraciones del sistema.
        Todos los valores sensibles se encriptan automáticamente antes de guardarse.
      </Paragraph>
      
      {integrationTypes.length === 0 ? (
        <Card>
          <Alert
            message="No se pudieron cargar las integraciones"
            description={
              <div>
                <p>Posibles causas:</p>
                <ul>
                  <li>Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.</li>
                  <li>Error de conexión con el servidor.</li>
                  <li>No hay integraciones configuradas en el sistema.</li>
                </ul>
                <Button 
                  type="primary" 
                  onClick={loadIntegrationTypes}
                  icon={<ReloadOutlined />}
                  style={{ marginTop: 16 }}
                >
                  Reintentar
                </Button>
              </div>
            }
            type="warning"
            showIcon
          />
        </Card>
      ) : (
        <Tabs defaultActiveKey="gocardless" type="card">
          {integrationTypes.map(integration => (
            <TabPane 
              tab={
                <Space>
                  {getIcon(integration.type)}
                  <span>{integration.name}</span>
                </Space>
              } 
              key={integration.type}
            >
              <IntegrationForm
                integration={integration}
                initialValues={configs[integration.type] || {}}
                onSave={handleSave}
                saving={saving}
              />
            </TabPane>
          ))}
        </Tabs>
      )}
    </div>
  );
};

// Separate component for each integration form
interface IntegrationFormProps {
  integration: IntegrationType;
  initialValues: ConfigValue;
  onSave: (integrationType: string, values: ConfigValue) => Promise<void>;
  saving: boolean;
}

const IntegrationForm: React.FC<IntegrationFormProps> = ({ 
  integration, 
  initialValues, 
  onSave, 
  saving 
}) => {
  const [form] = Form.useForm();
  
  // Clean up placeholders for form display
  const cleanedInitialValues: ConfigValue = {};
  
  Object.entries(initialValues).forEach(([key, value]) => {
    // Don't set placeholder values as initial values for encrypted fields
    if (value === '***CONFIGURED***') {
      cleanedInitialValues[key] = '';
    } else {
      cleanedInitialValues[key] = value;
    }
  });
  
  const getIcon = (type: string) => {
    switch (type) {
      case 'gocardless':
        return <BankOutlined />;
      case 'crypto':
        return <DollarOutlined />;
      case 'email':
        return <MailOutlined />;
      case 'openai':
        return <ApiOutlined />;
      default:
        return <ApiOutlined />;
    }
  };
  
  return (
    <Card 
      title={
        <Space>
          {getIcon(integration.type)}
          <span>{integration.name}</span>
        </Space>
      }
      extra={
        <Space>
          <Button 
            icon={<ReloadOutlined />}
            onClick={() => form.resetFields()}
          >
            Restablecer
          </Button>
          <Button 
            type="primary" 
            icon={<SaveOutlined />}
            loading={saving}
            onClick={() => form.submit()}
          >
            Guardar
          </Button>
        </Space>
      }
    >
      <Paragraph type="secondary">
        {integration.description}
      </Paragraph>
      
      <Divider />
      
      <Form
        form={form}
        layout="vertical"
        initialValues={cleanedInitialValues}
        onFinish={(values) => onSave(integration.type, values)}
      >
        {integration.type === 'gocardless' ? (
          <>
            {integration.configKeys
              .filter(key => !key.key.startsWith('sandbox_') && key.key !== 'base_url')
              .map(configKey => (
                <Form.Item
                  key={configKey.key}
                  label={
                    <Space>
                      <span>{configKey.description}</span>
                      {configKey.required && <Text type="danger">*</Text>}
                      {configKey.encrypted && (
                        <Tooltip title="Este valor se encripta antes de guardarse">
                          <InfoCircleOutlined style={{ color: '#1890ff' }} />
                        </Tooltip>
                      )}
                    </Space>
                  }
                  name={configKey.key}
                  rules={[
                    {
                      required: configKey.required,
                      message: `${configKey.description} es requerido`
                    }
                  ]}
                >
                  {configKey.encrypted ? (
                    <Input.Password 
                      placeholder={
                        initialValues[configKey.key] === '***CONFIGURED***' 
                          ? 'Valor configurado (ingrese nuevo valor para cambiar)'
                          : configKey.description
                      }
                      autoComplete="new-password"
                    />
                  ) : (
                    <Input 
                      placeholder={configKey.description}
                      autoComplete="off"
                    />
                  )}
                </Form.Item>
              ))}
          </>
        ) : (
          // Other integrations - keep original layout
          integration.configKeys.map(configKey => (
            <Form.Item
              key={configKey.key}
              label={
                <Space>
                  <span>{configKey.description}</span>
                  {configKey.required && <Text type="danger">*</Text>}
                  {configKey.encrypted && (
                    <Tooltip title="Este valor se encripta antes de guardarse">
                      <InfoCircleOutlined style={{ color: '#1890ff' }} />
                    </Tooltip>
                  )}
                </Space>
              }
              name={configKey.key}
              rules={[
                {
                  required: configKey.required,
                  message: `${configKey.description} es requerido`
                }
              ]}
            >
              {configKey.encrypted ? (
                <Input.Password 
                  placeholder={
                    initialValues[configKey.key] === '***CONFIGURED***' 
                      ? 'Valor configurado (ingrese nuevo valor para cambiar)'
                      : configKey.description
                  }
                  autoComplete="new-password"
                />
              ) : configKey.key.includes('enabled') || configKey.key.includes('mode') ? (
                <Switch 
                  checkedChildren="Sí" 
                  unCheckedChildren="No"
                  defaultChecked={cleanedInitialValues[configKey.key] === 'true'}
                />
              ) : (
                <Input 
                  placeholder={configKey.description}
                  autoComplete="off"
                />
              )}
            </Form.Item>
          ))
        )}
        
        {integration.type === 'gocardless' && (
          <>
            <Alert
              message="GoCardless - Account Data API (Open Banking)"
              description={
                <div>
                  <p>GoCardless permite conectar cuentas bancarias de forma segura usando Open Banking.</p>
                  <Divider />
                  <Title level={5}>Configuración</Title>
                  <ol>
                    <li>Accede a <a href="https://manage.gocardless.com" target="_blank" rel="noopener noreferrer">https://manage.gocardless.com</a></li>
                    <li>Crea una nueva aplicación en el panel de desarrollador</li>
                    <li>Copia el Secret ID y Secret Key</li>
                  </ol>
                </div>
              }
              type="info"
              showIcon
            />
          </>
        )}
      </Form>
    </Card>
  );
};

export default IntegrationSettings;