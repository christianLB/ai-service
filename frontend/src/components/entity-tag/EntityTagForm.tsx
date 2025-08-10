import React, { useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  DatePicker,
  InputNumber,
  Switch,
} from 'antd';
import { useForm, Controller } from 'react-hook-form';
import { useEntityTagMutations } from '../../hooks/use-entity-tag';
import type { EntityTag, CreateEntityTag } from '../../types/entity-tag.types';

const { TextArea } = Input;

interface EntityTagFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: EntityTag | null;
}

export const EntityTagForm: React.FC<EntityTagFormProps> = ({
  open,
  onClose,
  onSuccess,
  initialData,
}) => {
  const [form] = Form.useForm();
  const { create, update, isCreating, isUpdating } = useEntityTagMutations();
  const isEdit = !!initialData;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateEntityTag>({
    defaultValues: {
      entityType: '',
      entityId: '',
      method: '',
      confidence: 0,
      appliedBy: '',
      aiProvider: '',
      aiModel: '',
      aiResponse: {},
      aiReasoning: '',
      isVerified: false,
      verifiedBy: '',
      verifiedAt: undefined,
      feedback: '',
      isCorrect: false,
      sourceEntityType: '',
      sourceEntityId: '',
      relationshipType: '',
      tagId: '',
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        ...initialData,
      } as any);
    }
  }, [initialData, reset]);

  const onSubmit = async (data: CreateEntityTag) => {
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
      title={isEdit ? 'Edit Entitytag' : 'New Entitytag'}
      open={open}
      onCancel={handleCancel}
      onOk={handleSubmit(onSubmit)}
      confirmLoading={isCreating || isUpdating}
      width={720}
      okText={isEdit ? 'Update' : 'Create'}
    >
      <Form layout="vertical" form={form} style={{ marginTop: 24 }}>
        <Form.Item label="Entitytype" required>
          <Controller
            name="entityType"
            control={control}
            rules={{ required: 'Entitytype is required' }}
            render={({ field }) => (
              <Input {...field} placeholder="Enter entityType" />
                          )}
          />
          {errors.entityType && (
            <span style={{ color: 'red', fontSize: 12 }}>{String((errors.entityType as any).message ?? '')}</span>
          )}
        </Form.Item>
        <Form.Item label="Entityid" required>
          <Controller
            name="entityId"
            control={control}
            rules={{ required: 'Entityid is required' }}
            render={({ field }) => (
              <Input {...field} placeholder="Enter entityId" />
                          )}
          />
          {errors.entityId && (
            <span style={{ color: 'red', fontSize: 12 }}>{String((errors.entityId as any).message ?? '')}</span>
          )}
        </Form.Item>
        <Form.Item label="Method" required>
          <Controller
            name="method"
            control={control}
            rules={{ required: 'Method is required' }}
            render={({ field }) => (
              <Input {...field} placeholder="Enter method" />
                          )}
          />
          {errors.method && (
            <span style={{ color: 'red', fontSize: 12 }}>{String((errors.method as any).message ?? '')}</span>
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
            <span style={{ color: 'red', fontSize: 12 }}>{String((errors.confidence as any).message ?? '')}</span>
          )}
        </Form.Item>
        <Form.Item label="Appliedby">
          <Controller
            name="appliedBy"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="Enter appliedBy" />
                          )}
          />
          {errors.appliedBy && (
            <span style={{ color: 'red', fontSize: 12 }}>{String((errors.appliedBy as any).message ?? '')}</span>
          )}
        </Form.Item>
        <Form.Item label="Aiprovider">
          <Controller
            name="aiProvider"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="Enter aiProvider" />
                          )}
          />
          {errors.aiProvider && (
            <span style={{ color: 'red', fontSize: 12 }}>{String((errors.aiProvider as any).message ?? '')}</span>
          )}
        </Form.Item>
        <Form.Item label="Aimodel">
          <Controller
            name="aiModel"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="Enter aiModel" />
                          )}
          />
          {errors.aiModel && (
            <span style={{ color: 'red', fontSize: 12 }}>{String((errors.aiModel as any).message ?? '')}</span>
          )}
        </Form.Item>
        <Form.Item label="Airesponse">
          <Controller
            name="aiResponse"
            control={control}
            render={({ field }) => (
              <TextArea {...field} rows={4} placeholder="Enter JSON data" />
            )}
          />
          {errors.aiResponse && (
            <span style={{ color: 'red', fontSize: 12 }}>{String((errors.aiResponse as any).message ?? '')}</span>
          )}
        </Form.Item>
        <Form.Item label="Aireasoning">
          <Controller
            name="aiReasoning"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="Enter aiReasoning" />
                          )}
          />
          {errors.aiReasoning && (
            <span style={{ color: 'red', fontSize: 12 }}>{String((errors.aiReasoning as any).message ?? '')}</span>
          )}
        </Form.Item>
        <Form.Item label="Isverified" required>
          <Controller
            name="isVerified"
            control={control}
            rules={{ required: 'Isverified is required' }}
            render={({ field }) => (
              <Switch {...field} checked={field.value} />
            )}
          />
          {errors.isVerified && (
            <span style={{ color: 'red', fontSize: 12 }}>{String((errors.isVerified as any).message ?? '')}</span>
          )}
        </Form.Item>
        <Form.Item label="Verifiedby">
          <Controller
            name="verifiedBy"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="Enter verifiedBy" />
                          )}
          />
          {errors.verifiedBy && (
            <span style={{ color: 'red', fontSize: 12 }}>{String((errors.verifiedBy as any).message ?? '')}</span>
          )}
        </Form.Item>
        <Form.Item label="Verifiedat">
          <Controller
            name="verifiedAt"
            control={control}
            render={({ field }) => (
              <DatePicker {...field} style={{ width: '100%' }} />
            )}
          />
          {errors.verifiedAt && (
            <span style={{ color: 'red', fontSize: 12 }}>{String((errors.verifiedAt as any).message ?? '')}</span>
          )}
        </Form.Item>
        <Form.Item label="Feedback">
          <Controller
            name="feedback"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="Enter feedback" />
                          )}
          />
          {errors.feedback && (
            <span style={{ color: 'red', fontSize: 12 }}>{String((errors.feedback as any).message ?? '')}</span>
          )}
        </Form.Item>
        <Form.Item label="Iscorrect">
          <Controller
            name="isCorrect"
            control={control}
            render={({ field }) => (
              <Switch {...field} checked={field.value} />
            )}
          />
          {errors.isCorrect && (
            <span style={{ color: 'red', fontSize: 12 }}>{String((errors.isCorrect as any).message ?? '')}</span>
          )}
        </Form.Item>
        <Form.Item label="Sourceentitytype">
          <Controller
            name="sourceEntityType"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="Enter sourceEntityType" />
                          )}
          />
          {errors.sourceEntityType && (
            <span style={{ color: 'red', fontSize: 12 }}>{String((errors.sourceEntityType as any).message ?? '')}</span>
          )}
        </Form.Item>
        <Form.Item label="Sourceentityid">
          <Controller
            name="sourceEntityId"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="Enter sourceEntityId" />
                          )}
          />
          {errors.sourceEntityId && (
            <span style={{ color: 'red', fontSize: 12 }}>{String((errors.sourceEntityId as any).message ?? '')}</span>
          )}
        </Form.Item>
        <Form.Item label="Relationshiptype">
          <Controller
            name="relationshipType"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="Enter relationshipType" />
                          )}
          />
          {errors.relationshipType && (
            <span style={{ color: 'red', fontSize: 12 }}>{String((errors.relationshipType as any).message ?? '')}</span>
          )}
        </Form.Item>
        <Form.Item label="Tagid" required>
          <Controller
            name="tagId"
            control={control}
            rules={{ required: 'Tagid is required' }}
            render={({ field }) => (
              <Input {...field} placeholder="Enter tagId" />
                          )}
          />
          {errors.tagId && (
            <span style={{ color: 'red', fontSize: 12 }}>{String((errors.tagId as any).message ?? '')}</span>
          )}
        </Form.Item>
      </Form>
    </Modal>
  );
};