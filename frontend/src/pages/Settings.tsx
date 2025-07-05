import React from 'react';
import { Card, Alert } from 'antd';

const Settings: React.FC = () => {
  return (
    <div>
      <h1>Configuración</h1>
      <Card>
        <Alert
          message="Configuración en desarrollo"
          description="Aquí se podrán configurar los parámetros del sistema."
          type="info"
          showIcon
        />
      </Card>
    </div>
  );
};

export default Settings;