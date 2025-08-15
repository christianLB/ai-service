import React, { useState } from 'react';
import {
  Card,
  Button,
  Space,
  Alert,
  message,
  notification,
  Typography,
  Divider,
  Row,
  Col,
  Tag,
} from 'antd';
import {
  BankOutlined,
  SwapOutlined,
  WarningOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import gocardlessService from '../../services/gocardlessService';

const { Paragraph } = Typography;

interface GoCardlessSyncProps {
  isConfigured: boolean;
  onSyncComplete?: () => void;
}

const GoCardlessSync: React.FC<GoCardlessSyncProps> = ({ isConfigured, onSyncComplete }) => {
  const [syncingAccounts, setSyncingAccounts] = useState(false);
  const [syncingTransactions, setSyncingTransactions] = useState(false);
  const [lastAccountSync, setLastAccountSync] = useState<Date | null>(null);
  const [lastTransactionSync, setLastTransactionSync] = useState<Date | null>(null);

  const handleAccountSync = async () => {
    if (!isConfigured) {
      message.warning('Por favor, configura las credenciales de GoCardless primero');
      return;
    }

    setSyncingAccounts(true);
    message.info('Iniciando sincronización de cuentas...');

    try {
      const result = await gocardlessService.syncAccounts();

      if (result.success) {
        setLastAccountSync(new Date());
        message.success('Cuentas sincronizadas correctamente');

        if (onSyncComplete) {
          setTimeout(onSyncComplete, 1000);
        }
      } else {
        // Handle partial success or errors
        if (result.data?.errors && result.data.errors.length > 0) {
          const rateLimitErrors = result.data.errors.filter(
            (err: string) =>
              err.toLowerCase().includes('rate limit') || err.toLowerCase().includes('429')
          );

          if (rateLimitErrors.length > 0) {
            notification.warning({
              message: 'Límite de API Alcanzado',
              description: (
                <div>
                  <p>GoCardless tiene límites de sincronización:</p>
                  <ul>
                    {rateLimitErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                  <p style={{ marginTop: 8 }}>
                    <strong>💡 Consejo:</strong> GoCardless permite 4 sincronizaciones por día por
                    cuenta.
                  </p>
                </div>
              ),
              duration: 10,
            });
          } else {
            message.error(result.message || 'Error al sincronizar cuentas');
          }
        } else {
          message.error(result.message || 'Error al sincronizar cuentas');
        }
      }
    } catch (error) {
      console.error('Error syncing accounts:', error);

      const errorObj = error as {
        response?: { data?: { message?: string; error?: string }; status?: number };
      };
      const errorMessage =
        errorObj.response?.data?.message ||
        errorObj.response?.data?.error ||
        'Error al sincronizar cuentas';

      if (errorObj.response?.status === 429 || errorMessage.toLowerCase().includes('rate limit')) {
        notification.error({
          message: 'Límite de API Alcanzado',
          description: (
            <div>
              <p>{errorMessage}</p>
              <p style={{ marginTop: 8 }}>
                <strong>💡 Consejo:</strong> Intenta más tarde o usa sincronización individual.
              </p>
            </div>
          ),
          duration: 10,
        });
      } else {
        message.error(errorMessage);
      }
    } finally {
      setSyncingAccounts(false);
    }
  };

  const handleTransactionSync = async () => {
    if (!isConfigured) {
      message.warning('Por favor, configura las credenciales de GoCardless primero');
      return;
    }

    setSyncingTransactions(true);
    message.info('Iniciando sincronización de transacciones (últimos 7 días)...');

    try {
      const result = await gocardlessService.syncTransactions(undefined, 7);

      if (result.success) {
        setLastTransactionSync(new Date());
        const txCount = result.data?.transactionsSynced || 0;
        message.success(`${txCount} transacciones sincronizadas correctamente`);

        if (onSyncComplete) {
          setTimeout(onSyncComplete, 1000);
        }
      } else {
        // Handle errors
        if (result.data?.errors && result.data.errors.length > 0) {
          const rateLimitErrors = result.data.errors.filter(
            (err: string) =>
              err.toLowerCase().includes('rate limit') || err.toLowerCase().includes('429')
          );

          if (rateLimitErrors.length > 0) {
            notification.warning({
              message: 'Límite de API Alcanzado',
              description: (
                <div>
                  <p>No se pudieron sincronizar todas las transacciones:</p>
                  <ul>
                    {rateLimitErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                  <p style={{ marginTop: 8 }}>
                    <strong>💡 Consejo:</strong> Intenta sincronizar por cuenta individual.
                  </p>
                </div>
              ),
              duration: 10,
            });
          } else {
            message.error(result.message || 'Error al sincronizar transacciones');
          }
        } else {
          message.error(result.message || 'Error al sincronizar transacciones');
        }
      }
    } catch (error) {
      console.error('Error syncing transactions:', error);

      const errorObj = error as {
        response?: { data?: { message?: string; error?: string }; status?: number };
      };
      const errorMessage =
        errorObj.response?.data?.message ||
        errorObj.response?.data?.error ||
        'Error al sincronizar transacciones';

      if (errorObj.response?.status === 429 || errorMessage.toLowerCase().includes('rate limit')) {
        notification.error({
          message: 'Límite de API Alcanzado',
          description: (
            <div>
              <p>{errorMessage}</p>
              <p style={{ marginTop: 8 }}>
                <strong>💡 Consejo:</strong> GoCardless tiene límites estrictos. Intenta más tarde.
              </p>
            </div>
          ),
          duration: 10,
        });
      } else {
        message.error(errorMessage);
      }
    } finally {
      setSyncingTransactions(false);
    }
  };

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Nunca';

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (minutes < 1) return 'Hace menos de 1 minuto';
    if (minutes < 60) return `Hace ${minutes} minuto${minutes !== 1 ? 's' : ''}`;
    if (hours < 24) return `Hace ${hours} hora${hours !== 1 ? 's' : ''}`;

    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isConfigured) {
    return (
      <Alert
        message="GoCardless no configurado"
        description="Por favor, configura las credenciales de GoCardless antes de sincronizar"
        type="info"
        showIcon
        icon={<WarningOutlined />}
      />
    );
  }

  return (
    <Card
      title={
        <Space>
          <BankOutlined />
          <span>Sincronización con GoCardless</span>
        </Space>
      }
    >
      <Paragraph type="secondary">
        Sincroniza tus cuentas bancarias y transacciones desde GoCardless. Ten en cuenta los límites
        de API: 4 llamadas por día por cuenta.
      </Paragraph>

      <Divider />

      <Row gutter={16}>
        <Col span={12}>
          <Card
            size="small"
            title="Sincronizar Cuentas"
            extra={
              lastAccountSync && (
                <Tag icon={<ClockCircleOutlined />} color="processing">
                  {formatLastSync(lastAccountSync)}
                </Tag>
              )
            }
          >
            <Paragraph type="secondary" style={{ marginBottom: 16 }}>
              Obtiene la lista actualizada de todas tus cuentas bancarias conectadas en GoCardless.
            </Paragraph>

            <Button
              type="primary"
              icon={<BankOutlined />}
              loading={syncingAccounts}
              onClick={handleAccountSync}
              block
              size="large"
            >
              {syncingAccounts ? 'Sincronizando...' : 'Sincronizar Cuentas'}
            </Button>
          </Card>
        </Col>

        <Col span={12}>
          <Card
            size="small"
            title="Sincronizar Transacciones"
            extra={
              lastTransactionSync && (
                <Tag icon={<ClockCircleOutlined />} color="processing">
                  {formatLastSync(lastTransactionSync)}
                </Tag>
              )
            }
          >
            <Paragraph type="secondary" style={{ marginBottom: 16 }}>
              Obtiene las transacciones de los últimos 7 días para todas las cuentas.
            </Paragraph>

            <Button
              type="primary"
              icon={<SwapOutlined />}
              loading={syncingTransactions}
              onClick={handleTransactionSync}
              block
              size="large"
            >
              {syncingTransactions ? 'Sincronizando...' : 'Sincronizar Transacciones'}
            </Button>
          </Card>
        </Col>
      </Row>

      <Divider />

      <Alert
        message="Límites de API de GoCardless"
        description={
          <div>
            <p>GoCardless impone los siguientes límites:</p>
            <ul style={{ marginTop: 8 }}>
              <li>Máximo 4 sincronizaciones por día por cuenta</li>
              <li>Los límites se reinician cada 24 horas</li>
              <li>Las sincronizaciones fallidas también cuentan para el límite</li>
            </ul>
            <p style={{ marginTop: 8, marginBottom: 0 }}>
              <strong>Recomendación:</strong> Usa la sincronización con moderación y planifica las
              actualizaciones.
            </p>
          </div>
        }
        type="warning"
        showIcon
        style={{ marginTop: 16 }}
      />
    </Card>
  );
};

export default GoCardlessSync;
