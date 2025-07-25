# Enhanced Financial Dashboard API Documentation

## Overview

This document describes the comprehensive backend API endpoints for the revenue dashboard metrics system. These endpoints integrate with the financial.clients, financial.invoices, and financial.transactions tables to provide detailed business intelligence and financial analysis.

## Base URL

All endpoints are prefixed with: `/api/financial/dashboard/`

## Authentication

All endpoints require proper environment configuration:
- `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`

## Common Response Format

All endpoints return a standardized response format:

```json
{
  "success": boolean,
  "data": object | array,
  "error": string (only when success: false),
  "details": string (only when success: false)
}
```

---

## 1. Revenue Metrics

### `GET /api/financial/dashboard/revenue-metrics`

Get comprehensive revenue metrics with trends and comparisons.

#### Query Parameters

| Parameter   | Type   | Default   | Description                           |
|-------------|--------|-----------|---------------------------------------|
| `period`    | string | monthly   | Period type: monthly, quarterly, yearly, custom |
| `currency`  | string | EUR       | Currency code (EUR, USD, etc.)       |
| `startDate` | string | -         | Start date for custom period (ISO 8601) |
| `endDate`   | string | -         | End date for custom period (ISO 8601) |

#### Example Request

```bash
GET /api/financial/dashboard/revenue-metrics?period=monthly&currency=EUR
```

#### Response Structure

```json
{
  "success": true,
  "data": {
    "period": {
      "type": "monthly",
      "current": {
        "start": "2025-07-01T00:00:00.000Z",
        "end": "2025-07-31T23:59:59.999Z"
      },
      "previous": {
        "start": "2025-06-01T00:00:00.000Z",
        "end": "2025-06-30T23:59:59.999Z"
      }
    },
    "currentPeriod": {
      "totalRevenue": "45000.00",
      "paidRevenue": "35000.00",
      "pendingRevenue": "8000.00",
      "overdueRevenue": "2000.00",
      "totalInvoices": 23,
      "paidInvoices": 18,
      "averageInvoiceAmount": "1956.52",
      "uniqueClients": 12
    },
    "previousPeriod": {
      "totalRevenue": "38000.00",
      "paidRevenue": "30000.00",
      "pendingRevenue": "6000.00",
      "overdueRevenue": "2000.00",
      "totalInvoices": 20,
      "paidInvoices": 15,
      "averageInvoiceAmount": "1900.00",
      "uniqueClients": 10
    },
    "growth": {
      "revenueGrowth": 18.42,
      "invoiceGrowth": 15.00
    },
    "trends": {
      "monthlyRevenue": [
        {
          "month": "2024-08-01T00:00:00.000Z",
          "revenue": "32000.00",
          "invoices": 16
        }
      ]
    },
    "topClients": [
      {
        "id": "client_123",
        "name": "Acme Corp",
        "businessName": "Acme Corporation S.L.",
        "totalRevenue": "12000.00",
        "totalInvoices": 4,
        "avgInvoiceAmount": "3000.00"
      }
    ],
    "currency": "EUR",
    "generatedAt": "2025-07-06T10:30:00.000Z"
  }
}
```

---

## 2. Invoice Statistics

### `GET /api/financial/dashboard/invoice-stats`

Get detailed invoice statistics with status breakdown and aging analysis.

#### Query Parameters

| Parameter      | Type    | Default | Description                          |
|----------------|---------|---------|--------------------------------------|
| `currency`     | string  | EUR     | Currency code                        |
| `includeAging` | boolean | true    | Include aging analysis               |

#### Example Request

```bash
GET /api/financial/dashboard/invoice-stats?currency=EUR&includeAging=true
```

#### Response Structure

```json
{
  "success": true,
  "data": {
    "overview": {
      "totalInvoices": 145,
      "draftInvoices": 5,
      "sentInvoices": 12,
      "viewedInvoices": 8,
      "paidInvoices": 115,
      "overdueInvoices": 3,
      "cancelledInvoices": 2,
      "totalAmount": "287500.00",
      "paidAmount": "245000.00",
      "pendingAmount": "35000.00",
      "overdueAmount": "7500.00",
      "averageInvoiceAmount": "1983.62",
      "averagePaymentDays": "28.5"
    },
    "paymentBehavior": [
      {
        "category": "on_time",
        "count": 95,
        "amount": "190000.00"
      },
      {
        "category": "late_7_days",
        "count": 15,
        "amount": "35000.00"
      },
      {
        "category": "late_30_days",
        "count": 8,
        "amount": "15000.00"
      }
    ],
    "agingAnalysis": [
      {
        "bucket": "not_due",
        "count": 15,
        "amount": "28000.00"
      },
      {
        "bucket": "1_30_days",
        "count": 3,
        "amount": "6000.00"
      },
      {
        "bucket": "31_60_days",
        "count": 2,
        "amount": "3500.00"
      }
    ],
    "trends": {
      "monthlyCreation": [
        {
          "month": "2025-01-01T00:00:00.000Z",
          "invoicesCreated": 18,
          "totalAmount": "35000.00"
        }
      ]
    },
    "topOverdueInvoices": [
      {
        "id": "inv_456",
        "invoiceNumber": "INV-2025-0123",
        "clientName": "Client ABC",
        "total": "2500.00",
        "dueDate": "2025-06-15",
        "daysOverdue": 21
      }
    ],
    "currency": "EUR",
    "generatedAt": "2025-07-06T10:30:00.000Z"
  }
}
```

---

## 3. Client Performance Metrics

### `GET /api/financial/dashboard/client-metrics`

Get client performance metrics including payment behavior and revenue analysis.

#### Query Parameters

| Parameter         | Type    | Default       | Description                          |
|-------------------|---------|---------------|--------------------------------------|
| `currency`        | string  | EUR           | Currency code                        |
| `limit`           | number  | 20            | Maximum number of clients returned   |
| `sortBy`          | string  | total_revenue | Sort field: total_revenue, outstanding_balance, risk_score, last_invoice_date |
| `includeInactive` | boolean | false         | Include inactive clients             |

#### Example Request

```bash
GET /api/financial/dashboard/client-metrics?currency=EUR&limit=10&sortBy=total_revenue
```

#### Response Structure

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalClients": 45,
      "activeClients": 42,
      "inactiveClients": 2,
      "suspendedClients": 1,
      "prospectClients": 8,
      "avgClientRevenue": "5682.33",
      "avgOutstandingBalance": "1250.50",
      "totalClientRevenue": "255702.00",
      "totalOutstandingBalance": "52522.50"
    },
    "clients": [
      {
        "id": "client_789",
        "name": "Tech Solutions Ltd",
        "businessName": "Tech Solutions Limited",
        "email": "billing@techsolutions.com",
        "status": "active",
        "totalRevenue": "45000.00",
        "totalInvoices": 15,
        "outstandingBalance": "3000.00",
        "lastInvoiceDate": "2025-06-30T00:00:00.000Z",
        "averageInvoiceAmount": "3000.00",
        "paymentTerms": 30,
        "paidInvoices": 12,
        "pendingInvoices": 2,
        "overdueInvoices": 1,
        "averagePaymentDays": "25.5",
        "lastPaymentDate": "2025-06-28T00:00:00.000Z",
        "riskScore": "low"
      }
    ],
    "riskDistribution": [
      {
        "riskScore": "low",
        "count": 35,
        "totalRevenue": "200000.00",
        "totalOutstanding": "25000.00"
      },
      {
        "riskScore": "medium",
        "count": 8,
        "totalRevenue": "45000.00",
        "totalOutstanding": "15000.00"
      },
      {
        "riskScore": "high",
        "count": 2,
        "totalRevenue": "10000.00",
        "totalOutstanding": "8000.00"
      }
    ],
    "paymentBehavior": [
      {
        "category": "on_time",
        "clientCount": 28,
        "avgRevenue": "6500.00"
      },
      {
        "category": "late_7_days",
        "clientCount": 10,
        "avgRevenue": "4200.00"
      }
    ],
    "topRevenueClients": [
      {
        "id": "client_top1",
        "name": "Enterprise Client",
        "businessName": "Enterprise Solutions Inc",
        "totalRevenue": "45000.00",
        "totalInvoices": 15,
        "status": "active",
        "revenuePercentage": "17.60"
      }
    ],
    "currency": "EUR",
    "generatedAt": "2025-07-06T10:30:00.000Z"
  }
}
```

---

## 4. Cash Flow Projections

### `GET /api/financial/dashboard/cash-flow`

Get cash flow projections based on outstanding invoices and payment history.

#### Query Parameters

| Parameter             | Type    | Default | Description                          |
|-----------------------|---------|---------|--------------------------------------|
| `currency`            | string  | EUR     | Currency code                        |
| `daysAhead`           | number  | 90      | Number of days to project            |
| `includeTransactions` | boolean | true    | Include recent transaction data      |

#### Example Request

```bash
GET /api/financial/dashboard/cash-flow?currency=EUR&daysAhead=90&includeTransactions=true
```

#### Response Structure

```json
{
  "success": true,
  "data": {
    "currentPosition": {
      "currentCashBalance": "25000.00",
      "totalOutstanding": "45000.00",
      "expectedCollections": "38250.00",
      "collectionRate": "85.00"
    },
    "projectionPeriod": {
      "daysAhead": 90,
      "startDate": "2025-07-06T00:00:00.000Z",
      "endDate": "2025-10-04T00:00:00.000Z"
    },
    "weeklyProjections": [
      {
        "weekStart": "2025-07-06T00:00:00.000Z",
        "weekEnd": "2025-07-13T00:00:00.000Z",
        "expectedReceipts": "5500.00",
        "projectedBalance": "30500.00",
        "invoicesCount": 3
      },
      {
        "weekStart": "2025-07-13T00:00:00.000Z",
        "weekEnd": "2025-07-20T00:00:00.000Z",
        "expectedReceipts": "7200.00",
        "projectedBalance": "37700.00",
        "invoicesCount": 4
      }
    ],
    "outstandingInvoices": [
      {
        "id": "inv_proj1",
        "invoiceNumber": "INV-2025-0150",
        "clientName": "Client XYZ",
        "total": "3500.00",
        "dueDate": "2025-07-15",
        "status": "sent",
        "estimatedPaymentDate": "2025-07-18T00:00:00.000Z",
        "paymentProbability": "0.85",
        "riskScore": "low"
      }
    ],
    "riskAnalysis": {
      "highRisk": {
        "count": 2,
        "amount": "5000.00"
      },
      "mediumRisk": {
        "count": 5,
        "amount": "12000.00"
      },
      "lowRisk": {
        "count": 15,
        "amount": "28000.00"
      }
    },
    "recentTransactions": [
      {
        "amount": "2500.00",
        "date": "2025-07-05T00:00:00.000Z",
        "description": "Payment received from Client ABC",
        "counterpartyName": "Client ABC",
        "type": "bank_transfer"
      }
    ],
    "currency": "EUR",
    "generatedAt": "2025-07-06T10:30:00.000Z"
  }
}
```

---

## 5. Health Check

### `GET /api/financial/dashboard/health`

Health check for dashboard endpoints.

#### Example Request

```bash
GET /api/financial/dashboard/health
```

#### Response Structure

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "services": {
      "database": "connected",
      "endpoints": [
        "revenue-metrics",
        "invoice-stats",
        "client-metrics",
        "cash-flow"
      ]
    },
    "timestamp": "2025-07-06T10:30:00.000Z"
  }
}
```

---

## Error Handling

All endpoints include comprehensive error handling:

### Error Response Format

```json
{
  "success": false,
  "error": "Error description",
  "details": "Detailed error message"
}
```

### Common HTTP Status Codes

- `200 OK` - Successful request
- `400 Bad Request` - Invalid parameters
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Database connection issues

---

## Integration Examples

### Frontend Integration (TypeScript)

```typescript
import dashboardService from './services/dashboardService';

// Get revenue metrics
const revenueData = await dashboardService.getRevenueMetrics({
  period: 'monthly',
  currency: 'EUR'
});

// Get invoice statistics
const invoiceStats = await dashboardService.getInvoiceStats({
  currency: 'EUR',
  includeAging: true
});

// Get client metrics
const clientMetrics = await dashboardService.getClientMetrics({
  currency: 'EUR',
  limit: 20,
  sortBy: 'total_revenue'
});

// Get cash flow projections
const cashFlow = await dashboardService.getCashFlowProjections({
  currency: 'EUR',
  daysAhead: 90,
  includeTransactions: true
});
```

### cURL Examples

```bash
# Revenue metrics
curl -X GET "http://localhost:3000/api/financial/dashboard/revenue-metrics?period=monthly&currency=EUR"

# Invoice statistics
curl -X GET "http://localhost:3000/api/financial/dashboard/invoice-stats?currency=EUR&includeAging=true"

# Client metrics
curl -X GET "http://localhost:3000/api/financial/dashboard/client-metrics?currency=EUR&limit=10&sortBy=total_revenue"

# Cash flow projections
curl -X GET "http://localhost:3000/api/financial/dashboard/cash-flow?currency=EUR&daysAhead=90"
```

---

## Performance Notes

- All endpoints use database indexes for optimal performance
- Results are calculated in real-time from actual database tables
- Complex queries are optimized with appropriate SQL joins and aggregations
- Response times typically under 500ms for datasets with thousands of records

## Testing

Use the provided test script to verify all endpoints:

```bash
node test-dashboard-endpoints.js
```

The script tests all endpoints with various parameter combinations and provides detailed results.