import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Alert,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment
} from '@mui/material';
import {
  Save,
  Add,
  Delete,
  Warning,
  Security,
  Notifications,
  AccountBalanceWallet,
  Speed,
  Api
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tradingService } from '../../services/tradingService';

interface RiskSettings {
  maxPositionSize: number;
  maxDailyLoss: number;
  maxDrawdown: number;
  maxLeverage: number;
  stopLossRequired: boolean;
  defaultStopLoss: number;
  defaultTakeProfit: number;
}

interface NotificationSettings {
  telegramEnabled: boolean;
  telegramChatId: string;
  emailEnabled: boolean;
  emailAddress: string;
  alertTypes: {
    trades: boolean;
    errors: boolean;
    dailyReport: boolean;
    riskAlerts: boolean;
  };
}

interface ExchangeCredential {
  id: string;
  exchange: string;
  name: string;
  testnet: boolean;
  active: boolean;
}

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'risk' | 'notifications' | 'exchanges'>('risk');
  const [riskSettings, setRiskSettings] = useState<RiskSettings>({
    maxPositionSize: 10,
    maxDailyLoss: 5,
    maxDrawdown: 20,
    maxLeverage: 3,
    stopLossRequired: true,
    defaultStopLoss: 2,
    defaultTakeProfit: 3
  });
  
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    telegramEnabled: false,
    telegramChatId: '',
    emailEnabled: false,
    emailAddress: '',
    alertTypes: {
      trades: true,
      errors: true,
      dailyReport: true,
      riskAlerts: true
    }
  });

  const [addExchangeDialog, setAddExchangeDialog] = useState(false);
  const [newExchange, setNewExchange] = useState({
    exchange: '',
    name: '',
    apiKey: '',
    apiSecret: '',
    testnet: true
  });

  const queryClient = useQueryClient();

  const { data: exchanges } = useQuery({
    queryKey: ['exchange-credentials'],
    queryFn: async () => {
      // Mock data - replace with actual API call
      return [
        { id: '1', exchange: 'binance', name: 'Binance Main', testnet: false, active: true },
        { id: '2', exchange: 'binance', name: 'Binance Testnet', testnet: true, active: true }
      ] as ExchangeCredential[];
    }
  });

  const updateRiskSettingsMutation = useMutation({
    mutationFn: (settings: RiskSettings) => tradingService.updateRiskParams(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-settings'] });
    }
  });

  const handleSaveRiskSettings = () => {
    updateRiskSettingsMutation.mutate(riskSettings);
  };

  const handleAddExchange = () => {
    // Add exchange logic
    setAddExchangeDialog(false);
    setNewExchange({
      exchange: '',
      name: '',
      apiKey: '',
      apiSecret: '',
      testnet: true
    });
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Configuración de Trading
      </Typography>

      <Paper sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Grid container>
            <Grid 
              item xs={4} 
              sx={{ 
                p: 2, 
                cursor: 'pointer',
                bgcolor: activeTab === 'risk' ? 'action.selected' : 'transparent',
                borderBottom: activeTab === 'risk' ? 2 : 0,
                borderColor: 'primary.main'
              }}
              onClick={() => setActiveTab('risk')}
            >
              <Box display="flex" alignItems="center" justifyContent="center">
                <Security sx={{ mr: 1 }} />
                <Typography>Gestión de Riesgo</Typography>
              </Box>
            </Grid>
            <Grid 
              item xs={4} 
              sx={{ 
                p: 2, 
                cursor: 'pointer',
                bgcolor: activeTab === 'notifications' ? 'action.selected' : 'transparent',
                borderBottom: activeTab === 'notifications' ? 2 : 0,
                borderColor: 'primary.main'
              }}
              onClick={() => setActiveTab('notifications')}
            >
              <Box display="flex" alignItems="center" justifyContent="center">
                <Notifications sx={{ mr: 1 }} />
                <Typography>Notificaciones</Typography>
              </Box>
            </Grid>
            <Grid 
              item xs={4} 
              sx={{ 
                p: 2, 
                cursor: 'pointer',
                bgcolor: activeTab === 'exchanges' ? 'action.selected' : 'transparent',
                borderBottom: activeTab === 'exchanges' ? 2 : 0,
                borderColor: 'primary.main'
              }}
              onClick={() => setActiveTab('exchanges')}
            >
              <Box display="flex" alignItems="center" justifyContent="center">
                <Api sx={{ mr: 1 }} />
                <Typography>Exchanges</Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ p: 3 }}>
          {activeTab === 'risk' && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Alert severity="warning" icon={<Warning />}>
                  Los límites de riesgo son críticos para proteger tu capital. 
                  Configúralos cuidadosamente según tu tolerancia al riesgo.
                </Alert>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Tamaño Máximo de Posición (%)"
                  type="number"
                  value={riskSettings.maxPositionSize}
                  onChange={(e) => setRiskSettings({
                    ...riskSettings,
                    maxPositionSize: parseFloat(e.target.value)
                  })}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    inputProps: { min: 1, max: 100, step: 1 }
                  }}
                  helperText="Porcentaje máximo del capital por posición"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Pérdida Máxima Diaria (%)"
                  type="number"
                  value={riskSettings.maxDailyLoss}
                  onChange={(e) => setRiskSettings({
                    ...riskSettings,
                    maxDailyLoss: parseFloat(e.target.value)
                  })}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    inputProps: { min: 0.1, max: 20, step: 0.1 }
                  }}
                  helperText="Se detendrá el trading al alcanzar este límite"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Drawdown Máximo (%)"
                  type="number"
                  value={riskSettings.maxDrawdown}
                  onChange={(e) => setRiskSettings({
                    ...riskSettings,
                    maxDrawdown: parseFloat(e.target.value)
                  })}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    inputProps: { min: 5, max: 50, step: 1 }
                  }}
                  helperText="Pérdida máxima desde el pico de equity"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Apalancamiento Máximo"
                  type="number"
                  value={riskSettings.maxLeverage}
                  onChange={(e) => setRiskSettings({
                    ...riskSettings,
                    maxLeverage: parseFloat(e.target.value)
                  })}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">x</InputAdornment>,
                    inputProps: { min: 1, max: 10, step: 1 }
                  }}
                  helperText="Apalancamiento máximo permitido"
                />
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Configuración de Stop Loss / Take Profit
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={riskSettings.stopLossRequired}
                      onChange={(e) => setRiskSettings({
                        ...riskSettings,
                        stopLossRequired: e.target.checked
                      })}
                    />
                  }
                  label="Requerir Stop Loss en todas las operaciones"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Stop Loss por Defecto (%)"
                  type="number"
                  value={riskSettings.defaultStopLoss}
                  onChange={(e) => setRiskSettings({
                    ...riskSettings,
                    defaultStopLoss: parseFloat(e.target.value)
                  })}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    inputProps: { min: 0.1, max: 10, step: 0.1 }
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Take Profit por Defecto (%)"
                  type="number"
                  value={riskSettings.defaultTakeProfit}
                  onChange={(e) => setRiskSettings({
                    ...riskSettings,
                    defaultTakeProfit: parseFloat(e.target.value)
                  })}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    inputProps: { min: 0.1, max: 50, step: 0.1 }
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <Box display="flex" justifyContent="flex-end">
                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={handleSaveRiskSettings}
                    disabled={updateRiskSettingsMutation.isLoading}
                  >
                    Guardar Configuración de Riesgo
                  </Button>
                </Box>
              </Grid>
            </Grid>
          )}

          {activeTab === 'notifications' && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Telegram
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.telegramEnabled}
                      onChange={(e) => setNotificationSettings({
                        ...notificationSettings,
                        telegramEnabled: e.target.checked
                      })}
                    />
                  }
                  label="Habilitar notificaciones por Telegram"
                />
              </Grid>

              {notificationSettings.telegramEnabled && (
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Chat ID de Telegram"
                    value={notificationSettings.telegramChatId}
                    onChange={(e) => setNotificationSettings({
                      ...notificationSettings,
                      telegramChatId: e.target.value
                    })}
                    helperText="Obtén tu Chat ID del bot @userinfobot"
                  />
                </Grid>
              )}

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Email
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.emailEnabled}
                      onChange={(e) => setNotificationSettings({
                        ...notificationSettings,
                        emailEnabled: e.target.checked
                      })}
                    />
                  }
                  label="Habilitar notificaciones por email"
                />
              </Grid>

              {notificationSettings.emailEnabled && (
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Dirección de Email"
                    type="email"
                    value={notificationSettings.emailAddress}
                    onChange={(e) => setNotificationSettings({
                      ...notificationSettings,
                      emailAddress: e.target.value
                    })}
                  />
                </Grid>
              )}

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Tipos de Alertas
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.alertTypes.trades}
                      onChange={(e) => setNotificationSettings({
                        ...notificationSettings,
                        alertTypes: {
                          ...notificationSettings.alertTypes,
                          trades: e.target.checked
                        }
                      })}
                    />
                  }
                  label="Ejecución de trades"
                />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.alertTypes.errors}
                      onChange={(e) => setNotificationSettings({
                        ...notificationSettings,
                        alertTypes: {
                          ...notificationSettings.alertTypes,
                          errors: e.target.checked
                        }
                      })}
                    />
                  }
                  label="Errores y fallos"
                />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.alertTypes.dailyReport}
                      onChange={(e) => setNotificationSettings({
                        ...notificationSettings,
                        alertTypes: {
                          ...notificationSettings.alertTypes,
                          dailyReport: e.target.checked
                        }
                      })}
                    />
                  }
                  label="Reporte diario"
                />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.alertTypes.riskAlerts}
                      onChange={(e) => setNotificationSettings({
                        ...notificationSettings,
                        alertTypes: {
                          ...notificationSettings.alertTypes,
                          riskAlerts: e.target.checked
                        }
                      })}
                    />
                  }
                  label="Alertas de riesgo"
                />
              </Grid>

              <Grid item xs={12}>
                <Box display="flex" justifyContent="flex-end">
                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={() => console.log('Save notification settings')}
                  >
                    Guardar Configuración de Notificaciones
                  </Button>
                </Box>
              </Grid>
            </Grid>
          )}

          {activeTab === 'exchanges' && (
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">
                  Credenciales de Exchange
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setAddExchangeDialog(true)}
                >
                  Agregar Exchange
                </Button>
              </Box>

              <List>
                {exchanges?.map((exchange) => (
                  <ListItem key={exchange.id} divider>
                    <ListItemText
                      primary={exchange.name}
                      secondary={
                        <Box display="flex" gap={1} mt={0.5}>
                          <Chip 
                            label={exchange.exchange.toUpperCase()} 
                            size="small" 
                          />
                          {exchange.testnet && (
                            <Chip 
                              label="TESTNET" 
                              size="small" 
                              color="warning"
                            />
                          )}
                          <Chip 
                            label={exchange.active ? 'Activo' : 'Inactivo'} 
                            size="small"
                            color={exchange.active ? 'success' : 'default'}
                          />
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" aria-label="delete">
                        <Delete />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>

              {exchanges?.length === 0 && (
                <Alert severity="info">
                  No hay exchanges configurados. Agrega uno para comenzar a operar.
                </Alert>
              )}
            </Box>
          )}
        </Box>
      </Paper>

      {/* Add Exchange Dialog */}
      <Dialog open={addExchangeDialog} onClose={() => setAddExchangeDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Agregar Exchange</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Exchange</InputLabel>
                <Select
                  value={newExchange.exchange}
                  onChange={(e) => setNewExchange({ ...newExchange, exchange: e.target.value })}
                  label="Exchange"
                >
                  <MenuItem value="binance">Binance</MenuItem>
                  <MenuItem value="coinbase">Coinbase</MenuItem>
                  <MenuItem value="kraken">Kraken</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nombre de la conexión"
                value={newExchange.name}
                onChange={(e) => setNewExchange({ ...newExchange, name: e.target.value })}
                helperText="Ej: Binance Principal, Binance Test"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="API Key"
                value={newExchange.apiKey}
                onChange={(e) => setNewExchange({ ...newExchange, apiKey: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="API Secret"
                type="password"
                value={newExchange.apiSecret}
                onChange={(e) => setNewExchange({ ...newExchange, apiSecret: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={newExchange.testnet}
                    onChange={(e) => setNewExchange({ ...newExchange, testnet: e.target.checked })}
                  />
                }
                label="Usar Testnet (recomendado para pruebas)"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddExchangeDialog(false)}>Cancelar</Button>
          <Button onClick={handleAddExchange} variant="contained">
            Agregar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings;