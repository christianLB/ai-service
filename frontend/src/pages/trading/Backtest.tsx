import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  CircularProgress,
  Alert,
  Tab,
  Tabs,
  Card,
  CardContent,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  PlayArrow,
  Download,
  CompareArrows,
  TrendingUp,
  TrendingDown,
  Assessment
} from '@mui/icons-material';
import { useQuery, useMutation } from '@tanstack/react-query';
import { tradingService, BacktestRequest, BacktestResult } from '../../services/tradingService';
import { formatCurrency, formatPercentage, formatDate } from '../../utils/formatters';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`backtest-tabpanel-${index}`}
      aria-labelledby={`backtest-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const Backtest: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [selectedStrategy, setSelectedStrategy] = useState('');
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [initialCapital, setInitialCapital] = useState(10000);
  const [runningBacktest, setRunningBacktest] = useState(false);
  const [selectedResult, setSelectedResult] = useState<BacktestResult | null>(null);

  const { data: strategies } = useQuery({
    queryKey: ['strategies'],
    queryFn: () => tradingService.getStrategies(),
  });

  const { data: exchanges } = useQuery({
    queryKey: ['exchanges'],
    queryFn: () => tradingService.getExchanges(),
  });

  const { data: backtestResults, refetch: refetchResults } = useQuery({
    queryKey: ['backtest-results'],
    queryFn: () => tradingService.getBacktestResults(20),
  });

  const runBacktestMutation = useMutation({
    mutationFn: (request: BacktestRequest) => tradingService.runBacktest(request),
    onSuccess: () => {
      setRunningBacktest(false);
      refetchResults();
      setTabValue(1); // Switch to results tab
    },
    onError: () => {
      setRunningBacktest(false);
    },
  });

  const handleRunBacktest = () => {
    if (!selectedStrategy || selectedSymbols.length === 0 || !startDate || !endDate) {
      return;
    }

    setRunningBacktest(true);
    runBacktestMutation.mutate({
      strategyId: selectedStrategy,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      symbols: selectedSymbols,
      initialCapital,
    });
  };

  const handleExportResults = (result: BacktestResult) => {
    const csv = [
      ['Date', 'Symbol', 'Side', 'Entry Date', 'Exit Date', 'P&L'],
      ...result.trades.map(t => [
        formatDate(t.exitDate),
        t.symbol,
        t.side,
        formatDate(t.entryDate),
        formatDate(t.exitDate),
        t.pnl.toString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backtest-${result.id}.csv`;
    a.click();
  };

  const commonSymbols = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'ADA/USDT'];

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Backtesting
      </Typography>

      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
            <Tab label="Configurar Backtest" />
            <Tab label="Resultados" />
            <Tab label="Comparación" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Estrategia</InputLabel>
                <Select
                  value={selectedStrategy}
                  onChange={(e) => setSelectedStrategy(e.target.value)}
                  label="Estrategia"
                >
                  {strategies?.map((strategy) => (
                    <MenuItem key={strategy.id} value={strategy.id}>
                      {strategy.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Capital Inicial"
                type="number"
                value={initialCapital}
                onChange={(e) => setInitialCapital(parseInt(e.target.value))}
                InputProps={{
                  startAdornment: '$',
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Fecha Inicio"
                  value={startDate}
                  onChange={setStartDate}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Fecha Fin"
                  value={endDate}
                  onChange={setEndDate}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Símbolos a probar
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                {commonSymbols.map((symbol) => (
                  <Chip
                    key={symbol}
                    label={symbol}
                    onClick={() => {
                      if (selectedSymbols.includes(symbol)) {
                        setSelectedSymbols(selectedSymbols.filter(s => s !== symbol));
                      } else {
                        setSelectedSymbols([...selectedSymbols, symbol]);
                      }
                    }}
                    color={selectedSymbols.includes(symbol) ? 'primary' : 'default'}
                    clickable
                  />
                ))}
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Button
                variant="contained"
                size="large"
                startIcon={runningBacktest ? <CircularProgress size={20} /> : <PlayArrow />}
                onClick={handleRunBacktest}
                disabled={runningBacktest || !selectedStrategy || selectedSymbols.length === 0}
                fullWidth
              >
                {runningBacktest ? 'Ejecutando Backtest...' : 'Ejecutar Backtest'}
              </Button>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {backtestResults?.length === 0 ? (
            <Alert severity="info">
              No hay resultados de backtest disponibles. Ejecuta un backtest primero.
            </Alert>
          ) : (
            <Grid container spacing={3}>
              {/* Results List */}
              <Grid item xs={12} md={4}>
                <Typography variant="h6" gutterBottom>
                  Resultados Recientes
                </Typography>
                {backtestResults?.map((result) => (
                  <Card 
                    key={result.id} 
                    sx={{ mb: 2, cursor: 'pointer' }}
                    onClick={() => setSelectedResult(result)}
                  >
                    <CardContent>
                      <Typography variant="subtitle1">
                        {strategies?.find(s => s.id === result.strategyId)?.name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {formatDate(result.startDate)} - {formatDate(result.endDate)}
                      </Typography>
                      <Box display="flex" justifyContent="space-between" mt={1}>
                        <Typography variant="body2">
                          Return: {formatPercentage(result.metrics.totalReturn)}
                        </Typography>
                        <Typography variant="body2">
                          Sharpe: {result.metrics.sharpeRatio.toFixed(2)}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Grid>

              {/* Selected Result Details */}
              {selectedResult && (
                <Grid item xs={12} md={8}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">
                      Detalles del Backtest
                    </Typography>
                    <IconButton onClick={() => handleExportResults(selectedResult)}>
                      <Download />
                    </IconButton>
                  </Box>

                  {/* Metrics Summary */}
                  <Grid container spacing={2} mb={3}>
                    <Grid item xs={6} md={3}>
                      <Card>
                        <CardContent>
                          <Typography variant="body2" color="textSecondary">
                            Retorno Total
                          </Typography>
                          <Typography variant="h6" color={selectedResult.metrics.totalReturn > 0 ? 'success.main' : 'error.main'}>
                            {formatPercentage(selectedResult.metrics.totalReturn)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Card>
                        <CardContent>
                          <Typography variant="body2" color="textSecondary">
                            Sharpe Ratio
                          </Typography>
                          <Typography variant="h6">
                            {selectedResult.metrics.sharpeRatio.toFixed(2)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Card>
                        <CardContent>
                          <Typography variant="body2" color="textSecondary">
                            Max Drawdown
                          </Typography>
                          <Typography variant="h6" color="error.main">
                            {formatPercentage(selectedResult.metrics.maxDrawdown)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Card>
                        <CardContent>
                          <Typography variant="body2" color="textSecondary">
                            Win Rate
                          </Typography>
                          <Typography variant="h6">
                            {formatPercentage(selectedResult.metrics.winRate)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>

                  {/* Equity Curve */}
                  <Paper sx={{ p: 2, mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Curva de Equity
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={selectedResult.equityCurve}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <RechartsTooltip />
                        <Line 
                          type="monotone" 
                          dataKey="equity" 
                          stroke="#8884d8" 
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Paper>

                  {/* Trade List */}
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Trades ({selectedResult.trades.length})
                    </Typography>
                    <TableContainer sx={{ maxHeight: 400 }}>
                      <Table stickyHeader size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Símbolo</TableCell>
                            <TableCell>Lado</TableCell>
                            <TableCell>Entrada</TableCell>
                            <TableCell>Salida</TableCell>
                            <TableCell align="right">P&L</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedResult.trades.map((trade, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{trade.symbol}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={trade.side} 
                                  size="small"
                                  color={trade.side === 'buy' ? 'success' : 'error'}
                                />
                              </TableCell>
                              <TableCell>{formatDate(trade.entryDate)}</TableCell>
                              <TableCell>{formatDate(trade.exitDate)}</TableCell>
                              <TableCell 
                                align="right"
                                sx={{ 
                                  color: trade.pnl > 0 ? 'success.main' : 'error.main',
                                  fontWeight: 'medium'
                                }}
                              >
                                {formatCurrency(trade.pnl)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Grid>
              )}
            </Grid>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Alert severity="info">
            La funcionalidad de comparación de backtests estará disponible próximamente.
          </Alert>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default Backtest;