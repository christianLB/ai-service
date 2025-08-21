#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });
dotenv.config({ path: resolve(__dirname, '../.env') });

async function getToken(format: 'plain' | 'json' = 'plain') {
  const prisma = new PrismaClient();
  
  try {
    // Find admin user
    const admin = await prisma.user.findFirst({
      where: { 
        email: 'admin@ai-service.local',
        role: 'admin'
      }
    });
    
    if (!admin) {
      console.error('Admin user not found. Run: npm run db:seed');
      process.exit(1);
    }
    
    // Generate token
    const token = jwt.sign(
      { 
        userId: admin.id, 
        email: admin.email,
        role: admin.role,
        type: 'access'
      },
      process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
      { expiresIn: '24h' }
    );
    
    // Output based on format
    if (format === 'json') {
      console.log(JSON.stringify({
        accessToken: token,
        expiresIn: '24h',
        userId: admin.id,
        email: admin.email
      }, null, 2));
    } else {
      // Plain format - just the token, perfect for piping
      console.log(token);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error generating token:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Parse command line args
const args = process.argv.slice(2);
const format = args.includes('--json') ? 'json' : 'plain';

// Run
getToken(format);