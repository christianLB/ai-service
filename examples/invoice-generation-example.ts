import { InvoiceGenerationService } from '../src/services/financial/invoice-generation.service';
import { Invoice, InvoiceModel } from '../src/models/financial/invoice.model';
import { Client, ClientModel } from '../src/models/financial/client.model';
import { CompanyInfo } from '../src/models/financial/company.model';

// Example: Generate a sample invoice PDF
async function generateSampleInvoice() {
  // Create sample client
  const client: Client = new ClientModel({
    id: 'client_001',
    name: 'Juan García',
    businessName: 'Tech Solutions S.L.',
    taxId: 'B12345678',
    taxIdType: 'CIF',
    email: 'juan@techsolutions.com',
    phone: '+34 600 123 456',
    address: {
      street: 'Calle Innovación',
      number: '42',
      city: 'Barcelona',
      state: 'Barcelona',
      country: 'España',
      postalCode: '08001'
    },
    language: 'es',
    currency: 'EUR',
    paymentTerms: 30
  });

  // Create sample invoice
  const invoice: Invoice = new InvoiceModel({
    id: 'inv_001',
    invoiceNumber: 'FAC-2024-0001',
    clientId: client.id,
    clientName: client.businessName || client.name,
    clientTaxId: client.taxId,
    clientAddress: client.address,
    type: 'invoice',
    status: 'draft',
    issueDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    currency: 'EUR',
    taxRate: 21,
    taxType: 'IVA',
    paymentTerms: 30,
    items: [
      {
        id: 'item_001',
        description: 'Desarrollo de aplicación web personalizada',
        quantity: 40,
        unitPrice: 75,
        unit: 'horas',
        amount: 3000,
        category: 'Servicios de desarrollo'
      },
      {
        id: 'item_002',
        description: 'Configuración y despliegue en servidor',
        quantity: 8,
        unitPrice: 85,
        unit: 'horas',
        amount: 680,
        category: 'Servicios de infraestructura'
      },
      {
        id: 'item_003',
        description: 'Soporte técnico mensual',
        quantity: 1,
        unitPrice: 500,
        unit: 'mes',
        amount: 500,
        category: 'Servicios de mantenimiento'
      }
    ],
    notes: 'Gracias por confiar en nuestros servicios. Para cualquier consulta, no dude en contactarnos.',
    termsAndConditions: 'Pago a 30 días desde la fecha de emisión. En caso de retraso se aplicarán intereses de demora según la ley vigente.'
  });

  // Calculate totals
  invoice.calculateTotals();

  // Custom company configuration
  const company: CompanyInfo = {
    name: 'AI Service Solutions',
    legalName: 'AI Service Solutions S.L.',
    taxId: 'B87654321',
    taxIdType: 'CIF',
    email: 'info@aiservice.com',
    phone: '+34 900 123 456',
    website: 'https://aiservice.com',
    address: {
      street: 'Avenida de la Tecnología',
      number: '100',
      city: 'Madrid',
      state: 'Madrid',
      country: 'España',
      postalCode: '28020'
    },
    bankAccounts: [
      {
        id: 'bank_001',
        bankName: 'Banco Santander',
        accountHolder: 'AI Service Solutions S.L.',
        iban: 'ES12 1234 5678 9012 3456 7890',
        swiftBic: 'BSCHESMM',
        currency: 'EUR',
        isDefault: true,
        notes: 'Cuenta principal'
      }
    ],
    defaultBankAccount: 'bank_001',
    invoiceSettings: {
      numberPrefix: 'FAC',
      numberFormat: 'PREFIX-YYYY-0000',
      startingNumber: 1,
      yearlyReset: true,
      defaultPaymentTerms: 30,
      defaultCurrency: 'EUR',
      defaultTaxRate: 21,
      defaultTaxType: 'IVA',
      defaultLanguage: 'es'
    },
    legalInfo: {
      registrationNumber: '12345',
      registrationLocation: 'Madrid',
      capitalStock: '3.000 €',
      legalForm: 'S.L.'
    },
    branding: {
      primaryColor: '#1a73e8',
      secondaryColor: '#34a853',
      fontFamily: 'Arial, sans-serif'
    },
    emailSettings: {
      fromName: 'AI Service Invoicing',
      fromEmail: 'invoices@aiservice.com',
      replyTo: 'support@aiservice.com',
      bccEmail: 'accounting@aiservice.com'
    },
    defaultTerms: {
      es: 'Términos y condiciones estándar de AI Service Solutions S.L.',
      en: 'Standard terms and conditions of AI Service Solutions S.L.'
    },
    invoiceFooter: {
      es: 'AI Service Solutions - Soluciones tecnológicas avanzadas',
      en: 'AI Service Solutions - Advanced technology solutions'
    }
  };

  // Initialize service
  const invoiceGenerator = new InvoiceGenerationService('./generated-invoices', company);

  try {
    // Generate PDF
    console.log('Generating invoice PDF...');
    const result = await invoiceGenerator.generateInvoicePDF({
      invoice,
      client,
      company,
      language: 'es',
      showStatus: true,
      generateQR: true
    });

    console.log('Invoice PDF generated successfully!');
    console.log('File name:', result.fileName);
    console.log('File path:', result.filePath);
    console.log('PDF size:', result.pdfBuffer.length, 'bytes');

    // Generate HTML preview
    console.log('\nGenerating HTML preview...');
    const htmlPreview = await invoiceGenerator.previewInvoiceHTML({
      invoice,
      client,
      company,
      language: 'es'
    });

    console.log('HTML preview generated!');
    console.log('HTML size:', htmlPreview.length, 'characters');

    // Example: Generate invoice in English
    console.log('\nGenerating English version...');
    const englishResult = await invoiceGenerator.generateInvoicePDF({
      invoice,
      client,
      company,
      language: 'en',
      showStatus: true,
      generateQR: true
    });

    console.log('English invoice generated:', englishResult.fileName);

  } catch (error) {
    console.error('Error generating invoice:', error);
  }
}

// Run the example
if (require.main === module) {
  generateSampleInvoice()
    .then(() => {
      console.log('\nExample completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Example failed:', error);
      process.exit(1);
    });
}

export { generateSampleInvoice };