import React from 'react';
import { PageHeader as AntPageHeader } from '@ant-design/pro-layout';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  subTitle?: string;
  onBack?: () => void;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subTitle, onBack }) => {
  const navigate = useNavigate();
  
  return (
    <AntPageHeader
      title={title}
      subTitle={subTitle}
      onBack={onBack || (() => navigate(-1))}
      style={{ paddingLeft: 0, paddingRight: 0 }}
    />
  );
};