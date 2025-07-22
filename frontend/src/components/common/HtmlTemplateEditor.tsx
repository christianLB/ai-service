import React, { useRef, useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button, Dropdown, Space, Tooltip } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';

// Define available template variables
const TEMPLATE_VARIABLES = {
  company: [
    { key: 'company.name', label: 'Company Name', value: '{{company.name}}' },
    { key: 'company.taxId', label: 'Company Tax ID', value: '{{company.taxId}}' },
    { key: 'company.email', label: 'Company Email', value: '{{company.email}}' },
    { key: 'company.phone', label: 'Company Phone', value: '{{company.phone}}' },
    { key: 'company.website', label: 'Company Website', value: '{{company.website}}' },
    { key: 'company.address', label: 'Company Address', value: '{{company.address}}' },
  ],
  client: [
    { key: 'client.name', label: 'Client Name', value: '{{client.name}}' },
    { key: 'client.businessName', label: 'Business Name', value: '{{client.businessName}}' },
    { key: 'client.taxId', label: 'Client Tax ID', value: '{{client.taxId}}' },
    { key: 'client.email', label: 'Client Email', value: '{{client.email}}' },
    { key: 'client.phone', label: 'Client Phone', value: '{{client.phone}}' },
    { key: 'client.address', label: 'Client Address', value: '{{client.address}}' },
  ],
  invoice: [
    { key: 'invoice.invoiceNumber', label: 'Invoice Number', value: '{{invoice.invoiceNumber}}' },
    { key: 'invoice.issueDate', label: 'Issue Date', value: '{{invoice.issueDate}}' },
    { key: 'invoice.dueDate', label: 'Due Date', value: '{{invoice.dueDate}}' },
    { key: 'invoice.subtotal', label: 'Subtotal', value: '{{invoice.subtotal}}' },
    { key: 'invoice.taxAmount', label: 'Tax Amount', value: '{{invoice.taxAmount}}' },
    { key: 'invoice.total', label: 'Total', value: '{{invoice.total}}' },
    { key: 'invoice.currency', label: 'Currency', value: '{{invoice.currency}}' },
    { key: 'invoice.paymentTerms', label: 'Payment Terms', value: '{{invoice.paymentTerms}}' },
  ],
  bank: [
    { key: 'bank.accountHolder', label: 'Account Holder', value: '{{bank.accountHolder}}' },
    { key: 'bank.accountNumber', label: 'Account Number', value: '{{bank.accountNumber}}' },
    { key: 'bank.iban', label: 'IBAN', value: '{{bank.iban}}' },
    { key: 'bank.swiftBic', label: 'SWIFT/BIC', value: '{{bank.swiftBic}}' },
    { key: 'bank.bankName', label: 'Bank Name', value: '{{bank.bankName}}' },
  ],
  other: [
    { key: 'currentDate', label: 'Current Date', value: '{{currentDate}}' },
    { key: 'currentYear', label: 'Current Year', value: '{{currentYear}}' },
  ],
};

interface HtmlTemplateEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  height?: string;
  showVariables?: boolean;
  readOnly?: boolean;
}

export const HtmlTemplateEditor: React.FC<HtmlTemplateEditorProps> = ({
  value = '',
  onChange,
  placeholder = 'Enter your template content...',
  height = '400px',
  showVariables = true,
  readOnly = false,
}) => {
  const quillRef = useRef<ReactQuill>(null);

  // Insert variable at cursor position
  const insertVariable = (variable: string) => {
    const quill = quillRef.current?.getEditor();
    if (quill) {
      const range = quill.getSelection();
      if (range) {
        quill.insertText(range.index, variable);
        quill.setSelection(range.index + variable.length);
      } else {
        const length = quill.getLength();
        quill.insertText(length - 1, variable);
      }
    }
  };

  // Build menu items for variable dropdown
  const variableMenuItems: MenuProps['items'] = useMemo(() => {
    return Object.entries(TEMPLATE_VARIABLES).map(([category, variables]) => ({
      key: category,
      label: category.charAt(0).toUpperCase() + category.slice(1),
      children: variables.map((variable) => ({
        key: variable.key,
        label: (
          <Space>
            <span>{variable.label}</span>
            <code style={{ fontSize: '12px', color: '#666' }}>{variable.value}</code>
          </Space>
        ),
        onClick: () => insertVariable(variable.value),
      })),
    }));
  }, []);

  // Quill modules configuration
  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ align: [] }],
        ['link', 'image'],
        ['clean'],
        [{ color: [] }, { background: [] }],
        [{ font: [] }],
        [{ size: ['small', false, 'large', 'huge'] }],
      ],
    }),
    []
  );

  // Quill formats
  const formats = [
    'header',
    'bold',
    'italic',
    'underline',
    'strike',
    'list',
    'bullet',
    'align',
    'link',
    'image',
    'color',
    'background',
    'font',
    'size',
  ];

  return (
    <div className="html-template-editor">
      {showVariables && !readOnly && (
        <div style={{ marginBottom: '8px' }}>
          <Dropdown menu={{ items: variableMenuItems }} placement="bottomLeft">
            <Button icon={<PlusOutlined />} type="primary">
              Insert Variable
            </Button>
          </Dropdown>
          <Tooltip title="Use these variables to insert dynamic content that will be replaced with actual values when generating invoices">
            <span style={{ marginLeft: '8px', color: '#666', fontSize: '12px' }}>
              Variables will be replaced with actual values
            </span>
          </Tooltip>
        </div>
      )}
      
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        readOnly={readOnly}
        style={{ height, marginBottom: '42px' }}
      />
      
      <style>{`
        .html-template-editor :global(.ql-container) {
          font-size: 14px;
        }
        .html-template-editor :global(.ql-editor) {
          min-height: 200px;
        }
        .html-template-editor :global(.ql-snow .ql-tooltip) {
          z-index: 10000;
        }
      `}</style>
    </div>
  );
};