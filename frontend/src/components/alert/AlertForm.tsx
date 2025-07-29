import React, { useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
} from 'antd';
import { useForm, Controller } from 'react-hook-form';
import { useAlertMutations } from '../../hooks/use-alert';
import type { Alert, CreateAlert } from '../../types/alert.types';

const { TextArea } = Input;

interface AlertFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Alert | null;
}

export const AlertForm: React.FC<AlertFormProps> = ({
  open,
  onClose,
  onSuccess,
  initialData,
}) => {
  const [form] = Form.useForm();
  const { create, update, isCreating, isUpdating } = useAlertMutations();
  const isEdit = !!initialData;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateAlert>({
    defaultValues: {
      userId: '',
      strategyId: '',
      type: '',
      severity: '',
      title: '',
      message: '',
      data: {},
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        userId: initialData.userId,
        strategyId: initialData.strategyId || '',
        type: initialData.type,
        severity: initialData.severity,
        title: initialData.title,
        message: initialData.message,
        data: initialData.data || {},
      });
    }
  }, [initialData, reset]);

  const onSubmit = async (data: CreateAlert) => {
    try {
      if (isEdit && initialData) {
        await update({ id: initialData.id, data });
      } else {
        await create(data);
      }
      onSuccess();
      reset();
    } catch {
      // Error handled by mutation
    }
  };

  const handleCancel = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      title={isEdit ? 'Edit Alert' : 'New Alert'}
      open={open}
      onCancel={handleCancel}
      onOk={handleSubmit(onSubmit)}
      confirmLoading={isCreating || isUpdating}
      width={720}
      okText={isEdit ? 'Update' : 'Create'}
    >
      <Form layout="vertical" form={form} style={{ marginTop: 24 }}>
        <Form.Item label="Userid" required>
          <Controller
            name="userId"
            control={control}
            rules={{ required: 'Userid is required' }}
            render={({ field }) => (
              <Input {...field} placeholder="Enter userId" />
            )}
          />
          {errors.userId && (
            <span style={{ color: 'red', fontSize: 12 }}>{errors.userId?.message}</span>
          )}
        </Form.Item>
        <Form.Item label="Strategyid">
          <Controller
            name="strategyId"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="Enter strategyId" />
            )}
          />
          {errors.strategyId && (
            <span style={{ color: 'red', fontSize: 12 }}>{errors.strategyId?.message}</span>
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
            <span style={{ color: 'red', fontSize: 12 }}>{errors.type?.message}</span>
          )}
        </Form.Item>
        <Form.Item label="Severity" required>
          <Controller
            name="severity"
            control={control}
            rules={{ required: 'Severity is required' }}
            render={({ field }) => (
              <Input {...field} placeholder="Enter severity" />
            )}
          />
          {errors.severity && (
            <span style={{ color: 'red', fontSize: 12 }}>{errors.severity?.message}</span>
          )}
        </Form.Item>
        <Form.Item label="Title" required>
          <Controller
            name="title"
            control={control}
            rules={{ required: 'Title is required' }}
            render={({ field }) => (
              <Input {...field} placeholder="Enter title" />
            )}
          />
          {errors.title && (
            <span style={{ color: 'red', fontSize: 12 }}>{errors.title?.message}</span>
          )}
        </Form.Item>
        <Form.Item label="Message" required>
          <Controller
            name="message"
            control={control}
            rules={{ required: 'Message is required' }}
            render={({ field }) => (
              <Input {...field} placeholder="Enter message" />
            )}
          />
          {errors.message && (
            <span style={{ color: 'red', fontSize: 12 }}>{errors.message?.message}</span>
          )}
        </Form.Item>
        <Form.Item label="Data">
          <Controller
            name="data"
            control={control}
            render={({ field }) => (
              <TextArea 
                {...field} 
                value={typeof field.value === 'string' ? field.value : JSON.stringify(field.value || {})}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    field.onChange(parsed);
                  } catch {
                    field.onChange(e.target.value);
                  }
                }}
                rows={4} 
                placeholder="Enter JSON data" 
              />
            )}
          />
          {errors.data && (
            <span style={{ color: 'red', fontSize: 12 }}>
              {typeof errors.data.message === 'string' ? errors.data.message : 'Invalid data format'}
            </span>
          )}
        </Form.Item>
      </Form>
    </Modal>
  );
};