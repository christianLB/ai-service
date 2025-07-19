import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Chip,
  IconButton,
  Button,
  Tooltip
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  ShowChart,
  Stop,
  PlayArrow,
  Pause,
  Refresh,
  Warning
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { tradingService } from '../../services/tradingService';
import { formatCurrency, formatPercentage } from '../../utils/formatters';

interface DashboardData {
  portfolio: {
    totalValue: number;
    dailyPnL: number;
    weeklyPnL: number;
    monthlyPnL: number;
    exposure: Record<string, number>;
  };
  positions: {
    open: number;
    profitable: number;
    losing: number;
    totalPnL: number;
  };
  strategies: {
    active: number;
    paused: number;
    stopped: number;
    performance: Record<string, number>;
  };
  marketOverview: {
    btcPrice: number;
    btcChange24h: number;
    marketCap: number;
    fearGreedIndex: number;
  };
  alerts: Array<{
    id: string;
    type: 'info' | 'warning' | 'error';
    message: string;
    timestamp: Date;
  }>;
}

export const TradingDashboard: React.FC = () => {
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: dashboard, isLoading, error, refetch } = useQuery({
    queryKey: ['trading-dashboard'],
    queryFn: () => tradingService.getDashboard(),
    refetchInterval: autoRefresh ? 5000 : false,
  });

  useEffect(() => {
    const ws = tradingService.connectWebSocket();
    
    ws.subscribe(['dashboard']);
    
    ws.on('dashboard_update', (update: Partial<DashboardData>) => {
      // Handle real-time updates
      refetch();
    });

    return () => {
      ws.disconnect();
    };
  }, [refetch]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Error al cargar el dashboard de trading
      </Alert>
    );
  }

  const getPnLColor = (value: number) => {
    if (value > 0) return 'success.main';
    if (value < 0) return 'error.main';
    return 'text.secondary';
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Trading Dashboard
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            color="error"
            startIcon={<Stop />}
            onClick={() => tradingService.emergencyStop()}
          >
            EMERGENCY STOP
          </Button>
          <IconButton onClick={() => refetch()}>
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {/* Alerts */}
      {dashboard?.alerts && dashboard.alerts.length > 0 && (
        <Box mb={3}>
          {dashboard.alerts.map(alert => (
            <Alert 
              key={alert.id} 
              severity={alert.type}
              sx={{ mb: 1 }}
              icon={alert.type === 'warning' ? <Warning /> : undefined}
            >
              {alert.message}
            </Alert>
          ))}
        </Box>
      )}

      {/* Portfolio Overview */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Valor Total Portfolio
              </Typography>
              <Typography variant="h4">
                {formatCurrency(dashboard?.portfolio.totalValue || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                P&L Diario
              </Typography>
              <Typography 
                variant="h4" 
                color={getPnLColor(dashboard?.portfolio.dailyPnL || 0)}
              >
                {formatCurrency(dashboard?.portfolio.dailyPnL || 0)}
                <Typography variant="body2" component="span" sx={{ ml: 1 }}>
                  ({formatPercentage((dashboard?.portfolio.dailyPnL || 0) / (dashboard?.portfolio.totalValue || 1))})
                </Typography>
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                P&L Semanal
              </Typography>
              <Typography 
                variant="h4" 
                color={getPnLColor(dashboard?.portfolio.weeklyPnL || 0)}
              >
                {formatCurrency(dashboard?.portfolio.weeklyPnL || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                P&L Mensual
              </Typography>
              <Typography 
                variant="h4" 
                color={getPnLColor(dashboard?.portfolio.monthlyPnL || 0)}
              >
                {formatCurrency(dashboard?.portfolio.monthlyPnL || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Positions Summary */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Resumen de Posiciones
            </Typography>
            <Box display="flex" justifyContent="space-between" mb={2}>
              <Box>
                <Typography variant="body2" color="textSecondary">
                  Posiciones Abiertas
                </Typography>
                <Typography variant="h4">{dashboard?.positions.open || 0}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="textSecondary">
                  En Ganancia
                </Typography>
                <Typography variant="h4" color="success.main">
                  {dashboard?.positions.profitable || 0}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="textSecondary">
                  En Pérdida
                </Typography>
                <Typography variant="h4" color="error.main">
                  {dashboard?.positions.losing || 0}
                </Typography>
              </Box>
            </Box>
            <Box mt={2}>
              <Typography variant="body2" color="textSecondary">
                P&L Total Abierto
              </Typography>
              <Typography 
                variant="h5" 
                color={getPnLColor(dashboard?.positions.totalPnL || 0)}
              >
                {formatCurrency(dashboard?.positions.totalPnL || 0)}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Strategy Status */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Estado de Estrategias
            </Typography>
            <Box display="flex" gap={2} mb={2}>
              <Chip 
                icon={<PlayArrow />} 
                label={`${dashboard?.strategies.active || 0} Activas`} 
                color="success" 
              />
              <Chip 
                icon={<Pause />} 
                label={`${dashboard?.strategies.paused || 0} Pausadas`} 
                color="warning" 
              />
              <Chip 
                icon={<Stop />} 
                label={`${dashboard?.strategies.stopped || 0} Detenidas`} 
              />
            </Box>
            <Box mt={3}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Rendimiento por Estrategia
              </Typography>
              {dashboard?.strategies.performance && 
                Object.entries(dashboard.strategies.performance).map(([strategy, pnl]) => (
                  <Box 
                    key={strategy} 
                    display="flex" 
                    justifyContent="space-between" 
                    alignItems="center"
                    py={1}
                  >
                    <Typography>{strategy}</Typography>
                    <Typography color={getPnLColor(pnl)}>
                      {formatCurrency(pnl)}
                    </Typography>
                  </Box>
                ))
              }
            </Box>
          </Paper>
        </Grid>

        {/* Market Overview */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Vista General del Mercado
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} md={3}>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    BTC/USDT
                  </Typography>
                  <Typography variant="h5">
                    {formatCurrency(dashboard?.marketOverview.btcPrice || 0)}
                  </Typography>
                  <Box display="flex" alignItems="center">
                    {(dashboard?.marketOverview.btcChange24h || 0) > 0 ? 
                      <TrendingUp color="success" /> : 
                      <TrendingDown color="error" />
                    }
                    <Typography 
                      color={getPnLColor(dashboard?.marketOverview.btcChange24h || 0)}
                      sx={{ ml: 0.5 }}
                    >
                      {formatPercentage(dashboard?.marketOverview.btcChange24h || 0)}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Market Cap Total
                  </Typography>
                  <Typography variant="h5">
                    ${((dashboard?.marketOverview.marketCap || 0) / 1e9).toFixed(1)}B
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Fear & Greed Index
                  </Typography>
                  <Typography variant="h5">
                    {dashboard?.marketOverview.fearGreedIndex || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {getFearGreedLabel(dashboard?.marketOverview.fearGreedIndex || 0)}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Auto-Refresh
                  </Typography>
                  <Tooltip title={autoRefresh ? "Desactivar actualización automática" : "Activar actualización automática"}>
                    <IconButton 
                      onClick={() => setAutoRefresh(!autoRefresh)}
                      color={autoRefresh ? "primary" : "default"}
                    >
                      <Refresh />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

function getFearGreedLabel(value: number): string {
  if (value < 20) return 'Extreme Fear';
  if (value < 40) return 'Fear';
  if (value < 60) return 'Neutral';
  if (value < 80) return 'Greed';
  return 'Extreme Greed';
}

export default TradingDashboard;