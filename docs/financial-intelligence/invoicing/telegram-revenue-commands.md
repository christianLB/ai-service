# Telegram Revenue Management Commands

## Overview
The Telegram bot now includes comprehensive revenue management capabilities, allowing users to manage invoices, track revenue, monitor pending payments, manage clients, and record payments directly through Telegram.

## Command Reference

### Invoice Management

#### `/invoice create [client] [amount] [description]`
Creates a new invoice for a client.
- **Example**: `/invoice create "Acme Corp" 1500 "Consulting Services - March 2024"`
- **Features**:
  - Automatically creates client if doesn't exist
  - Adds 21% VAT by default
  - Sets 30-day payment terms
  - Returns invoice number and details
  - Provides quick action buttons

#### `/invoice list [client]`
Lists all invoices, optionally filtered by client.
- **Example**: `/invoice list` or `/invoice list "Acme Corp"`
- **Features**:
  - Shows invoice status with emojis
  - Displays total amounts and summaries
  - Highlights overdue invoices
  - Shows paid vs pending totals

#### `/invoice send [invoice_id]`
Marks an invoice as sent to the client.
- **Example**: `/invoice send inv_123456`
- **Features**:
  - Updates invoice status
  - Simulates client notification
  - Confirms action with details

### Revenue Analysis

#### `/revenue [period]`
Shows revenue summary for specified period.
- **Periods**: `today`, `week`, `month`, `year`
- **Example**: `/revenue month`
- **Features**:
  - Income vs expenses summary
  - Net amount calculation
  - Transaction count
  - Quick action buttons

#### `/revenue breakdown [period]`
Shows detailed category breakdown.
- **Example**: `/revenue breakdown month`
- **Features**:
  - Category-wise income breakdown
  - Category-wise expense breakdown
  - Percentages for each category
  - Comprehensive analysis

### Pending Payments

#### `/pending`
Lists all pending and overdue payments.
- **Features**:
  - Separates overdue from upcoming
  - Shows days overdue/until due
  - Calculates total pending amounts
  - Prioritizes by urgency

#### `/pending remind [client]`
Sends payment reminder to client.
- **Example**: `/pending remind "Tech Solutions"`
- **Features**:
  - Simulates email reminder
  - Shows pending invoice count
  - Displays total amount due

### Client Management

#### `/client list`
Lists all clients with revenue summary.
- **Features**:
  - Ranks by total revenue
  - Shows invoice counts
  - Displays outstanding balances
  - Top 3 get medal emojis

#### `/client balance [client]`
Shows detailed client balance and history.
- **Example**: `/client balance "Acme Corp"`
- **Features**:
  - Total revenue and invoice stats
  - Paid vs pending breakdown
  - Recent transaction history
  - Average invoice amount
  - Quick action buttons

### Payment Recording

#### `/payment record [client] [amount]`
Records a payment from a client.
- **Example**: `/payment record "Acme Corp" 3000`
- **Features**:
  - Applies to oldest invoices first
  - Handles partial payments
  - Shows which invoices were paid
  - Calculates remaining balance
  - Updates invoice statuses

## Interactive Features

### Inline Keyboards
Most commands include interactive buttons for quick actions:
- Send Invoice
- View List
- See Breakdown
- Open Dashboard
- Create New Invoice

### Callback Queries
The bot handles button clicks for seamless navigation without typing commands.

## Response Formatting

### Emojis Used
- 📄 Invoice/Document
- 💰 Money/Amount
- ✅ Paid/Completed
- ⚠️ Overdue/Warning
- ⏳ Pending
- 📤 Sent
- 👁️ Viewed
- ❌ Cancelled/Error
- 🥇🥈🥉 Top clients
- 💚 Income/Payment received
- 💔 Expenses
- 📊 Statistics/Summary

### Markdown Formatting
- **Bold** for headers and important info
- *Italic* for notes and timestamps
- Proper spacing for readability
- Structured sections

## Error Handling

All commands include:
- Parameter validation
- Clear error messages
- Usage examples on errors
- Graceful fallbacks
- Logging for debugging

## Integration

The commands integrate with:
- `InvoiceManagementService` for invoice operations
- `ClientManagementService` for client data
- `FinancialReportingService` for analytics
- `FinancialDatabaseService` for transactions

## Security

- Commands use Telegram chat ID for audit trails
- Client creation includes telegram reference
- All actions are logged
- No sensitive data exposed

## Future Enhancements

Potential additions:
- PDF invoice generation
- Real payment gateway integration
- Recurring invoice support
- Multi-currency handling
- Custom tax rates
- Invoice templates
- Automated late payment reminders
- Revenue forecasting