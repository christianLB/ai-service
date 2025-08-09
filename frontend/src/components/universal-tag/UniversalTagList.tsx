import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Button,
  Card,
  Space,
  Input,
  Tag,
  Tooltip,
  Popconfirm,
  message,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useUniversalTags, useUniversalTagMutations } from '../../hooks/use-universal-tag';
import { UniversalTagForm } from './UniversalTagForm';
import type { UniversalTag } from '../../types/universal-tag.types';
import { formatDate } from '../../utils/format';
import { useDebounce } from '../../hooks/useDebounce';

const { Search } = Input;

export const UniversalTagList: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [formVisible, setFormVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<UniversalTag | null>(null);

  const debouncedSearch = useDebounce(search, 500);

  // Fetch data
  const { data, isLoading, refetch } = useUniversalTags({
    page,
    limit: pageSize,
    search: debouncedSearch,
  });

  // Mutations
  const { delete: deleteItem, bulkDelete, isDeleting, isBulkDeleting } = useUniversalTagMutations();

  // Dynamic columns based on model fields
  const columns: ColumnsType<UniversalTag> = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      render: (text, record) => (
        <a onClick={() => navigate(`/universal-tags/${record.id}`)}>
          {text}
        </a>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Entitytypes',
      dataIndex: 'entityTypes',
      key: 'entityTypes',
    },
    {
      title: 'Patterns',
      dataIndex: 'patterns',
      key: 'patterns',
    },
    {
      title: 'Rules',
      dataIndex: 'rules',
      key: 'rules',
    },
    {
      title: 'Confidence',
      dataIndex: 'confidence',
      key: 'confidence',
      align: 'right',
          },
    {
      title: 'Embeddingmodel',
      dataIndex: 'embeddingModel',
      key: 'embeddingModel',
    },
    {
      title: 'Path',
      dataIndex: 'path',
      key: 'path',
    },
    {
      title: 'Level',
      dataIndex: 'level',
      key: 'level',
      align: 'right',
          },
    {
      title: 'Color',
      dataIndex: 'color',
      key: 'color',
    },
    {
      title: 'Icon',
      dataIndex: 'icon',
      key: 'icon',
    },
    {
      title: 'Isactive',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (value) => (
        <Tag color={value ? 'green' : 'red'}>
          {value ? 'Yes' : 'No'}
        </Tag>
      ),
    },
    {
      title: 'Issystem',
      dataIndex: 'isSystem',
      key: 'isSystem',
      render: (value) => (
        <Tag color={value ? 'green' : 'red'}>
          {value ? 'Yes' : 'No'}
        </Tag>
      ),
    },
    {
      title: 'Metadata',
      dataIndex: 'metadata',
      key: 'metadata',
    },
    {
      title: 'Usagecount',
      dataIndex: 'usageCount',
      key: 'usageCount',
      align: 'right',
          },
    {
      title: 'Successrate',
      dataIndex: 'successRate',
      key: 'successRate',
      align: 'right',
          },
    {
      title: 'Lastused',
      dataIndex: 'lastUsed',
      key: 'lastUsed',
      render: (date) => date ? formatDate(date) : '-',
    },
    {
      title: 'Parentid',
      dataIndex: 'parentId',
      key: 'parentId',
    },
    {
      title: 'Entitytags',
      dataIndex: 'entityTags',
      key: 'entityTags',
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: true,
      render: (date) => formatDate(date),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Popconfirm
              title="Are you sure you want to delete this universaltag?"
              onConfirm={() => handleDelete(record.id)}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                loading={isDeleting}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Handlers
  const handleEdit = (item: UniversalTag) => {
    setEditingItem(item);
    setFormVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteItem(id);
      setSelectedRowKeys(selectedRowKeys.filter(key => key !== id));
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select items to delete');
      return;
    }

    try {
      await bulkDelete(selectedRowKeys);
      setSelectedRowKeys([]);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleFormClose = () => {
    setFormVisible(false);
    setEditingItem(null);
  };

  const handleFormSuccess = () => {
    handleFormClose();
    refetch();
  };

  // Basic statistics (customize based on your needs)
  const statistics = useMemo(() => {
    if (!data) return null;

    return {
      total: data.total,
      // Add more statistics based on your model fields
    };
  }, [data]);

  return (
    <>
      <Card>
        {statistics && (
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Statistic title="Total Universaltags" value={statistics.total} />
            </Col>
            {/* Add more statistics here based on your model */}
          </Row>
        )}

        <div style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col flex="auto">
              <Space>
                <Search
                  placeholder="Search universaltags..."
                  allowClear
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: 300 }}
                  prefix={<SearchOutlined />}
                />
                <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
                  Refresh
                </Button>
              </Space>
            </Col>
            <Col>
              <Space>
                {selectedRowKeys.length > 0 && (
                  <Popconfirm
                    title={`Are you sure you want to delete $\{selectedRowKeys.length} universaltags?`}
                    onConfirm={handleBulkDelete}
                    okText="Yes"
                    cancelText="No"
                    okButtonProps={{ danger: true }}
                  >
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      loading={isBulkDeleting}
                    >
                      Delete Selected ({selectedRowKeys.length})
                    </Button>
                  </Popconfirm>
                )}
                <Button icon={<ExportOutlined />}>Export</Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setFormVisible(true)}
                >
                  New Universaltag
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        <Table
          columns={columns}
          dataSource={data?.items || []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: data?.total || 0,
            showSizeChanger: true,
            showTotal: (total: number) => `Total ${total} items`,
            onChange: (newPage, newPageSize) => {
              setPage(newPage);
              if (newPageSize !== pageSize) {
                setPageSize(newPageSize);
              }
            },
          }}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys as string[]),
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {formVisible && (
        <UniversalTagForm
          open={formVisible}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
          initialData={editingItem}
        />
      )}
    </>
  );
};