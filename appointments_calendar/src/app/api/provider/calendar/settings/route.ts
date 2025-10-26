import { NextRequest, NextResponse } from 'next/server';
import { CalendarConnectionService } from '@/lib/calendar-connections';
import { extractAndVerifyJWT } from '@/lib/jwt-utils';

export async function PUT(request: NextRequest) {
  try {
    // Get provider ID from JWT with proper error handling
    const authHeader = request.headers.get('authorization');
    const jwtResult = extractAndVerifyJWT(authHeader);
    
    if (!jwtResult.success) {
      console.warn('JWT verification failed:', jwtResult.error);
      return NextResponse.json({ 
        error: jwtResult.error, 
        code: jwtResult.code 
      }, { status: 401 });
    }

    const providerId = jwtResult.payload!.providerId;
    console.log('Provider authenticated:', providerId);

    const body = await request.json();
    const { connectionId, settings } = body;

    if (!connectionId) {
      return NextResponse.json({ error: 'Connection ID is required' }, { status: 400 });
    }

    // Update calendar settings
    const updatedConnection = await CalendarConnectionService.updateCalendarSettings(
      connectionId,
      settings
    );

    return NextResponse.json({
      success: true,
      connection: updatedConnection,
    });

  } catch (error) {
    console.error('Failed to update calendar settings:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update calendar settings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
