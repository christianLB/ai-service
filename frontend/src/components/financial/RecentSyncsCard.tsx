import React from 'react';
import { Card, List, Empty, Typography, Space, Tag, Progress, Tooltip } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;

interface RecentSync {
  startTime: string;
  endTime: string;
  status: string;
  accounts_synced?: number;
  transactions_synced?: number;
  error?: string;
  rateLimited?: boolean;
}

interface RecentSyncsCardProps {
  recentSyncs: RecentSync[] | null;
}

const RecentSyncsCard: React.FC<RecentSyncsCardProps> = ({ recentSyncs }) => {
  const getStatusIcon = (sync: RecentSync) => {
    const isRateLimited = sync.error?.includes('rate limit') || sync.rateLimited;
    
    if (isRateLimited) {
      return <ClockCircleOutlined style={{ color: '#fa8c16' }} />;
    }
    
    if (sync.status === 'completed') {
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    }
    
    return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
  };

  const getStatusTag = (sync: RecentSync) => {
    const isRateLimited = sync.error?.includes('rate limit') || sync.rateLimited;
    
    if (isRateLimited) {
      return <Tag color="warning">Límite alcanzado</Tag>;
    }
    
    if (sync.status === 'completed') {
      return <Tag color="success">Completado</Tag>;
    }
    
    return <Tag color="error">Fallido</Tag>;
  };

  const getSyncProgress = (sync: RecentSync) => {
    if (!sync.accounts_synced) return null;
    
    const percentage = sync.transactions_synced ? 100 : 50;
    const status = sync.rateLimited ? 'exception' : 'normal';
    
    return (
      <Tooltip title={`${sync.accounts_synced} cuentas, ${sync.transactions_synced || 0} transacciones`}>
        <Progress 
          percent={percentage} 
          size="small" 
          status={status}
          showInfo={false}
          style={{ width: 100 }}
        />
      </Tooltip>
    );
  };

  const formatDuration = (start: string, end: string) => {
    const duration = dayjs(end).diff(dayjs(start), 'second');
    if (duration < 60) return `${duration}s`;
    return `${Math.floor(duration / 60)}m ${duration % 60}s`;
  };

  if (!recentSyncs || recentSyncs.length === 0) {
    return (
      <Card 
        title={
          <Space>
            <SyncOutlined />
            <span>Actividad Reciente</span>
          </Space>
        }
      >
        <Empty 
          description="No hay sincronizaciones recientes" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  return (
    <Card 
      title={
        <Space>
          <SyncOutlined />
          <span>Actividad Reciente</span>
        </Space>
      }
      bodyStyle={{ padding: '12px' }}
    >
      <List
        size="small"
        dataSource={recentSyncs.slice(0, 5)}
        renderItem={(sync) => {
          const isRateLimited = sync.error?.includes('rate limit') || sync.rateLimited;
          const rateLimitHours = sync.error?.match(/(\d+) hours/)?.[1];
          
          return (
            <List.Item
              style={{ 
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '8px',
                backgroundColor: '#fafafa',
                border: '1px solid #f0f0f0'
              }}
            >
              <List.Item.Meta
                avatar={getStatusIcon(sync)}
                title={
                  <Space>
                    <Text style={{ fontSize: '13px' }}>
                      {dayjs(sync.startTime).format('DD/MM HH:mm')}
                    </Text>
                    {getStatusTag(sync)}
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {formatDuration(sync.startTime, sync.endTime)}
                    </Text>
                  </Space>
                }
                description={
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    {getSyncProgress(sync)}
                    {isRateLimited && (
                      <Space size={4}>
                        <WarningOutlined style={{ color: '#fa8c16', fontSize: '12px' }} />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          API limitada. Saldos actualizados, transacciones pendientes.
                          {rateLimitHours && ` Reintentar en ${rateLimitHours}h.`}
                        </Text>
                      </Space>
                    )}
                  </Space>
                }
              />
            </List.Item>
          );
        }}
      />
    </Card>
  );
};

export default RecentSyncsCard;