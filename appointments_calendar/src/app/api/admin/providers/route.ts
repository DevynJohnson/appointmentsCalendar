// Admin endpoint to list all providers
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const providers = await prisma.provider.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        title: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      count: providers.length,
      providers
    });
  } catch (error) {
    console.error('Failed to get providers:', error);
    return NextResponse.json(
      { error: 'Failed to get providers' },
      { status: 500 }
    );
  }
}
