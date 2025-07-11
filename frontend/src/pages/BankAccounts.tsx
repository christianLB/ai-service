import React, { useState, useEffect, Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
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
  Switch,
  Tooltip,
} from "antd";
import {
  BankOutlined,
  SyncOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/es";

dayjs.extend(relativeTime);
dayjs.locale("es");

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

interface BankAccount {
  id: string;
  name: string;
  institution: string;
  iban?: string;
  balance: number;
  available_balance?: number;
  currency: string;
  type: string;
  last_sync?: string;
  is_active: boolean;
}

interface StoredRequisition {
  requisitionId: string;
  timestamp: number;
  bankName: string;
}

// interface Institution {
//   id: string;
//   name: string;
//   logo: string;
//   countries: string[];
// }

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
const safeFormatNumber = (value: any, decimals: number = 2): string => {
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

const BankAccountsContent: React.FC = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [setupModalVisible, setSetupModalVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  // const [institutions, setInstitutions] = useState<Institution[]>([]);
  // const [selectedInstitution, setSelectedInstitution] = useState<string>('');
  const [requisitionUrl, setRequisitionUrl] = useState<string>("");
  const [requisitionId, setRequisitionId] = useState<string>("");
  const [authLoading, setAuthLoading] = useState(false);
  const [completeLoading, setCompleteLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(false);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);

  // LocalStorage key for requisition data
  const REQUISITION_STORAGE_KEY = "bank_requisition_pending";

  // Helper functions for localStorage with expiration
  const saveRequisitionToStorage = (
    requisitionId: string,
    bankName: string = "BBVA"
  ) => {
    const data: StoredRequisition = {
      requisitionId,
      timestamp: Date.now(),
      bankName,
    };
    localStorage.setItem(REQUISITION_STORAGE_KEY, JSON.stringify(data));
  };

  const getRequisitionFromStorage = (): StoredRequisition | null => {
    const stored = localStorage.getItem(REQUISITION_STORAGE_KEY);
    if (!stored) return null;

    try {
      const data: StoredRequisition = JSON.parse(stored);
      // Check if data is older than 1 hour (3600000 ms)
      if (Date.now() - data.timestamp > 3600000) {
        localStorage.removeItem(REQUISITION_STORAGE_KEY);
        return null;
      }
      return data;
    } catch {
      localStorage.removeItem(REQUISITION_STORAGE_KEY);
      return null;
    }
  };

  const clearRequisitionFromStorage = () => {
    localStorage.removeItem(REQUISITION_STORAGE_KEY);
  };

  // Fetch accounts on component mount
  useEffect(() => {
    fetchAccounts();
    checkSyncStatus();
    fetchSyncStatus();

    // Check for pending requisition
    const storedRequisition = getRequisitionFromStorage();
    if (storedRequisition) {
      message.info("Tienes una autorización pendiente de completar");
      setRequisitionId(storedRequisition.requisitionId);
      setSetupModalVisible(true);
      setCurrentStep(1);
    }
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/api/financial/accounts");
      if (response.data.success && Array.isArray(response.data.data)) {
        // Map backend data to frontend interface
        const mappedAccounts = response.data.data.map((account: any) => ({
          id: account.id,
          name: account.name,
          institution:
            account.metadata?.institution_name ||
            account.institutionId ||
            "BBVA",
          iban: account.iban,
          balance: account.balance ? parseFloat(account.balance) : 0,
          available_balance: account.balance ? parseFloat(account.balance) : 0, // Same as balance for now
          currency: account.currencyId || "EUR",
          type: account.type,
          last_sync: account.metadata?.last_sync || account.updatedAt,
          is_active: account.isActive,
        }));
        setAccounts(mappedAccounts);
      }
    } catch (error) {
      message.error("Error al cargar las cuentas bancarias");
    } finally {
      setLoading(false);
    }
  };

  const checkSyncStatus = async () => {
    try {
      const response = await axios.get("/api/financial/sync-status");
      if (response.data.success) {
        // Update UI based on sync status
      }
    } catch (error) {
      console.error("Error checking sync status:", error);
    }
  };

  const fetchSyncStatus = async () => {
    try {
      const response = await axios.get("/api/financial/sync-status");
      if (response.data.success) {
        setSyncStatus(response.data.data);
        setAutoSyncEnabled(response.data.data.scheduler.isRunning);
      }
    } catch (error) {
      console.error("Error fetching sync status:", error);
    }
  };

  const toggleAutoSync = async () => {
    setToggleLoading(true);
    try {
      const endpoint = autoSyncEnabled
        ? "/api/financial/scheduler/stop"
        : "/api/financial/scheduler/start";
      const response = await axios.post(endpoint);

      if (response.data.success) {
        setAutoSyncEnabled(!autoSyncEnabled);
        message.success(
          autoSyncEnabled
            ? "Sincronización automática desactivada"
            : "Sincronización automática activada"
        );
        fetchSyncStatus();
      }
    } catch (error) {
      message.error("Error al cambiar el estado de sincronización automática");
    } finally {
      setToggleLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await axios.post("/api/financial/sync");
      if (response.data.success) {
        message.success("Sincronización completada");
        fetchAccounts();
        fetchSyncStatus(); // Update sync stats
      }
    } catch (error) {
      message.error("Error al sincronizar cuentas");
    } finally {
      setSyncing(false);
    }
  };

  const startSetup = () => {
    setSetupModalVisible(true);
    setCurrentStep(0);
    setRequisitionId("");
    setRequisitionUrl("");
    // For now, we'll use BBVA as default
    // setSelectedInstitution('BBVA_BBVAESMM');
  };

  const handleSetupBBVA = async () => {
    setAuthLoading(true);
    try {
      console.log("Iniciando setup BBVA...");
      const response = await axios.post("/api/financial/setup-bbva");
      console.log("Respuesta del servidor:", response.data);

      if (response.data.success && response.data.data.consentUrl) {
        const { consentUrl, requisitionId } = response.data.data;
        console.log("ConsentUrl:", consentUrl);
        console.log("RequisitionId:", requisitionId);

        // Save requisition data
        setRequisitionUrl(consentUrl);
        setRequisitionId(requisitionId);

        // Save to localStorage for recovery
        saveRequisitionToStorage(requisitionId, "BBVA");

        setCurrentStep(1);

        // Open authorization URL in new window
        const authWindow = window.open(consentUrl, "_blank");
        if (!authWindow) {
          message.warning(
            "El navegador bloqueó la ventana emergente. Por favor, permite las ventanas emergentes para este sitio."
          );
        }

        message.info(
          "Por favor, autoriza el acceso en la ventana que se abrió"
        );
      } else {
        console.error("Respuesta inesperada:", response.data);
        message.error("No se recibió la URL de autorización");
      }
    } catch (error) {
      console.error("Setup error:", error);
      if (axios.isAxiosError(error)) {
        console.error("Error details:", error.response?.data);
      }
      message.error("Error al iniciar el proceso de autorización");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCompleteSetup = async () => {
    if (!requisitionId) {
      message.error(
        "No se encontró el ID de requisición. Por favor, intenta nuevamente."
      );
      return;
    }

    setCompleteLoading(true);
    try {
      const response = await axios.post("/api/financial/complete-setup", {
        requisitionId,
      });

      if (response.data.success) {
        message.success("¡Configuración completada exitosamente!");
        clearRequisitionFromStorage();
        setCurrentStep(2);

        // Wait 2 seconds to show success screen, then close and refresh
        setTimeout(() => {
          setSetupModalVisible(false);
          fetchAccounts();
        }, 2000);
      } else {
        message.error(
          response.data.error || "Error al completar la configuración"
        );
      }
    } catch (error: any) {
      console.error("Complete setup error:", error);
      if (error.response?.data?.error) {
        message.error(error.response.data.error);
      } else {
        message.error(
          "Error al completar la configuración. Por favor, intenta nuevamente."
        );
      }
    } finally {
      setCompleteLoading(false);
    }
  };

  // Optional: Check authorization status periodically
  const checkAuthorizationStatus = async () => {
    if (!requisitionId || currentStep !== 1) return;

    setCheckingAuth(true);
    try {
      const response = await axios.get(
        `/api/financial/requisition-status/${requisitionId}`
      );
      if (response.data.success && response.data.data.status === "LN") {
        // Linked successfully
        message.success(
          "¡Autorización detectada! Completando configuración..."
        );
        await handleCompleteSetup();
      }
    } catch (error) {
      // Silent fail - user can still click the button manually
      console.log("Status check failed:", error);
    } finally {
      setCheckingAuth(false);
    }
  };

  // Optional: Auto-check authorization status
  useEffect(() => {
    if (currentStep === 1 && requisitionId) {
      const interval = setInterval(() => {
        checkAuthorizationStatus();
      }, 10000); // Check every 10 seconds

      return () => clearInterval(interval);
    }
  }, [currentStep, requisitionId]);

  const columns = [
    {
      title: "Banco",
      dataIndex: "institution",
      key: "institution",
      render: (text: string) => (
        <Space>
          <BankOutlined />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: "Cuenta",
      dataIndex: "name",
      key: "name",
      render: (text: string, record: BankAccount) => (
        <div>
          <Text>{text}</Text>
          {record.iban && (
            <Text
              type="secondary"
              style={{ display: "block", fontSize: "12px" }}
            >
              {record.iban}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: "Saldo",
      dataIndex: "balance",
      key: "balance",
      align: "right" as const,
      render: (balance: number, record: BankAccount) => {
        const balanceValue =
          typeof balance === "number" && !isNaN(balance) ? balance : 0;
        const formattedBalance = safeFormatNumber(balanceValue);
        return (
          <div
            style={{
              textAlign: "right",
              fontSize: "16px",
              color: balanceValue >= 0 ? "#52c41a" : "#f5222d",
              fontWeight: 500,
            }}
          >
            {record.currency === "EUR" ? "€" : "$"} {formattedBalance}
          </div>
        );
      },
    },
    {
      title: "Disponible",
      dataIndex: "available_balance",
      key: "available_balance",
      align: "right" as const,
      render: (balance: number | undefined, record: BankAccount) => {
        return (
          <Text type="secondary">
            {record.currency === "EUR" ? "€" : "$"} {safeFormatNumber(balance)}
          </Text>
        );
      },
    },
    {
      title: "Última Sincronización",
      dataIndex: "last_sync",
      key: "last_sync",
      render: (date: string) => (
        <Space>
          <ClockCircleOutlined />
          <Text type="secondary">
            {date ? dayjs(date).format("DD/MM/YYYY HH:mm") : "Nunca"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Estado",
      dataIndex: "is_active",
      key: "is_active",
      render: (active: boolean) => (
        <Tag color={active ? "green" : "red"}>
          {active ? "Activa" : "Inactiva"}
        </Tag>
      ),
    },
  ];

  const totalBalance = accounts.reduce((sum, acc) => {
    const balance =
      typeof acc.balance === "number" && !isNaN(acc.balance) ? acc.balance : 0;
    return sum + balance;
  }, 0);

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Balance Total"
              value={
                typeof totalBalance === "number" && !isNaN(totalBalance)
                  ? totalBalance
                  : 0
              }
              precision={2}
              prefix="€"
              valueStyle={{ color: totalBalance >= 0 ? "#52c41a" : "#f5222d" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Cuentas Activas"
              value={accounts.filter((a) => a.is_active).length}
              suffix={`/ ${accounts.length}`}
              prefix={<BankOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Última Sincronización"
              value={
                syncStatus?.stats?.summary?.last_sync
                  ? dayjs(syncStatus.stats.summary.last_sync).fromNow()
                  : "Nunca"
              }
              prefix={<SyncOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Sincronizaciones Hoy"
              value={syncStatus?.stats?.summary?.total_syncs || 0}
              suffix="/ 2"
              prefix={<CalendarOutlined />}
            />
            {syncStatus?.scheduler?.nextSyncEstimate && (
              <Text
                type="secondary"
                style={{ fontSize: "12px", display: "block", marginTop: "8px" }}
              >
                Próxima:{" "}
                {dayjs(syncStatus.scheduler.nextSyncEstimate).format("HH:mm")}
              </Text>
            )}
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
            <Tooltip title="Activar/desactivar sincronización automática (2 veces al día)">
              <Space>
                <span>Auto-sync:</span>
                <Switch
                  checked={autoSyncEnabled}
                  onChange={toggleAutoSync}
                  loading={toggleLoading}
                  checkedChildren="ON"
                  unCheckedChildren="OFF"
                />
              </Space>
            </Tooltip>
            <Button type="primary" icon={<PlusOutlined />} onClick={startSetup}>
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
          <>
            <Table
              columns={columns}
              dataSource={accounts}
              rowKey="id"
              loading={loading}
              pagination={false}
            />
            {syncStatus?.stats?.recentSyncs &&
              syncStatus.stats.recentSyncs.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <Text type="secondary" style={{ fontSize: "12px" }}>
                    Últimas sincronizaciones:
                    {syncStatus.stats.recentSyncs
                      .slice(0, 3)
                      .map((sync: any, index: number) => (
                        <span key={index}>
                          {" "}
                          {dayjs(sync.created_at).format("DD/MM HH:mm")}
                          {sync.success ? " ✓" : " ✗"}
                          {index < 2 && ","}
                        </span>
                      ))}
                  </Text>
                </div>
              )}
          </>
        )}
      </Card>
      {/* Setup Modal */}
      <Modal
        title="Conectar Cuenta Bancaria"
        visible={setupModalVisible}
        onCancel={() => {
          if (currentStep === 1 && requisitionId) {
            Modal.confirm({
              title: "¿Cancelar proceso?",
              content:
                "Tienes una autorización pendiente. ¿Estás seguro de que quieres cancelar?",
              onOk: () => {
                clearRequisitionFromStorage();
                setSetupModalVisible(false);
                setCurrentStep(0);
                setRequisitionId("");
                setRequisitionUrl("");
              },
              okText: "Sí, cancelar",
              cancelText: "No, continuar",
            });
          } else {
            setSetupModalVisible(false);
            setCurrentStep(0);
            setRequisitionId("");
            setRequisitionUrl("");
          }
        }}
        footer={null}
        width={700}
        maskClosable={false}
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
              Utilizamos conexiones seguras PSD2 para acceder a tu información
              bancaria. Tus credenciales nunca se almacenan en nuestros
              servidores.
            </Paragraph>

            <Card
              hoverable
              style={{
                marginTop: 16,
                cursor: authLoading ? "not-allowed" : "pointer",
              }}
              onClick={!authLoading ? handleSetupBBVA : undefined}
            >
              <Space>
                {authLoading ? (
                  <SyncOutlined
                    spin
                    style={{ fontSize: 24, color: "#1890ff" }}
                  />
                ) : (
                  <BankOutlined style={{ fontSize: 24, color: "#004481" }} />
                )}
                <div>
                  <Title level={5} style={{ margin: 0 }}>
                    BBVA
                  </Title>
                  <Text type="secondary">
                    {authLoading
                      ? "Iniciando proceso..."
                      : "Banco Bilbao Vizcaya Argentaria"}
                  </Text>
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
              Se ha abierto una nueva ventana donde debes autorizar el acceso a
              tu cuenta bancaria. Una vez completado, haz clic en continuar.
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
                  Si la ventana no se abrió,
                  <a
                    href={requisitionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {" "}
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
              ¡Cuenta conectada exitosamente!
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

const BankAccounts: React.FC = () => {
  return (
    <ErrorBoundary>
      <BankAccountsContent />
    </ErrorBoundary>
  );
};

export default BankAccounts;
