#!/bin/bash

# Create the missing Client and Invoice tables

PROD_HOST="192.168.1.11"
PROD_USER="k2600x"

echo "Creating missing tables..."

ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no $PROD_USER@$PROD_HOST << 'ENDSSH'
sudo /usr/local/bin/docker exec ai-postgres psql -U ai_user -d ai_service << 'EOF'

-- Create Client table (PascalCase as Prisma expects)
CREATE TABLE IF NOT EXISTS "Client" (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(255) NOT NULL,
    "businessName" VARCHAR(255),
    "taxId" VARCHAR(100),
    "taxIdType" VARCHAR(20) DEFAULT 'OTHER',
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address JSONB,
    "clientType" VARCHAR(20) DEFAULT 'business',
    currency VARCHAR(10) DEFAULT 'EUR',
    language VARCHAR(10) DEFAULT 'es',
    timezone VARCHAR(50),
    "paymentTerms" INTEGER DEFAULT 30,
    "paymentMethod" VARCHAR(20),
    "bankAccount" VARCHAR(255),
    "creditLimit" DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    "totalRevenue" DECIMAL(15,2) DEFAULT 0,
    "totalInvoices" INTEGER DEFAULT 0,
    "outstandingBalance" DECIMAL(15,2) DEFAULT 0,
    "userId" VARCHAR(255),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP
);

-- Create Invoice table
CREATE TABLE IF NOT EXISTS "Invoice" (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "invoiceNumber" VARCHAR(50) NOT NULL,
    "clientId" VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    "issueDate" DATE NOT NULL DEFAULT CURRENT_DATE,
    "dueDate" DATE NOT NULL DEFAULT CURRENT_DATE + INTERVAL '30 days',
    currency VARCHAR(10) DEFAULT 'EUR',
    subtotal DECIMAL(15,2) DEFAULT 0,
    "taxRate" DECIMAL(5,2) DEFAULT 21,
    "taxAmount" DECIMAL(15,2) DEFAULT 0,
    "discountPercentage" DECIMAL(5,2) DEFAULT 0,
    "discountAmount" DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) DEFAULT 0,
    "paidAmount" DECIMAL(15,2) DEFAULT 0,
    "paymentStatus" VARCHAR(20) DEFAULT 'pending',
    "paymentDate" DATE,
    "paymentMethod" VARCHAR(20),
    notes TEXT,
    terms TEXT,
    items JSONB,
    metadata JSONB,
    "userId" VARCHAR(255),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP,
    "viewedAt" TIMESTAMP,
    "reminderSentAt" TIMESTAMP
);

-- Create User table if it doesn't exist (PascalCase)
CREATE TABLE IF NOT EXISTS "User" (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email VARCHAR(255) UNIQUE NOT NULL,
    "passwordHash" VARCHAR(255),
    "fullName" VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_client_userid ON "Client"("userId");
CREATE INDEX IF NOT EXISTS idx_client_taxid ON "Client"("taxId");
CREATE INDEX IF NOT EXISTS idx_invoice_clientid ON "Invoice"("clientId");
CREATE INDEX IF NOT EXISTS idx_invoice_userid ON "Invoice"("userId");

-- Insert admin user if not exists
INSERT INTO "User" (email, "passwordHash", "fullName", role)
VALUES (
    'admin@ai-service.local',
    '$2b$10$8YzH7X1vKpFdKjb8rqOAOe8uEpZ4UjQn9mGxK7bgQqFvI9o1aWVKq',
    'System Administrator',
    'admin'
) ON CONFLICT (email) DO NOTHING;

-- Show what tables we have now
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

EOF
ENDSSH

echo "Tables created. Restarting container..."

ssh $PROD_USER@$PROD_HOST "sudo /usr/local/bin/docker restart ai-service"

echo "Waiting 10 seconds for restart..."
sleep 10

echo "Testing client creation..."

# Get auth token
TOKEN=$(curl -s -X POST http://$PROD_HOST:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ai-service.local","password":"admin123"}' 2>/dev/null | \
  grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    echo "Got token, testing client creation..."
    RESULT=$(curl -s -X POST http://$PROD_HOST:3001/api/financial/clients \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d '{"name":"Test Client","email":"test@example.com","taxId":"TEST123"}' 2>&1)
    
    echo "Result: $RESULT"
    
    if [[ "$RESULT" == *"id"* ]] || [[ "$RESULT" == *"success\":true"* ]]; then
        echo ""
        echo "✅ SUCCESS! Client creation works!"
        echo "The 500 errors are FIXED!"
    else
        echo "Still having issues. Checking logs..."
        ssh $PROD_USER@$PROD_HOST "sudo /usr/local/bin/docker logs ai-service --tail 5 2>&1" | grep -i error
    fi
else
    echo "Authentication failed"
fi