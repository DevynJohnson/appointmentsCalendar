// Fix existing calendar connections to have proper syncEvents and allowBookings values
import { NextRequest, NextResponse } from 'next/server';
import { extractAndVerifyJWT } from '@/lib/jwt-utils';
import { CalendarConnectionService, AvailableCalendar } from '@/lib/calendar-connections';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
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

    // Get all connections for this provider first
    const connections = await prisma.calendarConnection.findMany({
      where: {
        providerId,
      },
    });

    // Update each connection individually to set up multi-calendar fields
    let updateCount = 0;
    for (const connection of connections) {
      try {
        // Fetch available calendars for this connection
        let availableCalendars: AvailableCalendar[] = [];
        let selectedCalendars: string[] = [];
        let calendarSettings: Record<string, { syncEvents: boolean; allowBookings: boolean }> = {};

        if (connection.accessToken) {
          try {
            // Apple Calendar requires email and app password, others just need access token
            if (connection.platform === 'APPLE') {
              // For Apple Calendar, we would need the app password, but it's not stored in the connection
              // Skip Apple Calendar for now in fix-connections since we don't have the app password
              console.log(`Skipping Apple Calendar connection ${connection.id} - app password not available`);
              continue;
            }
            
            availableCalendars = await CalendarConnectionService.getAvailableCalendars(
              connection.platform as 'GOOGLE' | 'OUTLOOK' | 'TEAMS',
              connection.accessToken
            );

            // Filter out read-only calendars and set up settings
            const writeableCalendars = availableCalendars.filter(cal => cal.canWrite !== false);
            selectedCalendars = writeableCalendars.map(cal => cal.id);
            calendarSettings = writeableCalendars.reduce((settings, cal) => {
              settings[cal.id] = {
                syncEvents: true,
                allowBookings: true,
                calendarName: cal.name || 'Unnamed Calendar',
                canWrite: cal.canWrite !== false,
              };
              return settings;
            }, {} as Record<string, { syncEvents: boolean; allowBookings: boolean; calendarName: string; canWrite: boolean }>);

            console.log(`Found ${availableCalendars.length} calendars for ${connection.platform} (${connection.email})`);
          } catch (fetchError) {
            console.error(`Failed to fetch calendars for ${connection.platform} (${connection.email}):`, fetchError);
            // Fallback to primary calendar only
            selectedCalendars = [connection.calendarId];
            calendarSettings = {
              [connection.calendarId]: {
                syncEvents: true,
                allowBookings: true,
              }
            };
          }
        } else {
          // No access token, use primary calendar only
          selectedCalendars = [connection.calendarId];
          calendarSettings = {
            [connection.calendarId]: {
              syncEvents: true,
              allowBookings: true,
            }
          };
        }

        await prisma.calendarConnection.update({
          where: { id: connection.id },
          data: {
            syncEvents: true,
            allowBookings: true,
            selectedCalendars: selectedCalendars,
            calendarSettings: calendarSettings,
          }
        });
        updateCount++;
      } catch (updateError) {
        console.error(`Failed to update connection ${connection.id}:`, updateError);
        // Continue with other connections
      }
    }

    console.log(`Updated ${updateCount} calendar connections with multi-calendar support`);

    // Get the updated connections to return
    const updatedConnections = await prisma.calendarConnection.findMany({
      where: {
        providerId,
      },
      select: {
        id: true,
        platform: true,
        email: true,
        syncEvents: true,
        allowBookings: true,
        selectedCalendars: true,
        calendarSettings: true,
        isActive: true,
      }
    });

    return NextResponse.json({
      message: `Fixed ${updateCount} calendar connections with multi-calendar support`,
      connections: updatedConnections,
    });

  } catch (error) {
    console.error('Fix connections error:', error);
    return NextResponse.json(
      { error: 'Failed to fix connections' },
      { status: 500 }
    );
  }
}