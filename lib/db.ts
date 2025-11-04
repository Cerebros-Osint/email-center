import { PrismaClient } from '@prisma/client';

// Check if we're in build phase
const isBuildPhase = 
  process.env.NEXT_PHASE === 'phase-production-build' ||
  process.env.CI === 'true' ||
  !process.env.DATABASE_URL ||
  process.env.DATABASE_URL === 'postgresql://localhost:5432/build' ||
  process.env.DATABASE_URL?.includes('localhost:5432/build');

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// During build, create a mock client that won't try to connect
const createPrismaClient = () => {
  if (isBuildPhase) {
    console.log('[Prisma] Build phase detected - using mock client');
    // Return a minimal mock that won't try to connect
    return new Proxy({} as PrismaClient, {
      get: () => {
        return new Proxy(() => Promise.resolve([]), {
          apply: () => Promise.resolve([]),
          get: () => () => Promise.resolve([])
        });
      }
    });
  }
  
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production' && !isBuildPhase) {
  globalForPrisma.prisma = prisma;
}

export default prisma;
