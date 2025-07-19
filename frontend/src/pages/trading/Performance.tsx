import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  AccountBalance,
  ShowChart,
  PieChart as PieChartIcon,
  Download,
  Info
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { tradingService } from '../../services/tradingService';
import { formatCurrency, formatPercentage, formatNumber } from '../../utils/formatters';

type TimeRange = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

interface PerformanceMetrics {
  totalReturn: number;
  totalReturnPercent: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownDuration: number;
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  bestTrade: number;
  worstTrade: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  averageHoldTime: number;
  roi: number;
}

interface PerformanceData {
  metrics: PerformanceMetrics;
  equityCurve: Array<{ date: string; value: number; drawdown: number }>;
  monthlyReturns: Array<{ month: string; return: number }>;
  strategyPerformance: Array<{ strategy: string; pnl: number; trades: number; winRate: number }>;
  symbolPerformance: Array<{ symbol: string; pnl: number; trades: number; winRate: number }>;
  tradingActivity: Array<{ date: string; trades: number; volume: number }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const Performance: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');
  const [selectedStrategy, setSelectedStrategy] = useState<string>('all');

  const { data: performanceData, isLoading } = useQuery({
    queryKey: ['performance', timeRange, selectedStrategy],
    queryFn: async () => {
      // This would be replaced with actual API call
      return mockPerformanceData;
    },
  });

  const { data: strategies } = useQuery({
    queryKey: ['strategies'],
    queryFn: () => tradingService.getStrategies(),
  });

  const handleExport = () => {
    // Export performance report
    console.log('Exporting performance report...');
  };

  if (isLoading || !performanceData) {
    return <Box>Loading...</Box>;
  }

  const { metrics } = performanceData;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Análisis de Rendimiento
        </Typography>
        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Estrategia</InputLabel>
            <Select
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value)}
              label="Estrategia"
            >
              <MenuItem value="all">Todas las Estrategias</MenuItem>
              {strategies?.map((strategy) => (
                <MenuItem key={strategy.id} value={strategy.id}>
                  {strategy.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <ToggleButtonGroup
            value={timeRange}
            exclusive
            onChange={(e, value) => value && setTimeRange(value)}
            size="small"
          >
            <ToggleButton value="1D">1D</ToggleButton>
            <ToggleButton value="1W">1S</ToggleButton>
            <ToggleButton value="1M">1M</ToggleButton>
            <ToggleButton value="3M">3M</ToggleButton>
            <ToggleButton value="6M">6M</ToggleButton>
            <ToggleButton value="1Y">1A</ToggleButton>
            <ToggleButton value="ALL">Todo</ToggleButton>
          </ToggleButtonGroup>
          <Tooltip title="Exportar reporte">
            <IconButton onClick={handleExport}>
              <Download />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Retorno Total
              </Typography>
              <Typography 
                variant="h5" 
                component="div"
                color={metrics.totalReturn > 0 ? 'success.main' : 'error.main'}
              >
                {formatCurrency(metrics.totalReturn)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {formatPercentage(metrics.totalReturnPercent)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Sharpe Ratio
              </Typography>
              <Typography variant="h5" component="div">
                {formatNumber(metrics.sharpeRatio, 2)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Risk-adjusted return
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Max Drawdown
              </Typography>
              <Typography variant="h5" component="div" color="error.main">
                {formatPercentage(metrics.maxDrawdown)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {metrics.maxDrawdownDuration} días
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Win Rate
              </Typography>
              <Typography variant="h5" component="div">
                {formatPercentage(metrics.winRate)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {metrics.winningTrades}/{metrics.totalTrades} trades
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Equity Curve */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Curva de Equity y Drawdown
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={performanceData.equityCurve}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <RechartsTooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="value"
                  stroke="#8884d8"
                  name="Valor Portfolio"
                  strokeWidth={2}
                  dot={false}
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="drawdown"
                  stroke="#ff7300"
                  fill="#ff7300"
                  name="Drawdown %"
                  opacity={0.3}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Monthly Returns Heatmap */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Retornos Mensuales
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceData.monthlyReturns}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="return" fill="#8884d8">
                  {performanceData.monthlyReturns.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.return > 0 ? '#00C49F' : '#FF8042'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Strategy Performance Pie */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Rendimiento por Estrategia
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={performanceData.strategyPerformance}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="pnl"
                  label={({ strategy, percent }) => `${strategy} ${(percent * 100).toFixed(0)}%`}
                >
                  {performanceData.strategyPerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Performance by Symbol */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Rendimiento por Símbolo
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Símbolo</TableCell>
                    <TableCell align="right">P&L</TableCell>
                    <TableCell align="right">Trades</TableCell>
                    <TableCell align="right">Win Rate</TableCell>
                    <TableCell align="right">Avg Win</TableCell>
                    <TableCell align="right">Avg Loss</TableCell>
                    <TableCell align="right">Profit Factor</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {performanceData.symbolPerformance.map((row) => (
                    <TableRow key={row.symbol}>
                      <TableCell>
                        <Chip label={row.symbol} size="small" />
                      </TableCell>
                      <TableCell 
                        align="right"
                        sx={{ 
                          color: row.pnl > 0 ? 'success.main' : 'error.main',
                          fontWeight: 'medium'
                        }}
                      >
                        {formatCurrency(row.pnl)}
                      </TableCell>
                      <TableCell align="right">{row.trades}</TableCell>
                      <TableCell align="right">{formatPercentage(row.winRate)}</TableCell>
                      <TableCell align="right" sx={{ color: 'success.main' }}>
                        {formatCurrency(125.50)}
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'error.main' }}>
                        {formatCurrency(-87.30)}
                      </TableCell>
                      <TableCell align="right">{formatNumber(1.44, 2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Additional Statistics */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Estadísticas Detalladas
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={6} md={3}>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Profit Factor
                  </Typography>
                  <Typography variant="h6">
                    {formatNumber(metrics.profitFactor, 2)}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Promedio Ganancia
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {formatCurrency(metrics.averageWin)}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Promedio Pérdida
                  </Typography>
                  <Typography variant="h6" color="error.main">
                    {formatCurrency(metrics.averageLoss)}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Tiempo Promedio
                  </Typography>
                  <Typography variant="h6">
                    {metrics.averageHoldTime}h
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Mejor Trade
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {formatCurrency(metrics.bestTrade)}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Peor Trade
                  </Typography>
                  <Typography variant="h6" color="error.main">
                    {formatCurrency(metrics.worstTrade)}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Rachas Ganadoras
                  </Typography>
                  <Typography variant="h6">
                    {metrics.consecutiveWins}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Rachas Perdedoras
                  </Typography>
                  <Typography variant="h6">
                    {metrics.consecutiveLosses}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

// Mock data for development
const mockPerformanceData: PerformanceData = {
  metrics: {
    totalReturn: 23456.78,
    totalReturnPercent: 23.46,
    sharpeRatio: 1.85,
    sortinoRatio: 2.10,
    maxDrawdown: -8.2,
    maxDrawdownDuration: 15,
    winRate: 58,
    profitFactor: 1.44,
    averageWin: 125.50,
    averageLoss: -87.30,
    bestTrade: 1250.00,
    worstTrade: -450.00,
    totalTrades: 150,
    winningTrades: 87,
    losingTrades: 63,
    consecutiveWins: 8,
    consecutiveLosses: 5,
    averageHoldTime: 24,
    roi: 234.56
  },
  equityCurve: Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
    value: 10000 + Math.random() * 5000 + i * 100,
    drawdown: -Math.random() * 5
  })),
  monthlyReturns: [
    { month: 'Ene', return: 5.2 },
    { month: 'Feb', return: -2.1 },
    { month: 'Mar', return: 8.5 },
    { month: 'Abr', return: 3.2 },
    { month: 'May', return: -1.5 },
    { month: 'Jun', return: 6.8 }
  ],
  strategyPerformance: [
    { strategy: 'Trend Following', pnl: 12500, trades: 45, winRate: 62 },
    { strategy: 'Mean Reversion', pnl: 8200, trades: 65, winRate: 55 },
    { strategy: 'Arbitrage', pnl: 2756, trades: 40, winRate: 72 }
  ],
  symbolPerformance: [
    { symbol: 'BTC/USDT', pnl: 15234, trades: 42, winRate: 60 },
    { symbol: 'ETH/USDT', pnl: 5422, trades: 38, winRate: 58 },
    { symbol: 'BNB/USDT', pnl: 2800, trades: 35, winRate: 54 },
    { symbol: 'SOL/USDT', pnl: -1200, trades: 35, winRate: 45 }
  ],
  tradingActivity: Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
    trades: Math.floor(Math.random() * 10),
    volume: Math.random() * 50000
  }))
};

export default Performance;