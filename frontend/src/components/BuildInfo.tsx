import React from 'react';
import { Tag } from 'antd';

const BuildInfo: React.FC = () => {
  const buildTime = import.meta.env.VITE_BUILD_TIME || new Date().toISOString();
  const buildVersion = import.meta.env.VITE_BUILD_VERSION || 'dev';
  const environment = import.meta.env.MODE || 'development';
  
  const isProduction = environment === 'production';
  
  return (
    <div style={{ 
      position: 'fixed', 
      bottom: 10, 
      right: 10, 
      zIndex: 1000,
      display: 'flex',
      gap: 8,
      opacity: 0.8
    }}>
      <Tag color={isProduction ? 'green' : 'orange'}>
        {isProduction ? 'PROD' : 'DEV'}
      </Tag>
      <Tag color="blue">
        Build: {buildTime.split('T')[0]} {buildTime.split('T')[1]?.substring(0, 5)}
      </Tag>
      <Tag color="default">
        v{buildVersion}
      </Tag>
    </div>
  );
};

export default BuildInfo;