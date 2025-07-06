import nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import Handlebars from 'handlebars';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../../utils/log';
import { Invoice } from '../../models/financial/invoice.model';
import { Client } from '../../models/financial/client.model';
import { CompanyInfo } from '../../models/financial/company.model';
import { getInvoiceLabels } from '../../templates/invoice/labels';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: {
    name: string;
    email: string;
  };
}

export interface InvoiceEmailOptions {
  invoice: Invoice;
  client: Client;
  company: CompanyInfo;
  pdfBuffer: Buffer;
  language?: string;
  subject?: string;
  message?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
}

export interface EmailTemplate {
  subject: string;
  body: string;
}

export class InvoiceEmailService {
  private transporter: Transporter;
  private config: EmailConfig;
  private templateCache: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor(config?: EmailConfig) {
    this.config = config || this.getDefaultConfig();
    this.transporter = this.createTransporter();
    this.initializeHelpers();
  }

  private getDefaultConfig(): EmailConfig {
    return {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      },
      from: {
        name: process.env.EMAIL_FROM_NAME || 'AI Service',
        email: process.env.EMAIL_FROM || 'noreply@aiservice.com'
      }
    };
  }

  private createTransporter(): Transporter {
    return nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth,
      tls: {
        rejectUnauthorized: false // For self-signed certificates
      }
    });
  }

  private initializeHelpers(): void {
    // Reuse helpers from invoice generation
    Handlebars.registerHelper('formatCurrency', (amount: number, currency: string) => {
      const formatter = new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: currency || 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      return formatter.format(amount);
    });

    Handlebars.registerHelper('formatDate', (date: Date | string) => {
      if (!date) return '';
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return dateObj.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    });
  }

  private async loadEmailTemplate(templateName: string, language: string): Promise<EmailTemplate> {
    const cacheKey = `${templateName}_${language}`;
    
    // Default templates
    const defaultTemplates: { [key: string]: { [lang: string]: EmailTemplate } } = {
      'invoice': {
        'es': {
          subject: 'Factura {{invoice.invoiceNumber}} - {{company.name}}',
          body: `
Estimado/a {{client.name}},

Adjunto encontrará la factura {{invoice.invoiceNumber}} correspondiente a los servicios prestados.

**Resumen de la factura:**
- Número: {{invoice.invoiceNumber}}
- Fecha: {{formatDate invoice.issueDate}}
- Importe total: {{formatCurrency invoice.total invoice.currency}}
- Fecha de vencimiento: {{formatDate invoice.dueDate}}

{{#if customMessage}}
{{customMessage}}
{{/if}}

**Información de pago:**
Por favor, realice el pago antes de la fecha de vencimiento utilizando los siguientes datos bancarios:
{{#if bankAccount}}
- Banco: {{bankAccount.bankName}}
- Titular: {{bankAccount.accountHolder}}
- IBAN: {{bankAccount.iban}}
{{#if bankAccount.swiftBic}}- SWIFT/BIC: {{bankAccount.swiftBic}}{{/if}}
- Referencia: {{invoice.invoiceNumber}}
{{/if}}

Si tiene alguna pregunta sobre esta factura, no dude en contactarnos.

Atentamente,
{{company.name}}
{{company.email}}
{{company.phone}}`
        },
        'en': {
          subject: 'Invoice {{invoice.invoiceNumber}} - {{company.name}}',
          body: `
Dear {{client.name}},

Please find attached invoice {{invoice.invoiceNumber}} for the services provided.

**Invoice Summary:**
- Number: {{invoice.invoiceNumber}}
- Date: {{formatDate invoice.issueDate}}
- Total Amount: {{formatCurrency invoice.total invoice.currency}}
- Due Date: {{formatDate invoice.dueDate}}

{{#if customMessage}}
{{customMessage}}
{{/if}}

**Payment Information:**
Please make payment before the due date using the following bank details:
{{#if bankAccount}}
- Bank: {{bankAccount.bankName}}
- Account Holder: {{bankAccount.accountHolder}}
- IBAN: {{bankAccount.iban}}
{{#if bankAccount.swiftBic}}- SWIFT/BIC: {{bankAccount.swiftBic}}{{/if}}
- Reference: {{invoice.invoiceNumber}}
{{/if}}

If you have any questions about this invoice, please don't hesitate to contact us.

Best regards,
{{company.name}}
{{company.email}}
{{company.phone}}`
        }
      },
      'reminder': {
        'es': {
          subject: 'Recordatorio - Factura {{invoice.invoiceNumber}} pendiente de pago',
          body: `
Estimado/a {{client.name}},

Le recordamos que la factura {{invoice.invoiceNumber}} con fecha de vencimiento {{formatDate invoice.dueDate}} está pendiente de pago.

**Detalles:**
- Importe: {{formatCurrency invoice.total invoice.currency}}
- Días de retraso: {{daysOverdue}}

Le agradeceríamos que realizara el pago lo antes posible.

Atentamente,
{{company.name}}`
        },
        'en': {
          subject: 'Reminder - Invoice {{invoice.invoiceNumber}} payment pending',
          body: `
Dear {{client.name}},

This is a reminder that invoice {{invoice.invoiceNumber}} with due date {{formatDate invoice.dueDate}} is pending payment.

**Details:**
- Amount: {{formatCurrency invoice.total invoice.currency}}
- Days overdue: {{daysOverdue}}

We would appreciate if you could make the payment as soon as possible.

Best regards,
{{company.name}}`
        }
      },
      'receipt': {
        'es': {
          subject: 'Recibo de pago - Factura {{invoice.invoiceNumber}}',
          body: `
Estimado/a {{client.name}},

Confirmamos la recepción del pago de la factura {{invoice.invoiceNumber}}.

**Detalles del pago:**
- Importe: {{formatCurrency invoice.total invoice.currency}}
- Fecha de pago: {{formatDate invoice.paidDate}}
{{#if invoice.paymentReference}}- Referencia: {{invoice.paymentReference}}{{/if}}

Gracias por su pago puntual.

Atentamente,
{{company.name}}`
        },
        'en': {
          subject: 'Payment receipt - Invoice {{invoice.invoiceNumber}}',
          body: `
Dear {{client.name}},

We confirm receipt of payment for invoice {{invoice.invoiceNumber}}.

**Payment details:**
- Amount: {{formatCurrency invoice.total invoice.currency}}
- Payment date: {{formatDate invoice.paidDate}}
{{#if invoice.paymentReference}}- Reference: {{invoice.paymentReference}}{{/if}}

Thank you for your prompt payment.

Best regards,
{{company.name}}`
        }
      }
    };

    const template = defaultTemplates[templateName]?.[language] || defaultTemplates[templateName]?.['en'];
    
    if (!template) {
      throw new Error(`Email template '${templateName}' not found`);
    }

    return template;
  }

  async sendInvoiceEmail(options: InvoiceEmailOptions): Promise<boolean> {
    try {
      const {
        invoice,
        client,
        company,
        pdfBuffer,
        language = client.language || 'es',
        subject: customSubject,
        message: customMessage,
        cc,
        bcc,
        replyTo
      } = options;

      // Load email template
      const template = await this.loadEmailTemplate('invoice', language);

      // Find bank account
      const bankAccount = company.bankAccounts?.find(acc => acc.isDefault);

      // Prepare template data
      const templateData = {
        invoice,
        client,
        company,
        bankAccount,
        customMessage,
        daysOverdue: this.calculateDaysOverdue(invoice.dueDate)
      };

      // Compile subject and body
      const subjectTemplate = Handlebars.compile(customSubject || template.subject);
      const bodyTemplate = Handlebars.compile(template.body);

      const subject = subjectTemplate(templateData);
      const htmlBody = this.convertMarkdownToHtml(bodyTemplate(templateData));

      // Prepare email options
      const mailOptions = {
        from: `${company.emailSettings?.fromName || company.name} <${company.emailSettings?.fromEmail || this.config.from.email}>`,
        to: client.email,
        subject,
        html: htmlBody,
        cc,
        bcc: [...(bcc || []), ...(company.emailSettings?.bccEmail ? [company.emailSettings.bccEmail] : [])],
        replyTo: replyTo || company.emailSettings?.replyTo,
        attachments: [
          {
            filename: `${invoice.invoiceNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      };

      // Send email
      const info = await this.transporter.sendMail(mailOptions);
      
      logger.info(`Invoice email sent successfully: ${info.messageId}`);
      return true;

    } catch (error) {
      logger.error('Error sending invoice email:', error);
      return false;
    }
  }

  async sendPaymentReminder(
    invoice: Invoice, 
    client: Client, 
    company: CompanyInfo,
    language?: string
  ): Promise<boolean> {
    try {
      const template = await this.loadEmailTemplate('reminder', language || client.language || 'es');
      
      const templateData = {
        invoice,
        client,
        company,
        daysOverdue: this.calculateDaysOverdue(invoice.dueDate)
      };

      const subjectTemplate = Handlebars.compile(template.subject);
      const bodyTemplate = Handlebars.compile(template.body);

      const subject = subjectTemplate(templateData);
      const htmlBody = this.convertMarkdownToHtml(bodyTemplate(templateData));

      const mailOptions = {
        from: `${company.emailSettings?.fromName || company.name} <${company.emailSettings?.fromEmail || this.config.from.email}>`,
        to: client.email,
        subject,
        html: htmlBody,
        replyTo: company.emailSettings?.replyTo
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      logger.info(`Payment reminder sent successfully: ${info.messageId}`);
      return true;

    } catch (error) {
      logger.error('Error sending payment reminder:', error);
      return false;
    }
  }

  async sendPaymentReceipt(
    invoice: Invoice,
    client: Client,
    company: CompanyInfo,
    pdfBuffer?: Buffer,
    language?: string
  ): Promise<boolean> {
    try {
      const template = await this.loadEmailTemplate('receipt', language || client.language || 'es');
      
      const templateData = {
        invoice,
        client,
        company
      };

      const subjectTemplate = Handlebars.compile(template.subject);
      const bodyTemplate = Handlebars.compile(template.body);

      const subject = subjectTemplate(templateData);
      const htmlBody = this.convertMarkdownToHtml(bodyTemplate(templateData));

      const mailOptions: any = {
        from: `${company.emailSettings?.fromName || company.name} <${company.emailSettings?.fromEmail || this.config.from.email}>`,
        to: client.email,
        subject,
        html: htmlBody,
        replyTo: company.emailSettings?.replyTo
      };

      // Attach receipt PDF if provided
      if (pdfBuffer) {
        mailOptions.attachments = [{
          filename: `Receipt_${invoice.invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }];
      }

      const info = await this.transporter.sendMail(mailOptions);
      
      logger.info(`Payment receipt sent successfully: ${info.messageId}`);
      return true;

    } catch (error) {
      logger.error('Error sending payment receipt:', error);
      return false;
    }
  }

  private calculateDaysOverdue(dueDate: Date): number {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = now.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  private convertMarkdownToHtml(markdown: string): string {
    // Simple markdown to HTML conversion
    let html = markdown
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
    
    // Wrap in paragraphs
    html = `<p>${html}</p>`;
    
    // Add basic styling
    return `
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            strong {
              color: #222;
            }
            p {
              margin: 10px 0;
            }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error) {
      logger.error('Email service connection failed:', error);
      return false;
    }
  }
}

// Export singleton instance with lazy initialization
let emailService: InvoiceEmailService | null = null;

export function getInvoiceEmailService(config?: EmailConfig): InvoiceEmailService {
  if (!emailService) {
    emailService = new InvoiceEmailService(config);
  }
  return emailService;
}