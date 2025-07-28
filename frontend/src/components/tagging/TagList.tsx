import React, { useState } from 'react';
import {
  Table,
  Tag,
  Space,
  Button,
  Input,
  Select,
  Popconfirm,
  message,
  Tooltip,
  Badge,
  Dropdown,
  Checkbox,
  Card,
  Row,
  Col,
  Typography,
  Spin,
  Alert,
  Modal,
  Form,
  Radio,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
  DownloadOutlined,
  PlusOutlined,
  ReloadOutlined,
  ExportOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  TagsOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table/interface';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { taggingService, type Tag as TagType, type TagQuery } from '../../services/taggingService';
import { TagForm } from './TagForm';

dayjs.extend(relativeTime);

const { Search } = Input;
const { Option } = Select;
const { Title } = Typography;

interface TagListProps {
  onTagSelect?: (tag: TagType) => void;
  selectable?: boolean;
}

export const TagList: React.FC<TagListProps> = ({ onTagSelect, selectable = false }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'system' | 'user'>('all');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string>();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>();

  // Build query params
  const queryParams: TagQuery = {
    search: searchText,
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
    ...(statusFilter !== 'all' && { isActive: statusFilter === 'active' }),
    ...(typeFilter !== 'all' && { isSystem: typeFilter === 'system' }),
    ...(sortField && { sortBy: sortField as any }),
    ...(sortOrder && { sortOrder }),
  };

  // Fetch tags
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['tags', queryParams],
    queryFn: () => taggingService.getTags(queryParams),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => taggingService.deleteTag(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['tags']);
    },
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: ({ ids, updates }: { ids: string[]; updates: Partial<TagType> }) =>
      Promise.all(ids.map(id => taggingService.updateTag(id, updates))),
    onSuccess: () => {
      queryClient.invalidateQueries(['tags']);
      setSelectedRowKeys([]);
      message.success('Tags updated successfully');
    },
  });

  // Handle table change
  const handleTableChange = (
    pagination: TablePaginationConfig,
    filters: any,
    sorter: any,
  ) => {
    setCurrentPage(pagination.current || 1);
    setPageSize(pagination.pageSize || 10);
    
    if (sorter.field) {
      setSortField(sorter.field);
      setSortOrder(sorter.order === 'ascend' ? 'asc' : 'desc');
    } else {
      setSortField(undefined);
      setSortOrder(undefined);
    }
  };

  // Export functions
  const exportToCSV = () => {
    if (!data?.data) return;

    const csvData = data.data.map((tag: TagType) => ({
      Name: tag.name,
      Description: tag.description || '',
      Color: tag.color || '',
      'Usage Count': tag.usageCount || 0,
      Status: tag.isActive ? 'Active' : 'Inactive',
      Type: tag.isSystem ? 'System' : 'User',
      'Last Used': tag.lastUsedAt ? dayjs(tag.lastUsedAt).format('YYYY-MM-DD HH:mm:ss') : '',
      Created: dayjs(tag.createdAt).format('YYYY-MM-DD HH:mm:ss'),
    }));

    const headers = Object.keys(csvData[0]).join(',');
    const rows = csvData.map(row => Object.values(row).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tags_export_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    message.success('Tags exported to CSV');
  };

  const exportToJSON = () => {
    if (!data?.data) return;

    const json = JSON.stringify(data.data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tags_export_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    message.success('Tags exported to JSON');
  };

  // Columns definition
  const columns: ColumnsType<TagType> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      width: 200,
      render: (text: string, record: TagType) => (
        <Tag 
          color={record.color || 'default'} 
          icon={record.icon ? <span className="anticon">{record.icon}</span> : undefined}
          style={{ fontSize: '14px', cursor: selectable ? 'pointer' : 'default' }}
          onClick={() => selectable && onTagSelect?.(record)}
        >
          {text}
        </Tag>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: 300,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text || '-'}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Color',
      dataIndex: 'color',
      key: 'color',
      width: 100,
      render: (color: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '24px',
              height: '24px',
              backgroundColor: color || '#d9d9d9',
              borderRadius: '4px',
              border: '1px solid #d9d9d9',
            }}
          />
          <span style={{ fontSize: '12px', color: '#666' }}>{color || 'default'}</span>
        </div>
      ),
    },
    {
      title: 'Usage',
      dataIndex: 'usageCount',
      key: 'usageCount',
      sorter: true,
      width: 100,
      align: 'center',
      render: (count: number) => (
        <Badge count={count || 0} showZero style={{ backgroundColor: '#52c41a' }} />
      ),
    },
    {
      title: 'Type',
      dataIndex: 'isSystem',
      key: 'isSystem',
      width: 100,
      align: 'center',
      render: (isSystem: boolean) => (
        <Tag color={isSystem ? 'blue' : 'green'}>
          {isSystem ? 'System' : 'User'}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      align: 'center',
      render: (isActive: boolean) => (
        <Tag 
          color={isActive ? 'success' : 'default'} 
          icon={isActive ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
        >
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Last Used',
      dataIndex: 'lastUsedAt',
      key: 'lastUsedAt',
      sorter: true,
      width: 150,
      render: (date: string) => (
        date ? (
          <Tooltip title={dayjs(date).format('YYYY-MM-DD HH:mm:ss')}>
            {dayjs(date).fromNow()}
          </Tooltip>
        ) : '-'
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 120,
      render: (_, record: TagType) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/tags/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => navigate(`/tags/${record.id}/edit`)}
              disabled={record.isSystem}
            />
          </Tooltip>
          <Popconfirm
            title="Delete Tag"
            description="Are you sure you want to delete this tag?"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Yes"
            cancelText="No"
            disabled={record.isSystem}
          >
            <Tooltip title={record.isSystem ? "System tags cannot be deleted" : "Delete"}>
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                disabled={record.isSystem}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Row selection
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
    getCheckboxProps: (record: TagType) => ({
      disabled: record.isSystem,
    }),
  };

  // Bulk actions menu items
  const bulkActions = [
    {
      key: 'activate',
      icon: <CheckCircleOutlined />,
      label: 'Activate',
      onClick: () => {
        bulkUpdateMutation.mutate({
          ids: selectedRowKeys as string[],
          updates: { isActive: true },
        });
      },
    },
    {
      key: 'deactivate',
      icon: <CloseCircleOutlined />,
      label: 'Deactivate',
      onClick: () => {
        bulkUpdateMutation.mutate({
          ids: selectedRowKeys as string[],
          updates: { isActive: false },
        });
      },
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Delete',
      danger: true,
      onClick: () => {
        Modal.confirm({
          title: 'Delete Tags',
          content: `Are you sure you want to delete ${selectedRowKeys.length} selected tags?`,
          okText: 'Yes',
          okType: 'danger',
          cancelText: 'No',
          onOk: async () => {
            try {
              await Promise.all(
                selectedRowKeys.map(id => taggingService.deleteTag(id as string))
              );
              message.success('Tags deleted successfully');
              queryClient.invalidateQueries(['tags']);
              setSelectedRowKeys([]);
            } catch (error) {
              message.error('Failed to delete some tags');
            }
          },
        });
      },
    },
  ];

  // Export menu items
  const exportMenuItems = [
    {
      key: 'csv',
      icon: <ExportOutlined />,
      label: 'Export as CSV',
      onClick: exportToCSV,
    },
    {
      key: 'json',
      icon: <ExportOutlined />,
      label: 'Export as JSON',
      onClick: exportToJSON,
    },
  ];

  if (error) {
    return (
      <Alert
        message="Error"
        description="Failed to load tags. Please try again later."
        type="error"
        showIcon
        action={
          <Button size="small" onClick={() => refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={8}>
          <Search
            placeholder="Search tags..."
            allowClear
            enterButton={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={() => setCurrentPage(1)}
          />
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Space>
            <Select
              style={{ width: 120 }}
              placeholder="Status"
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value);
                setCurrentPage(1);
              }}
            >
              <Option value="all">All Status</Option>
              <Option value="active">Active</Option>
              <Option value="inactive">Inactive</Option>
            </Select>
            <Select
              style={{ width: 120 }}
              placeholder="Type"
              value={typeFilter}
              onChange={(value) => {
                setTypeFilter(value);
                setCurrentPage(1);
              }}
            >
              <Option value="all">All Types</Option>
              <Option value="system">System</Option>
              <Option value="user">User</Option>
            </Select>
          </Space>
        </Col>
        <Col xs={24} sm={24} md={8} style={{ textAlign: 'right' }}>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
              Refresh
            </Button>
            <Dropdown menu={{ items: exportMenuItems }} placement="bottomRight">
              <Button icon={<DownloadOutlined />}>Export</Button>
            </Dropdown>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => setCreateModalVisible(true)}
            >
              Create Tag
            </Button>
          </Space>
        </Col>
      </Row>

      {selectedRowKeys.length > 0 && (
        <Row style={{ marginBottom: 16 }}>
          <Col span={24}>
            <Space>
              <span>{selectedRowKeys.length} selected</span>
              <Dropdown menu={{ items: bulkActions }} placement="bottomLeft">
                <Button icon={<MoreOutlined />}>Bulk Actions</Button>
              </Dropdown>
            </Space>
          </Col>
        </Row>
      )}

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.data || []}
        loading={isLoading}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: data?.total || 0,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} tags`,
        }}
        onChange={handleTableChange}
        rowSelection={!selectable ? rowSelection : undefined}
        scroll={{ x: 1200 }}
        size="middle"
      />

      {/* Create Tag Modal */}
      <Modal
        title="Create New Tag"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width={600}
      >
        <TagForm
          mode="create"
          onSuccess={(tag) => {
            setCreateModalVisible(false);
            queryClient.invalidateQueries(['tags']);
            navigate(`/tags/${tag.id}`);
          }}
          onCancel={() => setCreateModalVisible(false)}
        />
      </Modal>
    </>
  );
};

export default TagList;