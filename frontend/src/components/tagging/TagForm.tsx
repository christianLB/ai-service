import React, { useState } from 'react';
import { Form, Input, Switch, Button, Space, ColorPicker } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { taggingService } from '../../services/taggingService';
import type { Tag, CreateTagDto, UpdateTagDto } from '../../services/taggingService';

const { TextArea } = Input;

interface TagFormProps {
  mode: 'create' | 'edit';
  initialValues?: Tag;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const TagForm: React.FC<TagFormProps> = ({
  mode,
  initialValues,
  onSuccess,
  onCancel
}) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateTagDto) => taggingService.createTag(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      message.success('Tag created successfully');
      form.resetFields();
      onSuccess?.();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to create tag');
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdateTagDto) => 
      taggingService.updateTag(initialValues!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['tag', initialValues!.id] });
      message.success('Tag updated successfully');
      onSuccess?.();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to update tag');
    }
  });

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const data = {
        ...values,
        color: typeof values.color === 'string' ? values.color : values.color?.toHexString()
      };

      if (mode === 'create') {
        await createMutation.mutateAsync(data);
      } else {
        await updateMutation.mutateAsync(data);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={{
        ...initialValues,
        isActive: initialValues?.isActive ?? true,
        isSystem: initialValues?.isSystem ?? false
      }}
      onFinish={handleSubmit}
    >
      <Form.Item
        name="name"
        label="Name"
        rules={[
          { required: true, message: 'Please enter a tag name' },
          { max: 50, message: 'Name must be less than 50 characters' }
        ]}
      >
        <Input placeholder="Enter tag name" />
      </Form.Item>

      <Form.Item
        name="description"
        label="Description"
        rules={[
          { max: 200, message: 'Description must be less than 200 characters' }
        ]}
      >
        <TextArea 
          rows={3} 
          placeholder="Enter tag description (optional)"
        />
      </Form.Item>

      <Form.Item
        name="color"
        label="Color"
      >
        <ColorPicker showText />
      </Form.Item>

      <Form.Item
        name="icon"
        label="Icon"
        rules={[
          { max: 50, message: 'Icon must be less than 50 characters' }
        ]}
      >
        <Input placeholder="Enter icon name (optional)" />
      </Form.Item>

      <Form.Item
        name="isActive"
        label="Active"
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>

      {mode === 'create' && (
        <Form.Item
          name="isSystem"
          label="System Tag"
          valuePropName="checked"
          tooltip="System tags cannot be edited or deleted"
        >
          <Switch />
        </Form.Item>
      )}

      <Form.Item>
        <Space>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading || createMutation.isPending || updateMutation.isPending}
          >
            {mode === 'create' ? 'Create' : 'Update'}
          </Button>
          <Button onClick={onCancel}>
            Cancel
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default TagForm;