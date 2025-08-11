import React, { useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  DatePicker,
  Switch,
} from 'antd';
import { useForm, Controller } from 'react-hook-form';
import { useInvoiceAttachmentMutations } from '../../hooks/use-invoice-attachment';
import type { InvoiceAttachment, CreateInvoiceAttachment } from '../../types/invoice-attachment.types';

// no TextArea used here

interface InvoiceAttachmentFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: InvoiceAttachment | null;
}

export const InvoiceAttachmentForm: React.FC<InvoiceAttachmentFormProps> = ({
  open,
  onClose,
  onSuccess,
  initialData,
}) => {
  const [form] = Form.useForm();
  const { create, update, isCreating, isUpdating } = useInvoiceAttachmentMutations();
  const isEdit = !!initialData;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateInvoiceAttachment>({
    defaultValues: {
      invoiceId: '',
      fileName: '',
      filePath: '',
      fileSize: undefined,
      fileType: '',
      description: '',
      uploadedBy: '',
      uploadedAt: undefined,
      isDeleted: false,
      deletedAt: undefined,
      deletedBy: '',
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        ...initialData,
      } as unknown as CreateInvoiceAttachment);
    }
  }, [initialData, reset]);

  const onSubmit = async (data: CreateInvoiceAttachment) => {
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
      title={isEdit ? 'Edit Invoiceattachment' : 'New Invoiceattachment'}
      open={open}
      onCancel={handleCancel}
      onOk={handleSubmit(onSubmit)}
      confirmLoading={isCreating || isUpdating}
      width={720}
      okText={isEdit ? 'Update' : 'Create'}
    >
      <Form layout="vertical" form={form} style={{ marginTop: 24 }}>
        <Form.Item label="Invoiceid" required>
          <Controller
            name="invoiceId"
            control={control}
            rules={{ required: 'Invoiceid is required' }}
            render={({ field }) => (
              <Input {...field} placeholder="Enter invoiceId" />
                          )}
          />
          {errors.invoiceId && (
            <span style={{ color: 'red', fontSize: 12 }}>{String(errors.invoiceId.message)}</span>
          )}
        </Form.Item>
        <Form.Item label="Filename" required>
          <Controller
            name="fileName"
            control={control}
            rules={{ required: 'Filename is required' }}
            render={({ field }) => (
              <Input {...field} placeholder="Enter fileName" />
                          )}
          />
          {errors.fileName && (
            <span style={{ color: 'red', fontSize: 12 }}>{String(errors.fileName.message)}</span>
          )}
        </Form.Item>
        <Form.Item label="Filepath" required>
          <Controller
            name="filePath"
            control={control}
            rules={{ required: 'Filepath is required' }}
            render={({ field }) => (
              <Input {...field} placeholder="Enter filePath" />
                          )}
          />
          {errors.filePath && (
            <span style={{ color: 'red', fontSize: 12 }}>{String(errors.filePath.message)}</span>
          )}
        </Form.Item>
        <Form.Item label="Filesize" required>
          <Controller
            name="fileSize"
            control={control}
            rules={{ required: 'Filesize is required' }}
            render={({ field }) => (
              <Input {...field} placeholder="Enter fileSize" />
                          )}
          />
          {errors.fileSize && (
            <span style={{ color: 'red', fontSize: 12 }}>{String(errors.fileSize.message)}</span>
          )}
        </Form.Item>
        <Form.Item label="Filetype" required>
          <Controller
            name="fileType"
            control={control}
            rules={{ required: 'Filetype is required' }}
            render={({ field }) => (
              <Input {...field} placeholder="Enter fileType" />
                          )}
          />
          {errors.fileType && (
            <span style={{ color: 'red', fontSize: 12 }}>{String(errors.fileType.message)}</span>
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
            <span style={{ color: 'red', fontSize: 12 }}>{String(errors.description.message)}</span>
          )}
        </Form.Item>
        <Form.Item label="Uploadedby" required>
          <Controller
            name="uploadedBy"
            control={control}
            rules={{ required: 'Uploadedby is required' }}
            render={({ field }) => (
              <Input {...field} placeholder="Enter uploadedBy" />
                          )}
          />
          {errors.uploadedBy && (
            <span style={{ color: 'red', fontSize: 12 }}>{String(errors.uploadedBy.message)}</span>
          )}
        </Form.Item>
        <Form.Item label="Uploadedat" required>
          <Controller
            name="uploadedAt"
            control={control}
            rules={{ required: 'Uploadedat is required' }}
            render={({ field }) => (
              <DatePicker {...field} style={{ width: '100%' }} />
            )}
          />
          {errors.uploadedAt && (
            <span style={{ color: 'red', fontSize: 12 }}>{String(errors.uploadedAt.message)}</span>
          )}
        </Form.Item>
        <Form.Item label="Isdeleted" required>
          <Controller
            name="isDeleted"
            control={control}
            rules={{ required: 'Isdeleted is required' }}
            render={({ field }) => (
              <Switch {...field} checked={field.value} />
            )}
          />
          {errors.isDeleted && (
            <span style={{ color: 'red', fontSize: 12 }}>{String(errors.isDeleted.message)}</span>
          )}
        </Form.Item>
        <Form.Item label="Deletedat">
          <Controller
            name="deletedAt"
            control={control}
            render={({ field }) => (
              <DatePicker {...field} style={{ width: '100%' }} />
            )}
          />
          {errors.deletedAt && (
            <span style={{ color: 'red', fontSize: 12 }}>{String(errors.deletedAt.message)}</span>
          )}
        </Form.Item>
        <Form.Item label="Deletedby">
          <Controller
            name="deletedBy"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="Enter deletedBy" />
                          )}
          />
          {errors.deletedBy && (
            <span style={{ color: 'red', fontSize: 12 }}>{String(errors.deletedBy.message)}</span>
          )}
        </Form.Item>
      </Form>
    </Modal>
  );
};