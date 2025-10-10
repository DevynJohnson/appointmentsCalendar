// Get provider calendar connections
import { NextRequest, NextResponse } from 'next/server';
import { ProviderAuthService } from '@/lib/provider-auth';
import { withProviderContext } from '@/lib/db-rls';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const provider = await ProviderAuthService.verifyToken(token);

    // Use RLS context - will automatically filter to only this provider's connections
    const connections = await withProviderContext(provider.id, async () => {
      return await prisma.calendarConnection.findMany({
        orderBy: { createdAt: 'desc' },
      });
    });

    return NextResponse.json(connections);
  } catch (error) {
    console.error('Failed to get calendar connections:', error);
    return NextResponse.json(
      { error: 'Failed to get calendar connections' },
      { status: 500 }
    );
  }
}
