import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  TableSortLabel,
  TablePagination,
  Alert,
  Tooltip,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Close,
  Edit,
  MoreVert,
  TrendingUp,
  TrendingDown,
  Info
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tradingService, Position } from '../../services/tradingService';
import { formatCurrency, formatPercentage, formatDate } from '../../utils/formatters';

type OrderBy = 'symbol' | 'pnl' | 'pnlPercent' | 'openedAt' | 'currentValue';
type Order = 'asc' | 'desc';

interface ModifySLTPDialogProps {
  open: boolean;
  position: Position | null;
  onClose: () => void;
  onConfirm: (positionId: string, stopLoss: number, takeProfit: number) => void;
}

const ModifySLTPDialog: React.FC<ModifySLTPDialogProps> = ({ open, position, onClose, onConfirm }) => {
  const [stopLoss, setStopLoss] = useState(position?.stopLoss || 0);
  const [takeProfit, setTakeProfit] = useState(position?.takeProfit || 0);

  React.useEffect(() => {
    if (position) {
      setStopLoss(position.stopLoss || 0);
      setTakeProfit(position.takeProfit || 0);
    }
  }, [position]);

  const handleConfirm = () => {
    if (position) {
      onConfirm(position.id, stopLoss, takeProfit);
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Modificar Stop Loss / Take Profit</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            {position?.symbol} - {position?.side}
          </Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Precio actual: {formatCurrency(position?.currentPrice || 0)}
          </Typography>
          <Box mt={3}>
            <TextField
              fullWidth
              label="Stop Loss"
              type="number"
              value={stopLoss}
              onChange={(e) => setStopLoss(parseFloat(e.target.value))}
              margin="normal"
              helperText={`Pérdida estimada: ${formatCurrency((position?.entryPrice || 0) - stopLoss)}`}
            />
            <TextField
              fullWidth
              label="Take Profit"
              type="number"
              value={takeProfit}
              onChange={(e) => setTakeProfit(parseFloat(e.target.value))}
              margin="normal"
              helperText={`Ganancia estimada: ${formatCurrency(takeProfit - (position?.entryPrice || 0))}`}
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleConfirm} variant="contained">
          Confirmar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const Positions: React.FC = () => {
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<OrderBy>('openedAt');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [modifyDialogOpen, setModifyDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuPosition, setMenuPosition] = useState<Position | null>(null);

  const queryClient = useQueryClient();

  const { data: positions, isLoading, error } = useQuery({
    queryKey: ['positions', 'open'],
    queryFn: () => tradingService.getPositions('open'),
    refetchInterval: 5000,
  });

  const closePositionMutation = useMutation({
    mutationFn: (positionId: string) => tradingService.closePosition(positionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      queryClient.invalidateQueries({ queryKey: ['trading-dashboard'] });
    },
  });

  const updateSLTPMutation = useMutation({
    mutationFn: ({ positionId, stopLoss, takeProfit }: { positionId: string; stopLoss: number; takeProfit: number }) =>
      tradingService.updatePositionSLTP(positionId, stopLoss, takeProfit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      setModifyDialogOpen(false);
    },
  });

  const handleRequestSort = (property: OrderBy) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, position: Position) => {
    setAnchorEl(event.currentTarget);
    setMenuPosition(position);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuPosition(null);
  };

  const handleClosePosition = async (position: Position) => {
    if (window.confirm(`¿Cerrar posición ${position.symbol}?`)) {
      await closePositionMutation.mutateAsync(position.id);
    }
    handleMenuClose();
  };

  const handleModifySLTP = (position: Position) => {
    setSelectedPosition(position);
    setModifyDialogOpen(true);
    handleMenuClose();
  };

  const sortedPositions = useMemo(() => {
    if (!positions) return [];
    
    return [...positions].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (orderBy) {
        case 'symbol':
          aValue = a.symbol;
          bValue = b.symbol;
          break;
        case 'pnl':
          aValue = a.unrealizedPnl;
          bValue = b.unrealizedPnl;
          break;
        case 'pnlPercent':
          aValue = a.unrealizedPnl / a.positionValue;
          bValue = b.unrealizedPnl / b.positionValue;
          break;
        case 'openedAt':
          aValue = new Date(a.openedAt).getTime();
          bValue = new Date(b.openedAt).getTime();
          break;
        case 'currentValue':
          aValue = a.positionValue;
          bValue = b.positionValue;
          break;
        default:
          return 0;
      }

      if (order === 'asc') {
        return aValue < bValue ? -1 : 1;
      } else {
        return aValue > bValue ? -1 : 1;
      }
    });
  }, [positions, order, orderBy]);

  const paginatedPositions = sortedPositions.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Error al cargar las posiciones
      </Alert>
    );
  }

  const totalPnL = positions?.reduce((sum, pos) => sum + pos.unrealizedPnl, 0) || 0;
  const totalValue = positions?.reduce((sum, pos) => sum + pos.positionValue, 0) || 0;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Posiciones Abiertas
        </Typography>
        <Box>
          <Typography variant="h6" component="span" sx={{ mr: 3 }}>
            Total: {positions?.length || 0} posiciones
          </Typography>
          <Typography 
            variant="h6" 
            component="span"
            color={totalPnL > 0 ? 'success.main' : totalPnL < 0 ? 'error.main' : 'text.secondary'}
          >
            P&L: {formatCurrency(totalPnL)} ({formatPercentage(totalPnL / totalValue)})
          </Typography>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'symbol'}
                  direction={orderBy === 'symbol' ? order : 'asc'}
                  onClick={() => handleRequestSort('symbol')}
                >
                  Símbolo
                </TableSortLabel>
              </TableCell>
              <TableCell>Lado</TableCell>
              <TableCell align="right">Cantidad</TableCell>
              <TableCell align="right">Precio Entrada</TableCell>
              <TableCell align="right">Precio Actual</TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === 'pnl'}
                  direction={orderBy === 'pnl' ? order : 'asc'}
                  onClick={() => handleRequestSort('pnl')}
                >
                  P&L ($)
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === 'pnlPercent'}
                  direction={orderBy === 'pnlPercent' ? order : 'asc'}
                  onClick={() => handleRequestSort('pnlPercent')}
                >
                  P&L (%)
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">SL</TableCell>
              <TableCell align="right">TP</TableCell>
              <TableCell>Estrategia</TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'openedAt'}
                  direction={orderBy === 'openedAt' ? order : 'asc'}
                  onClick={() => handleRequestSort('openedAt')}
                >
                  Duración
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedPositions.map((position) => {
              const pnlPercent = (position.unrealizedPnl / position.positionValue) * 100;
              const duration = Date.now() - new Date(position.openedAt).getTime();
              const hours = Math.floor(duration / (1000 * 60 * 60));
              const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

              return (
                <TableRow key={position.id} hover>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      {position.side === 'buy' ? 
                        <TrendingUp color="success" sx={{ mr: 1 }} /> : 
                        <TrendingDown color="error" sx={{ mr: 1 }} />
                      }
                      <Typography fontWeight="medium">{position.symbol}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={position.side.toUpperCase()} 
                      size="small"
                      color={position.side === 'buy' ? 'success' : 'error'}
                    />
                  </TableCell>
                  <TableCell align="right">{position.quantity}</TableCell>
                  <TableCell align="right">{formatCurrency(position.entryPrice)}</TableCell>
                  <TableCell align="right">{formatCurrency(position.currentPrice)}</TableCell>
                  <TableCell align="right">
                    <Typography
                      color={position.unrealizedPnl > 0 ? 'success.main' : 
                             position.unrealizedPnl < 0 ? 'error.main' : 'text.secondary'}
                      fontWeight="medium"
                    >
                      {formatCurrency(position.unrealizedPnl)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      color={pnlPercent > 0 ? 'success.main' : 
                             pnlPercent < 0 ? 'error.main' : 'text.secondary'}
                      fontWeight="medium"
                    >
                      {formatPercentage(pnlPercent)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {position.stopLoss ? formatCurrency(position.stopLoss) : '-'}
                  </TableCell>
                  <TableCell align="right">
                    {position.takeProfit ? formatCurrency(position.takeProfit) : '-'}
                  </TableCell>
                  <TableCell>
                    <Chip label={position.strategyName || 'Manual'} size="small" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {hours}h {minutes}m
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, position)}
                    >
                      <MoreVert />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={sortedPositions.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => menuPosition && handleModifySLTP(menuPosition)}>
          <Edit sx={{ mr: 1 }} /> Modificar SL/TP
        </MenuItem>
        <MenuItem onClick={() => menuPosition && handleClosePosition(menuPosition)}>
          <Close sx={{ mr: 1 }} /> Cerrar Posición
        </MenuItem>
      </Menu>

      <ModifySLTPDialog
        open={modifyDialogOpen}
        position={selectedPosition}
        onClose={() => setModifyDialogOpen(false)}
        onConfirm={(positionId, stopLoss, takeProfit) => {
          updateSLTPMutation.mutate({ positionId, stopLoss, takeProfit });
        }}
      />
    </Box>
  );
};

export default Positions;