import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, App } from 'antd';
import esES from 'antd/locale/es_ES';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

import { AuthProvider } from './contexts/AuthContext';
import { PrivateRoute } from './components/auth/PrivateRoute';
import { Login } from './pages/auth/Login';
import AppLayout from './components/layout/AppLayout';
import { WebSocketProvider } from './components/WebSocketProvider';
import Dashboard from './pages/Dashboard';
import ClientList from './pages/clients/ClientList';
import ClientDetail from './pages/clients/ClientDetail';
import ClientForm from './pages/clients/ClientForm';
import InvoiceList from './pages/invoices/InvoiceList';
import InvoiceDetail from './pages/invoices/InvoiceDetail';
import InvoiceForm from './pages/invoices/InvoiceForm';
import DocumentList from './pages/documents/DocumentList';
import DocumentDetail from './pages/documents/DocumentDetail';
import DocumentForm from './pages/documents/DocumentForm';
import SystemHealth from './pages/SystemHealth';
import IntegrationSettings from './pages/IntegrationSettings';
import NotificationSettings from './pages/NotificationSettings';
import BankAccounts from './pages/BankAccounts';
import Transactions from './pages/Transactions';
import InvoiceTemplatePage from './pages/invoice-template';

// Trading routes
import TradingDashboard from './pages/trading/TradingDashboard';
import Positions from './pages/trading/Positions';
import Strategies from './pages/trading/Strategies';
import Backtest from './pages/trading/Backtest';
import Performance from './pages/trading/Performance';
import TradingSettings from './pages/trading/Settings';

// Intelligence routes
import DocumentIntelligence from './pages/DocumentIntelligence';
import TradingIntelligence from './pages/TradingIntelligence';

import './App.css';

// Configure dayjs
dayjs.locale('es');

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const AppComponent: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider 
        locale={esES}
        theme={{
          token: {
            colorPrimary: '#1890ff',
            borderRadius: 6,
          },
        }}
      >
        <App>
          <AuthProvider>
            <WebSocketProvider>
              <Router>
                <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
              
              {/* Protected routes */}
              <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
              <Route index element={<Dashboard />} />
              
              {/* Client Routes */}
              <Route path="clients" element={<ClientList />} />
              <Route path="clients/new" element={<ClientForm />} />
              <Route path="clients/:id" element={<ClientDetail />} />
              <Route path="clients/:id/edit" element={<ClientForm />} />
              
              {/* Invoice Routes */}
              <Route path="invoices" element={<InvoiceList />} />
              <Route path="invoices/new" element={<InvoiceForm />} />
              <Route path="invoices/:id" element={<InvoiceDetail />} />
              <Route path="invoices/:id/edit" element={<InvoiceForm />} />
              <Route path="invoice-templates" element={<InvoiceTemplatePage />} />
              
              {/* Document Routes */}
              <Route path="documents" element={<DocumentList />} />
              <Route path="documents/new" element={<DocumentForm />} />
              <Route path="documents/:id" element={<DocumentDetail />} />
              <Route path="documents/:id/edit" element={<DocumentForm />} />
              
              {/* Financial Routes */}
              <Route path="bank-accounts" element={<BankAccounts />} />
              <Route path="transactions" element={<Transactions />} />
              
              {/* Trading Routes */}
              <Route path="trading" element={<TradingDashboard />} />
              <Route path="trading/positions" element={<Positions />} />
              <Route path="trading/strategies" element={<Strategies />} />
              <Route path="trading/backtest" element={<Backtest />} />
              <Route path="trading/performance" element={<Performance />} />
              <Route path="trading/settings" element={<TradingSettings />} />
              
              {/* System Routes */}
              <Route path="health" element={<SystemHealth />} />
              <Route path="integrations" element={<IntegrationSettings />} />
              <Route path="notifications" element={<NotificationSettings />} />
              
              {/* Intelligence Routes */}
              <Route path="document-intelligence" element={<DocumentIntelligence />} />
              <Route path="trading-intelligence" element={<TradingIntelligence />} />
              
              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Router>
      </WebSocketProvider>
    </AuthProvider>
    </App>
    </ConfigProvider>
  </QueryClientProvider>
  );
};

export default AppComponent;