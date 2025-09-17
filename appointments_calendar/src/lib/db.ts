import { PrismaClient } from '@prisma/client';

// Global declaration for TypeScript
declare global {
  var __prisma: PrismaClient | undefined;
}

// Create a singleton PrismaClient instance
const prisma = globalThis.__prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// In development, save the instance to global to prevent hot reloads from creating new instances
if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma;
}

export { prisma };
export default prisma;