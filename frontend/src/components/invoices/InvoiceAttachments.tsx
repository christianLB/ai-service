import React, { useState, useEffect } from 'react';
import { Upload, Button, List, message, Modal, Tooltip, Space, Progress, Typography } from 'antd';
import {
  UploadOutlined,
  EyeOutlined,
  DownloadOutlined,
  DeleteOutlined,
  PaperClipOutlined,
} from '@ant-design/icons';
import type { InvoiceAttachment } from '../../types';
import { attachmentService } from '../../services/attachmentService';
import type { UploadFile } from 'antd/es/upload/interface';
import { sanitizeFilename, sanitizeText } from '../../utils/security';

const { Text, Paragraph } = Typography;

interface InvoiceAttachmentsProps {
  invoiceId: string;
  readOnly?: boolean;
  onAttachmentsChange?: (attachments: InvoiceAttachment[]) => void;
}

export const InvoiceAttachments: React.FC<InvoiceAttachmentsProps> = ({
  invoiceId,
  readOnly = false,
  onAttachmentsChange,
}) => {
  const [attachments, setAttachments] = useState<InvoiceAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState<InvoiceAttachment | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // Load attachments when component mounts or invoiceId changes
  useEffect(() => {
    if (invoiceId) {
      loadAttachments();
    }
  }, [invoiceId]);

  const loadAttachments = async () => {
    try {
      setLoading(true);
      const data = await attachmentService.getInvoiceAttachments(invoiceId);
      setAttachments(data);
      onAttachmentsChange?.(data);
    } catch (error) {
      console.error('Error loading attachments:', error);
      message.error('Error al cargar los archivos adjuntos');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    // Validate file
    const validation = attachmentService.validateFile(file);
    if (!validation.valid) {
      message.error(validation.error);
      return false;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const attachment = await attachmentService.uploadAttachment({
        invoiceId,
        file,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Add to attachments list
      const newAttachments = [...attachments, attachment];
      setAttachments(newAttachments);
      onAttachmentsChange?.(newAttachments);

      message.success(`Archivo ${file.name} subido correctamente`);
      
      // Clear file list
      setFileList([]);

      // Reset progress after a delay
      setTimeout(() => {
        setUploadProgress(0);
      }, 1000);

      return true;
    } catch (error) {
      console.error('Error uploading file:', error);
      message.error('Error al subir el archivo');
      return false;
    } finally {
      setUploading(false);
    }
  };

  const handlePreview = async (attachment: InvoiceAttachment) => {
    try {
      await attachmentService.previewAttachment(
        attachment.id,
        attachment.fileName,
        attachment.fileType
      );
    } catch (error) {
      console.error('Error previewing attachment:', error);
      message.error('Error al previsualizar el archivo');
    }
  };

  const handleDownload = async (attachment: InvoiceAttachment) => {
    try {
      await attachmentService.downloadAttachment(attachment.id, attachment.fileName);
      message.success('Archivo descargado correctamente');
    } catch (error) {
      console.error('Error downloading attachment:', error);
      message.error('Error al descargar el archivo');
    }
  };

  const confirmDelete = (attachment: InvoiceAttachment) => {
    setAttachmentToDelete(attachment);
    setDeleteModalVisible(true);
  };

  const handleDelete = async () => {
    if (!attachmentToDelete) return;

    try {
      await attachmentService.deleteAttachment(attachmentToDelete.id);
      
      // Remove from attachments list
      const newAttachments = attachments.filter((a) => a.id !== attachmentToDelete.id);
      setAttachments(newAttachments);
      onAttachmentsChange?.(newAttachments);

      message.success('Archivo eliminado correctamente');
      setDeleteModalVisible(false);
      setAttachmentToDelete(null);
    } catch (error) {
      console.error('Error deleting attachment:', error);
      message.error('Error al eliminar el archivo');
    }
  };

  const uploadProps = {
    fileList,
    beforeUpload: (file: File) => {
      handleUpload(file);
      return false; // Prevent automatic upload
    },
    onChange: ({ fileList }: { fileList: UploadFile[] }) => {
      setFileList(fileList);
    },
    multiple: true,
    showUploadList: false,
  };

  return (
    <div className="invoice-attachments">
      {!readOnly && (
        <div className="mb-4">
          <Upload {...uploadProps}>
            <Button
              icon={<UploadOutlined />}
              loading={uploading}
              disabled={uploading || !invoiceId}
            >
              {uploading ? 'Subiendo...' : 'Adjuntar Archivo'}
            </Button>
          </Upload>
          {uploadProgress > 0 && uploadProgress < 100 && (
            <Progress
              percent={uploadProgress}
              size="small"
              className="mt-2"
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
          )}
          <Text type="secondary" className="block mt-2 text-xs">
            Tipos permitidos: PDF, imágenes (JPG, PNG), Word, Excel, texto plano, CSV. Tamaño máximo: 10MB
          </Text>
        </div>
      )}

      <List
        loading={loading}
        dataSource={attachments}
        locale={{ emptyText: 'No hay archivos adjuntos' }}
        renderItem={(attachment) => (
          <List.Item
            actions={[
              <Tooltip title="Previsualizar">
                <Button
                  icon={<EyeOutlined />}
                  size="small"
                  onClick={() => handlePreview(attachment)}
                  disabled={
                    attachment.fileType !== 'application/pdf' &&
                    !attachment.fileType.startsWith('image/')
                  }
                />
              </Tooltip>,
              <Tooltip title="Descargar">
                <Button
                  icon={<DownloadOutlined />}
                  size="small"
                  onClick={() => handleDownload(attachment)}
                />
              </Tooltip>,
              !readOnly && (
                <Tooltip title="Eliminar">
                  <Button
                    icon={<DeleteOutlined />}
                    size="small"
                    danger
                    onClick={() => confirmDelete(attachment)}
                  />
                </Tooltip>
              ),
            ].filter(Boolean)}
          >
            <List.Item.Meta
              avatar={
                <div className="text-2xl">
                  {attachmentService.getFileIcon(attachment.fileType)}
                </div>
              }
              title={
                <Space>
                  <Text strong>{sanitizeFilename(attachment.fileName)}</Text>
                  <Text type="secondary" className="text-xs">
                    ({attachmentService.formatFileSize(attachment.fileSize)})
                  </Text>
                </Space>
              }
              description={
                <div>
                  {attachment.description && (
                    <Paragraph className="mb-1 text-xs">{sanitizeText(attachment.description)}</Paragraph>
                  )}
                  <Text type="secondary" className="text-xs">
                    Subido el {new Date(attachment.uploadedAt).toLocaleString('es-ES')}
                  </Text>
                </div>
              }
            />
          </List.Item>
        )}
      />

      <Modal
        title="Confirmar eliminación"
        open={deleteModalVisible}
        onOk={handleDelete}
        onCancel={() => {
          setDeleteModalVisible(false);
          setAttachmentToDelete(null);
        }}
        okText="Eliminar"
        cancelText="Cancelar"
        okButtonProps={{ danger: true }}
      >
        <p>
          ¿Está seguro de que desea eliminar el archivo{' '}
          <strong>{sanitizeFilename(attachmentToDelete?.fileName || '')}</strong>?
        </p>
        <p>Esta acción no se puede deshacer.</p>
      </Modal>
    </div>
  );
};

interface AttachmentsSummaryProps {
  attachments: InvoiceAttachment[];
  onClick?: () => void;
}

export const AttachmentsSummary: React.FC<AttachmentsSummaryProps> = ({ attachments, onClick }) => {
  if (attachments.length === 0) {
    return null;
  }

  const totalSize = attachments.reduce((sum, att) => sum + att.fileSize, 0);

  return (
    <Button
      type="text"
      icon={<PaperClipOutlined />}
      onClick={onClick}
      className="attachment-summary"
    >
      <Space>
        <span>{attachments.length} archivo(s)</span>
        <Text type="secondary" className="text-xs">
          ({attachmentService.formatFileSize(totalSize)})
        </Text>
      </Space>
    </Button>
  );
};