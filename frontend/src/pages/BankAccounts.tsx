import { useState, useEffect, useCallback, Component } from "react";

import type { ErrorInfo, ReactNode, FC } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  message,
  Modal,
  Row,
  Space,
  Statistic,
  Steps,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  List,
} from "antd";
import type { TableProps } from "antd";
import {
  CalendarOutlined,
  BankOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ExperimentOutlined,
  PlusOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import api from "../services/api";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/es";

dayjs.extend(relativeTime);
dayjs.locale("es");

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

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

interface SyncedAccount {
  id: string;
  institution_name: string;
}

interface RecentSync {
  startTime: string;
  endTime: string;
  status: string;
  accounts?: SyncedAccount[];
}

interface SyncStatus {
  stats: {
    lastSync: string | null;
    summary: {
      synced: number;
      total: number;
    } | null;
    recentSyncs: RecentSync[] | null;
  } | null;
  scheduler: {
    nextSyncEstimate: string | null;
    autoSyncEnabled: boolean;
  } | null;
}

interface StoredRequisition {
  requisitionId: string;
  timestamp: number;
  bankName: string;
}

// Error Boundary Component
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("BankAccounts Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card>
          <Alert
            message="Error en la página de cuentas bancarias"
            description={`Ha ocurrido un error al cargar las cuentas bancarias. Por favor, recarga la página. Error: ${this.state.error?.message}`}
            type="error"
            showIcon
            action={
              <Button onClick={() => window.location.reload()}>
                Recargar página
              </Button>
            }
          />
        </Card>
      );
    }

    return this.props.children;
  }
}

// Safe number formatter to prevent toFixed errors
const safeFormatNumber = (
  value: number | string | null | undefined,
  decimals: number = 2
): string => {
  try {
    const num = Number(value);
    if (isNaN(num) || num === null || num === undefined) {
      return "0.00";
    }
    return num.toFixed(decimals);
  } catch (error) {
    console.error("Error formatting number:", value, error);
    return "0.00";
  }
};

const BankAccountsContent: FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [setupModalVisible, setSetupModalVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [requisitionId, setRequisitionId] = useState<string | null>(null);
  const [requisitionUrl, setRequisitionUrl] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(false);
  const [isSandbox, setIsSandbox] = useState(false);
  const [completeLoading, setCompleteLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);

  const REQUISITION_STORAGE_KEY = "bank_requisition_pending";

  const clearRequisitionFromStorage = useCallback(() => {
    localStorage.removeItem(REQUISITION_STORAGE_KEY);
  }, []);

  const saveRequisitionToStorage = useCallback(
    (reqId: string, bankName: string) => {
      const data = {
        requisitionId: reqId,
        timestamp: Date.now(),
        bankName: bankName,
      };
      localStorage.setItem(REQUISITION_STORAGE_KEY, JSON.stringify(data));
    },
    []
  );

  const getRequisitionFromStorage = useCallback(() => {
    const storedData = localStorage.getItem(REQUISITION_STORAGE_KEY);
    if (storedData) {
      const data: StoredRequisition = JSON.parse(storedData);
      // Expire after 30 minutes
      if (Date.now() - data.timestamp < 30 * 60 * 1000) {
        return data;
      }
    }
    return null;
  }, []);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/financial/accounts");
      setAccounts(response.data.accounts || []);
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
      setAutoSyncEnabled(response.data.data?.scheduler?.autoSyncEnabled || false);
    } catch (error) {
      console.error("Error fetching sync status:", error);
      message.error("Error al cargar el estado de la sincronización");
    }
  }, []);

  const fetchSandboxStatus = useCallback(async () => {
    try {
      const response = await api.get("/financial/sandbox-status");
      setIsSandbox(response.data.is_sandbox);
    } catch (error) {
      console.error("Error fetching sandbox status:", error);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
    fetchSyncStatus();
    fetchSandboxStatus();

    const pendingRequisition = getRequisitionFromStorage();
    if (pendingRequisition) {
      setRequisitionId(pendingRequisition.requisitionId);
      setCurrentStep(1);
      setSetupModalVisible(true);
    }
  }, [fetchAccounts, fetchSyncStatus, fetchSandboxStatus, getRequisitionFromStorage]);

  const toggleAutoSync = async () => {
    setToggleLoading(true);
    try {
      const response = await api.post("/financial/toggle-auto-sync", {
        enable: !autoSyncEnabled,
      });
      setAutoSyncEnabled(response.data.autoSyncEnabled);
      message.success(
        `Sincronización automática ${response.data.autoSyncEnabled ? "activada" : "desactivada"}`
      );
    } catch (error) {
      console.error("Error toggling auto-sync:", error);
      message.error("Error al cambiar el estado de la sincronización automática");
    }
    setToggleLoading(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    message.info("Iniciando sincronización manual...");
    try {
      await api.post("/financial/sync-accounts");
      message.success("Sincronización iniciada. Los datos se actualizarán pronto.");
      fetchSyncStatus(); // Refresh status
    } catch (error) {
      console.error("Error starting manual sync:", error);
      message.error("Error al iniciar la sincronización manual");
    }
    setSyncing(false);
  };

  const handleSetupNewAccount = useCallback(() => {
    setRequisitionId(null);
    setSetupModalVisible(true);
    setCurrentStep(0);
  }, []);

  const handleSetupBBVA = useCallback(async () => {
    try {
      const response = await api.post("/financial/setup-bbva");
      
      // Extract the requisition data from the response
      if (response.data.success && response.data.data) {
        const { requisitionId, consentUrl } = response.data.data;
        setRequisitionId(requisitionId);
        setRequisitionUrl(consentUrl);
        window.open(consentUrl, "_blank");
        setCurrentStep(1);
        saveRequisitionToStorage(requisitionId, "BBVA");
      } else {
        throw new Error(response.data.error || "Failed to setup BBVA");
      }
    } catch (error: any) {
      message.error(error.message || "No se pudo iniciar la configuración de BBVA");
    }
  }, [saveRequisitionToStorage]);

  const handleSetupSandbox = useCallback(async () => {
    try {
      const response = await api.post("/financial/setup-sandbox");
      
      // Extract the requisition data from the response
      if (response.data.success && response.data.data) {
        const { requisitionId, consentUrl } = response.data.data;
        setRequisitionId(requisitionId);
        setRequisitionUrl(consentUrl);
        window.open(consentUrl, "_blank");
        setCurrentStep(1);
        saveRequisitionToStorage(requisitionId, "Sandbox Bank");
      } else {
        throw new Error(response.data.error || "Failed to setup sandbox");
      }
    } catch (error: any) {
      message.error(
        error.message || "No se pudo iniciar la configuración de sandbox"
      );
    }
  }, [saveRequisitionToStorage]);

  const handleCompleteSetup = useCallback(async () => {
    if (!requisitionId) {
      message.error("No hay un ID de requisición para completar.");
      return;
    }

    setCompleteLoading(true);
    setCheckingAuth(true);
    try {
      await api.post("/financial/complete-setup", { requisition_id: requisitionId });
      message.success("¡Cuenta conectada exitosamente!");
      setCurrentStep(2);
      fetchAccounts();
      fetchSyncStatus();
      clearRequisitionFromStorage();
      setTimeout(() => {
        setSetupModalVisible(false);
      }, 3000);
    } catch (error) {
      console.error("Error completing setup:", error);
      message.error("La autorización no pudo ser completada. Por favor, inténtalo de nuevo.");
    } finally {
      setCompleteLoading(false);
      setCheckingAuth(false);
    }
  }, [requisitionId, fetchAccounts, fetchSyncStatus, clearRequisitionFromStorage]);

  const columns: TableProps<Account>["columns"] = [
    {
      title: "Institución",
      dataIndex: "institution_name",
      key: "institution_name",
      render: (text, record) => (
        <Space>
          {record.logo_url ? (
            <img
              src={record.logo_url}
              alt={`${text} logo`}
              style={{ width: 24, height: 24 }}
            />
          ) : (
            <BankOutlined />
          )}
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: "Titular",
      dataIndex: "owner_name",
      key: "owner_name",
    },
    {
      title: "IBAN",
      dataIndex: "iban",
      key: "iban",
    },
    {
      title: "Saldo",
      dataIndex: "balance",
      key: "balance",
      align: "right",
      render: (balance, record) => (
        <span style={{ fontWeight: "bold" }}>
          {safeFormatNumber(balance)} {record.currency}
        </span>
      ),
    },
    {
      title: "Última Sincronización",
      dataIndex: "last_synced_at",
      key: "last_synced_at",
      render: (text) => (text ? dayjs(text).fromNow() : "Nunca"),
    },
    {
      title: "Estado",
      dataIndex: "is_active",
      key: "is_active",
      render: (isActive) => (
        <Tag color={isActive ? "green" : "red"}>
          {isActive ? "Activa" : "Inactiva"}
        </Tag>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Card>
            <Row justify="space-between" align="middle">
              <Col>
                <Title level={2}>Cuentas Bancarias</Title>
                <Text type="secondary">
                  Gestiona tus cuentas bancarias conectadas y su estado de
                  sincronización.
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
        </Col>

        <Col xs={24} md={8}>
          <Card title="Estado de Sincronización">
            <Statistic
              title="Última Sincronización"
              value={syncStatus?.stats?.lastSync ? dayjs(syncStatus.stats.lastSync).format("DD/MM/YYYY HH:mm") : "Nunca"}
              prefix={<CalendarOutlined />}
            />
            <Statistic
              title="Cuentas Sincronizadas"
              value={`${syncStatus?.stats?.summary?.synced || 0} / ${syncStatus?.stats?.summary?.total || 0}`}
              prefix={<CheckCircleOutlined />}
              style={{ marginTop: 16 }}
            />
            <Statistic
              title="Próxima Sincronización Automática"
              value={syncStatus?.scheduler?.nextSyncEstimate ? dayjs(syncStatus.scheduler.nextSyncEstimate).format("DD/MM/YYYY HH:mm") : "Desactivada"}
              prefix={<ClockCircleOutlined />}
              style={{ marginTop: 16 }}
            />
            <Divider />
            <Space direction="vertical" style={{ width: "100%" }}>
              <Row justify="space-between" align="middle">
                <Text>Sincronización automática</Text>
                <Switch
                  checked={autoSyncEnabled}
                  onChange={toggleAutoSync}
                  loading={toggleLoading}
                />
              </Row>
              <Button
                type="primary"
                icon={<SyncOutlined spin={syncing} />}
                onClick={handleSync}
                loading={syncing}
                style={{ width: "100%" }}
              >
                Sincronizar Ahora
              </Button>
            </Space>
          </Card>
        </Col>

        <Col xs={24} md={16}>
          <Card title="Sincronizaciones Recientes">
            <List
              dataSource={syncStatus?.stats?.recentSyncs || []}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Tooltip title={item.status}>
                        {item.status === "completed" ? (
                          <CheckCircleOutlined style={{ color: "green" }} />
                        ) : (
                          <ExclamationCircleOutlined style={{ color: "red" }} />
                        )}
                      </Tooltip>
                    }
                    title={`Sincronización ${dayjs(item.startTime).fromNow()}`}
                    description={`Duración: ${dayjs(item.endTime).diff(dayjs(item.startTime), "seconds")}s - Cuentas: ${item.accounts?.length || 0}`}
                  />
                </List.Item>
              )}
              locale={{ emptyText: "No hay sincronizaciones recientes." }}
            />
          </Card>
        </Col>

        <Col span={24}>
          <Card title="Cuentas Conectadas">
            <Table
              columns={columns}
              dataSource={accounts}
              loading={loading}
              rowKey="id"
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title="Conectar una nueva cuenta bancaria"
        visible={setupModalVisible}
        onCancel={() => {
          setSetupModalVisible(false);
          setCurrentStep(0);
          clearRequisitionFromStorage();
        }}
        footer={null}
        width={720}
      >
        <Steps current={currentStep} style={{ marginBottom: 24 }}>
          <Step title="Seleccionar Banco" />
          <Step title="Autorizar Conexión" />
          <Step title="Completado" />
        </Steps>

        {currentStep === 0 && (
          <div>
            <Title level={4}>Selecciona tu banco</Title>
            <Paragraph>
              Elige el banco que deseas conectar. Serás redirigido a su
              plataforma segura para autorizar el acceso.
            </Paragraph>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card
                  hoverable
                  onClick={handleSetupBBVA}
                  style={{ textAlign: "center", opacity: isSandbox ? 0.5 : 1 }}
                >
                  <BankOutlined style={{ fontSize: 40, marginBottom: 8 }} />
                  <Paragraph strong>BBVA</Paragraph>
                </Card>
              </Col>
              <Col span={12}>
                <Card
                  hoverable
                  onClick={handleSetupSandbox}
                  style={{ textAlign: "center" }}
                >
                  <ExperimentOutlined style={{ fontSize: 40, marginBottom: 8 }} />
                  <Paragraph strong>Sandbox Bank</Paragraph>
                </Card>
              </Col>
            </Row>

            {isSandbox && (
              <Card style={{ marginTop: 16 }} type="inner">
                <Paragraph>
                  <Text strong>Nota:</Text> Estás en modo sandbox. Solo puedes
                  conectar con el banco de pruebas.
                </Paragraph>
              </Card>
            )}

            <Alert
              message={isSandbox ? "Modo Sandbox Activo" : "Seguridad garantizada"}
              description={
                isSandbox
                  ? "Solo puedes conectar cuentas de prueba. El botón de BBVA está deshabilitado."
                  : "Utilizamos GoCardless/Nordigen, un proveedor certificado PSD2 para acceder de forma segura a tu información bancaria."
              }
              type={isSandbox ? "warning" : "success"}
              showIcon
              style={{ marginTop: 16 }}
            />
          </div>
        )}

        {currentStep === 1 && (
          <div>
            <Title level={4}>Autorizar</Title>
            <Paragraph>
              Serás redirigido a la página segura de tu banco para autorizar el
              acceso.
            </Paragraph>

            <Alert
              message={
                checkingAuth
                  ? "Verificando autorización..."
                  : "Esperando autorización"
              }
              description={
                checkingAuth
                  ? "Estamos verificando el estado de tu autorización. Por favor, espera un momento."
                  : "Por favor, completa el proceso de autorización en la ventana del banco."
              }
              type="info"
              showIcon
              icon={checkingAuth ? <SyncOutlined spin /> : undefined}
            />

            {requisitionId && (
              <Alert
                message="ID de Requisición"
                description={requisitionId}
                type="success"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}

            <div style={{ marginTop: 24, textAlign: "center" }}>
              <Button
                type="primary"
                size="large"
                onClick={handleCompleteSetup}
                loading={completeLoading}
                disabled={!requisitionId}
              >
                {completeLoading
                  ? "Verificando..."
                  : "He completado la autorización"}
              </Button>
            </div>

            {requisitionUrl && (
              <Paragraph style={{ marginTop: 16, textAlign: "center" }}>
                <Text type="secondary">
                  Si la ventana no se abrió,{" "}
                  <a
                    href={requisitionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    haz clic aquí
                  </a>
                </Text>
              </Paragraph>
            )}

            <div style={{ marginTop: 24, textAlign: "center" }}>
              <Text type="secondary">
                Este proceso puede tardar hasta 5 minutos en completarse.
              </Text>
            </div>

            <div style={{ marginTop: 16, textAlign: "center" }}>
              <Button
                type="link"
                onClick={() => {
                  clearRequisitionFromStorage();
                  setCurrentStep(0);
                  setRequisitionId("");
                  setRequisitionUrl("");
                }}
              >
                Empezar de nuevo con otro banco
              </Button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div style={{ textAlign: "center" }}>
            <CheckCircleOutlined style={{ fontSize: 64, color: "#52c41a" }} />
            <Title level={4} style={{ marginTop: 16 }}>
              ¡Configuración completada exitosamente!
            </Title>
            <Paragraph>
              Tu cuenta bancaria ha sido conectada y las transacciones se
              sincronizarán automáticamente.
            </Paragraph>
          </div>
        )}
      </Modal>
    </div>
  );
};

const BankAccounts: FC = () => {
  return (
    <ErrorBoundary>
      <BankAccountsContent />
    </ErrorBoundary>
  );
};

export default BankAccounts;
