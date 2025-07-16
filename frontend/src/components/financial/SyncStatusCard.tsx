import React from 'react';
import { Card, Statistic, Space, Switch, Button, Row, Col, Divider, Typography, Badge } from 'antd';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;

interface SyncStatusCardProps {
  syncStatus: any;
  autoSyncEnabled: boolean;
  syncing: boolean;
  toggleLoading: boolean;
  onToggleAutoSync: () => void;
  onManualSync: () => void;
}

const SyncStatusCard: React.FC<SyncStatusCardProps> = ({
  syncStatus,
  autoSyncEnabled,
  syncing,
  toggleLoading,
  onToggleAutoSync,
  onManualSync,
}) => {
  const lastSync = syncStatus?.stats?.lastSync;
  const summary = syncStatus?.stats?.summary;
  const nextSync = syncStatus?.scheduler?.nextSyncEstimate;

  const getSyncStatusBadge = () => {
    if (!lastSync) return <Badge status="default" text="Sin sincronizar" />;
    
    const hoursSinceSync = dayjs().diff(dayjs(lastSync), 'hour');
    if (hoursSinceSync < 1) return <Badge status="success" text="Actualizado" />;
    if (hoursSinceSync < 24) return <Badge status="processing" text="Reciente" />;
    return <Badge status="warning" text="Necesita actualización" />;
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
          Sincronizar
        </Button>
      }
    >
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Statistic
              title="Última Sincronización"
              value={lastSync ? dayjs(lastSync).format("DD/MM/YYYY HH:mm") : "Nunca"}
              prefix={<CalendarOutlined />}
              valueStyle={{ fontSize: '16px' }}
            />
            
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Cuentas"
                  value={summary?.synced || 0}
                  suffix={`/ ${summary?.total || 0}`}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ fontSize: '16px' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Próxima Sync"
                  value={nextSync && autoSyncEnabled ? dayjs(nextSync).format("HH:mm") : "Manual"}
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ fontSize: '16px' }}
                />
              </Col>
            </Row>
          </Space>
        </Col>
        
        <Col span={24}>
          <Divider style={{ margin: '12px 0' }} />
          <Row justify="space-between" align="middle">
            <Col>
              <Space>
                <Text>Sincronización automática</Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>
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