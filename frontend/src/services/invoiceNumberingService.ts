import api from './api';

export interface NumberingSequence {
  id: string;
  series: string;
  prefix: string;
  currentNumber: number;
  currentYear: number;
  format: string;
  yearlyReset: boolean;
  lastUsed: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NumberingStatistics {
  totalSequences: number;
  sequencesByYear: { year: number; count: number }[];
  mostUsedSeries: { series: string; count: number }[];
}

class InvoiceNumberingService {
  /**
   * Get all numbering sequences
   */
  async getSequences() {
    const response = await api.get('/financial/invoice-numbering/sequences');
    return response.data;
  }

  /**
   * Get sequences for a specific series
   */
  async getSequencesBySeries(series: string) {
    const response = await api.get(`/financial/invoice-numbering/sequences/${series}`);
    return response.data;
  }

  /**
   * Preview the next invoice number
   */
  async previewNextNumber(params?: {
    series?: string;
    prefix?: string;
    format?: string;
    year?: number;
  }) {
    const response = await api.get('/financial/invoice-numbering/preview', { params });
    return response.data;
  }

  /**
   * Set the next invoice number
   */
  async setNextNumber(data: {
    series?: string;
    prefix?: string;
    nextNumber: number;
    year?: number;
  }) {
    const response = await api.post('/financial/invoice-numbering/set-next', data);
    return response.data;
  }

  /**
   * Reset a numbering sequence
   */
  async resetSequence(data: {
    series?: string;
    prefix?: string;
    year?: number;
    confirm: boolean;
  }) {
    const response = await api.post('/financial/invoice-numbering/reset', data);
    return response.data;
  }

  /**
   * Get numbering statistics
   */
  async getStatistics() {
    const response = await api.get('/financial/invoice-numbering/statistics');
    return response.data;
  }

  /**
   * Validate an invoice number
   */
  async validateInvoiceNumber(invoiceNumber: string) {
    const response = await api.post('/financial/invoice-numbering/validate', {
      invoiceNumber
    });
    return response.data;
  }

  /**
   * Get available invoice number formats
   */
  getAvailableFormats() {
    return [
      { value: 'PREFIX-YYYY-0000', label: 'FAC-2024-0001 (Spanish Standard)' },
      { value: 'PREFIX/YYYY/0000', label: 'FAC/2024/0001 (Spanish Slash)' },
      { value: 'PREFIX-000000', label: 'FAC-000001 (Sequential Only)' },
      { value: 'YYYY-PREFIX-0000', label: '2024-FAC-0001 (Year First)' },
      { value: 'PREFIXYYYYY00000', label: 'FAC240001 (Compact)' },
      { value: 'PREFIX-YY-00000', label: 'FAC-24-00001 (Custom)' },
    ];
  }

  /**
   * Get prefix suggestions based on invoice type
   */
  getPrefixByType(type: string) {
    const prefixMap: Record<string, string> = {
      'invoice': 'FAC',
      'credit_note': 'NC',
      'proforma': 'PRO',
      'receipt': 'REC',
    };
    return prefixMap[type] || 'INV';
  }
}

export const invoiceNumberingService = new InvoiceNumberingService();