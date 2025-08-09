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
import { useStrategys, useStrategyMutations } from '../../hooks/use-strategy';
import { StrategyForm } from './StrategyForm';
import type { Strategy } from '../../types/strategy.types';
import { formatDate } from '../../utils/format';
import { useDebounce } from '../../hooks/useDebounce';

const { Search } = Input;

export const StrategyList: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [formVisible, setFormVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<Strategy | null>(null);

  const debouncedSearch = useDebounce(search, 500);

  // Fetch data
  const { data, isLoading, refetch } = useStrategys({
    page,
    limit: pageSize,
    search: debouncedSearch,
  });

  // Mutations
  const { delete: deleteItem, bulkDelete, isDeleting, isBulkDeleting } = useStrategyMutations();

  // Dynamic columns based on model fields
  const columns: ColumnsType<Strategy> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      render: (text, record) => (
        <a onClick={() => navigate(`/strategys/${record.id}`)}>
          {text}
        </a>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
    },
    {
      title: 'Parameters',
      dataIndex: 'parameters',
      key: 'parameters',
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
              title="Are you sure you want to delete this strategy?"
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
  const handleEdit = (item: Strategy) => {
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
              <Statistic title="Total Strategys" value={statistics.total} />
            </Col>
            {/* Add more statistics here based on your model */}
          </Row>
        )}

        <div style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col flex="auto">
              <Space>
                <Search
                  placeholder="Search strategys..."
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
                    title={`Are you sure you want to delete $\{selectedRowKeys.length} strategys?`}
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
                  New Strategy
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
        <StrategyForm
          open={formVisible}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
          initialData={editingItem}
        />
      )}
    </>
  );
};