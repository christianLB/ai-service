import React from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { AlertList } from '../../components/alert/AlertList';

const AlertPage: React.FC = () => {
  return (
    <div>
      <PageHeader
        title="Alerts"
        subTitle="Manage your alerts"
      />
      <AlertList />
    </div>
  );
};

export default AlertPage;