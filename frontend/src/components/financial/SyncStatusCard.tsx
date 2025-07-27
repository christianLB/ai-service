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
} from "antd";
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
      const response = await fetch(`/api/financial/sync/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body:
          endpoint === "transactions" ? JSON.stringify({ days: 7 }) : undefined,
      });

      const result = await response.json();
      if (result.success) {
        message.success(result.message);
        // Call the callback to refresh data
        if (onSyncComplete) {
          setTimeout(onSyncComplete, 1000);
        }
      } else {
        message.error(result.error || "Error al sincronizar");
      }
    } catch {
      message.error("Error de conexión");
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
                  value={summary?.synced || 0}
                  suffix={`/ ${summary?.total || 0}`}
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
                    rateLimits.find((rl) => rl.window_end)?.window_end
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
