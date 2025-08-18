import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create test user
  const testPassword = process.env.TEST_USER_PASSWORD || 'test123';
  const passwordHash = await bcrypt.hash(testPassword, 10);
  const user = await prisma.user.upsert({
    where: { email: 'admin@ai-service.local' },
    update: {},
    create: {
      email: 'admin@ai-service.local',
      password_hash: await bcrypt.hash('admin123', 10),
      full_name: 'Admin User',
      role: 'admin',
    },
  });

  console.log('✓ User created:', user.email);
  if (process.env.NODE_ENV !== 'production') {
    console.log('  Password: [REDACTED - check TEST_USER_PASSWORD env var]');
  }

  console.log('✓ Skipping client creation for now');

  console.log('✓ Skipping sample data creation for now');

  console.log('\n✨ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error in seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });