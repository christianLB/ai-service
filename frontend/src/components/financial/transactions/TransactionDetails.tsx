import React from 'react';
import {
  Descriptions,
  Tag,
  Space,
  Typography,
  Divider,
  Row,
  Col,
  Card,
} from 'antd';
import {
  CalendarOutlined,
  BankOutlined,
  UserOutlined,
  DollarOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;

interface TransactionDetailsProps {
  transaction: any;
  account?: any;
}

const TransactionDetails: React.FC<TransactionDetailsProps> = ({
  transaction,
  account,
}) => {
  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency || 'EUR',
    }).format(amount);
  };

  const getStatusTag = (status: string) => {
    const statusConfig: Record<string, { color: string; text: string }> = {
      confirmed: { color: 'success', text: 'Confirmada' },
      pending: { color: 'processing', text: 'Pendiente' },
      failed: { color: 'error', text: 'Fallida' },
      cancelled: { color: 'default', text: 'Cancelada' },
    };

    const config = statusConfig[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getTypeTag = (type: string) => {
    const typeConfig: Record<string, { color: string; text: string }> = {
      bank_transfer: { color: 'blue', text: 'Transferencia' },
      income: { color: 'green', text: 'Ingreso' },
      expense: { color: 'red', text: 'Gasto' },
      crypto_send: { color: 'purple', text: 'Envío Crypto' },
      crypto_receive: { color: 'cyan', text: 'Recepción Crypto' },
    };

    const config = typeConfig[type] || { color: 'default', text: type };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space>
                <CalendarOutlined />
                <Text strong>Fecha:</Text>
                <Text>{dayjs(transaction.date).format('DD/MM/YYYY HH:mm')}</Text>
              </Space>
              <Space>
                <DollarOutlined />
                <Text strong>Importe:</Text>
                <Text
                  strong
                  style={{
                    fontSize: '18px',
                    color: transaction.amount < 0 ? '#f5222d' : '#52c41a',
                  }}
                >
                  {formatAmount(transaction.amount, transaction.currency)}
                </Text>
              </Space>
            </Space>
          </Card>
        </Col>
      </Row>

      <Divider />

      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="ID de Transacción">
          <Text copyable>{transaction.id}</Text>
        </Descriptions.Item>
        
        <Descriptions.Item label="Referencia">
          {transaction.reference ? (
            <Text copyable>{transaction.reference}</Text>
          ) : (
            <Text type="secondary">Sin referencia</Text>
          )}
        </Descriptions.Item>

        <Descriptions.Item label="Tipo">
          {getTypeTag(transaction.type)}
        </Descriptions.Item>

        <Descriptions.Item label="Estado">
          {getStatusTag(transaction.status)}
        </Descriptions.Item>

        <Descriptions.Item label="Descripción">
          <Text>{transaction.description || 'Sin descripción'}</Text>
        </Descriptions.Item>

        <Descriptions.Item label="Cuenta Bancaria">
          <Space>
            <BankOutlined />
            <Text>{account?.institution_name || 'Desconocida'}</Text>
            {account?.iban && (
              <Text type="secondary">
                (****{account.iban.slice(-4)})
              </Text>
            )}
          </Space>
        </Descriptions.Item>

        {transaction.counterpartyName && (
          <Descriptions.Item label="Contraparte">
            <Space direction="vertical" size={0}>
              <Space>
                <UserOutlined />
                <Text strong>{transaction.counterpartyName}</Text>
              </Space>
              {transaction.counterpartyAccount && (
                <Text type="secondary" style={{ marginLeft: 20 }}>
                  {transaction.counterpartyAccount}
                </Text>
              )}
            </Space>
          </Descriptions.Item>
        )}
      </Descriptions>

      {transaction.metadata && Object.keys(transaction.metadata).length > 0 && (
        <>
          <Divider orientation="left">
            <Space>
              <InfoCircleOutlined />
              Información Adicional
            </Space>
          </Divider>
          <Card size="small">
            <pre style={{ margin: 0, fontSize: '12px' }}>
              {JSON.stringify(transaction.metadata, null, 2)}
            </pre>
          </Card>
        </>
      )}

      {transaction.gocardlessData && (
        <>
          <Divider orientation="left">
            <Space>
              <FileTextOutlined />
              Datos de GoCardless
            </Space>
          </Divider>
          <Card size="small">
            <Descriptions column={1} size="small">
              {transaction.gocardlessData.transactionId && (
                <Descriptions.Item label="GoCardless ID">
                  <Text copyable style={{ fontSize: '12px' }}>
                    {transaction.gocardlessData.transactionId}
                  </Text>
                </Descriptions.Item>
              )}
              {transaction.gocardlessData.bookingDate && (
                <Descriptions.Item label="Fecha de Registro">
                  {dayjs(transaction.gocardlessData.bookingDate).format('DD/MM/YYYY')}
                </Descriptions.Item>
              )}
              {transaction.gocardlessData.valueDate && (
                <Descriptions.Item label="Fecha Valor">
                  {dayjs(transaction.gocardlessData.valueDate).format('DD/MM/YYYY')}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </>
      )}
    </div>
  );
};

export default TransactionDetails;