# Invoice Generation System

## Overview

The AI Service includes a professional PDF invoice generation system with the following features:

- **Professional PDF Generation**: Beautiful, customizable invoice templates
- **Multi-language Support**: Spanish and English templates
- **Sequential Numbering**: Automatic invoice numbering with yearly reset
- **QR Code Payments**: SEPA-compliant QR codes for easy payment
- **Email Integration**: Send invoices directly via email
- **Storage System**: Secure storage and retrieval of generated PDFs
- **Legal Compliance**: Meets Spanish/EU invoicing requirements

## Features

### 1. PDF Generation
- Professional HTML/CSS templates using Handlebars
- Puppeteer for high-quality PDF rendering
- Customizable branding (logo, colors, fonts)
- Responsive design for email viewing

### 2. Invoice Numbering
- Sequential numbering with format customization
- Yearly reset option
- Multiple series support (e.g., different prefixes for different clients)
- Formats: FAC-2024-0001, FAC/2024/0001, etc.

### 3. Email Sending
- SMTP integration for direct sending
- Customizable email templates
- Payment reminders and receipts
- CC/BCC support

### 4. Storage
- Local file storage with organized directory structure
- Database tracking of all generated PDFs
- Temporary download links
- Automatic cleanup of old files

## API Endpoints

### Generate PDF
```http
POST /api/financial/invoices/:id/generate-pdf
{
  "language": "es",
  "showStatus": true,
  "generateQR": true
}
```

### Download PDF
```http
GET /api/financial/invoices/:id/download-pdf
```

### Preview Invoice
```http
GET /api/financial/invoices/:id/preview?language=es
```

### Send Invoice Email
```http
POST /api/financial/invoices/:id/send-email
{
  "subject": "Custom subject (optional)",
  "message": "Custom message (optional)",
  "cc": ["cc@example.com"],
  "bcc": ["bcc@example.com"],
  "language": "es"
}
```

### Send Payment Reminder
```http
POST /api/financial/invoices/:id/send-reminder
{
  "language": "es"
}
```

### Get Next Invoice Number
```http
GET /api/financial/invoices/numbering/next?series=DEFAULT&prefix=FAC
```

### Get Numbering Sequences
```http
GET /api/financial/invoices/numbering/sequences
```

## Configuration

### Environment Variables

Copy `.env.invoice.example` to `.env` and configure:

```bash
# Company Information
COMPANY_NAME="Your Company Name"
COMPANY_LEGAL_NAME="Your Company Legal Name S.L."
COMPANY_TAX_ID="B12345678"
COMPANY_EMAIL="invoices@yourcompany.com"
COMPANY_PHONE="+34 900 000 000"

# Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

### Company Configuration

Edit `src/models/financial/company.model.ts` to customize:

- Company details
- Bank accounts
- Invoice settings
- Default terms and conditions
- Branding (logo, colors)

## Usage Examples

### 1. Create and Generate Invoice PDF

```javascript
// Create invoice
const invoice = await fetch('/api/financial/invoices', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    clientId: 'client_123',
    items: [
      {
        description: 'Web Development Services',
        quantity: 40,
        unitPrice: 50,
        unit: 'hours'
      }
    ],
    taxRate: 21,
    paymentTerms: 30
  })
});

// Generate PDF
const pdf = await fetch(`/api/financial/invoices/${invoice.id}/generate-pdf`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    language: 'es',
    generateQR: true
  })
});
```

### 2. Send Invoice by Email

```javascript
await fetch(`/api/financial/invoices/${invoiceId}/send-email`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Thank you for your business!',
    cc: ['accounting@company.com']
  })
});
```

### 3. Preview Invoice

```javascript
// Open in browser
window.open(`/api/financial/invoices/${invoiceId}/preview?language=en`);
```

## Customization

### Templates

Invoice templates are located in `src/templates/invoice/`:

- `invoice.template.html` - Main invoice template
- `labels.ts` - Multi-language labels

### Styling

Customize the invoice appearance by editing the CSS in the template:

```css
.invoice-header {
  border-bottom: 2px solid {{company.branding.primaryColor}};
}

.company-name {
  color: {{company.branding.primaryColor}};
}
```

### Adding Languages

Add new language support in `src/templates/invoice/labels.ts`:

```typescript
export const INVOICE_LABELS = {
  es: { ... },
  en: { ... },
  fr: {
    invoice: 'Facture',
    invoiceNumber: 'Numéro de facture',
    // ... add all labels
  }
};
```

## Database Schema

The system creates these tables:

### invoice_numbering_sequences
- Tracks invoice number sequences
- Supports multiple series and prefixes
- Yearly reset capability

### stored_invoices
- Tracks all generated PDFs
- File metadata and locations
- Expiration dates for cleanup

## Docker Support

The system works in Docker with these considerations:

1. Puppeteer requires additional dependencies:
```dockerfile
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    fonts-noto-cjk
```

2. Set Puppeteer environment:
```dockerfile
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

3. Volume for PDF storage:
```yaml
volumes:
  - ./storage/invoices:/app/storage/invoices
```

## Troubleshooting

### PDF Generation Issues

1. **Puppeteer errors in Docker**:
   - Ensure Chromium is installed
   - Add `--no-sandbox` flag (already included)

2. **Font issues**:
   - Install required fonts in Docker
   - Use web-safe fonts in templates

### Email Issues

1. **Gmail SMTP**:
   - Use App Password, not regular password
   - Enable "Less secure app access"

2. **Connection errors**:
   - Check firewall rules
   - Verify SMTP settings

### Storage Issues

1. **Permission errors**:
   - Ensure write permissions on storage directory
   - Check Docker volume permissions

2. **Disk space**:
   - Monitor storage usage
   - Configure automatic cleanup

## Legal Compliance

The system includes features for Spanish/EU compliance:

- Proper tax identification (CIF/NIF)
- Sequential numbering without gaps
- All required invoice fields
- Legal text and registration info
- SEPA-compliant payment QR codes

## Performance

- PDF generation: ~1-2 seconds per invoice
- Batch generation supported
- Template caching for performance
- Async email sending

## Security

- PDFs stored outside web root
- Temporary download tokens
- Access control via API authentication
- Sanitized file names
- XSS protection in templates