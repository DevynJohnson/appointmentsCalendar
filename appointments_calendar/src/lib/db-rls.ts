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
 * Set the current provider context for RLS
 */
export async function setProviderContext(providerId: string) {
  await prisma.$executeRaw`SELECT set_config('app.current_provider_id', ${providerId}, true)`;
}

/**
 * Set the current user context for RLS
 */
export async function setUserContext(userId: string) {
  await prisma.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, true)`;
}

/**
 * Clear all RLS context (for admin operations)
 */
export async function clearRLSContext() {
  await prisma.$executeRaw`SELECT set_config('app.current_provider_id', '', true)`;
  await prisma.$executeRaw`SELECT set_config('app.current_user_id', '', true)`;
}

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

/**
 * Execute a function with user context
 */
export async function withUserContext<T>(
  userId: string, 
  fn: () => Promise<T>
): Promise<T> {
  await setUserContext(userId);
  try {
    return await fn();
  } finally {
    await clearRLSContext();
  }
}

/**
 * Execute a function without RLS (admin mode)
 */
export async function withoutRLS<T>(fn: () => Promise<T>): Promise<T> {
  // For admin operations, we might need to temporarily disable RLS
  // This should be used very carefully and only for admin endpoints
  await clearRLSContext();
  return await fn();
}

export { prisma };
export default prisma;