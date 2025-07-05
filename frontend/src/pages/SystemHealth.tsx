import React from 'react';
import { Card, Alert } from 'antd';

const SystemHealth: React.FC = () => {
  return (
    <div>
      <h1>Estado del Sistema</h1>
      <Card>
        <Alert
          message="Sistema de salud en desarrollo"
          description="Aquí se mostrará el estado detallado de todos los servicios del sistema."
          type="info"
          showIcon
        />
      </Card>
    </div>
  );
};

export default SystemHealth;