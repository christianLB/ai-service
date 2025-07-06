export interface InvoiceLabels {
  invoice: string;
  invoiceType: string;
  creditNote: string;
  proforma: string;
  receipt: string;
  invoiceNumber: string;
  date: string;
  issueDate: string;
  dueDate: string;
  servicePeriod: string;
  paymentTerms: string;
  days: string;
  billTo: string;
  invoiceDetails: string;
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  category: string;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  paymentInformation: string;
  bank: string;
  accountHolder: string;
  reference: string;
  scanToPay: string;
  notes: string;
  termsAndConditions: string;
  registeredIn: string;
  registrationNumber: string;
  capitalStock: string;
  taxId: string;
  phone: string;
  email: string;
  status: {
    draft: string;
    sent: string;
    viewed: string;
    paid: string;
    overdue: string;
    cancelled: string;
    refunded: string;
  };
}

export const INVOICE_LABELS: { [key: string]: InvoiceLabels } = {
  es: {
    invoice: 'Factura',
    invoiceType: 'Factura',
    creditNote: 'Nota de Crédito',
    proforma: 'Factura Proforma',
    receipt: 'Recibo',
    invoiceNumber: 'Número de Factura',
    date: 'Fecha',
    issueDate: 'Fecha de Emisión',
    dueDate: 'Fecha de Vencimiento',
    servicePeriod: 'Período de Servicio',
    paymentTerms: 'Términos de Pago',
    days: 'días',
    billTo: 'Facturar a',
    invoiceDetails: 'Detalles de la Factura',
    description: 'Descripción',
    quantity: 'Cantidad',
    unitPrice: 'Precio Unitario',
    amount: 'Importe',
    category: 'Categoría',
    subtotal: 'Subtotal',
    discount: 'Descuento',
    tax: 'Impuesto',
    total: 'Total',
    paymentInformation: 'Información de Pago',
    bank: 'Banco',
    accountHolder: 'Titular',
    reference: 'Referencia',
    scanToPay: 'Escanear para pagar',
    notes: 'Notas',
    termsAndConditions: 'Términos y Condiciones',
    registeredIn: 'Inscrita en el Registro Mercantil de',
    registrationNumber: 'Tomo',
    capitalStock: 'Capital Social',
    taxId: 'CIF/NIF',
    phone: 'Teléfono',
    email: 'Email',
    status: {
      draft: 'Borrador',
      sent: 'Enviada',
      viewed: 'Vista',
      paid: 'Pagada',
      overdue: 'Vencida',
      cancelled: 'Cancelada',
      refunded: 'Reembolsada'
    }
  },
  en: {
    invoice: 'Invoice',
    invoiceType: 'Invoice',
    creditNote: 'Credit Note',
    proforma: 'Proforma Invoice',
    receipt: 'Receipt',
    invoiceNumber: 'Invoice Number',
    date: 'Date',
    issueDate: 'Issue Date',
    dueDate: 'Due Date',
    servicePeriod: 'Service Period',
    paymentTerms: 'Payment Terms',
    days: 'days',
    billTo: 'Bill To',
    invoiceDetails: 'Invoice Details',
    description: 'Description',
    quantity: 'Quantity',
    unitPrice: 'Unit Price',
    amount: 'Amount',
    category: 'Category',
    subtotal: 'Subtotal',
    discount: 'Discount',
    tax: 'Tax',
    total: 'Total',
    paymentInformation: 'Payment Information',
    bank: 'Bank',
    accountHolder: 'Account Holder',
    reference: 'Reference',
    scanToPay: 'Scan to pay',
    notes: 'Notes',
    termsAndConditions: 'Terms and Conditions',
    registeredIn: 'Registered in',
    registrationNumber: 'Registration No.',
    capitalStock: 'Share Capital',
    taxId: 'Tax ID',
    phone: 'Phone',
    email: 'Email',
    status: {
      draft: 'Draft',
      sent: 'Sent',
      viewed: 'Viewed',
      paid: 'Paid',
      overdue: 'Overdue',
      cancelled: 'Cancelled',
      refunded: 'Refunded'
    }
  }
};

export function getInvoiceLabels(language: string): InvoiceLabels {
  return INVOICE_LABELS[language] || INVOICE_LABELS['en'];
}

// Invoice type labels mapping
export function getInvoiceTypeLabel(type: string, language: string): string {
  const labels = getInvoiceLabels(language);
  switch (type) {
    case 'invoice':
      return labels.invoiceType;
    case 'credit_note':
      return labels.creditNote;
    case 'proforma':
      return labels.proforma;
    case 'receipt':
      return labels.receipt;
    default:
      return labels.invoiceType;
  }
}