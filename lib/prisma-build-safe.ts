// Safe Prisma client that won't try to connect during build
import { PrismaClient } from '@prisma/client';

const isBuildPhase = 
  process.env.NEXT_PHASE === 'phase-production-build' || 
  process.env.BUILD_ID || 
  process.env.CI === 'true';

// During build, export a mock client
if (isBuildPhase) {
  // @ts-ignore - Mock client for build phase
  const mockPrisma = new Proxy({} as PrismaClient, {
    get: () => {
      return new Proxy(() => {}, {
        apply: () => Promise.resolve([]),
        get: () => () => Promise.resolve([])
      });
    }
  });
  
  // @ts-ignore
  global.prisma = mockPrisma;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? 
  (isBuildPhase ? 
    // @ts-ignore
    global.prisma : 
    new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
  );

if (process.env.NODE_ENV !== 'production' && !isBuildPhase) {
  globalForPrisma.prisma = prisma;
}

export default prisma;
