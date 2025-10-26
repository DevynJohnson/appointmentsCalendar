import { NextRequest, NextResponse } from 'next/server';
import { CalendarConnectionService } from '@/lib/calendar-connections';
import { ensureValidToken } from '@/lib/token-refresh';
import { extractAndVerifyJWT } from '@/lib/jwt-utils';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
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

    const url = new URL(request.url);
    const platformParam = url.searchParams.get('platform');
    const connectionId = url.searchParams.get('connectionId');
    const email = url.searchParams.get('email');
    const appPassword = url.searchParams.get('appPassword');

    if (!platformParam) {
      return NextResponse.json({ error: 'Platform is required' }, { status: 400 });
    }

    // Validate platform enum
    const validPlatforms = ['GOOGLE', 'OUTLOOK', 'TEAMS', 'APPLE'];
    if (!validPlatforms.includes(platformParam)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }

    const platform = platformParam as 'GOOGLE' | 'OUTLOOK' | 'TEAMS' | 'APPLE';

    // For Apple Calendar, use the old method with email/password
    if (platform === 'APPLE') {
      if (!email || !appPassword) {
        return NextResponse.json({ error: 'Email and app password are required for Apple Calendar' }, { status: 400 });
      }
      
      const allCalendars = await CalendarConnectionService.getAvailableCalendars(
        platform,
        '',
        email,
        appPassword
      );

      // Filter out read-only calendars (holidays, birthdays, etc.)
      const writeableCalendars = allCalendars.filter(calendar => {
        // Must have write access
        if (!calendar.canWrite) return false;
        
        // Filter out common read-only calendar patterns
        const name = calendar.name.toLowerCase();
        const readOnlyPatterns = [
          'holidays',
          'birthday',
          'contacts',
          'weather',
          'phases of the moon',
          'week numbers',
          'religious calendar',
          'sports calendar'
        ];
        
        const isReadOnlyPattern = readOnlyPatterns.some(pattern => 
          name.includes(pattern)
        );
        
        return !isReadOnlyPattern;
      });

      return NextResponse.json({
        success: true,
        calendars: writeableCalendars,
      });
    }

    // For OAuth platforms (Google, Outlook, Teams), find the connection and refresh token if needed
    if (!connectionId) {
      return NextResponse.json({ error: 'Connection ID is required for OAuth platforms' }, { status: 400 });
    }

    // Find the calendar connection for this provider and platform
    const connection = await prisma.calendarConnection.findFirst({
      where: {
        id: connectionId,
        providerId: providerId,
        platform: platform,
        isActive: true,
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Calendar connection not found' }, { status: 404 });
    }

    // Use token refresh system to ensure we have a valid access token
    const validConnection = {
      id: connection.id,
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken || null,
      tokenExpiry: connection.tokenExpiry,
      platform: connection.platform,
    };

    let validAccessToken: string;
    try {
      validAccessToken = await ensureValidToken(validConnection);
    } catch (error) {
      console.error('Token refresh failed:', error);
      return NextResponse.json({ 
        error: 'Authentication expired. Please reconnect your calendar.',
        needsReauth: true
      }, { status: 401 });
    }

    // Fetch available calendars with the valid token
    const allCalendars = await CalendarConnectionService.getAvailableCalendars(
      platform,
      validAccessToken
    );

    // Filter out read-only calendars (holidays, birthdays, etc.)
    const writeableCalendars = allCalendars.filter(calendar => {
      // Must have write access
      if (!calendar.canWrite) return false;
      
      // Filter out common read-only calendar patterns
      const name = calendar.name.toLowerCase();
      const readOnlyPatterns = [
        'holidays',
        'birthday',
        'contacts',
        'weather',
        'phases of the moon',
        'week numbers',
        'religious calendar',
        'sports calendar'
      ];
      
      const isReadOnlyPattern = readOnlyPatterns.some(pattern => 
        name.includes(pattern)
      );
      
      return !isReadOnlyPattern;
    });

    return NextResponse.json({
      success: true,
      calendars: writeableCalendars,
    });

  } catch (error) {
    console.error('Failed to fetch available calendars:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch available calendars',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
