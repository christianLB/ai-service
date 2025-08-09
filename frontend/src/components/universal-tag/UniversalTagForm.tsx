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
import { useUniversalTagMutations } from '../../hooks/use-universal-tag';
import type { UniversalTag, CreateUniversalTag } from '../../types/universal-tag.types';

const { TextArea } = Input;

interface UniversalTagFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: UniversalTag | null;
}

export const UniversalTagForm: React.FC<UniversalTagFormProps> = ({
  open,
  onClose,
  onSuccess,
  initialData,
}) => {
  const [form] = Form.useForm();
  const { create, update, isCreating, isUpdating } = useUniversalTagMutations();
  const isEdit = !!initialData;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUniversalTag>({
    defaultValues: {
      code: '',
      name: '',
      description: '',
      entityTypes: '',
      patterns: {},
      rules: {},
      confidence: 0,
      embeddingModel: '',
      path: '',
      level: 0,
      color: '',
      icon: '',
      isActive: false,
      isSystem: false,
      metadata: {},
      usageCount: 0,
      successRate: 0,
      lastUsed: undefined,
      parentId: '',
      entityTags: undefined,
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        ...initialData,
      } as any);
    }
  }, [initialData, reset]);

  const onSubmit = async (data: CreateUniversalTag) => {
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
      title={isEdit ? 'Edit Universaltag' : 'New Universaltag'}
      open={open}
      onCancel={handleCancel}
      onOk={handleSubmit(onSubmit)}
      confirmLoading={isCreating || isUpdating}
      width={720}
      okText={isEdit ? 'Update' : 'Create'}
    >
      <Form layout="vertical" form={form} style={{ marginTop: 24 }}>
        <Form.Item label="Code" required>
          <Controller
            name="code"
            control={control}
            rules={{ required: 'Code is required' }}
            render={({ field }) => (
              <Input {...field} placeholder="Enter code" />
                          )}
          />
          {errors.code && (
            <span style={{ color: 'red', fontSize: 12 }}>{errors.code.message}</span>
          )}
        </Form.Item>
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
        <Form.Item label="Description">
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="Enter description" />
                          )}
          />
          {errors.description && (
            <span style={{ color: 'red', fontSize: 12 }}>{errors.description.message}</span>
          )}
        </Form.Item>
        <Form.Item label="Entitytypes" required>
          <Controller
            name="entityTypes"
            control={control}
            rules={{ required: 'Entitytypes is required' }}
            render={({ field }) => (
              <Input {...field} placeholder="Enter entityTypes" />
                          )}
          />
          {errors.entityTypes && (
            <span style={{ color: 'red', fontSize: 12 }}>{errors.entityTypes.message}</span>
          )}
        </Form.Item>
        <Form.Item label="Patterns">
          <Controller
            name="patterns"
            control={control}
            render={({ field }) => (
              <TextArea {...field} rows={4} placeholder="Enter JSON data" />
            )}
          />
          {errors.patterns && (
            <span style={{ color: 'red', fontSize: 12 }}>{errors.patterns.message}</span>
          )}
        </Form.Item>
        <Form.Item label="Rules">
          <Controller
            name="rules"
            control={control}
            render={({ field }) => (
              <TextArea {...field} rows={4} placeholder="Enter JSON data" />
            )}
          />
          {errors.rules && (
            <span style={{ color: 'red', fontSize: 12 }}>{errors.rules.message}</span>
          )}
        </Form.Item>
        <Form.Item label="Confidence" required>
          <Controller
            name="confidence"
            control={control}
            rules={{ required: 'Confidence is required' }}
            render={({ field }) => (
              <InputNumber {...field} style={{ width: '100%' }} step={0.01} placeholder="Enter confidence" />
            )}
          />
          {errors.confidence && (
            <span style={{ color: 'red', fontSize: 12 }}>{errors.confidence.message}</span>
          )}
        </Form.Item>
        <Form.Item label="Embeddingmodel">
          <Controller
            name="embeddingModel"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="Enter embeddingModel" />
                          )}
          />
          {errors.embeddingModel && (
            <span style={{ color: 'red', fontSize: 12 }}>{errors.embeddingModel.message}</span>
          )}
        </Form.Item>
        <Form.Item label="Path" required>
          <Controller
            name="path"
            control={control}
            rules={{ required: 'Path is required' }}
            render={({ field }) => (
              <Input {...field} placeholder="Enter path" />
                          )}
          />
          {errors.path && (
            <span style={{ color: 'red', fontSize: 12 }}>{errors.path.message}</span>
          )}
        </Form.Item>
        <Form.Item label="Level" required>
          <Controller
            name="level"
            control={control}
            rules={{ required: 'Level is required' }}
            render={({ field }) => (
              <InputNumber {...field} style={{ width: '100%' }} placeholder="Enter level" />
            )}
          />
          {errors.level && (
            <span style={{ color: 'red', fontSize: 12 }}>{errors.level.message}</span>
          )}
        </Form.Item>
        <Form.Item label="Color">
          <Controller
            name="color"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="Enter color" />
                          )}
          />
          {errors.color && (
            <span style={{ color: 'red', fontSize: 12 }}>{errors.color.message}</span>
          )}
        </Form.Item>
        <Form.Item label="Icon">
          <Controller
            name="icon"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="Enter icon" />
                          )}
          />
          {errors.icon && (
            <span style={{ color: 'red', fontSize: 12 }}>{errors.icon.message}</span>
          )}
        </Form.Item>
        <Form.Item label="Isactive" required>
          <Controller
            name="isActive"
            control={control}
            rules={{ required: 'Isactive is required' }}
            render={({ field }) => (
              <Switch {...field} checked={field.value} />
            )}
          />
          {errors.isActive && (
            <span style={{ color: 'red', fontSize: 12 }}>{errors.isActive.message}</span>
          )}
        </Form.Item>
        <Form.Item label="Issystem" required>
          <Controller
            name="isSystem"
            control={control}
            rules={{ required: 'Issystem is required' }}
            render={({ field }) => (
              <Switch {...field} checked={field.value} />
            )}
          />
          {errors.isSystem && (
            <span style={{ color: 'red', fontSize: 12 }}>{errors.isSystem.message}</span>
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
        <Form.Item label="Usagecount" required>
          <Controller
            name="usageCount"
            control={control}
            rules={{ required: 'Usagecount is required' }}
            render={({ field }) => (
              <InputNumber {...field} style={{ width: '100%' }} placeholder="Enter usageCount" />
            )}
          />
          {errors.usageCount && (
            <span style={{ color: 'red', fontSize: 12 }}>{errors.usageCount.message}</span>
          )}
        </Form.Item>
        <Form.Item label="Successrate" required>
          <Controller
            name="successRate"
            control={control}
            rules={{ required: 'Successrate is required' }}
            render={({ field }) => (
              <InputNumber {...field} style={{ width: '100%' }} step={0.01} placeholder="Enter successRate" />
            )}
          />
          {errors.successRate && (
            <span style={{ color: 'red', fontSize: 12 }}>{errors.successRate.message}</span>
          )}
        </Form.Item>
        <Form.Item label="Lastused">
          <Controller
            name="lastUsed"
            control={control}
            render={({ field }) => (
              <DatePicker {...field} style={{ width: '100%' }} />
            )}
          />
          {errors.lastUsed && (
            <span style={{ color: 'red', fontSize: 12 }}>{errors.lastUsed.message}</span>
          )}
        </Form.Item>
        <Form.Item label="Parentid">
          <Controller
            name="parentId"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="Enter parentId" />
                          )}
          />
          {errors.parentId && (
            <span style={{ color: 'red', fontSize: 12 }}>{errors.parentId.message}</span>
          )}
        </Form.Item>
        <Form.Item label="Entitytags" required>
          <Controller
            name="entityTags"
            control={control}
            rules={{ required: 'Entitytags is required' }}
            render={({ field }) => (
              <Input {...field} placeholder="Enter entityTags" />
                          )}
          />
          {errors.entityTags && (
            <span style={{ color: 'red', fontSize: 12 }}>{errors.entityTags.message}</span>
          )}
        </Form.Item>
      </Form>
    </Modal>
  );
};