import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Alert,
  Modal,
  Steps,
  message,
  Row,
  Col,
  Statistic,
  Typography,
} from 'antd';
import {
  BankOutlined,
  SyncOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

interface BankAccount {
  id: string;
  name: string;
  institution: string;
  iban?: string;
  balance: number;
  available_balance: number;
  currency: string;
  type: string;
  last_sync?: string;
  is_active: boolean;
}

// interface Institution {
//   id: string;
//   name: string;
//   logo: string;
//   countries: string[];
// }

const BankAccounts: React.FC = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [setupModalVisible, setSetupModalVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  // const [institutions, setInstitutions] = useState<Institution[]>([]);
  // const [selectedInstitution, setSelectedInstitution] = useState<string>('');
  const [requisitionUrl, setRequisitionUrl] = useState<string>('');

  // Fetch accounts on component mount
  useEffect(() => {
    fetchAccounts();
    checkSyncStatus();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/financial/accounts');
      if (response.data.success) {
        setAccounts(response.data.data);
      }
    } catch (error) {
      message.error('Error al cargar las cuentas bancarias');
    } finally {
      setLoading(false);
    }
  };

  const checkSyncStatus = async () => {
    try {
      const response = await axios.get('/api/financial/sync-status');
      if (response.data.success) {
        // Update UI based on sync status
      }
    } catch (error) {
      console.error('Error checking sync status:', error);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await axios.post('/api/financial/sync');
      if (response.data.success) {
        message.success('Sincronización completada');
        fetchAccounts();
      }
    } catch (error) {
      message.error('Error al sincronizar cuentas');
    } finally {
      setSyncing(false);
    }
  };

  const startSetup = () => {
    setSetupModalVisible(true);
    setCurrentStep(0);
    // For now, we'll use BBVA as default
    // setSelectedInstitution('BBVA_BBVAESMM');
  };

  const handleSetupBBVA = async () => {
    try {
      const response = await axios.post('/api/financial/setup-bbva');
      if (response.data.success && response.data.data.authUrl) {
        setRequisitionUrl(response.data.data.authUrl);
        setCurrentStep(1);
        
        // Open authorization URL in new window
        window.open(response.data.data.authUrl, '_blank');
        
        message.info('Por favor, autoriza el acceso en la ventana que se abrió');
      }
    } catch (error) {
      message.error('Error al iniciar el proceso de autorización');
    }
  };

  const handleCompleteSetup = async () => {
    try {
      const response = await axios.post('/api/financial/complete-setup');
      if (response.data.success) {
        message.success('¡Configuración completada exitosamente!');
        setSetupModalVisible(false);
        fetchAccounts();
      }
    } catch (error) {
      message.error('Error al completar la configuración');
    }
  };

  const columns = [
    {
      title: 'Banco',
      dataIndex: 'institution',
      key: 'institution',
      render: (text: string) => (
        <Space>
          <BankOutlined />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: 'Cuenta',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: BankAccount) => (
        <div>
          <Text>{text}</Text>
          {record.iban && (
            <Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>
              {record.iban}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Saldo',
      dataIndex: 'balance',
      key: 'balance',
      align: 'right' as const,
      render: (balance: number, record: BankAccount) => (
        <Statistic
          value={balance}
          precision={2}
          prefix={record.currency === 'EUR' ? '€' : '$'}
          valueStyle={{ fontSize: '16px', color: balance >= 0 ? '#52c41a' : '#f5222d' }}
        />
      ),
    },
    {
      title: 'Disponible',
      dataIndex: 'available_balance',
      key: 'available_balance',
      align: 'right' as const,
      render: (balance: number, record: BankAccount) => (
        <Text type="secondary">
          {record.currency === 'EUR' ? '€' : '$'} {balance.toFixed(2)}
        </Text>
      ),
    },
    {
      title: 'Última Sincronización',
      dataIndex: 'last_sync',
      key: 'last_sync',
      render: (date: string) => (
        <Space>
          <ClockCircleOutlined />
          <Text type="secondary">
            {date ? dayjs(date).format('DD/MM/YYYY HH:mm') : 'Nunca'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'red'}>
          {active ? 'Activa' : 'Inactiva'}
        </Tag>
      ),
    },
  ];

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Balance Total"
              value={totalBalance}
              precision={2}
              prefix="€"
              valueStyle={{ color: totalBalance >= 0 ? '#52c41a' : '#f5222d' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Cuentas Activas"
              value={accounts.filter(a => a.is_active).length}
              suffix={`/ ${accounts.length}`}
              prefix={<BankOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Última Sincronización"
              value={accounts.length > 0 ? 'Hace 2 horas' : 'Nunca'}
              prefix={<SyncOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Transacciones Hoy"
              value={0}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <Space>
            <BankOutlined />
            <span>Cuentas Bancarias Conectadas</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={startSetup}
            >
              Conectar Cuenta
            </Button>
            <Button
              icon={<SyncOutlined />}
              onClick={handleSync}
              loading={syncing}
            >
              Sincronizar
            </Button>
          </Space>
        }
      >
        {accounts.length === 0 && !loading ? (
          <Alert
            message="No hay cuentas conectadas"
            description="Conecta tu primera cuenta bancaria para empezar a sincronizar transacciones automáticamente."
            type="info"
            showIcon
            action={
              <Button size="small" type="primary" onClick={startSetup}>
                Conectar Cuenta
              </Button>
            }
          />
        ) : (
          <Table
            columns={columns}
            dataSource={accounts}
            rowKey="id"
            loading={loading}
            pagination={false}
          />
        )}
      </Card>

      {/* Setup Modal */}
      <Modal
        title="Conectar Cuenta Bancaria"
        visible={setupModalVisible}
        onCancel={() => setSetupModalVisible(false)}
        footer={null}
        width={700}
      >
        <Steps current={currentStep} style={{ marginBottom: 24 }}>
          <Step title="Seleccionar Banco" icon={<BankOutlined />} />
          <Step title="Autorizar Acceso" icon={<LinkOutlined />} />
          <Step title="Confirmar" icon={<CheckCircleOutlined />} />
        </Steps>

        {currentStep === 0 && (
          <div>
            <Title level={4}>Selecciona tu banco</Title>
            <Paragraph>
              Utilizamos conexiones seguras PSD2 para acceder a tu información bancaria.
              Tus credenciales nunca se almacenan en nuestros servidores.
            </Paragraph>
            
            <Card 
              hoverable 
              style={{ marginTop: 16 }}
              onClick={handleSetupBBVA}
            >
              <Space>
                <BankOutlined style={{ fontSize: 24, color: '#004481' }} />
                <div>
                  <Title level={5} style={{ margin: 0 }}>BBVA</Title>
                  <Text type="secondary">Banco Bilbao Vizcaya Argentaria</Text>
                </div>
              </Space>
            </Card>

            <Alert
              message="Seguridad garantizada"
              description="Utilizamos GoCardless/Nordigen, un proveedor certificado PSD2 para acceder de forma segura a tu información bancaria."
              type="success"
              showIcon
              style={{ marginTop: 16 }}
            />
          </div>
        )}

        {currentStep === 1 && (
          <div>
            <Title level={4}>Autoriza el acceso</Title>
            <Paragraph>
              Se ha abierto una nueva ventana donde debes autorizar el acceso a tu cuenta bancaria.
              Una vez completado, haz clic en continuar.
            </Paragraph>
            
            <Alert
              message="Esperando autorización"
              description="Por favor, completa el proceso de autorización en la ventana del banco."
              type="info"
              showIcon
            />

            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <Button type="primary" size="large" onClick={handleCompleteSetup}>
                He completado la autorización
              </Button>
            </div>

            {requisitionUrl && (
              <Paragraph style={{ marginTop: 16, textAlign: 'center' }}>
                <Text type="secondary">
                  Si la ventana no se abrió, 
                  <a href={requisitionUrl} target="_blank" rel="noopener noreferrer">
                    {' '}haz clic aquí
                  </a>
                </Text>
              </Paragraph>
            )}
          </div>
        )}

        {currentStep === 2 && (
          <div style={{ textAlign: 'center' }}>
            <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a' }} />
            <Title level={4} style={{ marginTop: 16 }}>¡Cuenta conectada exitosamente!</Title>
            <Paragraph>
              Tu cuenta bancaria ha sido conectada y las transacciones se sincronizarán automáticamente.
            </Paragraph>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BankAccounts;