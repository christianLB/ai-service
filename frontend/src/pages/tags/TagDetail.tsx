import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PageHeader,
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  Statistic,
  Row,
  Col,
  Table,
  Modal,
  message,
  Spin,
  Alert,
  Typography,
  Divider,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  TagsOutlined,
  CalendarOutlined,
  BarChartOutlined,
  FileTextOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { taggingService } from '../../services/taggingService';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

const TagDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  // Fetch tag details
  const { data: tag, isLoading, error } = useQuery({
    queryKey: ['tag', id],
    queryFn: () => taggingService.getTag(id!),
    enabled: !!id,
  });

  // Fetch tag metrics
  const { data: metrics } = useQuery({
    queryKey: ['tagMetrics', id],
    queryFn: () => taggingService.getTagMetrics(id!),
    enabled: !!id,
  });

  // Fetch entities using this tag
  const { data: entities } = useQuery({
    queryKey: ['tagEntities', id],
    queryFn: () => taggingService.findEntitiesByTag(id!),
    enabled: !!id,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => taggingService.deleteTag(id!),
    onSuccess: () => {
      message.success('Tag deleted successfully');
      navigate('/tags');
    },
    onError: () => {
      message.error('Failed to delete tag');
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  if (isLoading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !tag?.data) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="Error"
          description="Failed to load tag details. Please try again."
          type="error"
          showIcon
          action={
            <Button size="small" onClick={() => navigate('/tags')}>
              Back to Tags
            </Button>
          }
        />
      </div>
    );
  }

  const tagData = tag.data;
  const metricsData = metrics?.data;
  const entitiesData = entities?.data || [];

  // Entity breakdown for pie chart
  const entityBreakdown = metricsData?.entityBreakdown || {};
  const entityTypes = Object.entries(entityBreakdown).map(([type, count]) => ({
    type,
    count,
  }));

  const columns = [
    {
      title: 'Entity Type',
      dataIndex: 'entityType',
      key: 'entityType',
      render: (type: string) => <Text strong className="capitalize">{type}</Text>,
    },
    {
      title: 'Entity ID',
      dataIndex: 'entityId',
      key: 'entityId',
    },
    {
      title: 'Confidence',
      dataIndex: 'confidence',
      key: 'confidence',
      render: (confidence?: number) => 
        confidence ? `${Math.round(confidence * 100)}%` : '-',
    },
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
      render: (source: string) => {
        const colors: Record<string, string> = {
          manual: 'blue',
          ai: 'green',
          rule: 'orange',
          import: 'purple',
        };
        return <Tag color={colors[source] || 'default'}>{source}</Tag>;
      },
    },
    {
      title: 'Tagged At',
      dataIndex: 'taggedAt',
      key: 'taggedAt',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: any) => (
        <Button
          type="link"
          size="small"
          onClick={() => navigate(`/${record.entityType}s/${record.entityId}`)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <PageHeader
        title={
          <Space>
            <Tag color={tagData.color || 'default'} style={{ fontSize: '18px' }}>
              {tagData.name}
            </Tag>
          </Space>
        }
        subTitle={tagData.description}
        tags={[
          tagData.isActive ? (
            <Tag color="success" key="active">Active</Tag>
          ) : (
            <Tag key="inactive">Inactive</Tag>
          ),
          tagData.isSystem ? (
            <Tag color="blue" key="system">System</Tag>
          ) : (
            <Tag color="green" key="user">User</Tag>
          ),
        ]}
        extra={[
          <Button
            key="edit"
            icon={<EditOutlined />}
            onClick={() => navigate(`/tags/${id}/edit`)}
            disabled={tagData.isSystem}
          >
            Edit
          </Button>,
          <Button
            key="delete"
            danger
            icon={<DeleteOutlined />}
            onClick={() => setDeleteModalVisible(true)}
            disabled={tagData.isSystem}
          >
            Delete
          </Button>,
        ]}
        onBack={() => navigate('/tags')}
        avatar={{ icon: <TagsOutlined />, style: { backgroundColor: tagData.color || '#1890ff' } }}
        style={{ marginBottom: 24, backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
      />

      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Usage"
              value={tagData.usageCount || 0}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Entity Types"
              value={Object.keys(entityBreakdown).length}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Avg Confidence"
              value={metricsData?.confidenceStats?.average 
                ? Math.round(metricsData.confidenceStats.average * 100)
                : 0
              }
              suffix="%"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Last Used"
              value={tagData.lastUsedAt ? dayjs(tagData.lastUsedAt).fromNow() : 'Never'}
              prefix={<CalendarOutlined />}
              valueStyle={{ fontSize: '16px' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Tag Details */}
      <Card title="Tag Information" style={{ marginBottom: 24 }}>
        <Descriptions bordered column={{ xs: 1, sm: 2, md: 2 }}>
          <Descriptions.Item label="ID">{tagData.id}</Descriptions.Item>
          <Descriptions.Item label="Slug">{tagData.slug}</Descriptions.Item>
          <Descriptions.Item label="Color">
            <Space>
              <div
                style={{
                  width: 20,
                  height: 20,
                  backgroundColor: tagData.color || '#d9d9d9',
                  borderRadius: 4,
                  border: '1px solid #d9d9d9',
                }}
              />
              <span>{tagData.color || 'default'}</span>
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Icon">{tagData.icon || '-'}</Descriptions.Item>
          <Descriptions.Item label="Created">
            {dayjs(tagData.createdAt).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          <Descriptions.Item label="Updated">
            {dayjs(tagData.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          {tagData.metadata && Object.keys(tagData.metadata).length > 0 && (
            <Descriptions.Item label="Metadata" span={2}>
              <pre style={{ margin: 0 }}>
                {JSON.stringify(tagData.metadata, null, 2)}
              </pre>
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {/* Entity Breakdown */}
      {entityTypes.length > 0 && (
        <Card title="Entity Type Distribution" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            {entityTypes.map(({ type, count }) => (
              <Col key={type} xs={12} sm={8} md={6} style={{ marginBottom: 16 }}>
                <Card size="small">
                  <Statistic
                    title={<Text className="capitalize">{type}</Text>}
                    value={count}
                  />
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* Tagged Entities */}
      <Card title={`Tagged Entities (${entitiesData.length})`}>
        <Table
          dataSource={entitiesData}
          columns={columns}
          rowKey={(record) => `${record.entityType}-${record.entityId}`}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} entities`,
          }}
        />
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        title="Delete Tag"
        open={deleteModalVisible}
        onOk={handleDelete}
        onCancel={() => setDeleteModalVisible(false)}
        okText="Delete"
        okType="danger"
        confirmLoading={deleteMutation.isLoading}
      >
        <p>Are you sure you want to delete the tag "{tagData.name}"?</p>
        <p>This action cannot be undone.</p>
        {tagData.usageCount > 0 && (
          <Alert
            message="Warning"
            description={`This tag is currently used by ${tagData.usageCount} entities. Deleting it will remove the tag from all entities.`}
            type="warning"
            showIcon
          />
        )}
      </Modal>
    </div>
  );
};

export default TagDetail;