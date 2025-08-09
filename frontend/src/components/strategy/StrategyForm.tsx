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
import { useStrategyMutations } from '../../hooks/use-strategy';
import type { Strategy, CreateStrategy } from '../../types/strategy.types';

const { TextArea } = Input;

interface StrategyFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Strategy | null;
}

export const StrategyForm: React.FC<StrategyFormProps> = ({
  open,
  onClose,
  onSuccess,
  initialData,
}) => {
  const [form] = Form.useForm();
  const { create, update, isCreating, isUpdating } = useStrategyMutations();
  const isEdit = !!initialData;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateStrategy>({
    defaultValues: {
      name: '',
      type: '',
      status: '',
      parameters: {},
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        ...initialData,
      } as any);
    }
  }, [initialData, reset]);

  const onSubmit = async (data: CreateStrategy) => {
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
      title={isEdit ? 'Edit Strategy' : 'New Strategy'}
      open={open}
      onCancel={handleCancel}
      onOk={handleSubmit(onSubmit)}
      confirmLoading={isCreating || isUpdating}
      width={720}
      okText={isEdit ? 'Update' : 'Create'}
    >
      <Form layout="vertical" form={form} style={{ marginTop: 24 }}>
        <Form.Item label="Name" required>
          <Controller
            name="name"
            control={control}
            rules={{ required: 'Name is required' }}
            render={({ field }) => (
              <Input {...field} placeholder="Enter name" />
                          )}
          />
          {errors.name && (
            <span style={{ color: 'red', fontSize: 12 }}>{errors.name.message}</span>
          )}
        </Form.Item>
        <Form.Item label="Type" required>
          <Controller
            name="type"
            control={control}
            rules={{ required: 'Type is required' }}
            render={({ field }) => (
              <Input {...field} placeholder="Enter type" />
                          )}
          />
          {errors.type && (
            <span style={{ color: 'red', fontSize: 12 }}>{errors.type.message}</span>
          )}
        </Form.Item>
        <Form.Item label="Status" required>
          <Controller
            name="status"
            control={control}
            rules={{ required: 'Status is required' }}
            render={({ field }) => (
              <Input {...field} placeholder="Enter status" />
                          )}
          />
          {errors.status && (
            <span style={{ color: 'red', fontSize: 12 }}>{errors.status.message}</span>
          )}
        </Form.Item>
        <Form.Item label="Parameters" required>
          <Controller
            name="parameters"
            control={control}
            rules={{ required: 'Parameters is required' }}
            render={({ field }) => (
              <TextArea {...field} rows={4} placeholder="Enter JSON data" />
            )}
          />
          {errors.parameters && (
            <span style={{ color: 'red', fontSize: 12 }}>{errors.parameters.message}</span>
          )}
        </Form.Item>
      </Form>
    </Modal>
  );
};