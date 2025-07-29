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
  Tooltip,
  Tag,
  Popconfirm,
  Row,
  Col
} from 'antd';
import { 
  BankOutlined, 
  ApiOutlined, 
  MailOutlined, 
  DollarOutlined,
  SaveOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  LockOutlined
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

interface FieldStatus {
  [key: string]: {
    configured: boolean;
    lastUpdated?: string;
  };
}

const IntegrationSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState<string | null>(null);
  const [integrationTypes, setIntegrationTypes] = useState<IntegrationType[]>([]);
  const [configs, setConfigs] = useState<{ [type: string]: ConfigValue }>({});
  const [fieldStatuses, setFieldStatuses] = useState<{ [type: string]: FieldStatus }>({});

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
      const statusesByType: { [type: string]: FieldStatus } = {};
      
      existingConfigs.forEach(config => {
        if (!configsByType[config.integrationType]) {
          configsByType[config.integrationType] = {};
          statusesByType[config.integrationType] = {};
        }
        
        // Para valores encriptados, usamos un placeholder especial
        configsByType[config.integrationType][config.configKey] = 
          config.isEncrypted ? '***CONFIGURED***' : config.configValue;
        
        // Track field status
        statusesByType[config.integrationType][config.configKey] = {
          configured: true,
          lastUpdated: config.updatedAt || config.createdAt
        };
      });
      
      setConfigs(configsByType);
      setFieldStatuses(statusesByType);
    } catch (error) {
      console.error('Error loading integrations:', error);
      if ((error as { response?: { status?: number } }).response?.status === 401) {
        message.error('Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.');
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

  const handleClearField = async (integrationType: string, configKey: string) => {
    try {
      setClearing(`${integrationType}-${configKey}`);
      
      // Delete the config
      await integrationService.deleteConfig({
        integrationType,
        configKey
      });
      
      message.success(`Campo ${configKey} eliminado correctamente`);
      
      // Reload configs
      await loadIntegrationTypes();
    } catch (error) {
      console.error('Error clearing field:', error);
      message.error('Error al eliminar el campo');
    } finally {
      setClearing(null);
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
      case 'claude':
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
                fieldStatuses={fieldStatuses[integration.type] || {}}
                onSave={handleSave}
                onClearField={handleClearField}
                saving={saving}
                clearing={clearing}
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
  fieldStatuses: FieldStatus;
  onSave: (integrationType: string, values: ConfigValue) => Promise<void>;
  onClearField: (integrationType: string, configKey: string) => Promise<void>;
  saving: boolean;
  clearing: string | null;
}

const IntegrationForm: React.FC<IntegrationFormProps> = ({ 
  integration, 
  initialValues, 
  fieldStatuses,
  onSave, 
  onClearField,
  saving,
  clearing
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
      case 'claude':
        return <ApiOutlined />;
      default:
        return <ApiOutlined />;
    }
  };

  const renderFieldStatus = (configKey: ConfigKey) => {
    const status = fieldStatuses[configKey.key];
    const isConfigured = status?.configured || initialValues[configKey.key] === '***CONFIGURED***';
    
    if (!configKey.encrypted) {
      return null;
    }

    return (
      <Space size="small">
        {isConfigured ? (
          <>
            <Tag icon={<CheckCircleOutlined />} color="success">
              Configurado
            </Tag>
            <Popconfirm
              title="¿Eliminar esta credencial?"
              description="Esta acción no se puede deshacer"
              onConfirm={() => onClearField(integration.type, configKey.key)}
              okText="Sí, eliminar"
              cancelText="Cancelar"
            >
              <Button 
                size="small" 
                danger 
                icon={<DeleteOutlined />}
                loading={clearing === `${integration.type}-${configKey.key}`}
              >
                Limpiar
              </Button>
            </Popconfirm>
          </>
        ) : (
          <Tag icon={<CloseCircleOutlined />} color="default">
            No configurado
          </Tag>
        )}
      </Space>
    );
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
            {/* GoCardless Credentials */}
            <Title level={5}>Credenciales de GoCardless</Title>
            <Row gutter={16}>
              {integration.configKeys
                .filter(key => key.key === 'secret_id' || key.key === 'secret_key')
                .map(configKey => (
                  <Col span={12} key={configKey.key}>
                    <Form.Item
                      label={
                        <Space>
                          <span>{configKey.description}</span>
                          {configKey.required && <Text type="danger">*</Text>}
                          {configKey.encrypted && (
                            <Tooltip title="Este valor se encripta antes de guardarse">
                              <LockOutlined style={{ color: '#1890ff' }} />
                            </Tooltip>
                          )}
                        </Space>
                      }
                      name={configKey.key}
                      extra={renderFieldStatus(configKey)}
                      rules={[
                        {
                          required: configKey.required && !fieldStatuses[configKey.key]?.configured,
                          message: `${configKey.description} es requerido`
                        }
                      ]}
                    >
                      {configKey.encrypted ? (
                        <Input.Password 
                          prefix={<LockOutlined />}
                          placeholder={
                            initialValues[configKey.key] === '***CONFIGURED***' 
                              ? 'Valor configurado (ingrese nuevo valor para cambiar)'
                              : `Ingrese ${configKey.description}`
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
                  </Col>
                ))}
            </Row>

            <Divider />

            {/* URLs Configuration */}
            <Title level={5}>Configuración de URLs</Title>
            <Row gutter={16}>
              {integration.configKeys
                .filter(key => key.key === 'base_url' || key.key === 'redirect_uri')
                .map(configKey => (
                  <Col span={12} key={configKey.key}>
                    <Form.Item
                      label={configKey.description}
                      name={configKey.key}
                    >
                      <Input 
                        prefix={<ApiOutlined />}
                        placeholder={configKey.description}
                        autoComplete="off"
                      />
                    </Form.Item>
                  </Col>
                ))}
            </Row>

            {/* Test Connection Button */}
            <Row justify="center" style={{ marginTop: 24, marginBottom: 16 }}>
              <Col>
                <Button
                  size="large"
                  icon={<ApiOutlined />}
                  onClick={async () => {
                    try {
                      message.loading('Verificando credenciales...', 0);
                      const response = await fetch('/api/financial/refresh-auth', {
                        method: 'POST'
                      });
                      const result = await response.json();
                      message.destroy();
                      
                      if (result.success) {
                        const hasCredentials = fieldStatuses['secret_id']?.configured && 
                                              fieldStatuses['secret_key']?.configured;
                        
                        if (!hasCredentials) {
                          message.warning('No hay credenciales configuradas. Configura las credenciales primero.');
                        } else {
                          message.success('✅ Autenticación exitosa con GoCardless');
                        }
                      } else {
                        message.error('Error de autenticación: ' + (result.details || 'Verifica las credenciales'));
                      }
                    } catch {
                      message.destroy();
                      message.error('Error de conexión con el servidor');
                    }
                  }}
                >
                  Probar Conexión
                </Button>
              </Col>
            </Row>

            <Alert
              message="Instrucciones de Configuración"
              description={
                <div>
                  <Title level={5}>Obtener Credenciales de GoCardless:</Title>
                  <ol>
                    <li>Accede a <a href="https://manage.gocardless.com" target="_blank" rel="noopener noreferrer">GoCardless Dashboard</a></li>
                    <li>Ve a Developers → User Secrets</li>
                    <li>Copia el Secret ID y Secret Key</li>
                    <li>Pega las credenciales en los campos correspondientes</li>
                  </ol>
                  <p style={{ marginTop: 16 }}>
                    <strong>Nota:</strong> Asegúrate de usar las credenciales de producción. GoCardless tiene un límite de 4 llamadas API por cuenta cada 24 horas.
                  </p>
                </div>
              }
              type="info"
              showIcon
              style={{ marginTop: 24 }}
            />
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
                      <LockOutlined style={{ color: '#1890ff' }} />
                    </Tooltip>
                  )}
                </Space>
              }
              name={configKey.key}
              extra={configKey.encrypted ? renderFieldStatus(configKey) : null}
              rules={[
                {
                  required: configKey.required && !fieldStatuses[configKey.key]?.configured,
                  message: `${configKey.description} es requerido`
                }
              ]}
            >
              {configKey.encrypted ? (
                <Input.Password 
                  prefix={<LockOutlined />}
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
      </Form>
    </Card>
  );
};

export default IntegrationSettings;