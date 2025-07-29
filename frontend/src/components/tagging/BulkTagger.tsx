import React, { useState } from 'react';
import {
  Modal,
  Button,
  Space,
  Alert,
  Radio,
  message,
  Table,
  Tag,
  Progress,
  Typography,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  MinusOutlined,
  SyncOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { TagSelector } from './TagSelector';
import { taggingService } from '../../services/taggingService';
import type { BatchTagOperation } from '../../services/taggingService';

const { Title, Text } = Typography;

interface BulkTaggerProps {
  visible: boolean;
  onClose: () => void;
  entities: Array<{
    type: string;
    id: string;
    name?: string;
    currentTags?: string[];
  }>;
  onSuccess?: () => void;
}

type OperationType = 'add' | 'remove' | 'replace';

export const BulkTagger: React.FC<BulkTaggerProps> = ({
  visible,
  onClose,
  entities,
  onSuccess,
}) => {
  const [operation, setOperation] = useState<OperationType>('add');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const bulkTagMutation = useMutation({
    mutationFn: (data: BatchTagOperation) => taggingService.batchTagOperation(data),
    onSuccess: () => {
      message.success('Bulk tagging completed successfully');
      onSuccess?.();
      handleClose();
    },
    onError: (error: Error) => {
      message.error(error.message || 'Bulk tagging failed');
    },
  });

  const handleClose = () => {
    setOperation('add');
    setSelectedTags([]);
    setProcessing(false);
    setProgress(0);
    onClose();
  };

  const handleSubmit = async () => {
    if (selectedTags.length === 0 && operation !== 'remove') {
      message.warning('Please select at least one tag');
      return;
    }

    if (entities.length === 0) {
      message.warning('No entities selected');
      return;
    }

    setProcessing(true);
    setProgress(0);

    const batchOperation: BatchTagOperation = {
      operation,
      entities: entities.map(e => ({ type: e.type, id: e.id })),
      tagIds: selectedTags,
    };

    // Simulate progress for UX
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      await bulkTagMutation.mutateAsync(batchOperation);
      setProgress(100);
      clearInterval(progressInterval);
    } catch {
      clearInterval(progressInterval);
      setProcessing(false);
    }
  };

  const columns = [
    {
      title: 'Entity',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: any) => (
        <div>
          <Text strong>{name || record.id}</Text>
          <br />
          <Text type="secondary" className="text-xs">
            {record.type}
          </Text>
        </div>
      ),
    },
    {
      title: 'Current Tags',
      dataIndex: 'currentTags',
      key: 'currentTags',
      render: (tags: string[]) => (
        <Space size={[0, 8]} wrap>
          {tags?.length > 0 ? (
            tags.map(tag => <Tag key={tag}>{tag}</Tag>)
          ) : (
            <Text type="secondary">No tags</Text>
          )}
        </Space>
      ),
    },
  ];

  const getOperationIcon = () => {
    switch (operation) {
      case 'add':
        return <PlusOutlined />;
      case 'remove':
        return <MinusOutlined />;
      case 'replace':
        return <SyncOutlined />;
    }
  };

  const getOperationColor = () => {
    switch (operation) {
      case 'add':
        return 'green';
      case 'remove':
        return 'red';
      case 'replace':
        return 'blue';
    }
  };

  const getOperationDescription = () => {
    switch (operation) {
      case 'add':
        return 'Add selected tags to all entities without removing existing tags';
      case 'remove':
        return 'Remove selected tags from all entities';
      case 'replace':
        return 'Replace all existing tags with selected tags';
    }
  };

  return (
    <Modal
      title={
        <Space>
          <TagsOutlined />
          <span>Bulk Tag Management</span>
        </Space>
      }
      open={visible}
      onCancel={handleClose}
      width={800}
      footer={[
        <Button key="cancel" onClick={handleClose} disabled={processing}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          icon={getOperationIcon()}
          onClick={handleSubmit}
          loading={processing}
          disabled={entities.length === 0}
        >
          Apply to {entities.length} {entities.length === 1 ? 'Entity' : 'Entities'}
        </Button>,
      ]}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Operation Selection */}
        <div>
          <Title level={5}>Operation Type</Title>
          <Radio.Group
            value={operation}
            onChange={(e) => setOperation(e.target.value)}
            disabled={processing}
          >
            <Radio.Button value="add">
              <Space>
                <PlusOutlined />
                Add Tags
              </Space>
            </Radio.Button>
            <Radio.Button value="remove">
              <Space>
                <MinusOutlined />
                Remove Tags
              </Space>
            </Radio.Button>
            <Radio.Button value="replace">
              <Space>
                <SyncOutlined />
                Replace Tags
              </Space>
            </Radio.Button>
          </Radio.Group>
          <Alert
            message={getOperationDescription()}
            type="info"
            showIcon
            style={{ marginTop: 8 }}
          />
        </div>

        {/* Tag Selection */}
        <div>
          <Title level={5}>Select Tags</Title>
          <TagSelector
            value={selectedTags}
            onChange={setSelectedTags}
            multiple
            placeholder={`Select tags to ${operation}`}
            disabled={processing}
            style={{ width: '100%' }}
          />
        </div>

        {/* Selected Entities Preview */}
        <div>
          <Title level={5}>Selected Entities ({entities.length})</Title>
          <Table
            dataSource={entities}
            columns={columns}
            rowKey="id"
            size="small"
            pagination={false}
            scroll={{ y: 200 }}
          />
        </div>

        {/* Progress */}
        {processing && (
          <div>
            <Divider />
            <Title level={5}>Processing...</Title>
            <Progress percent={progress} status="active" />
            <Text type="secondary">
              Applying {operation} operation to {entities.length} entities...
            </Text>
          </div>
        )}

        {/* Summary */}
        {selectedTags.length > 0 && !processing && (
          <Alert
            message="Summary"
            description={
              <div>
                <Text>
                  Will <Text strong style={{ color: getOperationColor() }}>
                    {operation}
                  </Text> {selectedTags.length} tag{selectedTags.length > 1 ? 's' : ''} 
                  {operation === 'add' ? ' to' : operation === 'remove' ? ' from' : ' on'} {entities.length} 
                  {entities.length === 1 ? ' entity' : ' entities'}
                </Text>
              </div>
            }
            type="warning"
            showIcon
          />
        )}
      </Space>
    </Modal>
  );
};

export default BulkTagger;