// Get provider calendar events
import { NextRequest, NextResponse } from 'next/server';
import { ProviderAuthService } from '@/lib/provider-auth';
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

    const events = await prisma.calendarEvent.findMany({
      where: {
        providerId: provider.id,
        startTime: {
          gte: new Date(),
        },
      },
      include: {
        bookings: true,
      },
      orderBy: {
        startTime: 'asc',
      },
      take: 50, // Limit to next 50 events
    });

    // Transform events to include booking counts
    const eventsWithBookingCounts = events.map(event => ({
      id: event.id,
      title: event.title,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime.toISOString(),
      location: event.location,
      platform: event.platform,
      allowBookings: event.allowBookings,
      maxBookings: event.maxBookings,
      currentBookings: event.bookings.length,
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
