// Demo Dashboard Server - Simple server to showcase the financial dashboard
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Serve static files
app.use('/public', express.static(path.join(__dirname, 'public')));

// Dashboard redirect
app.get('/', (req, res) => {
    res.redirect('/dashboard');
});

app.get('/dashboard', (req, res) => {
    res.redirect('/public/financial-dashboard.html');
});

// Mock API endpoints for dashboard demo
app.get('/api/financial/dashboard/overview', (req, res) => {
    // Mock financial data
    const mockData = {
        success: true,
        data: {
            metrics: {
                currentMonth: {
                    income: "3500.00",
                    expenses: "2800.00",
                    balance: "700.00",
                    transactionCount: 85
                },
                trends: {
                    incomeChange: 12.5,
                    expenseChange: -8.3,
                    balanceChange: 45.2
                },
                topExpenseCategories: [
                    { categoryName: "Housing", amount: "1200.00" },
                    { categoryName: "Food & Dining", amount: "450.00" },
                    { categoryName: "Transportation", amount: "320.00" },
                    { categoryName: "Shopping", amount: "280.00" },
                    { categoryName: "Entertainment", amount: "180.00" }
                ]
            },
            accounts: {
                total: 3,
                totalBalance: "15420.50",
                insights: [
                    { name: "BBVA Cuenta Corriente", balance: "8420.50" },
                    { name: "BBVA Cuenta Ahorro", balance: "5500.00" },
                    { name: "Cuenta Inversión", balance: "1500.00" }
                ]
            },
            categories: {
                income: 5,
                expense: 10,
                transfer: 4
            },
            recentTransactions: [
                {
                    counterpartyName: "MERCADONA",
                    description: "Compra supermercado",
                    amount: "-45.60",
                    date: "2025-07-02T10:30:00Z"
                },
                {
                    counterpartyName: "NOMINA EMPRESA",
                    description: "Salario mensual",
                    amount: "3000.00",
                    date: "2025-07-01T09:00:00Z"
                },
                {
                    counterpartyName: "REPSOL",
                    description: "Combustible",
                    amount: "-65.20",
                    date: "2025-06-30T18:45:00Z"
                },
                {
                    counterpartyName: "ALQUILER PISO",
                    description: "Pago mensual alquiler",
                    amount: "-1200.00",
                    date: "2025-06-30T08:00:00Z"
                },
                {
                    counterpartyName: "CARREFOUR",
                    description: "Compra semanal",
                    amount: "-89.30",
                    date: "2025-06-29T16:20:00Z"
                }
            ],
            alerts: [],
            lastUpdated: new Date().toISOString()
        }
    };
    
    res.json(mockData);
});

app.get('/api/financial/categories', (req, res) => {
    const mockCategories = {
        success: true,
        data: [
            { id: "1", name: "Salary", type: "income", color: "#4CAF50", icon: "work" },
            { id: "2", name: "Freelancing", type: "income", color: "#8BC34A", icon: "person" },
            { id: "3", name: "Housing", type: "expense", color: "#F44336", icon: "home" },
            { id: "4", name: "Food & Dining", type: "expense", color: "#FF5722", icon: "restaurant" },
            { id: "5", name: "Transportation", type: "expense", color: "#795548", icon: "directions_car" },
            { id: "6", name: "Shopping", type: "expense", color: "#E91E63", icon: "shopping_cart" },
            { id: "7", name: "Entertainment", type: "expense", color: "#9C27B0", icon: "movie" }
        ],
        count: 7
    };
    
    res.json(mockCategories);
});

app.get('/api/financial/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        services: {
            database: 'connected',
            categorization: 'active',
            dashboard: 'running'
        },
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not found',
        path: req.originalUrl,
        message: 'This is a demo server. Available endpoints:',
        available: [
            'GET / - Redirect to dashboard',
            'GET /dashboard - Financial Dashboard',
            'GET /api/financial/dashboard/overview - Demo data',
            'GET /api/financial/categories - Demo categories',
            'GET /api/financial/health - Health check'
        ]
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🏦 Financial Dashboard Demo Server running on http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
    console.log(`🔧 Health Check: http://localhost:${PORT}/api/financial/health`);
    console.log(`📝 API Demo: http://localhost:${PORT}/api/financial/dashboard/overview`);
    console.log('');
    console.log('🎯 This demo showcases the complete financial categorization system');
    console.log('💡 The dashboard will load with realistic mock data');
    console.log('🚀 Ready for integration with real banking APIs!');
});