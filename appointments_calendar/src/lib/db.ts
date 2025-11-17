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

// Type for Prisma transaction client
type PrismaTransaction = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Execute a function with provider context
 * The function receives the transaction client as its first parameter
 */
export async function withProviderContext<T>(
  providerId: string, 
  fn: (tx: PrismaTransaction) => Promise<T>
): Promise<T> {
  return await prisma.$transaction(async (tx) => {
    // Set provider context within the transaction
    await tx.$executeRaw`SELECT set_config('app.current_provider_id', ${providerId}, true)`;
    
    // Execute the function with the transaction client
    return await fn(tx);
  });
}

export { prisma };
export default prisma;