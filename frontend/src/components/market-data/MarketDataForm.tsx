import React, { useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Switch,
} from 'antd';
import { useForm, Controller } from 'react-hook-form';
import { useMarketDataMutations } from '../../hooks/use-market-data';
import type { MarketData, CreateMarketData } from '../../types/market-data.types';

const { TextArea } = Input;

interface MarketDataFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: MarketData | null;
}

export const MarketDataForm: React.FC<MarketDataFormProps> = ({
  open,
  onClose,
  onSuccess,
  initialData,
}) => {
  const [form] = Form.useForm();
  const { create, update, isCreating, isUpdating } = useMarketDataMutations();
  const isEdit = !!initialData;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateMarketData>({
    defaultValues: {
      exchangeId: '',
      tradingPairId: '',
      timestamp: undefined,
      open: 0,
      high: 0,
      low: 0,
      close: 0,
      volume: 0,
      quoteVolume: 0,
      trades: 0,
      timeframe: '',
      metadata: {},
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        ...initialData,
      } as any);
    }
  }, [initialData, reset]);

  const onSubmit = async (data: CreateMarketData) => {
    try {
      if (isEdit && initialData) {
        await update({ id: initialData.id, data });
      } else {
        await create(data);
      }
      onSuccess();
      reset();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleCancel = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      title={isEdit ? 'Edit Marketdata' : 'New Marketdata'}
      open={open}
      onCancel={handleCancel}
      onOk={handleSubmit(onSubmit)}
      confirmLoading={isCreating || isUpdating}
      width={720}
      okText={isEdit ? 'Update' : 'Create'}
    >
      <Form layout="vertical" form={form} style={{ marginTop: 24 }}>
        <Form.Item label="Exchangeid" required>
          <Controller
            name="exchangeId"
            control={control}
            rules={{ required: 'Exchangeid is required' }}
            render={({ field }) => (
              <Input {...field} placeholder="Enter exchangeId" />
                          )}
          />
          {errors.exchangeId && (
            <span style={{ color: 'red', fontSize: 12 }}>{errors.exchangeId.message}</span>
          )}
        </Form.Item>
        <Form.Item label="Tradingpairid" required>
          <Controller
            name="tradingPairId"
            control={control}
            rules={{ required: 'Tradingpairid is required' }}
            render={({ field }) => (
              <Input {...field} placeholder="Enter tradingPairId" />
                          )}
          />
          {errors.tradingPairId && (
            <span style={{ color: 'red', fontSize: 12 }}>{errors.tradingPairId.message}</span>
          )}
        </Form.Item>
        <Form.Item label="Timestamp" required>
          <Controller
            name="timestamp"
            control={control}
            rules={{ required: 'Timestamp is required' }}
            render={({ field }) => (
              <DatePicker {...field} style={{ width: '100%' }} />
            )}
          />
          {errors.timestamp && (
            <span style={{ color: 'red', fontSize: 12 }}>{errors.timestamp.message}</span>
          )}
        </Form.Item>
        <Form.Item label="Open" required>
          <Controller
            name="open"
            control={control}
            rules={{ required: 'Open is required' }}
            render={({ field }) => (
              <InputNumber {...field} style={{ width: '100%' }} step={0.01} placeholder="Enter open" />
            )}
          />
          {errors.open && (
            <span style={{ color: 'red', fontSize: 12 }}>{errors.open.message}</span>
          )}
        </Form.Item>
        <Form.Item label="High" required>
          <Controller
            name="high"
            control={control}
            rules={{ required: 'High is required' }}
            render={({ field }) => (
              <InputNumber {...field} style={{ width: '100%' }} step={0.01} placeholder="Enter high" />
            )}
          />
          {errors.high && (
            <span style={{ color: 'red', fontSize: 12 }}>{errors.high.message}</span>
          )}
        </Form.Item>
        <Form.Item label="Low" required>
          <Controller
            name="low"
            control={control}
            rules={{ required: 'Low is required' }}
            render={({ field }) => (
              <InputNumber {...field} style={{ width: '100%' }} step={0.01} placeholder="Enter low" />
            )}
          />
          {errors.low && (
            <span style={{ color: 'red', fontSize: 12 }}>{errors.low.message}</span>
          )}
        </Form.Item>
        <Form.Item label="Close" required>
          <Controller
            name="close"
            control={control}
            rules={{ required: 'Close is required' }}
            render={({ field }) => (
              <InputNumber {...field} style={{ width: '100%' }} step={0.01} placeholder="Enter close" />
            )}
          />
          {errors.close && (
            <span style={{ color: 'red', fontSize: 12 }}>{errors.close.message}</span>
          )}
        </Form.Item>
        <Form.Item label="Volume" required>
          <Controller
            name="volume"
            control={control}
            rules={{ required: 'Volume is required' }}
            render={({ field }) => (
              <InputNumber {...field} style={{ width: '100%' }} step={0.01} placeholder="Enter volume" />
            )}
          />
          {errors.volume && (
            <span style={{ color: 'red', fontSize: 12 }}>{errors.volume.message}</span>
          )}
        </Form.Item>
        <Form.Item label="Quotevolume">
          <Controller
            name="quoteVolume"
            control={control}
            render={({ field }) => (
              <InputNumber {...field} style={{ width: '100%' }} step={0.01} placeholder="Enter quoteVolume" />
            )}
          />
          {errors.quoteVolume && (
            <span style={{ color: 'red', fontSize: 12 }}>{errors.quoteVolume.message}</span>
          )}
        </Form.Item>
        <Form.Item label="Trades">
          <Controller
            name="trades"
            control={control}
            render={({ field }) => (
              <InputNumber {...field} style={{ width: '100%' }} placeholder="Enter trades" />
            )}
          />
          {errors.trades && (
            <span style={{ color: 'red', fontSize: 12 }}>{errors.trades.message}</span>
          )}
        </Form.Item>
        <Form.Item label="Timeframe" required>
          <Controller
            name="timeframe"
            control={control}
            rules={{ required: 'Timeframe is required' }}
            render={({ field }) => (
              <Input {...field} placeholder="Enter timeframe" />
                          )}
          />
          {errors.timeframe && (
            <span style={{ color: 'red', fontSize: 12 }}>{errors.timeframe.message}</span>
          )}
        </Form.Item>
        <Form.Item label="Metadata">
          <Controller
            name="metadata"
            control={control}
            render={({ field }) => (
              <TextArea {...field} rows={4} placeholder="Enter JSON data" />
            )}
          />
          {errors.metadata && (
            <span style={{ color: 'red', fontSize: 12 }}>{errors.metadata.message}</span>
          )}
        </Form.Item>
      </Form>
    </Modal>
  );
};