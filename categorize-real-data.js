// Categorize Real Banking Data - Execute AI categorization on real BBVA transactions
const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
    host: 'localhost',
    port: 5434,
    database: 'ai_service',
    user: 'ai_user',
    password: 'ultra_secure_password_2025'
});

// AI Tags for real Spanish banking patterns
const aiTags = [
    {
        name: "Rent Payment",
        keywords: ["alquiler", "piso", "cochera", "vivienda"],
        merchantPatterns: [".*ALQUILER.*", ".*PISO.*"],
        categoryName: "Housing",
        subcategoryName: "Rent",
        confidence: 0.95
    },
    {
        name: "Insurance Payment", 
        keywords: ["seguros", "sanitas", "adeslas", "mapfre"],
        merchantPatterns: [".*SEGUROS.*", ".*SANITAS.*", ".*ADESLAS.*"],
        categoryName: "Healthcare",
        subcategoryName: "Insurance",
        confidence: 0.92
    },
    {
        name: "Tax Payment",
        keywords: ["impuesto", "tributo", "hacienda", "iva"],
        merchantPatterns: [".*IMPUESTO.*", ".*TRIBUTO.*", ".*HACIENDA.*"],
        categoryName: "Financial",
        subcategoryName: "Taxes",
        confidence: 0.90
    },
    {
        name: "Tobacco Shop",
        keywords: ["estanco", "tabaco"],
        merchantPatterns: [".*ESTANCO.*"],
        categoryName: "Shopping",
        subcategoryName: "Miscellaneous",
        confidence: 0.85
    },
    {
        name: "Transfer Received",
        keywords: ["transferencia", "recibida"],
        merchantPatterns: [".*TRANSFERENCIA RECIBIDA.*"],
        categoryName: "Other Income",
        subcategoryName: null,
        confidence: 0.80
    },
    {
        name: "Salary/Income",
        keywords: ["nomina", "sueldo", "salario"],
        merchantPatterns: [".*NOMINA.*", ".*SUELDO.*"],
        categoryName: "Salary",
        subcategoryName: null,
        confidence: 0.95
    },
    {
        name: "Supermarket",
        keywords: ["mercadona", "carrefour", "lidl", "dia", "eroski"],
        merchantPatterns: ["MERCADONA.*", "CARREFOUR.*", "LIDL.*"],
        categoryName: "Food & Dining",
        subcategoryName: "Groceries", 
        confidence: 0.95
    },
    {
        name: "Gas Station",
        keywords: ["repsol", "galp", "cepsa", "gasolina", "combustible"],
        merchantPatterns: ["REPSOL.*", "GALP.*", "CEPSA.*"],
        categoryName: "Transportation",
        subcategoryName: "Fuel",
        confidence: 0.90
    }
];

// Categorization function
function categorizeTransaction(transaction) {
    const description = (transaction.description || '').toLowerCase();
    const counterparty = (transaction.counterparty_name || '').toLowerCase();
    const searchText = `${description} ${counterparty}`;
    
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
            try {
                const regex = new RegExp(pattern, 'i');
                if (regex.test(counterparty) || regex.test(description)) {
                    confidence += 0.3;
                    matchReason.push(`Pattern: ${pattern}`);
                    break;
                }
            } catch (e) {
                // Invalid regex, skip
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
    
    return {
        transactionId: transaction.id,
        categoryName: bestMatch ? bestMatch.categoryName : null,
        subcategoryName: bestMatch ? bestMatch.subcategoryName : null,
        confidence: maxConfidence,
        method: maxConfidence > 0.5 ? 'ai_auto' : 'requires_manual',
        aiTagUsed: bestMatch ? bestMatch.name : null,
        reasoning: bestMatch ? bestMatch.matchReason.join(', ') : 'No high-confidence match'
    };
}

async function main() {
    try {
        console.log('🤖 AI Categorization of Real BBVA Banking Data');
        console.log('===============================================\n');
        
        // Get uncategorized transactions
        const transactionsQuery = `
            SELECT t.id, t.description, t.counterparty_name, t.amount, t.date
            FROM financial.transactions t
            LEFT JOIN financial.transaction_categorizations tc ON t.id = tc.transaction_id
            WHERE tc.id IS NULL
            ORDER BY t.date DESC
            LIMIT 50
        `;
        
        console.log('📊 Fetching uncategorized transactions...');
        const result = await pool.query(transactionsQuery);
        const transactions = result.rows;
        
        console.log(`Found ${transactions.length} uncategorized transactions\n`);
        
        if (transactions.length === 0) {
            console.log('✅ All transactions are already categorized!');
            return;
        }
        
        // Get category and subcategory IDs
        const categoriesResult = await pool.query('SELECT id, name FROM financial.categories');
        const categoriesMap = new Map();
        categoriesResult.rows.forEach(cat => categoriesMap.set(cat.name, cat.id));
        
        const subcategoriesResult = await pool.query('SELECT id, name, category_id FROM financial.subcategories');
        const subcategoriesMap = new Map();
        subcategoriesResult.rows.forEach(sub => subcategoriesMap.set(sub.name, sub.id));
        
        let categorizedCount = 0;
        let totalAmount = 0;
        
        for (const transaction of transactions) {
            console.log(`\n🔍 Analyzing: ${transaction.description.substring(0, 80)}...`);
            console.log(`   💰 Amount: €${transaction.amount}`);
            console.log(`   🏪 Counterparty: ${transaction.counterparty_name || 'N/A'}`);
            console.log(`   📅 Date: ${transaction.date.toISOString().split('T')[0]}`);
            
            const result = categorizeTransaction(transaction);
            totalAmount += Math.abs(parseFloat(transaction.amount));
            
            if (result.categoryName && result.confidence > 0.5) {
                const categoryId = categoriesMap.get(result.categoryName);
                const subcategoryId = result.subcategoryName ? subcategoriesMap.get(result.subcategoryName) : null;
                
                if (categoryId) {
                    // Insert categorization
                    await pool.query(`
                        INSERT INTO financial.transaction_categorizations 
                        (transaction_id, category_id, subcategory_id, method, confidence_score, notes)
                        VALUES ($1, $2, $3, $4, $5, $6)
                    `, [
                        transaction.id,
                        categoryId,
                        subcategoryId,
                        result.method,
                        result.confidence,
                        result.reasoning
                    ]);
                    
                    console.log(`   ✅ CATEGORIZED: ${result.categoryName}${result.subcategoryName ? ' → ' + result.subcategoryName : ''}`);
                    console.log(`   📊 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
                    console.log(`   🎯 Reason: ${result.reasoning}`);
                    categorizedCount++;
                } else {
                    console.log(`   ❌ Category '${result.categoryName}' not found in database`);
                }
            } else {
                console.log(`   ❓ UNCATEGORIZED: Low confidence (${(result.confidence * 100).toFixed(1)}%)`);
                console.log(`   💡 Requires manual review`);
            }
        }
        
        console.log('\n📈 CATEGORIZATION SUMMARY');
        console.log('========================');
        console.log(`Total Transactions Processed: ${transactions.length}`);
        console.log(`Successfully Categorized: ${categorizedCount}`);
        console.log(`Success Rate: ${((categorizedCount / transactions.length) * 100).toFixed(1)}%`);
        console.log(`Total Amount Processed: €${totalAmount.toFixed(2)}`);
        
        // Get categorization statistics
        const statsQuery = `
            SELECT 
                c.name as category_name,
                COUNT(*) as transaction_count,
                SUM(ABS(t.amount)) as total_amount
            FROM financial.transaction_categorizations tc
            JOIN financial.categories c ON tc.category_id = c.id
            JOIN financial.transactions t ON tc.transaction_id = t.id
            GROUP BY c.id, c.name
            ORDER BY total_amount DESC
        `;
        
        const statsResult = await pool.query(statsQuery);
        
        console.log('\n🎯 CATEGORY BREAKDOWN:');
        for (const stat of statsResult.rows) {
            console.log(`📂 ${stat.category_name}:`);
            console.log(`   Transactions: ${stat.transaction_count}`);
            console.log(`   Total Amount: €${parseFloat(stat.total_amount).toFixed(2)}`);
        }
        
        console.log('\n✨ AI CATEGORIZATION OF REAL DATA COMPLETE!');
        console.log('\n🚀 Next Steps:');
        console.log('   1. Launch the real dashboard with actual data');
        console.log('   2. Review and adjust categorizations as needed');
        console.log('   3. Provide feedback to improve AI accuracy');
        console.log('   4. Generate comprehensive financial reports');
        
    } catch (error) {
        console.error('❌ Error during categorization:', error);
    } finally {
        await pool.end();
    }
}

main();