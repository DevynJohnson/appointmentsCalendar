// Default Calendar Settings API
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { extractAndVerifyJWT } from '@/lib/jwt-utils';

interface ConnectionData {
  id: string;
  platform: string;
  email: string;
  calendarId: string;
  calendarName: string | null;
  isDefaultForBookings: boolean;
  isActive: boolean;
  createdAt: Date;
  selectedCalendars: unknown;
  calendarSettings: unknown;
  allowBookings: boolean;
}

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

    // Get all calendar connections for the provider
    const connections = await prisma.calendarConnection.findMany({
      where: {
        providerId,
        isActive: true,
      },
      select: {
        id: true,
        platform: true,
        email: true,
        calendarId: true,
        calendarName: true,
        isDefaultForBookings: true,
        isActive: true,
        createdAt: true,
        selectedCalendars: true,
        calendarSettings: true,
        allowBookings: true,
      },
      orderBy: [
        { isDefaultForBookings: 'desc' },
        { createdAt: 'asc' }
      ]
    });

    interface CalendarInfo {
      connectionId: string;
      calendarId: string;
      calendarName: string;
      email: string;
      isDefault: boolean;
    }

    const platformGroups: Record<string, CalendarInfo[]> = {};

    // Process each connection to extract available calendars
    for (const connection of connections) {
      const platform = connection.platform;
      if (!platformGroups[platform]) {
        platformGroups[platform] = [];
      }

      // Check if this connection has multi-calendar setup
      if (connection.selectedCalendars && Array.isArray(connection.selectedCalendars)) {
        const calendarSettings = connection.calendarSettings as Record<string, {
          allowBookings?: boolean;
          calendarName?: string;
          canWrite?: boolean;
        }> | null;
        
        // Add each selected calendar that allows bookings and is writeable
        for (const calendarId of connection.selectedCalendars) {
          // Type cast to string since selectedCalendars should contain calendar ID strings
          const calendarIdStr = calendarId as string;
          const settings = calendarSettings?.[calendarIdStr];
          if (settings?.allowBookings && settings?.canWrite !== false) {
            platformGroups[platform].push({
              connectionId: connection.id,
              calendarId: calendarIdStr,
              calendarName: settings.calendarName || `${platform} Calendar`,
              email: connection.email,
              isDefault: connection.isDefaultForBookings && connection.calendarId === calendarIdStr,
            });
          }
        }
      } else {
        // Fallback to primary calendar for connections without multi-calendar setup
        if (connection.allowBookings) {
          platformGroups[platform].push({
            connectionId: connection.id,
            calendarId: connection.calendarId,
            calendarName: connection.calendarName || `${platform} Calendar`,
            email: connection.email,
            isDefault: connection.isDefaultForBookings,
          });
        }
      }
    }

    // Get current default
    const currentDefault = connections.find((conn: ConnectionData) => conn.isDefaultForBookings);

    // Format data to match frontend expectations
    const platforms = Object.entries(platformGroups).map(([platform, calendars]) => ({
      platform,
      calendars: calendars.map(cal => ({
        calendarId: cal.calendarId,
        calendarName: cal.calendarName,
        email: cal.email,
      })),
    }));

    return NextResponse.json({
      platforms,
      currentDefault: currentDefault ? {
        platform: currentDefault.platform,
        calendarId: currentDefault.calendarId,
        email: currentDefault.email,
      } : null,
    });

  } catch (error) {
    console.error('Default calendar settings error:', error);
    return NextResponse.json(
      { error: 'Failed to get default calendar settings' },
      { status: 500 }
    );
  }
}

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

    const { platform, calendarId, connectionId } = await request.json();

    // Support both old (connectionId) and new (platform + calendarId) formats
    let targetConnection;
    
    if (connectionId) {
      // Old format - find connection by ID
      targetConnection = await prisma.calendarConnection.findFirst({
        where: {
          id: connectionId,
          providerId,
          isActive: true,
        }
      });
    } else if (platform && calendarId) {
      // New format - find connection that contains this calendar
      const connections = await prisma.calendarConnection.findMany({
        where: {
          providerId,
          platform: platform,
          isActive: true,
        }
      });

      // Find the connection that has this calendar in its selectedCalendars
      for (const conn of connections) {
        if (conn.selectedCalendars && Array.isArray(conn.selectedCalendars)) {
          if (conn.selectedCalendars.includes(calendarId)) {
            targetConnection = conn;
            break;
          }
        } else if (conn.calendarId === calendarId) {
          // Fallback for legacy connections without multi-calendar setup
          targetConnection = conn;
          break;
        }
      }
    }

    if (!targetConnection) {
      return NextResponse.json({ error: 'Calendar connection not found' }, { status: 404 });
    }

    if (!platform || !calendarId) {
      return NextResponse.json({ error: 'Platform and calendar ID are required' }, { status: 400 });
    }

    // Update default settings - first unset all existing defaults for this provider
    await prisma.calendarConnection.updateMany({
      where: {
        providerId,
      },
      data: {
        isDefaultForBookings: false,
      },
    });

    // Set the new default connection and update the primary calendar ID
    const updatedConnection = await prisma.calendarConnection.update({
      where: {
        id: targetConnection.id,
      },
      data: {
        isDefaultForBookings: true,
        calendarId: calendarId, // Update the primary calendar to the selected one
      },
      select: {
        id: true,
        platform: true,
        calendarId: true,
        calendarName: true,
        email: true,
        isDefaultForBookings: true,
        selectedCalendars: true,
        calendarSettings: true,
      }
    });

    // Get the calendar name from settings if available
    const calendarSettings = updatedConnection.calendarSettings as Record<string, {calendarName?: string}> | null;
    const calendarName = calendarSettings?.[calendarId]?.calendarName || updatedConnection.calendarName || `${platform} Calendar`;

    return NextResponse.json({
      message: 'Default calendar updated successfully',
      defaultCalendar: {
        platform: updatedConnection.platform,
        connectionId: updatedConnection.id,
        calendarId: calendarId,
        calendarName: calendarName,
        email: updatedConnection.email,
      }
    });

  } catch (error) {
    console.error('Update default calendar error:', error);
    return NextResponse.json(
      { error: 'Failed to update default calendar' },
      { status: 500 }
    );
  }
}