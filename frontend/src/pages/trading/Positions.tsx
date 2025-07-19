import React, { useState } from 'react';
import {
  Table,
  Card,
  Typography,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  InputNumber,
  Alert,
  Dropdown,
  Statistic,
  Row,
  Col,
  message
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import {
  CloseOutlined,
  EditOutlined,
  MoreOutlined,
  RiseOutlined,
  FallOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tradingService, type Position } from '../../services/tradingService';
import { formatCurrency, formatPercentage } from '../../utils/formatters';

const { Title, Text } = Typography;

interface ModifySLTPModalProps {
  open: boolean;
  position: Position | null;
  onClose: () => void;
  onConfirm: (positionId: string, stopLoss: number, takeProfit: number) => void;
}

const ModifySLTPModal: React.FC<ModifySLTPModalProps> = ({ open, position, onClose, onConfirm }) => {
  const [form] = Form.useForm();

  React.useEffect(() => {
    if (position) {
      form.setFieldsValue({
        stopLoss: position.stopLoss || 0,
        takeProfit: position.takeProfit || 0,
      });
    }
  }, [position, form]);

  const handleConfirm = () => {
    form.validateFields().then((values) => {
      if (position) {
        onConfirm(position.id, values.stopLoss, values.takeProfit);
        form.resetFields();
      }
    });
  };

  const calculatePnL = (price: number) => {
    if (!position) return 0;
    const diff = position.side === 'buy' ? price - position.entryPrice : position.entryPrice - price;
    return diff * position.quantity;
  };

  return (
    <Modal
      title="Modificar Stop Loss / Take Profit"
      open={open}
      onOk={handleConfirm}
      onCancel={onClose}
      width={500}
    >
      <div style={{ marginBottom: 16 }}>
        <Title level={5}>{position?.symbol} - {position?.side?.toUpperCase()}</Title>
        <Text type="secondary">
          Precio actual: {formatCurrency(position?.currentPrice || 0)}
        </Text>
      </div>
      
      <Form form={form} layout="vertical">
        <Form.Item
          name="stopLoss"
          label="Stop Loss"
          help={
            <Text type={position && calculatePnL(form.getFieldValue('stopLoss')) < 0 ? 'danger' : 'secondary'}>
              Pérdida estimada: {formatCurrency(calculatePnL(form.getFieldValue('stopLoss') || 0))}
            </Text>
          }
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            step={0.01}
            precision={2}
            placeholder="0.00"
          />
        </Form.Item>
        
        <Form.Item
          name="takeProfit"
          label="Take Profit"
          help={
            <Text type={position && calculatePnL(form.getFieldValue('takeProfit')) > 0 ? 'success' : 'secondary'}>
              Ganancia estimada: {formatCurrency(calculatePnL(form.getFieldValue('takeProfit') || 0))}
            </Text>
          }
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            step={0.01}
            precision={2}
            placeholder="0.00"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export const Positions: React.FC = () => {
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [modifyModalOpen, setModifyModalOpen] = useState(false);
  
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
      message.success('Posición cerrada exitosamente');
    },
    onError: () => {
      message.error('Error al cerrar la posición');
    },
  });

  const updateSLTPMutation = useMutation({
    mutationFn: ({ positionId, stopLoss, takeProfit }: { positionId: string; stopLoss: number; takeProfit: number }) =>
      tradingService.updatePositionSLTP(positionId, stopLoss, takeProfit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      setModifyModalOpen(false);
      message.success('Stop Loss/Take Profit actualizado');
    },
    onError: () => {
      message.error('Error al actualizar Stop Loss/Take Profit');
    },
  });

  const handleClosePosition = async (position: Position) => {
    Modal.confirm({
      title: '¿Cerrar posición?',
      content: `¿Está seguro de cerrar la posición ${position.symbol}?`,
      okText: 'Sí, cerrar',
      cancelText: 'Cancelar',
      onOk: () => closePositionMutation.mutate(position.id),
    });
  };

  const handleModifySLTP = (position: Position) => {
    setSelectedPosition(position);
    setModifyModalOpen(true);
  };

  const getActionItems = (position: Position): MenuProps['items'] => [
    {
      key: 'modify',
      label: 'Modificar SL/TP',
      icon: <EditOutlined />,
      onClick: () => handleModifySLTP(position),
    },
    {
      key: 'close',
      label: 'Cerrar Posición',
      icon: <CloseOutlined />,
      danger: true,
      onClick: () => handleClosePosition(position),
    },
  ];

  const columns: ColumnsType<Position> = [
    {
      title: 'Símbolo',
      dataIndex: 'symbol',
      key: 'symbol',
      sorter: (a, b) => a.symbol.localeCompare(b.symbol),
      render: (symbol, record) => (
        <Space>
          {record.side === 'buy' ? 
            <RiseOutlined style={{ color: '#52c41a' }} /> : 
            <FallOutlined style={{ color: '#ff4d4f' }} />
          }
          <Text strong>{symbol}</Text>
        </Space>
      ),
    },
    {
      title: 'Lado',
      dataIndex: 'side',
      key: 'side',
      render: (side) => (
        <Tag color={side === 'buy' ? 'success' : 'error'}>
          {side.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Cantidad',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'right',
    },
    {
      title: 'Precio Entrada',
      dataIndex: 'entryPrice',
      key: 'entryPrice',
      align: 'right',
      render: (price) => formatCurrency(price),
    },
    {
      title: 'Precio Actual',
      dataIndex: 'currentPrice',
      key: 'currentPrice',
      align: 'right',
      render: (price) => formatCurrency(price),
    },
    {
      title: 'P&L ($)',
      dataIndex: 'unrealizedPnl',
      key: 'unrealizedPnl',
      align: 'right',
      sorter: (a, b) => a.unrealizedPnl - b.unrealizedPnl,
      render: (pnl) => (
        <Text style={{ color: pnl > 0 ? '#52c41a' : pnl < 0 ? '#ff4d4f' : '#8c8c8c' }} strong>
          {formatCurrency(pnl)}
        </Text>
      ),
    },
    {
      title: 'P&L (%)',
      key: 'pnlPercent',
      align: 'right',
      sorter: (a, b) => {
        const aPercent = (a.unrealizedPnl / a.positionValue) * 100;
        const bPercent = (b.unrealizedPnl / b.positionValue) * 100;
        return aPercent - bPercent;
      },
      render: (_, record) => {
        const pnlPercent = (record.unrealizedPnl / record.positionValue) * 100;
        return (
          <Text style={{ color: pnlPercent > 0 ? '#52c41a' : pnlPercent < 0 ? '#ff4d4f' : '#8c8c8c' }} strong>
            {formatPercentage(pnlPercent)}
          </Text>
        );
      },
    },
    {
      title: 'SL',
      dataIndex: 'stopLoss',
      key: 'stopLoss',
      align: 'right',
      render: (sl) => sl ? formatCurrency(sl) : '-',
    },
    {
      title: 'TP',
      dataIndex: 'takeProfit',
      key: 'takeProfit',
      align: 'right',
      render: (tp) => tp ? formatCurrency(tp) : '-',
    },
    {
      title: 'Estrategia',
      dataIndex: 'strategyName',
      key: 'strategyName',
      render: (strategy) => <Tag>{strategy || 'Manual'}</Tag>,
    },
    {
      title: 'Duración',
      dataIndex: 'openedAt',
      key: 'openedAt',
      sorter: (a, b) => new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime(),
      render: (date) => {
        const duration = Date.now() - new Date(date).getTime();
        const hours = Math.floor(duration / (1000 * 60 * 60));
        const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
        return <Text type="secondary">{hours}h {minutes}m</Text>;
      },
    },
    {
      title: 'Acciones',
      key: 'actions',
      align: 'center',
      render: (_, record) => (
        <Dropdown
          menu={{ items: getActionItems(record) }}
          trigger={['click']}
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  if (error) {
    return (
      <Alert
        type="error"
        message="Error al cargar las posiciones"
        style={{ margin: 16 }}
      />
    );
  }

  const totalPnL = positions?.reduce((sum, pos) => sum + pos.unrealizedPnl, 0) || 0;
  const totalValue = positions?.reduce((sum, pos) => sum + pos.positionValue, 0) || 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2}>Posiciones Abiertas</Title>
        <Row gutter={24}>
          <Col>
            <Statistic
              title="Total Posiciones"
              value={positions?.length || 0}
            />
          </Col>
          <Col>
            <Statistic
              title="P&L Total"
              value={totalPnL}
              formatter={(value) => formatCurrency(Number(value))}
              valueStyle={{ color: totalPnL > 0 ? '#52c41a' : totalPnL < 0 ? '#ff4d4f' : '#8c8c8c' }}
              suffix={
                <Text type="secondary" style={{ fontSize: 14 }}>
                  ({formatPercentage(totalPnL / totalValue)})
                </Text>
              }
            />
          </Col>
        </Row>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={positions}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} posiciones`,
          }}
        />
      </Card>

      <ModifySLTPModal
        open={modifyModalOpen}
        position={selectedPosition}
        onClose={() => setModifyModalOpen(false)}
        onConfirm={(positionId, stopLoss, takeProfit) => {
          updateSLTPMutation.mutate({ positionId, stopLoss, takeProfit });
        }}
      />
    </div>
  );
};

export default Positions;