import React, { useState, useEffect } from 'react';
import { Tag, Tooltip, Button, Space } from 'antd';
import { InfoCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

interface VersionInfo {
  version: string;
  buildDate: string;
  commit: string;
  commitShort: string;
  nodeVersion: string;
  environment: string;
  uptime: number;
  timestamp: string;
}

const VersionIndicator: React.FC = () => {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchVersionInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/version');
      const data = await response.json();
      
      if (data.success) {
        setVersionInfo(data.data);
      }
    } catch (error) {
      console.error('Error fetching version info:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVersionInfo();
    
    // Refresh version info every 30 seconds
    const interval = setInterval(fetchVersionInfo, 30000);
    return () => clearInterval(interval);
  }, []);

  const testNotification = async () => {
    try {
      await fetch('/api/test-notification', { method: 'POST' });
      // Could show a success message
    } catch (error) {
      console.error('Error testing notification:', error);
    }
  };

  if (!versionInfo) {
    return (
      <Tag icon={<InfoCircleOutlined />} color="default">
        {loading ? 'Cargando...' : 'Versión: N/A'}
      </Tag>
    );
  }

  const getEnvironmentColor = (env: string) => {
    switch (env) {
      case 'production': return 'success';
      case 'development': return 'processing';
      case 'staging': return 'warning';
      default: return 'default';
    }
  };

  const formatUptime = (seconds: number) => {
    const duration = dayjs.duration(seconds * 1000);
    if (duration.asDays() >= 1) {
      return `${Math.floor(duration.asDays())}d ${duration.hours()}h`;
    } else if (duration.asHours() >= 1) {
      return `${duration.hours()}h ${duration.minutes()}m`;
    } else {
      return `${duration.minutes()}m ${duration.seconds()}s`;
    }
  };

  const tooltipContent = (
    <div style={{ fontSize: '12px' }}>
      <div><strong>Versión:</strong> {versionInfo.version}</div>
      <div><strong>Commit:</strong> {versionInfo.commitShort}</div>
      <div><strong>Build:</strong> {dayjs(versionInfo.buildDate).format('DD/MM/YY HH:mm')}</div>
      <div><strong>Node.js:</strong> {versionInfo.nodeVersion}</div>
      <div><strong>Uptime:</strong> {formatUptime(versionInfo.uptime)}</div>
      <div><strong>Actualizado:</strong> {dayjs(versionInfo.timestamp).format('DD/MM/YY HH:mm:ss')}</div>
    </div>
  );

  return (
    <Space size="small">
      <Tooltip title={tooltipContent} placement="bottomRight">
        <Tag 
          icon={<InfoCircleOutlined />} 
          color={getEnvironmentColor(versionInfo.environment)}
          style={{ cursor: 'pointer' }}
        >
          {versionInfo.version}
        </Tag>
      </Tooltip>
      
      <Button 
        size="small" 
        type="text" 
        icon={<ReloadOutlined />}
        loading={loading}
        onClick={fetchVersionInfo}
        style={{ padding: '0 4px' }}
        title="Actualizar versión"
      />
      
      {versionInfo.environment === 'development' && (
        <Button 
          size="small" 
          type="text" 
          onClick={testNotification}
          style={{ padding: '0 4px', fontSize: '10px' }}
          title="Test notification"
        >
          📱
        </Button>
      )}
    </Space>
  );
};

export default VersionIndicator;