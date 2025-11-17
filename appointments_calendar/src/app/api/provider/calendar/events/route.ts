// Get provider calendar events
import { NextRequest, NextResponse } from 'next/server';
import { ProviderAuthService } from '@/lib/provider-auth';
import { withProviderContext } from '@/lib/db';


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

    console.log(`🔍 Fetching calendar events for provider: ${provider.id} (${provider.email})`);

        // Explicitly filter by provider ID to ensure data isolation
    const events = await withProviderContext(provider.id, async (tx) => {
      return await tx.calendarEvent.findMany({
        where: { providerId: provider.id }, // Explicit filtering for security
        include: {
          connection: {
            select: {
              platform: true,
              email: true,
              calendarName: true,
            },
          },
          bookings: true, // Include bookings to count them
        },
        orderBy: { startTime: 'asc' },
      });
    });

    console.log(`📅 Found ${events.length} calendar events for provider ${provider.id}`);

    // Transform events to include booking counts
    const eventsWithBookingCounts = events.map(event => ({
      id: event.id,
      title: event.title,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime.toISOString(),
      location: event.location,
      platform: event.connection.platform,
      allowBookings: event.allowBookings,
      maxBookings: event.maxBookings,
      currentBookings: event.bookings?.length || 0,
    }));

    return NextResponse.json(eventsWithBookingCounts);
  } catch (error) {
    console.error('Failed to get calendar events:', error);
    return NextResponse.json(
      { error: 'Failed to get calendar events' },
      { status: 500 }
    );
  }
}
