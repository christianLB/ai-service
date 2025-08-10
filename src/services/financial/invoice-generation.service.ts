import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';
import QRCode from 'qrcode';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Invoice, InvoiceItem } from '../../models/financial/invoice.model';
import { Client } from '../../models/financial/client.model';
import { CompanyInfo, BankAccount, DEFAULT_COMPANY_CONFIG } from '../../models/financial/company.model';
import { getInvoiceLabels, getInvoiceTypeLabel } from '../../templates/invoice/labels';
import { logger } from '../../utils/log';
import { prisma } from '../../lib/prisma';

export interface InvoiceGenerationOptions {
  invoice: Invoice;
  client: Client;
  company?: CompanyInfo;
  language?: string;
  showStatus?: boolean;
  generateQR?: boolean;
  bankAccountId?: string;
}

export interface GeneratedInvoice {
  pdfBuffer: Buffer;
  fileName: string;
  filePath?: string;
}

export class InvoiceGenerationService {
  private templateCache: Map<string, HandlebarsTemplateDelegate> = new Map();
  private outputDir: string;
  private company: CompanyInfo;

  constructor(outputDir?: string, company?: CompanyInfo) {
    this.outputDir = outputDir || path.join(process.cwd(), 'generated-invoices');
    this.company = company || DEFAULT_COMPANY_CONFIG;
    this.initializeHelpers();
  }

  private initializeHelpers(): void {
    // Format currency helper
    Handlebars.registerHelper('formatCurrency', (amount: number, currency: string) => {
      const formatter = new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: currency || 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      return formatter.format(amount);
    });

    // Format date helper
    Handlebars.registerHelper('formatDate', (date: Date | string) => {
      if (!date) {
        return '';
      }
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return dateObj.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    });

    // Equality helper
    Handlebars.registerHelper('eq', (a: any, b: any) => a === b);

    // Math helpers
    Handlebars.registerHelper('add', (a: number, b: number) => a + b);
    Handlebars.registerHelper('subtract', (a: number, b: number) => a - b);
    Handlebars.registerHelper('multiply', (a: number, b: number) => a * b);
    Handlebars.registerHelper('divide', (a: number, b: number) => a / b);
  }

  private async loadTemplate(templateName: string): Promise<HandlebarsTemplateDelegate> {
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }

    const templatePath = path.join(__dirname, '../../templates/invoice', `${templateName}.template.html`);
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    const template = Handlebars.compile(templateContent);

    this.templateCache.set(templateName, template);
    return template;
  }

  private async loadCustomTemplate(templateId: string): Promise<HandlebarsTemplateDelegate | null> {
    try {
      const customTemplate = await prisma.invoiceTemplate.findUnique({
        where: { id: templateId }
      });

      if (!customTemplate) {
        return null;
      }

      // Cache key for custom templates
      const cacheKey = `custom_${templateId}`;

      // Check cache first
      if (this.templateCache.has(cacheKey)) {
        return this.templateCache.get(cacheKey)!;
      }

      // Compile the custom template
      const template = Handlebars.compile(customTemplate.htmlContent);
      this.templateCache.set(cacheKey, template);

      return template;
    } catch (error) {
      logger.error('Error loading custom template:', error);
      return null;
    }
  }

  private async generateQRCode(data: string): Promise<string> {
    try {
      return await QRCode.toDataURL(data, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    } catch (error) {
      logger.error('Error generating QR code:', error);
      return '';
    }
  }

  private calculateDiscountAmount(invoice: Invoice): number {
    if (!invoice.discount) {
      return 0;
    }

    if (invoice.discountType === 'percentage') {
      return invoice.subtotal * (invoice.discount / 100);
    }
    return invoice.discount;
  }

  private async generatePaymentQRData(invoice: Invoice, bankAccount: BankAccount): Promise<string> {
    // Generate SEPA QR code format (EPC QR Code)
    const qrData = [
      'BCD', // Service tag
      '002', // Version
      '1', // Character set (UTF-8)
      'SCT', // Identification
      bankAccount.swiftBic || '', // BIC
      bankAccount.accountHolder, // Beneficiary name
      bankAccount.iban || '', // Account number
      `EUR${invoice.total.toFixed(2)}`, // Amount
      '', // Purpose
      invoice.invoiceNumber, // Reference
      '', // Remittance
      `Payment for invoice ${invoice.invoiceNumber}` // Information
    ].join('\n');

    return qrData;
  }

  async generateInvoicePDF(options: InvoiceGenerationOptions): Promise<GeneratedInvoice> {
    const {
      invoice,
      client,
      company = this.company,
      language = client.language || 'es',
      showStatus = false,
      generateQR = true,
      bankAccountId
    } = options;

    try {
      // Load template - check for custom template first
      let template: HandlebarsTemplateDelegate;

      // Check if invoice has templateId (may be added as custom field)
      const templateId = (invoice as any).templateId;
      if (templateId) {
        const customTemplate = await this.loadCustomTemplate(templateId);
        if (customTemplate) {
          template = customTemplate;
        } else {
          // Fallback to default template if custom template not found
          logger.warn(`Custom template ${templateId} not found, using default template`);
          template = await this.loadTemplate('invoice');
        }
      } else {
        // Use default template
        template = await this.loadTemplate('invoice');
      }

      // Get language labels
      const labels = getInvoiceLabels(language);

      // Get the correct invoice type label
      const invoiceTypeLabel = getInvoiceTypeLabel(invoice.type, language);

      // Find the bank account
      let bankAccount: BankAccount | undefined;
      if (bankAccountId) {
        bankAccount = company.bankAccounts?.find(acc => acc.id === bankAccountId);
      } else {
        bankAccount = company.bankAccounts?.find(acc => acc.isDefault);
      }

      // Generate QR code if requested
      let qrCode: string | undefined;
      if (generateQR && bankAccount) {
        const qrData = await this.generatePaymentQRData(invoice, bankAccount);
        qrCode = await this.generateQRCode(qrData);
      }

      // Calculate discount amount for display
      const discountAmount = this.calculateDiscountAmount(invoice);

      // Prepare template data
      const templateData = {
        invoice,
        client,
        company,
        labels: {
          ...labels,
          invoiceType: invoiceTypeLabel
        },
        language,
        showStatus,
        bankAccount,
        qrCode,
        discountAmount
      };

      // Render HTML
      const html = template(templateData);

      // Launch Puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=IsolateOrigins',
          '--disable-site-isolation-trials'
        ]
      });

      try {
        const page = await browser.newPage();

        // Set content
        await page.setContent(html, {
          waitUntil: 'networkidle0'
        });

        // Set PDF options
        const pdfData = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
            top: '20mm',
            right: '15mm',
            bottom: '20mm',
            left: '15mm'
          }
        });

        // Convert Uint8Array to Buffer
        const pdfBuffer = Buffer.from(pdfData);

        // Generate filename
        const fileName = `${invoice.invoiceNumber.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;

        // Ensure output directory exists
        await fs.mkdir(this.outputDir, { recursive: true });

        // Save PDF to file
        const filePath = path.join(this.outputDir, fileName);
        await fs.writeFile(filePath, pdfBuffer);

        logger.info(`Invoice PDF generated successfully: ${fileName}`);

        return {
          pdfBuffer,
          fileName,
          filePath
        };

      } finally {
        await browser.close();
      }

    } catch (error) {
      logger.error('Error generating invoice PDF:', error);
      throw new Error(`Failed to generate invoice PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateBatchInvoices(invoices: InvoiceGenerationOptions[]): Promise<GeneratedInvoice[]> {
    const results: GeneratedInvoice[] = [];

    for (const invoiceOptions of invoices) {
      try {
        const result = await this.generateInvoicePDF(invoiceOptions);
        results.push(result);
      } catch (error) {
        logger.error(`Error generating invoice ${invoiceOptions.invoice.invoiceNumber}:`, error);
        // Continue with other invoices
      }
    }

    return results;
  }

  async previewInvoiceHTML(options: InvoiceGenerationOptions): Promise<string> {
    const {
      invoice,
      client,
      company = this.company,
      language = client.language || 'es',
      showStatus = true,
      generateQR = true,
      bankAccountId
    } = options;

    // Load template
    const template = await this.loadTemplate('invoice');

    // Get language labels
    const labels = getInvoiceLabels(language);

    // Get the correct invoice type label
    const invoiceTypeLabel = getInvoiceTypeLabel(invoice.type, language);

    // Find the bank account
    let bankAccount: BankAccount | undefined;
    if (bankAccountId) {
      bankAccount = company.bankAccounts?.find(acc => acc.id === bankAccountId);
    } else {
      bankAccount = company.bankAccounts?.find(acc => acc.isDefault);
    }

    // Generate QR code if requested
    let qrCode: string | undefined;
    if (generateQR && bankAccount) {
      const qrData = await this.generatePaymentQRData(invoice, bankAccount);
      qrCode = await this.generateQRCode(qrData);
    }

    // Calculate discount amount for display
    const discountAmount = this.calculateDiscountAmount(invoice);

    // Prepare template data
    const templateData = {
      invoice,
      client,
      company,
      labels: {
        ...labels,
        invoiceType: invoiceTypeLabel
      },
      language,
      showStatus,
      bankAccount,
      qrCode,
      discountAmount
    };

    // Render and return HTML
    return template(templateData);
  }

  // Clean up old invoices
  async cleanupOldInvoices(daysToKeep: number = 90): Promise<void> {
    try {
      const files = await fs.readdir(this.outputDir);
      const now = Date.now();
      const cutoffTime = now - (daysToKeep * 24 * 60 * 60 * 1000);

      for (const file of files) {
        if (file.endsWith('.pdf')) {
          const filePath = path.join(this.outputDir, file);
          const stats = await fs.stat(filePath);

          if (stats.mtimeMs < cutoffTime) {
            await fs.unlink(filePath);
            logger.info(`Deleted old invoice: ${file}`);
          }
        }
      }
    } catch (error) {
      logger.error('Error cleaning up old invoices:', error);
    }
  }
}

// Export singleton instance
export const invoiceGenerationService = new InvoiceGenerationService();