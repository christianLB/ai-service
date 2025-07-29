import React, { useState } from 'react';
import { Button, Card, Table, Space, Modal, Form, Input, Switch, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CopyOutlined } from '@ant-design/icons';
import { useInvoiceTemplates, useCreateInvoiceTemplate, useUpdateInvoiceTemplate, useDeleteInvoiceTemplate } from '../../hooks/use-invoice-template';
import type { InvoiceTemplate } from '../../types/invoice-template.types';
import { useAuth } from '../../hooks/useAuth';

const InvoiceTemplatePage: React.FC = () => {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<InvoiceTemplate | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useInvoiceTemplates({ page: 1, limit: 20 });
  const createMutation = useCreateInvoiceTemplate();
  const updateMutation = useUpdateInvoiceTemplate();
  const deleteMutation = useDeleteInvoiceTemplate();

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => text || '-',
    },
    {
      title: 'Type',
      dataIndex: 'templateType',
      key: 'templateType',
    },
    {
      title: 'Default',
      dataIndex: 'isDefault',
      key: 'isDefault',
      render: (isDefault: boolean) => isDefault ? 'Yes' : 'No',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: InvoiceTemplate) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          />
          <Button
            icon={<CopyOutlined />}
            onClick={() => handleDuplicate(record)}
            size="small"
          />
          <Popconfirm
            title="Are you sure you want to delete this template?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              icon={<DeleteOutlined />}
              danger
              size="small"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleEdit = (template: InvoiceTemplate) => {
    setEditingTemplate(template);
    form.setFieldsValue({
      name: template.name,
      description: template.description,
      isDefault: template.isDefault,
      templateType: template.templateType,
      htmlContent: template.htmlContent,
    });
    setIsModalOpen(true);
  };

  const handleDuplicate = (template: InvoiceTemplate) => {
    form.setFieldsValue({
      name: `${template.name} (Copy)`,
      description: template.description,
      isDefault: false,
      templateType: template.templateType,
      htmlContent: template.htmlContent,
    });
    setEditingTemplate(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      message.success('Template deleted successfully');
    } catch {
      message.error('Failed to delete template');
    }
  };

  const handleSubmit = async (values: { name: string; description?: string; isDefault?: boolean; templateType?: string; htmlContent?: string }) => {
    try {
      if (editingTemplate) {
        await updateMutation.mutateAsync({
          id: editingTemplate.id,
          ...values,
        });
        message.success('Template updated successfully');
      } else {
        await createMutation.mutateAsync({
          ...values,
          htmlContent: values.htmlContent || '',
          userId: user?.id || '',
          variables: [],
        });
        message.success('Template created successfully');
      }
      setIsModalOpen(false);
      form.resetFields();
      setEditingTemplate(null);
    } catch {
      message.error('Failed to save template');
    }
  };

  return (
    <div>
      <Card
        title="Invoice Templates"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingTemplate(null);
              form.resetFields();
              setIsModalOpen(true);
            }}
          >
            New Template
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={data?.items || []}
          loading={isLoading}
          rowKey="id"
          pagination={{
            total: data?.total || 0,
            pageSize: data?.limit || 20,
            current: data?.page || 1,
          }}
        />
      </Card>

      <Modal
        title={editingTemplate ? 'Edit Template' : 'Create Template'}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
          setEditingTemplate(null);
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            templateType: 'invoice',
            isDefault: false,
          }}
        >
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
          >
            <Input.TextArea rows={2} />
          </Form.Item>

          <Form.Item
            label="Template Type"
            name="templateType"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="HTML Content"
            name="htmlContent"
            rules={[{ required: true, message: 'Please enter HTML content' }]}
          >
            <Input.TextArea 
              rows={10} 
              placeholder="Enter HTML template with variables like {{client.name}}, {{invoice.number}}, etc."
            />
          </Form.Item>

          <Form.Item
            label="Set as Default"
            name="isDefault"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingTemplate ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => {
                setIsModalOpen(false);
                form.resetFields();
                setEditingTemplate(null);
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default InvoiceTemplatePage;