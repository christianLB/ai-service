import React from 'react';
import { Card, Table, Tag, Space, Typography, Avatar, Empty, Tooltip, Button } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  BankOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EuroOutlined,
  CalendarOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

const { Text } = Typography;

interface Account {
  id: string;
  institution_id: string;
  institution_name: string;
  logo_url: string;
  iban: string;
  balance: number;
  currency: string;
  owner_name: string;
  is_active: boolean;
  last_synced_at: string;
}

interface AccountsListProps {
  accounts: Account[];
  loading: boolean;
}

const AccountsList: React.FC<AccountsListProps> = ({ accounts, loading }) => {
  const navigate = useNavigate();
  
  const formatIBAN = (iban: string) => {
    if (!iban) return '-';
    const last4 = iban.slice(-4);
    return `****${last4}`;
  };

  const formatBalance = (balance: number, currency: string) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency || 'EUR',
    }).format(balance);
  };

  const getSyncStatus = (lastSync: string) => {
    if (!lastSync) return { color: 'default', text: 'Nunca sincronizado' };
    
    const hoursSinceSync = dayjs().diff(dayjs(lastSync), 'hour');
    
    if (hoursSinceSync < 1) {
      return { color: 'success', text: 'Hace menos de 1 hora' };
    } else if (hoursSinceSync < 24) {
      return { color: 'processing', text: `Hace ${hoursSinceSync} horas` };
    } else {
      const days = Math.floor(hoursSinceSync / 24);
      return { color: 'warning', text: `Hace ${days} días` };
    }
  };

  const columns: ColumnsType<Account> = [
    {
      title: 'Banco',
      key: 'institution',
      width: '25%',
      render: (_, record) => (
        <Space>
          {record.logo_url ? (
            <Avatar src={record.logo_url} size="small" />
          ) : (
            <Avatar icon={<BankOutlined />} size="small" />
          )}
          <div>
            <Text strong>{record.institution_name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {formatIBAN(record.iban)}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Titular',
      dataIndex: 'owner_name',
      key: 'owner_name',
      width: '20%',
      ellipsis: true,
    },
    {
      title: 'Saldo',
      key: 'balance',
      width: '20%',
      align: 'right',
      render: (_, record) => (
        <Space direction="vertical" size={0} style={{ width: '100%' }}>
          <Text strong style={{ fontSize: '16px' }}>
            {formatBalance(record.balance, record.currency)}
          </Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            <CalendarOutlined /> {getSyncStatus(record.last_synced_at).text}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Estado',
      key: 'status',
      width: '15%',
      align: 'center',
      render: (_, record) => {
        const syncStatus = getSyncStatus(record.last_synced_at);
        return (
          <Space direction="vertical" size={4}>
            <Tag 
              icon={record.is_active ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
              color={record.is_active ? 'success' : 'default'}
            >
              {record.is_active ? 'Activa' : 'Inactiva'}
            </Tag>
            <Tag color={syncStatus.color} style={{ fontSize: '11px' }}>
              {syncStatus.text}
            </Tag>
          </Space>
        );
      },
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: '20%',
      align: 'center',
      render: (_, record) => (
        <Space>
          <Tooltip title="Ver transacciones">
            <Button 
              type="link" 
              size="small" 
              icon={<EuroOutlined />}
              onClick={() => navigate(`/transactions?accountId=${record.id}`)}
            >
              Transacciones
            </Button>
          </Tooltip>
          <Tooltip title="Más información">
            <Button type="link" size="small" icon={<InfoCircleOutlined />} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (accounts.length === 0 && !loading) {
    return (
      <Card>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space direction="vertical" size="small">
              <Text>No hay cuentas bancarias conectadas</Text>
              <Text type="secondary">
                Conecta tu primera cuenta para empezar a sincronizar tus movimientos
              </Text>
            </Space>
          }
        />
      </Card>
    );
  }

  return (
    <Card 
      title={
        <Space>
          <BankOutlined />
          <span>Cuentas Conectadas</span>
          <Tag>{accounts.length}</Tag>
        </Space>
      }
      bodyStyle={{ padding: 0 }}
    >
      <Table
        columns={columns}
        dataSource={accounts}
        loading={loading}
        rowKey="id"
        pagination={false}
        size="middle"
        rowClassName={(record) => !record.is_active ? 'inactive-row' : ''}
      />
    </Card>
  );
};

export default AccountsList;