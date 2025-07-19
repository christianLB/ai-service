import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  LinearProgress,
  Tooltip,
  Paper,
  Divider
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  Stop,
  Settings,
  TrendingUp,
  Assessment,
  Schedule,
  Info
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tradingService, Strategy, StrategyParams } from '../../services/tradingService';
import { formatCurrency, formatPercentage } from '../../utils/formatters';

interface StrategyCardProps {
  strategy: Strategy;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onPause: (id: string) => void;
  onConfigure: (strategy: Strategy) => void;
  onBacktest: (id: string) => void;
}

const StrategyCard: React.FC<StrategyCardProps> = ({
  strategy,
  onStart,
  onStop,
  onPause,
  onConfigure,
  onBacktest
}) => {
  const getStatusColor = () => {
    switch (strategy.status) {
      case 'active': return 'success';
      case 'paused': return 'warning';
      case 'stopped': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = () => {
    switch (strategy.status) {
      case 'active': return <PlayArrow />;
      case 'paused': return <Pause />;
      case 'stopped': return <Stop />;
      default: return null;
    }
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="h3">
            {strategy.name}
          </Typography>
          <Chip
            icon={getStatusIcon()}
            label={strategy.status.toUpperCase()}
            color={getStatusColor()}
            size="small"
          />
        </Box>

        <Typography variant="body2" color="textSecondary" paragraph>
          {strategy.description}
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="body2" color="textSecondary">
              Trades
            </Typography>
            <Typography variant="h6">
              {strategy.performance.totalTrades}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="textSecondary">
              Win Rate
            </Typography>
            <Typography variant="h6">
              {formatPercentage(strategy.performance.winRate)}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="textSecondary">
              P&L Total
            </Typography>
            <Typography 
              variant="h6"
              color={strategy.performance.totalPnL > 0 ? 'success.main' : 'error.main'}
            >
              {formatCurrency(strategy.performance.totalPnL)}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="textSecondary">
              Sharpe Ratio
            </Typography>
            <Typography variant="h6">
              {strategy.performance.sharpeRatio.toFixed(2)}
            </Typography>
          </Grid>
        </Grid>

        {strategy.performance.maxDrawdown && (
          <Box mt={2}>
            <Typography variant="body2" color="textSecondary">
              Max Drawdown
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={Math.abs(strategy.performance.maxDrawdown)} 
              color="error"
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Typography variant="body2" color="error">
              {formatPercentage(strategy.performance.maxDrawdown)}
            </Typography>
          </Box>
        )}
      </CardContent>
      
      <CardActions>
        {strategy.status === 'stopped' && (
          <Button 
            size="small" 
            startIcon={<PlayArrow />}
            onClick={() => onStart(strategy.id)}
            color="success"
          >
            Iniciar
          </Button>
        )}
        {strategy.status === 'active' && (
          <Button 
            size="small" 
            startIcon={<Pause />}
            onClick={() => onPause(strategy.id)}
            color="warning"
          >
            Pausar
          </Button>
        )}
        {strategy.status === 'paused' && (
          <Button 
            size="small" 
            startIcon={<PlayArrow />}
            onClick={() => onStart(strategy.id)}
            color="success"
          >
            Reanudar
          </Button>
        )}
        {strategy.status !== 'stopped' && (
          <Button 
            size="small" 
            startIcon={<Stop />}
            onClick={() => onStop(strategy.id)}
            color="error"
          >
            Detener
          </Button>
        )}
        <IconButton size="small" onClick={() => onConfigure(strategy)}>
          <Settings />
        </IconButton>
        <IconButton size="small" onClick={() => onBacktest(strategy.id)}>
          <Assessment />
        </IconButton>
      </CardActions>
    </Card>
  );
};

interface ConfigureStrategyDialogProps {
  open: boolean;
  strategy: Strategy | null;
  onClose: () => void;
  onSave: (strategyId: string, params: StrategyParams) => void;
}

const ConfigureStrategyDialog: React.FC<ConfigureStrategyDialogProps> = ({
  open,
  strategy,
  onClose,
  onSave
}) => {
  const [params, setParams] = useState<StrategyParams>({});

  React.useEffect(() => {
    if (strategy) {
      setParams(strategy.parameters);
    }
  }, [strategy]);

  const handleSave = () => {
    if (strategy) {
      onSave(strategy.id, params);
    }
  };

  const updateParam = (key: string, value: any) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  if (!strategy) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Configurar {strategy.name}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Parámetros de la Estrategia
          </Typography>
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {Object.entries(strategy.parameterSchema).map(([key, schema]) => (
              <Grid item xs={12} sm={6} key={key}>
                {schema.type === 'boolean' ? (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={params[key] || false}
                        onChange={(e) => updateParam(key, e.target.checked)}
                      />
                    }
                    label={schema.label}
                  />
                ) : (
                  <TextField
                    fullWidth
                    label={schema.label}
                    type={schema.type === 'number' ? 'number' : 'text'}
                    value={params[key] || ''}
                    onChange={(e) => updateParam(key, 
                      schema.type === 'number' ? parseFloat(e.target.value) : e.target.value
                    )}
                    helperText={schema.description}
                    InputProps={{
                      inputProps: {
                        min: schema.min,
                        max: schema.max,
                        step: schema.step
                      }
                    }}
                  />
                )}
              </Grid>
            ))}
          </Grid>

          <Box mt={3}>
            <Typography variant="subtitle2" gutterBottom>
              Configuración de Riesgo
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Max Pérdida por Trade (%)"
                  type="number"
                  value={params.maxLossPerTrade || 1}
                  onChange={(e) => updateParam('maxLossPerTrade', parseFloat(e.target.value))}
                  InputProps={{ inputProps: { min: 0.1, max: 5, step: 0.1 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Max Exposición (%)"
                  type="number"
                  value={params.maxExposure || 10}
                  onChange={(e) => updateParam('maxExposure', parseFloat(e.target.value))}
                  InputProps={{ inputProps: { min: 1, max: 100, step: 1 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Stop Loss por Defecto (%)"
                  type="number"
                  value={params.defaultStopLoss || 2}
                  onChange={(e) => updateParam('defaultStopLoss', parseFloat(e.target.value))}
                  InputProps={{ inputProps: { min: 0.1, max: 10, step: 0.1 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Take Profit por Defecto (%)"
                  type="number"
                  value={params.defaultTakeProfit || 3}
                  onChange={(e) => updateParam('defaultTakeProfit', parseFloat(e.target.value))}
                  InputProps={{ inputProps: { min: 0.1, max: 50, step: 0.1 } }}
                />
              </Grid>
            </Grid>
          </Box>

          <Box mt={3}>
            <Typography variant="subtitle2" gutterBottom>
              Horario de Trading
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={params.scheduleEnabled || false}
                  onChange={(e) => updateParam('scheduleEnabled', e.target.checked)}
                />
              }
              label="Habilitar horario específico"
            />
            {params.scheduleEnabled && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Hora Inicio (UTC)"
                    type="time"
                    value={params.startTime || '00:00'}
                    onChange={(e) => updateParam('startTime', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Hora Fin (UTC)"
                    type="time"
                    value={params.endTime || '23:59'}
                    onChange={(e) => updateParam('endTime', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained">
          Guardar Cambios
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const Strategies: React.FC = () => {
  const [configureDialog, setConfigureDialog] = useState<{
    open: boolean;
    strategy: Strategy | null;
  }>({ open: false, strategy: null });

  const queryClient = useQueryClient();

  const { data: strategies, isLoading, error } = useQuery({
    queryKey: ['strategies'],
    queryFn: () => tradingService.getStrategies(),
    refetchInterval: 10000,
  });

  const startStrategyMutation = useMutation({
    mutationFn: (strategyId: string) => tradingService.startStrategy(strategyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
    },
  });

  const stopStrategyMutation = useMutation({
    mutationFn: (strategyId: string) => tradingService.stopStrategy(strategyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
    },
  });

  const pauseStrategyMutation = useMutation({
    mutationFn: (strategyId: string) => tradingService.pauseStrategy(strategyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
    },
  });

  const updateStrategyMutation = useMutation({
    mutationFn: ({ strategyId, params }: { strategyId: string; params: StrategyParams }) =>
      tradingService.updateStrategyParams(strategyId, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
      setConfigureDialog({ open: false, strategy: null });
    },
  });

  const handleBacktest = (strategyId: string) => {
    // Navigate to backtest page
    window.location.href = `/trading/backtest?strategy=${strategyId}`;
  };

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
        Error al cargar las estrategias
      </Alert>
    );
  }

  const activeStrategies = strategies?.filter(s => s.status === 'active').length || 0;
  const totalPnL = strategies?.reduce((sum, s) => sum + s.performance.totalPnL, 0) || 0;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Gestión de Estrategias
        </Typography>
        <Box display="flex" gap={2} alignItems="center">
          <Chip 
            label={`${activeStrategies} Activas`} 
            color="success" 
            icon={<PlayArrow />}
          />
          <Typography variant="h6">
            P&L Total: 
            <Typography 
              component="span" 
              color={totalPnL > 0 ? 'success.main' : 'error.main'}
              sx={{ ml: 1 }}
            >
              {formatCurrency(totalPnL)}
            </Typography>
          </Typography>
        </Box>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <Info color="info" />
          <Typography variant="body2">
            Las estrategias se ejecutan automáticamente según sus parámetros configurados. 
            Puedes pausar o detener una estrategia en cualquier momento. 
            Las posiciones abiertas no se cerrarán automáticamente al detener una estrategia.
          </Typography>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {strategies?.map((strategy) => (
          <Grid item xs={12} md={6} lg={4} key={strategy.id}>
            <StrategyCard
              strategy={strategy}
              onStart={startStrategyMutation.mutate}
              onStop={stopStrategyMutation.mutate}
              onPause={pauseStrategyMutation.mutate}
              onConfigure={(s) => setConfigureDialog({ open: true, strategy: s })}
              onBacktest={handleBacktest}
            />
          </Grid>
        ))}
      </Grid>

      <ConfigureStrategyDialog
        open={configureDialog.open}
        strategy={configureDialog.strategy}
        onClose={() => setConfigureDialog({ open: false, strategy: null })}
        onSave={(strategyId, params) => {
          updateStrategyMutation.mutate({ strategyId, params });
        }}
      />
    </Box>
  );
};

export default Strategies;