import React, { useState, useEffect } from 'react';
import {
  Modal,
  Upload,
  Select,
  Table,
  Button,
  Space,
  Typography,
  Alert,
  Result,
  Divider,
  Tag,
  message,
} from 'antd';
import type { UploadProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  UploadOutlined,
  FileTextOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const { Option } = Select;
const { Dragger } = Upload;

interface Account {
  id: string;
  account_id: string;
  name?: string;
  type?: string;
  institution?: string;
  iban?: string;
  currency_id?: string;
  currencies?: {
    code: string;
    symbol: string;
  };
}

interface ImportTransaction {
  transaction_id?: string;
  amount: string;
  currency_id?: string;
  type?: string;
  status?: string;
  description?: string;
  reference?: string;
  counterparty_name?: string;
  date: string;
  [key: string]: any;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
  duplicates: Array<{ row: number; transaction_id: string }>;
}

interface ImportTransactionsModalProps {
  visible: boolean;
  accounts: Account[];
  defaultAccountId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const ImportTransactionsModal: React.FC<ImportTransactionsModalProps> = ({
  visible,
  accounts,
  defaultAccountId,
  onClose,
  onSuccess,
}) => {
  const [selectedAccount, setSelectedAccount] = useState<string | undefined>(defaultAccountId);
  const [fileData, setFileData] = useState<{
    transactions: ImportTransaction[];
    metadata?: any;
  } | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview' | 'result'>('upload');

  // Update selected account when defaultAccountId changes
  useEffect(() => {
    if (defaultAccountId) {
      setSelectedAccount(defaultAccountId);
    }
  }, [defaultAccountId]);

  // Reset when modal closes
  useEffect(() => {
    if (!visible) {
      setFileData(null);
      setImportResult(null);
      setCurrentStep('upload');
      // Only reset selectedAccount if no defaultAccountId
      if (!defaultAccountId) {
        setSelectedAccount(undefined);
      }
    }
  }, [visible, defaultAccountId]);

  const resetModal = () => {
    setSelectedAccount(defaultAccountId || undefined);
    setFileData(null);
    setImportResult(null);
    setCurrentStep('upload');
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleAccountChange = (value: string) => {
    setSelectedAccount(value);
  };

  const processFile = (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const jsonData = JSON.parse(content);
          
          // Validate structure
          if (!jsonData.transactions || !Array.isArray(jsonData.transactions)) {
            throw new Error('El archivo debe contener un array de transacciones');
          }
          
          setFileData(jsonData);
          setCurrentStep('preview');
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsText(file);
    });
  };

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: '.json',
    showUploadList: false,
    beforeUpload: async (file: any) => {
      try {
        await processFile(file);
        message.success(`${file.name} cargado correctamente`);
      } catch (error) {
        message.error(`Error al procesar ${file.name}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
      return false; // Prevent auto upload
    },
  };

  const handleImport = async () => {
    if (!selectedAccount || !fileData) {
      message.error('Por favor seleccione una cuenta y cargue un archivo');
      return;
    }

    setImporting(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      const blob = new Blob([JSON.stringify(fileData)], { type: 'application/json' });
      formData.append('file', blob, 'transactions.json');
      formData.append('accountId', selectedAccount);

      const response = await fetch('/api/financial/transactions/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al importar transacciones');
      }

      setImportResult(result.data);
      setCurrentStep('result');
      
      if (result.data.imported > 0) {
        message.success(`${result.data.imported} transacciones importadas correctamente`);
        onSuccess();
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Error al importar transacciones');
    } finally {
      setImporting(false);
    }
  };

  const previewColumns: ColumnsType<ImportTransaction> = [
    {
      title: 'Fecha',
      dataIndex: 'date',
      key: 'date',
      width: 100,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Descripción',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Importe',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right',
      render: (amount: string) => {
        const num = parseFloat(amount);
        return (
          <Text style={{ color: num < 0 ? '#f5222d' : '#52c41a' }}>
            {new Intl.NumberFormat('es-ES', {
              style: 'currency',
              currency: 'EUR',
            }).format(Math.abs(num))}
          </Text>
        );
      },
    },
    {
      title: 'Tipo',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => <Tag>{type || 'bank_transfer'}</Tag>,
    },
  ];

  const renderContent = () => {
    switch (currentStep) {
      case 'upload':
        return (
          <>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <Text strong>Paso 1: Seleccione la cuenta destino</Text>
                <Select
                  style={{ width: '100%', marginTop: 8 }}
                  placeholder="Seleccione una cuenta"
                  value={selectedAccount}
                  onChange={handleAccountChange}
                  size="large"
                >
                  {accounts.map((account) => (
                    <Option key={account.id} value={account.id}>
                      {account.name || account.institution || 'Cuenta sin nombre'}
                      {account.type && ` - ${account.type}`}
                      {account.currencies && ` (${account.currencies.code})`}
                    </Option>
                  ))}
                </Select>
              </div>

              <div>
                <Text strong>Paso 2: Seleccione el archivo JSON</Text>
                <div style={{ marginTop: 8 }}>
                  <Dragger {...uploadProps}>
                    <p className="ant-upload-drag-icon">
                      <FileTextOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                    </p>
                    <p className="ant-upload-text">
                      Haga clic o arrastre un archivo JSON aquí
                    </p>
                    <p className="ant-upload-hint">
                      Soporte para archivos JSON con transacciones históricas
                    </p>
                  </Dragger>
                </div>
              </div>

              <Alert
                message="Formato del archivo"
                description="El archivo debe contener un objeto JSON con un array 'transactions' que incluya las transacciones a importar."
                type="info"
                showIcon
              />
            </Space>
          </>
        );

      case 'preview':
        return (
          <>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <Title level={5}>Vista previa de transacciones</Title>
                {fileData?.metadata && (
                  <Space>
                    <Text type="secondary">
                      Total: {fileData.transactions.length} transacciones
                    </Text>
                    {fileData.metadata.date_range && (
                      <Text type="secondary">
                        Período: {dayjs(fileData.metadata.date_range.start).format('DD/MM/YYYY')} - 
                        {dayjs(fileData.metadata.date_range.end).format('DD/MM/YYYY')}
                      </Text>
                    )}
                  </Space>
                )}
              </div>

              <Table
                columns={previewColumns}
                dataSource={fileData?.transactions.slice(0, 10)}
                rowKey={(record, index) => record.transaction_id || `preview-${index}`}
                pagination={false}
                size="small"
                scroll={{ y: 300 }}
              />

              {fileData && fileData.transactions.length > 10 && (
                <Text type="secondary" style={{ textAlign: 'center', display: 'block' }}>
                  Mostrando 10 de {fileData.transactions.length} transacciones
                </Text>
              )}

              <Alert
                message="Revisión antes de importar"
                description="Por favor revise que las transacciones se vean correctas antes de proceder con la importación."
                type="warning"
                showIcon
              />
            </Space>
          </>
        );

      case 'result':
        return (
          <Result
            status={importResult?.imported ? 'success' : 'warning'}
            title={
              importResult?.imported
                ? `${importResult.imported} transacciones importadas exitosamente`
                : 'No se importaron transacciones'
            }
            subTitle={
              importResult?.skipped
                ? `${importResult.skipped} transacciones omitidas`
                : undefined
            }
            extra={[
              <Button key="close" onClick={handleClose}>
                Cerrar
              </Button>,
              importResult?.imported ? (
                <Button key="import-more" type="primary" onClick={resetModal}>
                  Importar más
                </Button>
              ) : null,
            ]}
          >
            {importResult && (
              <div style={{ textAlign: 'left' }}>
                {importResult.duplicates.length > 0 && (
                  <>
                    <Divider />
                    <Title level={5}>
                      <ExclamationCircleOutlined /> Transacciones duplicadas ({importResult.duplicates.length})
                    </Title>
                    <Text type="secondary">
                      Estas transacciones ya existen en el sistema y fueron omitidas.
                    </Text>
                  </>
                )}

                {importResult.errors.length > 0 && (
                  <>
                    <Divider />
                    <Title level={5}>
                      <CloseCircleOutlined /> Errores ({importResult.errors.length})
                    </Title>
                    {importResult.errors.slice(0, 5).map((error, index) => (
                      <div key={index}>
                        <Text type="danger">
                          Fila {error.row}: {error.error}
                        </Text>
                      </div>
                    ))}
                    {importResult.errors.length > 5 && (
                      <Text type="secondary">
                        ... y {importResult.errors.length - 5} errores más
                      </Text>
                    )}
                  </>
                )}
              </div>
            )}
          </Result>
        );
    }
  };

  const getModalFooter = () => {
    switch (currentStep) {
      case 'upload':
        return [
          <Button key="cancel" onClick={handleClose}>
            Cancelar
          </Button>,
        ];

      case 'preview':
        return [
          <Button key="back" onClick={() => setCurrentStep('upload')}>
            Atrás
          </Button>,
          <Button
            key="import"
            type="primary"
            loading={importing}
            onClick={handleImport}
            disabled={!selectedAccount}
          >
            Importar {fileData?.transactions.length || 0} transacciones
          </Button>,
        ];

      case 'result':
        return null; // Footer is handled in Result component
    }
  };

  return (
    <Modal
      title={
        <Space>
          <UploadOutlined />
          <span>Importar Transacciones</span>
        </Space>
      }
      open={visible}
      onCancel={handleClose}
      width={800}
      footer={getModalFooter()}
      destroyOnClose
    >
      {renderContent()}
    </Modal>
  );
};

export default ImportTransactionsModal;