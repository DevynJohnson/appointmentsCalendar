// Get provider calendar connections
import { NextRequest, NextResponse } from 'next/server';
import { ProviderAuthService } from '@/lib/provider-auth';
import { CalendarConnectionService } from '@/lib/calendar-connections';

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

    const connections = await CalendarConnectionService.getProviderConnections(provider.id);

    return NextResponse.json(connections);
  } catch (error) {
    console.error('Failed to get calendar connections:', error);
    return NextResponse.json(
      { error: 'Failed to get calendar connections' },
      { status: 500 }
    );
  }
}
