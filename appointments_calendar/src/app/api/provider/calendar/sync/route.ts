// Manual calendar sync trigger
import { NextRequest, NextResponse } from 'next/server';
import { ProviderAuthService } from '@/lib/provider-auth';
import { CalendarSyncService } from '@/lib/calendar-sync';

export async function POST(request: NextRequest) {
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

    const results = await CalendarSyncService.syncAllCalendars(provider.id);

    return NextResponse.json({
      message: 'Calendar sync completed',
      results,
    });
  } catch (error) {
    console.error('Calendar sync failed:', error);
    return NextResponse.json(
      { error: 'Calendar sync failed' },
      { status: 500 }
    );
  }
}
