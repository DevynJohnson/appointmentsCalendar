// Test endpoint to verify calendar connections without OAuth
import { NextRequest, NextResponse } from 'next/server';
import { CalendarSyncService } from '@/lib/calendar-sync';
import { prisma } from '@/lib/db';

type CalendarConnection = {
  platform: string;
  email: string;
  isActive: boolean;
  lastSyncAt: Date | null;
  tokenExpiry: Date | null;
  provider?: {
    name: string;
  };
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const providerId = searchParams.get('providerId');

    if (!providerId) {
      return NextResponse.json({ error: 'providerId required' }, { status: 400 });
    }

    // Get all connections for this provider
    const connections = await prisma.calendarConnection.findMany({
      where: { 
        providerId,
        isActive: true 
      },
      include: { provider: true },
    });

    // Test sync for each platform
    const testResults = {
      provider: connections[0]?.provider?.name || 'Unknown',
      connections: connections.map((conn: CalendarConnection) => ({
        platform: conn.platform,
        email: conn.email,
        isActive: conn.isActive,
        lastSync: conn.lastSyncAt,
        tokenExpiry: conn.tokenExpiry,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      syncTest: null as { success: boolean; results?: any; error?: string } | null,
    };

    // Try to sync
    try {
      const syncResults = await CalendarSyncService.syncAllCalendars(providerId);
      testResults.syncTest = {
        success: true,
        results: syncResults,
      };
    } catch (error) {
      testResults.syncTest = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown sync error',
      };
    }

    return NextResponse.json(testResults);
  } catch (error) {
    console.error('Calendar test failed:', error);
    return NextResponse.json(
      { 
        error: 'Test failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
