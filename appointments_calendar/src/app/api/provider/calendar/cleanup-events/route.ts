// API endpoint to cleanup/remove synced events from a specific calendar
import { NextRequest, NextResponse } from 'next/server';
import { ProviderAuthService } from '@/lib/provider-auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const provider = await ProviderAuthService.verifyToken(token || '');
    
    if (!provider) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { connectionId, calendarId } = await request.json();
    
    console.log('🧹 Cleanup request:', { connectionId, calendarId, providerId: provider.id });

    if (!connectionId || !calendarId) {
      return NextResponse.json({ error: 'Connection ID and Calendar ID are required' }, { status: 400 });
    }

    // Verify the connection belongs to this provider
    const connection = await prisma.calendarConnection.findFirst({
      where: {
        id: connectionId,
        providerId: provider.id,
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Delete all events from this specific calendar connection
    const deleteResult = await prisma.calendarEvent.deleteMany({
      where: {
        connectionId: connectionId,
        calendarId: calendarId,
      },
    });

    console.log(`🧹 Cleaned up ${deleteResult.count} events from calendar ${calendarId} in connection ${connectionId}`);

    return NextResponse.json({
      message: `Successfully removed ${deleteResult.count} synced events from the calendar`,
      deletedCount: deleteResult.count,
    });

  } catch (error) {
    console.error('❌ Cleanup events error:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup events' },
      { status: 500 }
    );
  }
}