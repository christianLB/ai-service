import React, { useState } from "react";
import {
  Card,
  Statistic,
  Space,
  Switch,
  Button,
  Row,
  Col,
  Divider,
  Typography,
  Badge,
  Tooltip,
  Progress,
  message,
  App,
} from "antd";
import api from "../../services/api";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  BankOutlined,
  DollarOutlined,
  SwapOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/es";

dayjs.extend(relativeTime);
dayjs.locale("es");

const { Text } = Typography;

// interface RateLimitInfo {
//   canSync: boolean;
//   callsRemaining: number;
//   windowResetAt: string;
//   retryAfter?: string;
// }

interface RateLimit {
  endpoint_type: string;
  calls_limit: number;
  calls_made: number;
  status: 'normal' | 'exhausted' | 'rate_limited';
  window_reset_at?: string;
  retry_after?: string;
}

interface SyncStats {
  lastSync?: string;
  summary?: {
    total_accounts: number;
    total_transactions: number;
    updated_today: number;
  };
}

interface SyncScheduler {
  nextSyncEstimate?: string;
}

interface SyncStatus {
  stats?: SyncStats;
  scheduler?: SyncScheduler;
}

interface SyncResult {
  success: boolean;
  error?: string;
  accountName?: string;
  rateLimitInfo?: {
    status?: string;
  };
}

interface SyncStatusCardProps {
  syncStatus: SyncStatus;
  autoSyncEnabled: boolean;
  syncing: boolean;
  toggleLoading: boolean;
  onToggleAutoSync: () => void;
  onManualSync: () => void;
  rateLimits?: RateLimit[];
  onSyncComplete?: () => void;
}

const SyncStatusCard: React.FC<SyncStatusCardProps> = ({
  syncStatus,
  autoSyncEnabled,
  syncing,
  toggleLoading,
  onToggleAutoSync,
  onManualSync,
  rateLimits,
  onSyncComplete,
}) => {
  const { notification } = App.useApp();
  const [syncingType, setSyncingType] = useState<string | null>(null);
  const lastSync = syncStatus?.stats?.lastSync;
  const summary = syncStatus?.stats?.summary;
  const nextSync = syncStatus?.scheduler?.nextSyncEstimate;

  const getSyncStatusBadge = () => {
    if (!lastSync) return <Badge status="default" text="Sin sincronizar" />;

    const hoursSinceSync = dayjs().diff(dayjs(lastSync), "hour");
    if (hoursSinceSync < 1)
      return <Badge status="success" text="Actualizado" />;
    if (hoursSinceSync < 24)
      return <Badge status="processing" text="Reciente" />;
    return <Badge status="warning" text="Necesita actualización" />;
  };

  const handleSyncOperation = async (
    endpoint: string,
    operationType: string
  ) => {
    setSyncingType(operationType);
    try {
      const response = await api.post(
        `/financial/sync/${endpoint}`,
        endpoint === "transactions" ? { days: 7 } : {}
      );

      const result = response.data;
      console.log(`[SyncStatusCard] ${endpoint} sync response:`, result);

      // Check if we have results data - but still process them even if success is false
      if (!result.data || !result.data.results) {
        // Handle unexpected response structure
        if (result.success) {
          message.success(result.message || `${operationType} sincronizados correctamente`);
        } else {
          message.error(result.message || `Error al sincronizar ${operationType}`);
        }
        if (onSyncComplete) {
          setTimeout(onSyncComplete, 1000);
        }
        return;
      }

      // Extract successful and failed results
      const results = result.data.results || [];
      const successfulAccounts = results.filter((r: SyncResult) => r.success);
      const failedAccounts = results.filter((r: SyncResult) => !r.success && r.error);
      
      // Check for rate limit errors specifically
      const rateLimitAccounts = failedAccounts.filter((r: SyncResult) => 
        r.error?.toLowerCase().includes("rate limit") || 
        r.error?.toLowerCase().includes("429") ||
        r.rateLimitInfo?.status === "exhausted" ||
        r.rateLimitInfo?.status === "rate_limited"
      );

      // Handle different scenarios
      if (failedAccounts.length === 0 && successfulAccounts.length > 0) {
        // Complete success
        message.success(result.message || `Todos los ${operationType} sincronizados correctamente`);
        if (onSyncComplete) {
          setTimeout(onSyncComplete, 1000);
        }
      } else if (failedAccounts.length > 0 && successfulAccounts.length > 0) {
        // Partial success
        if (rateLimitAccounts.length > 0) {
          // Show rate limit notification for partial success with rate limits
          notification.warning({
            message: "Sincronización Parcial",
            description: (
              <div>
                <p>Se sincronizaron {successfulAccounts.length} de {results.length} cuentas.</p>
                <p style={{ marginTop: 8 }}>
                  <strong>Cuentas con límite de API alcanzado:</strong>
                </p>
                {rateLimitAccounts.map((account: SyncResult, idx: number) => (
                  <p key={idx} style={{ marginTop: 4 }}>
                    • {account.accountName}: {account.error}
                  </p>
                ))}
                <p style={{ marginTop: 8 }}>
                  <strong>💡 Consejo:</strong> GoCardless permite solo 4 sincronizaciones por día por cuenta. 
                  Intenta de nuevo más tarde.
                </p>
              </div>
            ),
            duration: 10,
            placement: "topRight",
          });
        } else {
          // Show regular errors for partial success
          notification.warning({
            message: "Sincronización Parcial",
            description: (
              <div>
                <p>Se sincronizaron {successfulAccounts.length} de {results.length} cuentas.</p>
                <p style={{ marginTop: 8 }}>
                  <strong>Errores encontrados:</strong>
                </p>
                {failedAccounts.map((account: SyncResult, idx: number) => (
                  <p key={idx} style={{ marginTop: 4 }}>
                    • {account.accountName}: {account.error}
                  </p>
                ))}
              </div>
            ),
            duration: 8,
            placement: "topRight",
          });
        }
        if (onSyncComplete) {
          setTimeout(onSyncComplete, 2000);
        }
      } else if (failedAccounts.length > 0 && successfulAccounts.length === 0) {
        // Complete failure
        if (rateLimitAccounts.length === failedAccounts.length) {
          // All failures are due to rate limits
          notification.error({
            message: "Límite de API Alcanzado",
            description: (
              <div>
                <p>No se pudo sincronizar ninguna cuenta debido a límites de API.</p>
                {rateLimitAccounts.map((account: SyncResult, idx: number) => {
                  const hoursMatch = account.error?.match(/(\d+)\s*hours?/i);
                  const minutesMatch = account.error?.match(/(\d+)\s*minutes?/i);
                  const waitTime = hoursMatch ? `${hoursMatch[1]} horas` : 
                                  minutesMatch ? `${minutesMatch[1]} minutos` : 
                                  "un tiempo";
                  return (
                    <p key={idx} style={{ marginTop: idx === 0 ? 8 : 4 }}>
                      • {account.accountName}: Disponible en {waitTime}
                    </p>
                  );
                })}
                <p style={{ marginTop: 8 }}>
                  <strong>💡 Consejo:</strong> GoCardless permite solo 4 sincronizaciones por día por cuenta.
                </p>
              </div>
            ),
            duration: 10,
            placement: "topRight",
          });
        } else {
          // Mixed errors or all non-rate-limit errors
          notification.error({
            message: "Error en Sincronización",
            description: (
              <div>
                <p>No se pudo sincronizar ninguna cuenta.</p>
                {failedAccounts.map((account: SyncResult, idx: number) => (
                  <p key={idx} style={{ marginTop: idx === 0 ? 8 : 4 }}>
                    • {account.accountName}: {account.error}
                  </p>
                ))}
              </div>
            ),
            duration: 8,
            placement: "topRight",
          });
        }
      } else {
        // No results at all
        message.warning("No se encontraron cuentas para sincronizar");
      }
    } catch (error) {
      console.error(`[SyncStatusCard] ${endpoint} sync error:`, error);
      const axiosError = error as { response?: { data?: { error?: string } }; message?: string };
      const errorMessage = axiosError.response?.data?.error || axiosError.message || "Error de conexión";
      message.error(errorMessage);
    } finally {
      setSyncingType(null);
    }
  };

  const getRateLimitProgress = (endpoint: string) => {
    const limit = rateLimits?.find((rl) => rl.endpoint_type === endpoint);
    if (!limit) return { percent: 100, status: "normal" as const };

    const percent =
      ((limit.calls_limit - limit.calls_made) / limit.calls_limit) * 100;
    let status: "normal" | "exception" | "success" = "normal";

    if (limit.status === "exhausted" || limit.status === "rate_limited") {
      status = "exception";
    } else if (percent === 100) {
      status = "success";
    }

    return { percent, status, limit };
  };

  return (
    <Card
      title={
        <Space>
          <SyncOutlined />
          <span>Estado de Sincronización</span>
          {getSyncStatusBadge()}
        </Space>
      }
      extra={
        <Button
          type="primary"
          icon={<SyncOutlined spin={syncing} />}
          onClick={onManualSync}
          loading={syncing}
        >
          Sincronizar Todo
        </Button>
      }
    >
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            <Statistic
              title="Última Sincronización"
              value={
                lastSync ? dayjs(lastSync).format("DD/MM/YYYY HH:mm") : "Nunca"
              }
              prefix={<CalendarOutlined />}
              valueStyle={{ fontSize: "16px" }}
            />

            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Cuentas"
                  value={summary?.total_accounts || 0}
                  suffix={`/ ${summary?.total_accounts || 0}`}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ fontSize: "16px" }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Próxima Sync"
                  value={
                    nextSync && autoSyncEnabled
                      ? dayjs(nextSync).format("HH:mm")
                      : "Manual"
                  }
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ fontSize: "16px" }}
                />
              </Col>
            </Row>
          </Space>
        </Col>

        <Col span={24}>
          <Divider style={{ margin: "12px 0" }}>
            Sincronización Individual
          </Divider>
          <Row gutter={[8, 8]}>
            <Col span={8}>
              <Tooltip
                title={
                  getRateLimitProgress("accounts").status === "exception"
                    ? "Límite de llamadas alcanzado"
                    : "Sincronizar detalles de cuentas"
                }
              >
                <Button
                  block
                  icon={<BankOutlined />}
                  loading={syncingType === "accounts"}
                  disabled={
                    getRateLimitProgress("accounts").status === "exception"
                  }
                  onClick={() => handleSyncOperation("accounts", "accounts")}
                >
                  Cuentas
                </Button>
              </Tooltip>
              <Progress
                percent={getRateLimitProgress("accounts").percent}
                size="small"
                showInfo={false}
                status={getRateLimitProgress("accounts").status}
                style={{ marginTop: 4 }}
              />
            </Col>
            <Col span={8}>
              <Tooltip
                title={
                  getRateLimitProgress("balances").status === "exception"
                    ? "Límite de llamadas alcanzado"
                    : "Sincronizar saldos"
                }
              >
                <Button
                  block
                  icon={<DollarOutlined />}
                  loading={syncingType === "balances"}
                  disabled={
                    getRateLimitProgress("balances").status === "exception"
                  }
                  onClick={() => handleSyncOperation("balances", "balances")}
                >
                  Saldos
                </Button>
              </Tooltip>
              <Progress
                percent={getRateLimitProgress("balances").percent}
                size="small"
                showInfo={false}
                status={getRateLimitProgress("balances").status}
                style={{ marginTop: 4 }}
              />
            </Col>
            <Col span={8}>
              <Tooltip
                title={
                  getRateLimitProgress("transactions").status === "exception"
                    ? "Límite de llamadas alcanzado"
                    : "Sincronizar transacciones (últimos 7 días)"
                }
              >
                <Button
                  block
                  icon={<SwapOutlined />}
                  loading={syncingType === "transactions"}
                  disabled={
                    getRateLimitProgress("transactions").status === "exception"
                  }
                  onClick={() =>
                    handleSyncOperation("transactions", "transactions")
                  }
                >
                  Transacciones
                </Button>
              </Tooltip>
              <Progress
                percent={getRateLimitProgress("transactions").percent}
                size="small"
                showInfo={false}
                status={getRateLimitProgress("transactions").status}
                style={{ marginTop: 4 }}
              />
            </Col>
          </Row>

          {rateLimits &&
            rateLimits.some(
              (rl) => rl.status === "exhausted" || rl.status === "rate_limited"
            ) && (
              <div style={{ marginTop: 12 }}>
                <Text type="warning" style={{ fontSize: "12px" }}>
                  <WarningOutlined /> Algunos límites de API alcanzados. Próximo
                  reset:{" "}
                  {dayjs(
                    rateLimits.find((rl) => rl.window_reset_at)?.window_reset_at
                  ).fromNow()}
                </Text>
              </div>
            )}
        </Col>

        <Col span={24}>
          <Divider style={{ margin: "12px 0" }} />
          <Row justify="space-between" align="middle">
            <Col>
              <Space>
                <Text>Sincronización automática</Text>
                <Text type="secondary" style={{ fontSize: "12px" }}>
                  (2 veces al día)
                </Text>
              </Space>
            </Col>
            <Col>
              <Switch
                checked={autoSyncEnabled}
                onChange={onToggleAutoSync}
                loading={toggleLoading}
              />
            </Col>
          </Row>
        </Col>
      </Row>
    </Card>
  );
};

export default SyncStatusCard;
