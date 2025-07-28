import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Select,
  Space,
  Button,
  Spin,
  Alert,
  Tag,
  Tooltip,
  message,
} from 'antd';
import {
  FileExcelOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  BankOutlined,
} from '@ant-design/icons';
import dashboardService from '../services/dashboardService';
import type { ColumnsType } from 'antd/es/table';

interface YearlyReportData {
  year: number;
  currency: string;
  categories: {
    income: CategoryData[];
    expense: CategoryData[];
  };
  monthlyTotals: {
    income: Record<string, string>;
    expense: Record<string, string>;
    balance: Record<string, string>;
  };
  yearTotals: {
    income: string;
    expense: string;
    balance: string;
  };
}

interface CategoryData {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  monthlyData: Record<string, string>;
  total: string;
  percentage: number;
}

interface TableRow {
  key: string;
  category: string;
  categoryColor?: string;
  isTotal?: boolean;
  isHeader?: boolean;
  type?: 'income' | 'expense' | 'balance';
  total?: string;
  percentage?: number;
  [key: `month_${number}`]: string | undefined;
}

const YearlyFinancialReport: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<YearlyReportData | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedCurrency, setSelectedCurrency] = useState('EUR');

  const months = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ];

  useEffect(() => {
    fetchYearlyReport();
  }, [selectedYear, selectedCurrency]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchYearlyReport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await dashboardService.getYearlyReport({
        year: selectedYear,
        currency: selectedCurrency
      });

      if (response.success && response.data) {
        setReportData(response.data);
      } else {
        setError(response.error || 'Error al cargar el reporte');
      }
    } catch (err) {
      setError('Error de conexión al cargar el reporte');
      console.error('Error loading yearly report:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: string | number): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: selectedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const getCellStyle = (value: string, type?: 'income' | 'expense' | 'balance', isTotal?: boolean) => {
    const amount = parseFloat(value);
    
    if (isTotal && type === 'balance') {
      return {
        fontWeight: 'bold',
        color: amount >= 0 ? '#52c41a' : '#ff4d4f',
        backgroundColor: amount >= 0 ? '#f6ffed' : '#fff2e8',
      };
    }
    
    if (isTotal) {
      return {
        fontWeight: 'bold',
        backgroundColor: type === 'income' ? '#f6ffed' : type === 'expense' ? '#fff2e8' : '#e6f7ff',
      };
    }
    
    if (amount === 0) return {};
    
    // Calculate intensity for cell background
    const maxValue = type === 'income' 
      ? Math.max(...(reportData?.categories.income || []).map(c => 
          Math.max(...Object.values(c.monthlyData).map(v => parseFloat(v)))
        ))
      : Math.max(...(reportData?.categories.expense || []).map(c => 
          Math.max(...Object.values(c.monthlyData).map(v => parseFloat(v)))
        ));
    
    const intensity = amount / maxValue;
    const baseColor = type === 'income' ? '82, 196, 26' : '255, 77, 79';
    
    return {
      backgroundColor: `rgba(${baseColor}, ${0.05 + intensity * 0.15})`,
    };
  };

  const exportToCSV = () => {
    if (!reportData) return;

    const rows = [];
    
    // Headers
    rows.push(['Categoría', ...months, 'Total', '%']);
    
    // Income categories
    rows.push(['INGRESOS']);
    reportData.categories.income.forEach(category => {
      const monthlyValues = months.map((_, i) => category.monthlyData[(i + 1).toString()] || '0');
      rows.push([
        category.categoryName,
        ...monthlyValues,
        category.total,
        category.percentage.toFixed(2) + '%'
      ]);
    });
    
    // Income totals
    const incomeTotals = months.map((_, i) => 
      reportData.monthlyTotals?.income?.[(i + 1).toString()] || '0'
    );
    rows.push(['Total Ingresos', ...incomeTotals, reportData.yearTotals.income, '100%']);
    
    // Separator
    rows.push([]);
    
    // Expense categories
    rows.push(['EGRESOS']);
    reportData.categories.expense.forEach(category => {
      const monthlyValues = months.map((_, i) => category.monthlyData[(i + 1).toString()] || '0');
      rows.push([
        category.categoryName,
        ...monthlyValues,
        category.total,
        category.percentage.toFixed(2) + '%'
      ]);
    });
    
    // Expense totals
    const expenseTotals = months.map((_, i) => 
      reportData.monthlyTotals?.expense?.[(i + 1).toString()] || '0'
    );
    rows.push(['Total Egresos', ...expenseTotals, reportData.yearTotals.expense, '100%']);
    
    // Balance
    rows.push([]);
    const balanceValues = months.map((_, i) => 
      reportData.monthlyTotals?.balance?.[(i + 1).toString()] || '0'
    );
    rows.push(['BALANCE', ...balanceValues, reportData.yearTotals.balance, '']);
    
    // Convert to CSV
    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte_financiero_${selectedYear}.csv`;
    link.click();
    
    message.success('Reporte exportado exitosamente');
  };

  const prepareTableData = (): TableRow[] => {
    if (!reportData || !reportData.categories) return [];

    const data: TableRow[] = [];
    const months = Array.from({ length: 12 }, (_, i) => i);
    
    // Income header
    data.push({
      key: 'income-header',
      category: 'INGRESOS',
      isHeader: true,
      type: 'income',
    });
    
    // Income categories
    if (reportData.categories.income && Array.isArray(reportData.categories.income)) {
      reportData.categories.income.forEach((category) => {
      const row: TableRow = {
        key: `income-${category.categoryId}`,
        category: category.categoryName,
        categoryColor: category.categoryColor,
        type: 'income',
        total: category.total,
        percentage: category.percentage,
      };
      
      months.forEach((_, index) => {
        row[`month_${index + 1}`] = category.monthlyData[(index + 1).toString()] || '0';
      });
      
      data.push(row);
      });
    }
    
    // Income total
    const incomeTotal: TableRow = {
      key: 'income-total',
      category: 'Total Ingresos',
      isTotal: true,
      type: 'income',
      total: reportData.yearTotals.income,
      percentage: 100,
    };
    months.forEach((_, index) => {
      incomeTotal[`month_${index + 1}`] = reportData.monthlyTotals?.income?.[(index + 1).toString()] || '0';
    });
    data.push(incomeTotal);
    
    // Separator
    data.push({
      key: 'separator',
      category: '',
      isHeader: true,
    });
    
    // Expense header
    data.push({
      key: 'expense-header',
      category: 'EGRESOS',
      isHeader: true,
      type: 'expense',
    });
    
    // Expense categories
    if (reportData.categories.expense && Array.isArray(reportData.categories.expense)) {
      reportData.categories.expense.forEach((category) => {
      const row: TableRow = {
        key: `expense-${category.categoryId}`,
        category: category.categoryName,
        categoryColor: category.categoryColor,
        type: 'expense',
        total: category.total,
        percentage: category.percentage,
      };
      
      months.forEach((_, index) => {
        row[`month_${index + 1}`] = category.monthlyData[(index + 1).toString()] || '0';
      });
      
      data.push(row);
      });
    }
    
    // Expense total
    const expenseTotal: TableRow = {
      key: 'expense-total',
      category: 'Total Egresos',
      isTotal: true,
      type: 'expense',
      total: reportData.yearTotals.expense,
      percentage: 100,
    };
    months.forEach((_, index) => {
      expenseTotal[`month_${index + 1}`] = reportData.monthlyTotals?.expense?.[(index + 1).toString()] || '0';
    });
    data.push(expenseTotal);
    
    // Balance
    const balance: TableRow = {
      key: 'balance',
      category: 'BALANCE',
      isTotal: true,
      type: 'balance',
      total: reportData.yearTotals.balance,
    };
    months.forEach((_, index) => {
      balance[`month_${index + 1}`] = reportData.monthlyTotals?.balance?.[(index + 1).toString()] || '0';
    });
    data.push(balance);
    
    return data;
  };

  const columns: ColumnsType<TableRow> = [
    {
      title: 'Categoría',
      dataIndex: 'category',
      key: 'category',
      fixed: 'left',
      width: 200,
      render: (text, record) => {
        if (record.isHeader && record.type) {
          const icon = record.type === 'income' ? <ArrowUpOutlined /> : 
                       record.type === 'expense' ? <ArrowDownOutlined /> : 
                       <BankOutlined />;
          const color = record.type === 'income' ? '#52c41a' : 
                       record.type === 'expense' ? '#ff4d4f' : 
                       '#1890ff';
          return (
            <span style={{ fontWeight: 'bold', color, display: 'flex', alignItems: 'center', gap: '8px' }}>
              {icon} {text}
            </span>
          );
        }
        
        if (record.isTotal) {
          return <span style={{ fontWeight: 'bold' }}>{text}</span>;
        }
        
        if (record.categoryColor) {
          return (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span 
                style={{ 
                  width: 12, 
                  height: 12, 
                  borderRadius: '50%', 
                  backgroundColor: record.categoryColor,
                  display: 'inline-block'
                }} 
              />
              {text}
            </span>
          );
        }
        
        return text;
      },
    },
    ...months.map((month, index) => ({
      title: month,
      dataIndex: `month_${index + 1}`,
      key: `month_${index + 1}`,
      width: 90,
      align: 'right' as const,
      render: (value: string, record: TableRow) => {
        if (record.isHeader || !value) return null;
        
        const amount = parseFloat(value);
        if (amount === 0 && !record.isTotal) return '-';
        
        return (
          <span style={getCellStyle(value, record.type, record.isTotal)}>
            {formatCurrency(value)}
          </span>
        );
      },
    })),
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 120,
      align: 'right',
      fixed: 'right',
      render: (value: string, record: TableRow) => {
        if (record.isHeader || !value) return null;
        
        return (
          <span style={{ fontWeight: 'bold' }}>
            {formatCurrency(value)}
          </span>
        );
      },
    },
    {
      title: '%',
      dataIndex: 'percentage',
      key: 'percentage',
      width: 80,
      align: 'right',
      fixed: 'right',
      render: (value: number, record: TableRow) => {
        if (record.isHeader || record.type === 'balance' || !value) return null;
        
        return (
          <Tag color={record.type === 'income' ? 'green' : 'red'}>
            {value.toFixed(1)}%
          </Tag>
        );
      },
    },
  ];

  return (
    <div>
      <Card 
        title="Reporte Financiero Anual"
        extra={
          <Space>
            <Select
              value={selectedYear}
              onChange={setSelectedYear}
              style={{ width: 120 }}
            >
              {[...Array(5)].map((_, i) => {
                const year = new Date().getFullYear() - i;
                return (
                  <Select.Option key={year} value={year}>
                    {year}
                  </Select.Option>
                );
              })}
            </Select>
            
            <Select
              value={selectedCurrency}
              onChange={setSelectedCurrency}
              style={{ width: 100 }}
            >
              <Select.Option value="EUR">EUR</Select.Option>
              <Select.Option value="USD">USD</Select.Option>
              <Select.Option value="GBP">GBP</Select.Option>
            </Select>
            
            <Tooltip title="Exportar a CSV">
              <Button 
                icon={<FileExcelOutlined />} 
                onClick={exportToCSV} 
                disabled={!reportData}
              >
                Exportar
              </Button>
            </Tooltip>
          </Space>
        }
      >
        {loading && (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" />
            <p style={{ marginTop: 16 }}>Cargando reporte anual...</p>
          </div>
        )}

        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {!loading && !error && reportData && (
          <>
            {/* Check if there's no data */}
            {reportData.categories && 
             reportData.categories.income.length === 0 && 
             reportData.categories.expense.length === 0 ? (
              <Alert
                message="No hay datos para mostrar"
                description={
                  <div>
                    <p>No se encontraron transacciones categorizadas para el año {selectedYear}.</p>
                    <p style={{ marginTop: 8 }}>
                      Esto puede deberse a:
                    </p>
                    <ul style={{ marginTop: 8, marginBottom: 8 }}>
                      <li>Las transacciones no han sido categorizadas</li>
                      <li>No hay transacciones para este período</li>
                      <li>Las transacciones no tienen la moneda seleccionada ({selectedCurrency})</li>
                    </ul>
                    <p>
                      <strong>Acción recomendada:</strong> Dirígete a la sección de transacciones 
                      para categorizar las transacciones existentes o importar nuevas transacciones.
                    </p>
                  </div>
                }
                type="warning"
                showIcon
                icon={<BankOutlined />}
                style={{ marginBottom: 16 }}
              />
            ) : (
              <Table
                columns={columns}
                dataSource={prepareTableData()}
                pagination={false}
                scroll={{ x: 1500 }}
                size="small"
                bordered
                rowClassName={(record) => {
                  if (record.isHeader) return 'header-row';
                  if (record.isTotal) return 'total-row';
                  return '';
                }}
              />
            )}
          </>
        )}
      </Card>
      
      <style>{`
        .header-row {
          background-color: #fafafa !important;
        }
        .total-row {
          background-color: #f0f0f0 !important;
          font-weight: bold;
        }
        .ant-table-cell {
          padding: 8px !important;
        }
      `}</style>
    </div>
  );
};

export default YearlyFinancialReport;