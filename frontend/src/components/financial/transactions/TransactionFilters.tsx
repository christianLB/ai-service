import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Select,
  DatePicker,
  InputNumber,
  Input,
  Button,
  Space,
  Divider,
  Tag,
  Row,
  Col,
  Typography,
} from 'antd';
import {
  FilterOutlined,
  ClearOutlined,
  SearchOutlined,
  CalendarOutlined,
  DollarOutlined,
  BankOutlined,
  TagOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Search } = Input;
const { Text } = Typography;

interface TransactionFilters {
  accountIds?: string[];
  dateRange?: [string, string];
  amountRange?: [number, number];
  type?: string[];
  status?: string[];
  searchTerm?: string;
}

interface Account {
  id: string;
  account_id: string;
  iban?: string;
  name?: string;
  currency?: string;
  institution_name?: string;
}

interface TransactionFiltersProps {
  filters: TransactionFilters;
  onChange: (filters: TransactionFilters) => void;
  accounts: Account[];
  loading: boolean;
}

const TransactionFilters: React.FC<TransactionFiltersProps> = ({
  filters,
  onChange,
  accounts,
  loading,
}) => {
  const [form] = Form.useForm();
  const [searchValue, setSearchValue] = useState(filters.searchTerm || '');

  // Transaction types
  const transactionTypes = [
    { value: 'bank_transfer', label: 'Transferencia', color: 'blue' },
    { value: 'income', label: 'Ingreso', color: 'green' },
    { value: 'expense', label: 'Gasto', color: 'red' },
    { value: 'crypto_send', label: 'Envío Crypto', color: 'purple' },
    { value: 'crypto_receive', label: 'Recepción Crypto', color: 'cyan' },
  ];

  // Transaction statuses
  const transactionStatuses = [
    { value: 'confirmed', label: 'Confirmada', color: 'success' },
    { value: 'pending', label: 'Pendiente', color: 'processing' },
    { value: 'failed', label: 'Fallida', color: 'error' },
    { value: 'cancelled', label: 'Cancelada', color: 'default' },
  ];

  // Quick filters
  const quickFilters = [
    { label: 'Hoy', days: 0 },
    { label: 'Última semana', days: 7 },
    { label: 'Último mes', days: 30 },
    { label: 'Últimos 3 meses', days: 90 },
  ];

  useEffect(() => {
    // Initialize form with current filters
    form.setFieldsValue({
      accountIds: filters.accountIds,
      dateRange: filters.dateRange
        ? [dayjs(filters.dateRange[0]), dayjs(filters.dateRange[1])]
        : undefined,
      amountMin: filters.amountRange?.[0],
      amountMax: filters.amountRange?.[1],
      type: filters.type,
      status: filters.status,
    });
  }, [filters, form]);

  const handleFormChange = () => {
    const values = form.getFieldsValue();
    const newFilters: TransactionFilters = {
      ...filters,
      accountIds: values.accountIds,
      dateRange: values.dateRange
        ? [
            values.dateRange[0].format('YYYY-MM-DD'),
            values.dateRange[1].format('YYYY-MM-DD'),
          ]
        : undefined,
      amountRange:
        values.amountMin !== undefined || values.amountMax !== undefined
          ? [values.amountMin || 0, values.amountMax || 999999]
          : undefined,
      type: values.type,
      status: values.status,
    };
    onChange(newFilters);
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);
    onChange({ ...filters, searchTerm: value });
  };

  const handleQuickFilter = (days: number) => {
    const endDate = dayjs();
    const startDate = days === 0 ? dayjs().startOf('day') : dayjs().subtract(days, 'day');
    
    form.setFieldsValue({
      dateRange: [startDate, endDate],
    });
    
    onChange({
      ...filters,
      dateRange: [startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')],
    });
  };

  const handleReset = () => {
    form.resetFields();
    setSearchValue('');
    onChange({});
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.accountIds?.length) count++;
    if (filters.dateRange) count++;
    if (filters.amountRange) count++;
    if (filters.type?.length) count++;
    if (filters.status?.length) count++;
    if (filters.searchTerm) count++;
    return count;
  };

  const activeCount = getActiveFiltersCount();

  return (
    <Card
      title={
        <Space>
          <FilterOutlined />
          <span>Filtros</span>
          {activeCount > 0 && <Tag color="blue">{activeCount} activos</Tag>}
        </Space>
      }
      extra={
        <Button
          size="small"
          icon={<ClearOutlined />}
          onClick={handleReset}
          disabled={activeCount === 0}
        >
          Limpiar
        </Button>
      }
    >
      {/* Search */}
      <Search
        placeholder="Buscar por descripción, referencia o contraparte"
        onSearch={handleSearch}
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        style={{ marginBottom: 16 }}
        prefix={<SearchOutlined />}
        allowClear
      />

      <Divider style={{ margin: '12px 0' }} />

      {/* Quick Filters */}
      <div style={{ marginBottom: 16 }}>
        <Space wrap>
          {quickFilters.map((filter) => (
            <Button
              key={filter.days}
              size="small"
              onClick={() => handleQuickFilter(filter.days)}
            >
              {filter.label}
            </Button>
          ))}
        </Space>
      </div>

      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleFormChange}
        size="small"
      >
        {/* Date Range */}
        <Form.Item name="dateRange" label={<Space><CalendarOutlined />Rango de fechas</Space>}>
          <RangePicker
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
            placeholder={['Fecha inicio', 'Fecha fin']}
          />
        </Form.Item>

        {/* Accounts */}
        <Form.Item name="accountIds" label={<Space><BankOutlined />Cuentas</Space>}>
          <Select
            mode="multiple"
            placeholder="Todas las cuentas"
            style={{ width: '100%' }}
            loading={loading}
            maxTagCount={2}
          >
            {accounts.map((account) => (
              <Option key={account.id} value={account.id}>
                <Space>
                  <BankOutlined />
                  {account.institution_name}
                  <Text type="secondary">****{account.iban?.slice(-4)}</Text>
                </Space>
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* Amount Range */}
        <Form.Item label={<Space><DollarOutlined />Rango de importe</Space>}>
          <Row gutter={8}>
            <Col span={12}>
              <Form.Item name="amountMin" noStyle>
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Mínimo"
                  prefix="€"
                  min={0}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="amountMax" noStyle>
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Máximo"
                  prefix="€"
                  min={0}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form.Item>

        {/* Transaction Type */}
        <Form.Item name="type" label={<Space><TagOutlined />Tipo</Space>}>
          <Select
            mode="multiple"
            placeholder="Todos los tipos"
            style={{ width: '100%' }}
            maxTagCount={2}
          >
            {transactionTypes.map((type) => (
              <Option key={type.value} value={type.value}>
                <Tag color={type.color}>{type.label}</Tag>
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* Status */}
        <Form.Item name="status" label={<Space><TagOutlined />Estado</Space>}>
          <Select
            mode="multiple"
            placeholder="Todos los estados"
            style={{ width: '100%' }}
            maxTagCount={2}
          >
            {transactionStatuses.map((status) => (
              <Option key={status.value} value={status.value}>
                <Tag color={status.color}>{status.label}</Tag>
              </Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default TransactionFilters;