// Demo Categorization - Simulate AI categorization process
console.log('🤖 AI Categorization System Demo');
console.log('=================================\n');

// Mock transactions for categorization
const mockTransactions = [
    {
        id: "tx-001",
        description: "COMPRA MERCADONA",
        counterpartyName: "MERCADONA S.A.",
        amount: "-45.60",
        date: "2025-07-02"
    },
    {
        id: "tx-002", 
        description: "NOMINA JULIO 2025",
        counterpartyName: "EMPRESA TECH S.L.",
        amount: "3000.00",
        date: "2025-07-01"
    },
    {
        id: "tx-003",
        description: "PAGO COMBUSTIBLE",
        counterpartyName: "REPSOL",
        amount: "-65.20",
        date: "2025-06-30"
    },
    {
        id: "tx-004",
        description: "ALQUILER PISO MADRID",
        counterpartyName: "INMOBILIARIA ABC",
        amount: "-1200.00",
        date: "2025-06-30"
    },
    {
        id: "tx-005",
        description: "COMPRA AMAZON",
        counterpartyName: "AMAZON SPAIN",
        amount: "-78.50",
        date: "2025-06-29"
    }
];

// AI Tags for categorization
const aiTags = [
    {
        name: "Supermarket",
        keywords: ["mercadona", "carrefour", "lidl", "compra"],
        merchantPatterns: ["MERCADONA.*", "CARREFOUR.*"],
        categoryName: "Food & Dining",
        subcategoryName: "Groceries",
        confidence: 0.95
    },
    {
        name: "Salary Payment",
        keywords: ["nomina", "sueldo", "salary"],
        merchantPatterns: [".*NOMINA.*", ".*EMPRESA.*"],
        categoryName: "Salary",
        subcategoryName: null,
        confidence: 0.98
    },
    {
        name: "Gas Station",
        keywords: ["combustible", "gasolina", "repsol", "galp"],
        merchantPatterns: ["REPSOL.*", "GALP.*"],
        categoryName: "Transportation", 
        subcategoryName: "Fuel",
        confidence: 0.92
    },
    {
        name: "Rent Payment",
        keywords: ["alquiler", "rent", "piso"],
        merchantPatterns: [".*ALQUILER.*", ".*INMOBILIARIA.*"],
        categoryName: "Housing",
        subcategoryName: "Rent",
        confidence: 0.90
    },
    {
        name: "Online Shopping",
        keywords: ["amazon", "compra", "online"],
        merchantPatterns: ["AMAZON.*", ".*COMPRA.*"],
        categoryName: "Shopping",
        subcategoryName: "Online",
        confidence: 0.85
    }
];

// Categorization function
function categorizeTransaction(transaction) {
    const description = transaction.description.toLowerCase();
    const counterparty = transaction.counterpartyName.toLowerCase();
    const searchText = `${description} ${counterparty}`;
    
    console.log(`\n🔍 Analyzing: ${transaction.description}`);
    console.log(`   💰 Amount: €${transaction.amount}`);
    console.log(`   🏪 Merchant: ${transaction.counterpartyName}`);
    
    // Find best match
    let bestMatch = null;
    let maxConfidence = 0;
    
    for (const tag of aiTags) {
        let confidence = 0;
        let matchReason = [];
        
        // Check keywords
        const keywordMatches = tag.keywords.filter(keyword => 
            searchText.includes(keyword.toLowerCase())
        );
        if (keywordMatches.length > 0) {
            confidence += 0.7 * (keywordMatches.length / tag.keywords.length);
            matchReason.push(`Keywords: ${keywordMatches.join(', ')}`);
        }
        
        // Check merchant patterns
        for (const pattern of tag.merchantPatterns) {
            const regex = new RegExp(pattern, 'i');
            if (regex.test(counterparty) || regex.test(description)) {
                confidence += 0.3;
                matchReason.push(`Pattern: ${pattern}`);
                break;
            }
        }
        
        // Apply base confidence
        confidence = confidence * tag.confidence;
        
        if (confidence > maxConfidence) {
            maxConfidence = confidence;
            bestMatch = {
                ...tag,
                finalConfidence: confidence,
                matchReason: matchReason
            };
        }
    }
    
    if (bestMatch && maxConfidence > 0.5) {
        console.log(`   ✅ CATEGORIZED: ${bestMatch.categoryName}${bestMatch.subcategoryName ? ' → ' + bestMatch.subcategoryName : ''}`);
        console.log(`   📊 Confidence: ${(maxConfidence * 100).toFixed(1)}%`);
        console.log(`   🎯 Reason: ${bestMatch.matchReason.join(', ')}`);
        console.log(`   🤖 Method: AI Auto-categorization`);
        
        return {
            transactionId: transaction.id,
            categoryName: bestMatch.categoryName,
            subcategoryName: bestMatch.subcategoryName,
            confidence: maxConfidence,
            method: 'ai_auto',
            aiTagUsed: bestMatch.name,
            reasoning: bestMatch.matchReason.join(', ')
        };
    } else {
        console.log(`   ❓ UNCATEGORIZED: Low confidence (${(maxConfidence * 100).toFixed(1)}%)`);
        console.log(`   💡 Suggestion: Manual review required`);
        
        return {
            transactionId: transaction.id,
            categoryName: null,
            confidence: maxConfidence,
            method: 'requires_manual',
            reasoning: 'No high-confidence match found'
        };
    }
}

// Run categorization demo
console.log('🚀 Starting AI Categorization Process...\n');

const results = [];
let categorizedCount = 0;
let totalAmount = 0;

for (const transaction of mockTransactions) {
    const result = categorizeTransaction(transaction);
    results.push(result);
    
    if (result.categoryName) {
        categorizedCount++;
    }
    
    totalAmount += Math.abs(parseFloat(transaction.amount));
}

// Summary
console.log('\n📈 CATEGORIZATION SUMMARY');
console.log('========================');
console.log(`Total Transactions: ${mockTransactions.length}`);
console.log(`Successfully Categorized: ${categorizedCount}`);
console.log(`Accuracy Rate: ${((categorizedCount / mockTransactions.length) * 100).toFixed(1)}%`);
console.log(`Total Amount Processed: €${totalAmount.toFixed(2)}`);

console.log('\n📊 CATEGORIZATION RESULTS:');
results.forEach((result, index) => {
    const tx = mockTransactions[index];
    console.log(`\n${index + 1}. ${tx.description}`);
    console.log(`   Category: ${result.categoryName || 'UNCATEGORIZED'}`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`   Method: ${result.method}`);
});

console.log('\n🎯 CATEGORY BREAKDOWN:');
const categoryStats = {};
results.forEach((result, index) => {
    if (result.categoryName) {
        if (!categoryStats[result.categoryName]) {
            categoryStats[result.categoryName] = {
                count: 0,
                totalAmount: 0,
                transactions: []
            };
        }
        categoryStats[result.categoryName].count++;
        categoryStats[result.categoryName].totalAmount += Math.abs(parseFloat(mockTransactions[index].amount));
        categoryStats[result.categoryName].transactions.push(mockTransactions[index].description);
    }
});

Object.entries(categoryStats).forEach(([category, stats]) => {
    console.log(`\n📂 ${category}:`);
    console.log(`   Transactions: ${stats.count}`);
    console.log(`   Total Amount: €${stats.totalAmount.toFixed(2)}`);
    console.log(`   Examples: ${stats.transactions.join(', ')}`);
});

console.log('\n✨ AI CATEGORIZATION COMPLETE!');
console.log('\n🚀 Next Steps:');
console.log('   1. Review uncategorized transactions');
console.log('   2. Provide feedback to improve AI accuracy');
console.log('   3. Add custom categories as needed');
console.log('   4. Set up automated reporting');
console.log('\n🎉 Your financial data is now intelligently organized!');