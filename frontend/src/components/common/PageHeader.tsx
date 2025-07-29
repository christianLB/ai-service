import React from 'react';
import { Typography, Space, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

interface PageHeaderProps {
  title: React.ReactNode;
  subTitle?: React.ReactNode;
  onBack?: () => void;
  avatar?: {
    icon: React.ReactNode;
    style?: React.CSSProperties;
  };
  tags?: React.ReactNode[];
  extra?: React.ReactNode[];
  style?: React.CSSProperties;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subTitle,
  onBack,
  avatar,
  tags,
  extra,
  style,
  className
}) => {
  const navigate = useNavigate();
  
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div 
      className={className}
      style={{
        padding: '16px 24px',
        backgroundColor: '#fff',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        ...style
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {onBack && (
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={handleBack}
              style={{ marginRight: 16 }}
            />
          )}
          {avatar && (
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: '#1890ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 16,
                ...avatar.style
              }}
            >
              {avatar.icon}
            </div>
          )}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Title level={4} style={{ margin: 0 }}>{title}</Title>
              {tags && tags.map((tag, index) => (
                <React.Fragment key={index}>{tag}</React.Fragment>
              ))}
            </div>
            {subTitle && (
              <Text type="secondary" style={{ fontSize: 14 }}>{subTitle}</Text>
            )}
          </div>
        </div>
        {extra && (
          <Space>{extra}</Space>
        )}
      </div>
    </div>
  );
};