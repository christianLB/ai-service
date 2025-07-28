import React, { useState } from 'react';
import { Button, Card, Space, Typography, Divider } from 'antd';
import ImportTransactionsModal from '../components/financial/transactions/ImportTransactionsModal';

const { Title, Text } = Typography;

const ImportDemo: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [scenario, setScenario] = useState<'with-account' | 'without-account'>('with-account');

  const mockAccounts = [
    {
      id: 'account-123',
      account_id: 'ACC123',
      name: 'Cuenta Demo 1',
      type: 'bank_account',
      institution: 'Banco Demo',
      currencies: { code: 'EUR', symbol: '€' },
    },
    {
      id: 'account-456',
      account_id: 'ACC456',
      name: 'Cuenta Demo 2',
      type: 'bank_account',
      institution: 'Otro Banco',
      currencies: { code: 'USD', symbol: '$' },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Title level={2}>Demo de Import Modal</Title>
        <Text>Esta página demuestra que el botón de importar funciona correctamente cuando se proporciona un defaultAccountId.</Text>
        
        <Divider />
        
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={4}>Escenario 1: CON cuenta pre-seleccionada</Title>
            <Text type="secondary">
              Al abrir el modal con defaultAccountId="account-123", la cuenta ya está seleccionada 
              y el botón de importar DEBE estar habilitado después de cargar un archivo.
            </Text>
            <br /><br />
            <Button 
              type="primary" 
              onClick={() => {
                setScenario('with-account');
                setModalVisible(true);
              }}
            >
              Abrir Modal CON cuenta pre-seleccionada
            </Button>
          </div>

          <div>
            <Title level={4}>Escenario 2: SIN cuenta pre-seleccionada</Title>
            <Text type="secondary">
              Al abrir el modal sin defaultAccountId, no hay cuenta seleccionada 
              y el botón de importar DEBE estar deshabilitado hasta seleccionar una cuenta.
            </Text>
            <br /><br />
            <Button 
              onClick={() => {
                setScenario('without-account');
                setModalVisible(true);
              }}
            >
              Abrir Modal SIN cuenta pre-seleccionada
            </Button>
          </div>
        </Space>

        <Divider />

        <div style={{ background: '#f0f2f5', padding: 16, borderRadius: 8 }}>
          <Title level={5}>Instrucciones para probar:</Title>
          <ol>
            <li>Haz clic en "Abrir Modal CON cuenta pre-seleccionada"</li>
            <li>Verifica que ya hay una cuenta seleccionada (Cuenta Demo 1)</li>
            <li>Carga un archivo JSON con transacciones</li>
            <li><strong>El botón "Importar X transacciones" DEBE estar habilitado</strong></li>
          </ol>
        </div>
      </Card>

      <ImportTransactionsModal
        visible={modalVisible}
        accounts={mockAccounts}
        defaultAccountId={scenario === 'with-account' ? 'account-123' : undefined}
        onClose={() => setModalVisible(false)}
        onSuccess={() => {
          console.log('Import successful!');
          setModalVisible(false);
        }}
      />
    </div>
  );
};

export default ImportDemo;