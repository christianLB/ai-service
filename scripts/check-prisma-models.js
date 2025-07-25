#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkModels() {
  try {
    console.log('Available Prisma models:');
    console.log('========================');
    
    // List all available model accessors
    const modelNames = Object.keys(prisma).filter(key => 
      typeof prisma[key] === 'object' && 
      prisma[key] !== null && 
      'findMany' in prisma[key]
    );
    
    modelNames.forEach(model => {
      console.log(`- prisma.${model}`);
    });
    
    console.log('\n Looking for marketplace models...');
    const marketplaceModels = modelNames.filter(m => 
      m.toLowerCase().includes('strategy') || 
      m.toLowerCase().includes('marketplace')
    );
    
    if (marketplaceModels.length > 0) {
      console.log('\nFound marketplace models:');
      marketplaceModels.forEach(m => console.log(`- prisma.${m}`));
    } else {
      console.log('\nNo marketplace models found!');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkModels();