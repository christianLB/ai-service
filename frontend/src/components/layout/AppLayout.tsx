import React, { useState, useEffect } from 'react';
import { Layout, Menu, theme, Avatar, Dropdown, Badge, Space, Button, Tooltip } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  FileTextOutlined,
  FolderOutlined,
  SettingOutlined,
  BellOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  ApiOutlined,
  BankOutlined,
  TransactionOutlined,
  LineChartOutlined,
  FundOutlined,
  StockOutlined,
  BarChartOutlined,
  BulbOutlined,
  ThunderboltOutlined,
  TagsOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import dashboardService from '../../services/dashboardService';
import type { HealthStatus } from '../../types';

const { Header, Sider, Content } = Layout;

const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/clients',
      icon: <UserOutlined />,
      label: 'Clientes',
    },
    {
      key: '/invoices',
      icon: <FileTextOutlined />,
      label: 'Facturas',
    },
    {
      key: '/documents',
      icon: <FolderOutlined />,
      label: 'Documentos',
    },
    {
      key: '/financial',
      icon: <BankOutlined />,
      label: 'Finanzas',
      children: [
        {
          key: '/bank-accounts',
          icon: <BankOutlined />,
          label: 'Cuentas Bancarias',
        },
        {
          key: '/transactions',
          icon: <TransactionOutlined />,
          label: 'Transacciones',
        },
      ],
    },
    // Trading menu
    {
      key: '/trading',
      icon: <LineChartOutlined />,
      label: 'Trading',
      children: [
        {
          key: '/trading/dashboard',
          icon: <FundOutlined />,
          label: 'Dashboard',
        },
        {
          key: '/trading/positions',
          icon: <StockOutlined />,
          label: 'Posiciones',
        },
        {
          key: '/trading/strategies',
          icon: <BarChartOutlined />,
          label: 'Estrategias',
        },
        {
          key: '/trading/backtest',
          icon: <LineChartOutlined />,
          label: 'Backtest',
        },
        {
          key: '/trading/performance',
          icon: <BarChartOutlined />,
          label: 'Rendimiento',
        },
        {
          key: '/trading/settings',
          icon: <SettingOutlined />,
          label: 'Configuración',
        },
      ],
    },
    // Intelligence menu
    {
      key: '/intelligence',
      icon: <BulbOutlined />,
      label: 'Inteligencia',
      children: [
        {
          key: '/document-intelligence',
          icon: <FolderOutlined />,
          label: 'Document Intelligence',
        },
        {
          key: '/trading-intelligence',
          icon: <ThunderboltOutlined />,
          label: 'Trading Intelligence',
        },
        {
          key: '/tagging-intelligence',
          icon: <TagsOutlined />,
          label: 'AI Universal Tagging',
        },
      ],
    },
    {
      key: 'management',
      icon: <AppstoreOutlined />,
      label: 'Management',
      children: [
        {
          key: '/tags',
          icon: <TagsOutlined />,
          label: 'Tags Admin',
        },
      ],
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: 'Configuración',
      children: [
        {
          key: '/integrations',
          icon: <ApiOutlined />,
          label: 'Integraciones',
        },
        {
          key: '/notifications',
          icon: <BellOutlined />,
          label: 'Notificaciones',
        },
      ],
    },
  ];

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Perfil',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Configuración',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Cerrar Sesión',
      danger: true,
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const handleUserMenuClick = async ({ key }: { key: string }) => {
    if (key === 'logout') {
      // Handle logout
      await logout();
      navigate('/login');
    } else {
      navigate(`/${key}`);
    }
  };

  const fetchHealthStatus = async () => {
    try {
      const response = await dashboardService.getHealthCheck();
      setHealthStatus(response);
    } catch (error) {
      console.error('Error fetching health status:', error);
      setHealthStatus({
        success: false,
        status: 'unhealthy',
        services: {
          database: 'error',
          gocardless: 'error',
          scheduler: 'error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  };

  useEffect(() => {
    fetchHealthStatus();
    const interval = setInterval(fetchHealthStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'authenticated':
      case 'running':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'warning':
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
      default:
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        theme="light"
        style={{
          borderRight: '1px solid #f0f0f0',
        }}
      >
        <div style={{ 
          height: 64, 
          padding: '16px', 
          display: 'flex', 
          alignItems: 'center',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <div style={{ 
            color: '#1890ff', 
            fontSize: collapsed ? 16 : 20, 
            fontWeight: 'bold',
            textAlign: 'center',
            width: '100%'
          }}>
            {collapsed ? 'AI' : 'AI Service'}
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={handleMenuClick}
            style={{ borderRight: 0, marginTop: 8, flex: 1 }}
          />
          
          {/* System Status Footer */}
          <div style={{ 
            padding: collapsed ? '8px' : '12px 16px', 
            borderTop: '1px solid #f0f0f0',
            background: '#fafafa',
            transition: 'all 0.3s'
          }}>
            {!collapsed && (
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', fontWeight: '500' }}>
                Estado del Sistema
              </div>
            )}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: collapsed ? '1fr' : '1fr 1fr',
              gap: '8px'
            }}>
              {/* General Status */}
              <Tooltip title={collapsed ? 'Estado General' : null} placement="right">
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: collapsed ? 'transparent' : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => navigate('/health')}
                >
                  {getStatusIcon(healthStatus?.status || 'error')}
                  {!collapsed && (
                    <span style={{ marginLeft: '6px', fontSize: '11px' }}>
                      General
                    </span>
                  )}
                </div>
              </Tooltip>

              {/* Database Status */}
              <Tooltip title={collapsed ? 'Base de Datos' : null} placement="right">
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: collapsed ? 'transparent' : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => navigate('/health')}
                >
                  {getStatusIcon(healthStatus?.services.database || 'error')}
                  {!collapsed && (
                    <span style={{ marginLeft: '6px', fontSize: '11px' }}>
                      Database
                    </span>
                  )}
                </div>
              </Tooltip>

              {/* GoCardless Status */}
              <Tooltip title={collapsed ? 'GoCardless' : null} placement="right">
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: collapsed ? 'transparent' : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => navigate('/health')}
                >
                  {getStatusIcon(healthStatus?.services.gocardless || 'error')}
                  {!collapsed && (
                    <span style={{ marginLeft: '6px', fontSize: '11px' }}>
                      GoCardless
                    </span>
                  )}
                </div>
              </Tooltip>

              {/* Scheduler Status */}
              <Tooltip title={collapsed ? 'Scheduler' : null} placement="right">
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: collapsed ? 'transparent' : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => navigate('/health')}
                >
                  {getStatusIcon(healthStatus?.services.scheduler || 'error')}
                  {!collapsed && (
                    <span style={{ marginLeft: '6px', fontSize: '11px' }}>
                      Scheduler
                    </span>
                  )}
                </div>
              </Tooltip>
            </div>
          </div>
        </div>
      </Sider>
      
      <Layout>
        <Header 
          style={{ 
            padding: '0 24px', 
            background: colorBgContainer,
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: 64,
              height: 64,
            }}
          />
          
          <Space size="middle">
            <Button 
              type="text" 
              icon={<SyncOutlined />}
              onClick={() => window.location.reload()}
            >
              Sincronizar
            </Button>
            
            <Badge count={0} showZero={false}>
              <Button 
                type="text" 
                icon={<BellOutlined />} 
                size="large"
              />
            </Badge>
            
            <Dropdown
              menu={{
                items: userMenuItems,
                onClick: handleUserMenuClick,
              }}
              placement="bottomRight"
            >
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} />
                <span>{user?.fullName || user?.email || 'Usuario'}</span>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        
        <Content
          style={{
            margin: '24px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;