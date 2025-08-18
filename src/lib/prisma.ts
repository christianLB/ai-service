import { PrismaClient } from '@prisma/client';

// Re-export types from Prisma
export * from '@prisma/client';

// Singleton pattern for Prisma Client
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Helper function to disconnect on app termination
export async function disconnectPrisma() {
  await prisma.$disconnect();
}

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await disconnectPrisma();
});
