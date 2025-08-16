// Authentication utilities for magic link system
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export async function createMagicLink(
  email: string, 
  purpose: 'LOGIN' | 'BOOK_APPOINTMENT' | 'MODIFY_BOOKING',
  data?: any
) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  return await prisma.magicLink.create({
    data: {
      email,
      token,
      purpose,
      data,
      expiresAt,
    },
  });
}

export async function validateMagicLink(token: string) {
  const magicLink = await prisma.magicLink.findUnique({
    where: { token },
  });
  
  if (!magicLink || magicLink.usedAt || magicLink.expiresAt < new Date()) {
    return null;
  }
  
  // Mark as used
  await prisma.magicLink.update({
    where: { id: magicLink.id },
    data: { usedAt: new Date() },
  });
  
  return magicLink;
}
