// Admin endpoint to view calendar connections
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const connections = await prisma.calendarConnection.findMany({
      include: {
        provider: {
          select: {
            name: true,
            email: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      count: connections.length,
      connections
    });
  } catch (error) {
    console.error('Failed to get calendar connections:', error);
    return NextResponse.json(
      { error: 'Failed to get calendar connections' },
      { status: 500 }
    );
  }
}
