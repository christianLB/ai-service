import React from 'react';
import { Card, Row, Col, Progress, Typography, Space, Tag, Tooltip, Badge } from 'antd';
import {
  ClockCircleOutlined,
  ThunderboltOutlined,
  WarningOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';

dayjs.extend(relativeTime);
dayjs.locale('es');

const { Text, Title } = Typography;

interface RateLimitInfo {
  account_id: string;
  account_name: string;
  endpoint_type: string;
  calls_made: number;
  calls_limit: number;
  window_start: string;
  window_end: string;
  retry_after?: string;
  last_call_at?: string;
  status: 'available' | 'exhausted' | 'rate_limited';
  calls_remaining: number;
}

interface RateLimitCardProps {
  rateLimits: RateLimitInfo[];
  loading?: boolean;
}

const RateLimitCard: React.FC<RateLimitCardProps> = ({ rateLimits, loading }) => {
  const getEndpointLabel = (endpoint: string) => {
    switch (endpoint) {
      case 'accounts':
        return 'Detalles de Cuenta';
      case 'balances':
        return 'Saldos';
      case 'transactions':
        return 'Transacciones';
      default:
        return endpoint;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'exhausted':
        return <WarningOutlined style={{ color: '#ff4d4f' }} />;
      case 'rate_limited':
        return <ClockCircleOutlined style={{ color: '#fa8c16' }} />;
      default:
        return null;
    }
  };

  const getProgressStatus = (status: string): "normal" | "exception" | "active" | "success" => {
    switch (status) {
      case 'exhausted':
      case 'rate_limited':
        return 'exception';
      case 'available':
        return 'normal';
      default:
        return 'normal';
    }
  };

  // Group rate limits by account
  const groupedLimits = rateLimits.reduce((acc, limit) => {
    if (!acc[limit.account_name]) {
      acc[limit.account_name] = [];
    }
    acc[limit.account_name].push(limit);
    return acc;
  }, {} as Record<string, RateLimitInfo[]>);

  return (
    <Card 
      title={
        <Space>
          <ThunderboltOutlined />
          <span>Límites de API</span>
        </Space>
      }
      loading={loading}
      extra={
        <Tag color="blue">
          4 llamadas/24h por cuenta
        </Tag>
      }
    >
      {Object.entries(groupedLimits).length === 0 ? (
        <Text type="secondary">No hay información de límites disponible</Text>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {Object.entries(groupedLimits).map(([accountName, limits]) => {
            const nextReset = limits[0]?.window_end;
            const hasExhausted = limits.some(l => l.status !== 'available');
            
            return (
              <div key={accountName}>
                <Row justify="space-between" align="middle" style={{ marginBottom: 8 }}>
                  <Col>
                    <Space>
                      <Title level={5} style={{ margin: 0 }}>{accountName}</Title>
                      {hasExhausted && (
                        <Badge status="error" text="Límite alcanzado" />
                      )}
                    </Space>
                  </Col>
                  <Col>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Reset: {dayjs(nextReset).fromNow()}
                    </Text>
                  </Col>
                </Row>
                
                <Row gutter={[16, 16]}>
                  {limits.map((limit) => (
                    <Col span={8} key={`${limit.account_id}-${limit.endpoint_type}`}>
                      <Tooltip 
                        title={
                          limit.retry_after 
                            ? `Reintento disponible ${dayjs(limit.retry_after).fromNow()}`
                            : limit.last_call_at 
                              ? `Última llamada ${dayjs(limit.last_call_at).fromNow()}`
                              : 'Sin llamadas recientes'
                        }
                      >
                        <div style={{ textAlign: 'center' }}>
                          <Space direction="vertical" size={0} style={{ width: '100%' }}>
                            <Space>
                              {getStatusIcon(limit.status)}
                              <Text style={{ fontSize: '12px' }}>
                                {getEndpointLabel(limit.endpoint_type)}
                              </Text>
                            </Space>
                            <Progress
                              percent={Math.round((limit.calls_remaining / limit.calls_limit) * 100)}
                              size="small"
                              status={getProgressStatus(limit.status)}
                              format={() => `${limit.calls_remaining}/${limit.calls_limit}`}
                            />
                          </Space>
                        </div>
                      </Tooltip>
                    </Col>
                  ))}
                </Row>
              </div>
            );
          })}
          
          {rateLimits.some(l => l.retry_after) && (
            <div style={{ marginTop: 12, padding: '8px 12px', background: '#fff7e6', borderRadius: 4 }}>
              <Space>
                <WarningOutlined style={{ color: '#fa8c16' }} />
                <Text type="warning" style={{ fontSize: '12px' }}>
                  Algunos endpoints están en período de espera por límite de tasa
                </Text>
              </Space>
            </div>
          )}
        </Space>
      )}
    </Card>
  );
};

export default RateLimitCard;