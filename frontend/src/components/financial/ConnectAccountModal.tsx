import React, { useState } from 'react';
import { Modal, Steps, Space, Typography, Button, Result, Spin, Alert } from 'antd';
import {
  BankOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  LinkOutlined,
  SafetyOutlined,
} from '@ant-design/icons';

// Steps now uses items prop instead of Step children in Ant Design v5
const { Title, Text, Paragraph } = Typography;

interface ConnectAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const ConnectAccountModal: React.FC<ConnectAccountModalProps> = ({ 
  visible, 
  onClose, 
  onComplete 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [requisitionData, setRequisitionData] = useState<{
    requisitionId: string;
    redirectUrl?: string;
    consentUrl?: string;
    status: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetModal = () => {
    setCurrentStep(0);
    setRequisitionData(null);
    setLoading(false);
    setError(null);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const startConnection = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/financial/setup-bbva', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al iniciar la conexión');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        setRequisitionData(result.data);
        
        // Open authorization URL if available
        if (result.data.consentUrl) {
          window.open(result.data.consentUrl, '_blank');
        }
        
        setCurrentStep(1);
      } else {
        throw new Error(result.error || 'Error al iniciar la conexión');
      }
    } catch (error) {
      console.error('Error setting up BBVA:', error);
      setError('No se pudo iniciar la conexión. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const checkRequisitionStatus = async () => {
    if (!requisitionData?.requisitionId) return;
    
    setLoading(true);
    
    try {
      const response = await fetch(
        `/api/financial/requisition-status/${requisitionData.requisitionId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Error al verificar el estado');
      }

      const data = await response.json();
      
      // Log the full response for debugging
      console.log('[ConnectAccountModal] Requisition status response:', data);
      
      // Fix: The API returns data.data.status, not data.requisition.status
      if (data.data?.status === 'LN' || data.data?.status === 'LINKED') {
        console.log('[ConnectAccountModal] Requisition is linked, proceeding to complete setup');
        setCurrentStep(2);
        setTimeout(() => completeSetup(), 1000);
      } else {
        // Show helpful error message if status is not as expected
        const statusMessage = data.message || `Estado actual: ${data.data?.status || 'desconocido'}`;
        console.log('[ConnectAccountModal] Requisition not yet linked:', statusMessage);
        setError(`La autorización aún no se ha completado. ${statusMessage}. Por favor, completa la autorización en BBVA y vuelve a intentarlo.`);
      }
    } catch (error) {
      console.error('Error checking status:', error);
      setError('Error al verificar el estado de la autorización. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const completeSetup = async () => {
    if (!requisitionData?.requisitionId) return;
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/financial/complete-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          requisitionId: requisitionData.requisitionId,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al completar la configuración');
      }

      setCurrentStep(3);
      setTimeout(() => {
        onComplete();
        handleClose();
      }, 2000);
    } catch (error) {
      console.error('Error completing setup:', error);
      setError('No se pudo completar la configuración. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <BankOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
              <Title level={4}>Conecta tu cuenta bancaria</Title>
              <Paragraph type="secondary">
                Conecta de forma segura tu cuenta de BBVA para sincronizar automáticamente
                tus transacciones y mantener tu información financiera actualizada.
              </Paragraph>
            </div>
            
            <Alert
              icon={<SafetyOutlined />}
              message="Conexión segura"
              description="Utilizamos el protocolo Open Banking (PSD2) para acceder de forma segura a tu información bancaria. Tus credenciales nunca se almacenan en nuestros servidores."
              type="info"
              showIcon
            />
            
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <Button 
                type="primary" 
                size="large"
                icon={<LinkOutlined />}
                onClick={startConnection}
                loading={loading}
              >
                Conectar con BBVA
              </Button>
            </div>
          </Space>
        );

      case 1:
        return (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
              <Title level={4} style={{ marginTop: 24 }}>
                Autoriza el acceso en BBVA
              </Title>
              <Paragraph type="secondary">
                Se ha abierto una nueva ventana para que autorices el acceso.
                Una vez completado, haz clic en el botón de abajo.
              </Paragraph>
            </div>
            
            {requisitionData?.consentUrl && (
              <Alert
                message="Ventana de autorización abierta"
                description={
                  <Space direction="vertical">
                    <Text>Si la ventana no se abrió automáticamente:</Text>
                    <a 
                      href={requisitionData.consentUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ wordBreak: 'break-all' }}
                    >
                      {requisitionData.consentUrl}
                    </a>
                  </Space>
                }
                type="warning"
                showIcon
              />
            )}
            
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <Space>
                <Button onClick={handleClose}>
                  Cancelar
                </Button>
                <Button 
                  type="primary"
                  onClick={checkRequisitionStatus}
                  loading={loading}
                >
                  He autorizado el acceso
                </Button>
              </Space>
            </div>
          </Space>
        );

      case 2:
        return (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
            <Title level={4} style={{ marginTop: 24 }}>
              Configurando tu cuenta...
            </Title>
            <Paragraph type="secondary">
              Estamos sincronizando tu información bancaria.
              Esto puede tardar unos segundos.
            </Paragraph>
          </div>
        );

      case 3:
        return (
          <Result
            status="success"
            title="¡Cuenta conectada exitosamente!"
            subTitle="Tu cuenta de BBVA ha sido conectada y comenzará a sincronizarse automáticamente."
            icon={<CheckCircleOutlined style={{ fontSize: 72 }} />}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      title={null}
      open={visible}
      onCancel={handleClose}
      footer={null}
      width={600}
      centered
    >
      <div style={{ padding: '24px 0' }}>
        <Steps 
          current={currentStep} 
          style={{ marginBottom: 32 }}
          items={[
            { title: "Iniciar" },
            { title: "Autorizar" },
            { title: "Configurar" },
            { title: "Completado" }
          ]}
        />
        
        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: 24 }}
          />
        )}
        
        {renderStepContent()}
      </div>
    </Modal>
  );
};

export default ConnectAccountModal;