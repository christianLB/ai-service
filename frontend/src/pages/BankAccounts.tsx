import { useState, useEffect, useCallback } from "react";
import type { FC } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  message,
  Row,
  Space,
  Typography,
  Empty,
  Tabs,
} from "antd";
import {
  BankOutlined,
  PlusOutlined,
  DashboardOutlined,
  HistoryOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import api from "../services/api";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/es";

// Import modular components
import SyncStatusCard from "../components/financial/SyncStatusCard";
import RecentSyncsCard from "../components/financial/RecentSyncsCard";
import AccountsList from "../components/financial/AccountsList";
import ConnectAccountModal from "../components/financial/ConnectAccountModal";

dayjs.extend(relativeTime);
dayjs.locale("es");

const { Title, Text } = Typography;

interface Account {
  id: string;
  institution_id: string;
  institution_name: string;
  logo_url: string;
  iban: string;
  balance: number;
  currency: string;
  owner_name: string;
  is_active: boolean;
  last_synced_at: string;
}


const BankAccounts: FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [setupModalVisible, setSetupModalVisible] = useState(false);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/financial/accounts");
      setAccounts(response.data.data || []);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      message.error("Error al cargar las cuentas bancarias");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSyncStatus = useCallback(async () => {
    try {
      const response = await api.get("/financial/sync-status");
      setSyncStatus(response.data.data);
      setAutoSyncEnabled(response.data.data?.scheduler?.isRunning || false);
    } catch (error) {
      console.error("Error fetching sync status:", error);
      message.error("Error al cargar el estado de la sincronización");
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
    fetchSyncStatus();
    
    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      fetchSyncStatus();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchAccounts, fetchSyncStatus]);

  const toggleAutoSync = async () => {
    setToggleLoading(true);
    try {
      const endpoint = autoSyncEnabled ? "/scheduler/stop" : "/scheduler/start";
      await api.post(endpoint);
      setAutoSyncEnabled(!autoSyncEnabled);
      message.success(
        `Sincronización automática ${!autoSyncEnabled ? "activada" : "desactivada"}`
      );
      fetchSyncStatus();
    } catch (error) {
      console.error("Error toggling auto-sync:", error);
      message.error("Error al cambiar el estado de la sincronización automática");
    } finally {
      setToggleLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    message.info("Iniciando sincronización manual...");
    try {
      await api.post("/financial/sync");
      message.success("Sincronización iniciada. Los datos se actualizarán pronto.");
      setTimeout(() => {
        fetchAccounts();
        fetchSyncStatus();
      }, 2000);
    } catch (error) {
      console.error("Error starting manual sync:", error);
      message.error("Error al iniciar la sincronización manual");
    } finally {
      setSyncing(false);
    }
  };

  const handleSetupNewAccount = useCallback(() => {
    setSetupModalVisible(true);
  }, []);

  const handleAccountConnected = useCallback(() => {
    fetchAccounts();
    fetchSyncStatus();
  }, [fetchAccounts, fetchSyncStatus]);

  const hasAccounts = accounts.length > 0;

  return (
    <div>
      {/* Header */}
      <Card style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ marginBottom: 8 }}>
              <BankOutlined style={{ marginRight: 12 }} />
              Cuentas Bancarias
            </Title>
            <Text type="secondary" style={{ fontSize: 16 }}>
              Gestiona tus cuentas bancarias conectadas y su estado de sincronización
            </Text>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleSetupNewAccount}
              size="large"
            >
              Conectar Nueva Cuenta
            </Button>
          </Col>
        </Row>
      </Card>

      {!hasAccounts ? (
        /* Empty State */
        <Card style={{ padding: '48px 24px', textAlign: 'center' }}>
          <Empty
            image={<BankOutlined style={{ fontSize: 64, color: '#bfbfbf' }} />}
            imageStyle={{ height: 64 }}
            description={
              <Space direction="vertical" size="large">
                <div>
                  <Title level={4}>No tienes cuentas bancarias conectadas</Title>
                  <Text type="secondary">
                    Conecta tu primera cuenta para empezar a sincronizar tus movimientos bancarios
                  </Text>
                </div>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleSetupNewAccount}
                  size="large"
                >
                  Conectar tu Primera Cuenta
                </Button>
              </Space>
            }
          />
        </Card>
      ) : (
        /* Main Content with Tabs */
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          size="large"
          style={{ marginTop: -16 }}
          items={[
            {
              key: 'overview',
              label: (
                <span>
                  <DashboardOutlined />
                  Vista General
                </span>
              ),
              children: (
            <Row gutter={[24, 24]}>
              <Col xs={24} lg={8}>
                <SyncStatusCard
                  syncStatus={syncStatus}
                  autoSyncEnabled={autoSyncEnabled}
                  syncing={syncing}
                  toggleLoading={toggleLoading}
                  onToggleAutoSync={toggleAutoSync}
                  onManualSync={handleSync}
                />
              </Col>
              <Col xs={24} lg={16}>
                <AccountsList 
                  accounts={accounts} 
                  loading={loading}
                />
              </Col>
            </Row>
              )
            },
            {
              key: 'activity',
              label: (
                <span>
                  <HistoryOutlined />
                  Actividad
                </span>
              ),
              children: (
            <Row gutter={[24, 24]}>
              <Col xs={24} md={16}>
                <RecentSyncsCard 
                  recentSyncs={syncStatus?.stats?.recentSyncs}
                />
              </Col>
              <Col xs={24} md={8}>
                <Card 
                  title={
                    <Space>
                      <SettingOutlined />
                      <span>Configuración Rápida</span>
                    </Space>
                  }
                >
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <Alert
                      message="Límites de API"
                      description="GoCardless permite 4 solicitudes cada 24 horas por cuenta"
                      type="info"
                      showIcon
                    />
                    <Button 
                      block
                      icon={<BankOutlined />}
                      onClick={handleSetupNewAccount}
                    >
                      Añadir otra cuenta
                    </Button>
                  </Space>
                </Card>
              </Col>
            </Row>
              )
            }
          ]}
        />
      )}

      {/* Connect Account Modal */}
      <ConnectAccountModal
        visible={setupModalVisible}
        onClose={() => setSetupModalVisible(false)}
        onComplete={handleAccountConnected}
      />
    </div>
  );
};

export default BankAccounts;
