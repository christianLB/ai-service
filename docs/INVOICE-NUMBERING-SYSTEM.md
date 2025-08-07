# Invoice Numbering System Documentation

## Overview

The invoice numbering system in AI Service is designed to provide flexible, sequential invoice numbering with support for different patterns and legal compliance requirements. The system uses database-level locking to ensure no duplicate numbers are generated.

## Current Implementation

### 1. Invoice Numbering Service (`InvoiceNumberingService`)

Located at: `src/services/financial/invoice-numbering.service.ts`

This service provides:
- **Atomic Sequential Numbering**: Uses PostgreSQL row-level locking to ensure no gaps or duplicates
- **Multiple Numbering Series**: Support for different invoice types (e.g., invoices, credit notes, proformas)
- **Yearly Reset Option**: Can automatically reset numbers at the start of each year
- **Custom Formats**: Flexible formatting patterns for different business needs

### 2. Database Schema

The system uses the `InvoiceNumberingSequence` table in the `financial` schema:

```prisma
model InvoiceNumberingSequence {
  id            String    @id @default(dbgenerated("gen_random_uuid()"))
  series        String    @default("DEFAULT")
  prefix        String    
  currentNumber Int       @default(0)
  currentYear   Int       
  format        String    
  yearlyReset   Boolean   @default(true)
  lastUsed      DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

### 3. Current Invoice Creation Flow

In `InvoiceService.createInvoice()`:
```javascript
// Currently uses a simple pattern
const year = new Date().getFullYear();
const lastNumber = lastInvoice?.invoiceNumber 
  ? parseInt(lastInvoice.invoiceNumber.split('-').pop() || '0')
  : 0;
invoiceNumber = `INV-${year}-${String(lastNumber + 1).padStart(5, '0')}`;
```

## Available Invoice Number Formats

The system supports various formats:

1. **SPANISH_STANDARD**: `PREFIX-YYYY-0000` → FAC-2024-0001
2. **SPANISH_SLASH**: `PREFIX/YYYY/0000` → FAC/2024/0001
3. **SEQUENTIAL_ONLY**: `PREFIX-000000` → FAC-000001
4. **YEAR_PREFIX**: `YYYY-PREFIX-0000` → 2024-FAC-0001
5. **COMPACT**: `PREFIXYYYYY00000` → FAC240001
6. **CUSTOM**: `PREFIX-YY-00000` → FAC-24-00001

## How to Enable Custom Invoice Numbering

### Step 1: Update Invoice Creation to Use Numbering Service

Currently, the `InvoiceService` doesn't use the `InvoiceNumberingService`. To enable it:

1. **Import and initialize the numbering service**:
```typescript
import { InvoiceNumberingService } from './invoice-numbering.service';

// In the service constructor or method
const numberingService = new InvoiceNumberingService(prisma, {
  defaultPrefix: 'INV',
  defaultFormat: 'PREFIX-YYYY-0000',
  yearlyReset: true
});
```

2. **Replace the current simple numbering**:
```typescript
// Instead of the current simple pattern
let invoiceNumber = data.invoiceNumber;
if (!invoiceNumber) {
  invoiceNumber = await numberingService.getNextInvoiceNumber({
    series: 'DEFAULT',
    prefix: 'INV',
    format: 'PREFIX-YYYY-0000'
  });
}
```

### Step 2: Add Invoice Number Management UI

Create a settings page where users can:
- Configure invoice number formats
- Set custom prefixes
- Choose numbering series
- Set the next invoice number
- View current sequences

### Step 3: Allow Manual Invoice Number Entry

To allow editing invoice numbers:

1. **Add to Invoice Form**:
```typescript
// In InvoiceForm.tsx, add a form field
<Form.Item
  label="Invoice Number"
  name="invoiceNumber"
  tooltip="Leave empty to auto-generate or enter custom number"
>
  <Input 
    placeholder="Auto-generate or enter custom" 
    disabled={!allowManualNumbering}
  />
</Form.Item>
```

2. **Validate uniqueness**:
```typescript
// Before saving
if (data.invoiceNumber) {
  const isValid = await numberingService.validateInvoiceNumber(data.invoiceNumber);
  if (!isValid) {
    throw new Error('Invoice number already exists');
  }
}
```

## API Endpoints Needed

To fully implement custom numbering, these endpoints should be created:

```typescript
// Get current numbering sequences
GET /api/financial/invoice-numbering/sequences

// Get next number preview
GET /api/financial/invoice-numbering/preview?series=DEFAULT&prefix=INV

// Set next number
POST /api/financial/invoice-numbering/set-next
{
  "series": "DEFAULT",
  "prefix": "INV",
  "nextNumber": 100
}

// Update numbering format
PUT /api/financial/invoice-numbering/format
{
  "series": "DEFAULT",
  "format": "PREFIX/YYYY/0000",
  "yearlyReset": true
}
```

## Legal Compliance Considerations

Many jurisdictions require:
- **Sequential numbering without gaps**: The system ensures this with database locking
- **No duplicates**: Enforced at database level
- **Yearly sequences**: Supported with `yearlyReset` option
- **Audit trail**: All number generations are logged
- **No deletions**: Once an invoice number is assigned, it cannot be reused

## Migration Path

To migrate existing invoices to the new numbering system:

1. **Analyze current numbers**:
```sql
SELECT 
  SUBSTRING(invoice_number FROM '\d+$') as number,
  COUNT(*) 
FROM financial.invoices 
GROUP BY 1 
ORDER BY 1;
```

2. **Initialize sequences**:
```typescript
// Set the next number based on existing invoices
await numberingService.setNextNumber(
  'DEFAULT',
  'INV',
  lastExistingNumber + 1,
  currentYear
);
```

## Best Practices

1. **Never allow gaps**: If an invoice creation fails, don't increment the counter
2. **Use transactions**: Ensure invoice creation and number assignment are atomic
3. **Regular backups**: Backup numbering sequences regularly
4. **Audit logging**: Log all number generations and manual changes
5. **User permissions**: Only admins should be able to modify numbering settings

## Example Implementation

```typescript
// Complete example of invoice creation with custom numbering
async createInvoice(data: InvoiceFormData, userId: string) {
  const numberingService = new InvoiceNumberingService(prisma);
  
  return await prisma.$transaction(async (tx) => {
    // Get next number if not provided
    let invoiceNumber = data.invoiceNumber;
    if (!invoiceNumber) {
      invoiceNumber = await numberingService.getNextInvoiceNumber({
        series: data.type?.toUpperCase() || 'INVOICE',
        prefix: this.getPrefixForType(data.type),
        format: userSettings.invoiceNumberFormat || 'PREFIX-YYYY-0000'
      });
    } else {
      // Validate manual number
      const isValid = await numberingService.validateInvoiceNumber(invoiceNumber);
      if (!isValid) {
        throw new Error(`Invoice number ${invoiceNumber} already exists`);
      }
    }
    
    // Create invoice with the number
    const invoice = await tx.invoice.create({
      data: {
        ...data,
        invoiceNumber,
        userId
      }
    });
    
    return invoice;
  });
}
```

## Future Enhancements

1. **Multiple number formats per user/company**
2. **Department-specific sequences**
3. **Country-specific formatting rules**
4. **Automatic number reservation for drafts**
5. **Number recycling for cancelled invoices (where legally allowed)**
6. **Integration with external numbering systems**