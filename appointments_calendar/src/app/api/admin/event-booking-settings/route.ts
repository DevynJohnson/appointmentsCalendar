// Admin endpoint to enable bookings on calendar events
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type EventWithProvider = {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  location: string | null;
  allowBookings: boolean;
  maxBookings: number | null;
  availableServices: string[];
  provider: {
    name: string;
  };
};

export async function POST(request: NextRequest) {
  try {
    const { eventId, allowBookings, maxBookings, availableServices } = await request.json();

    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
    }

    const updatedEvent = await prisma.calendarEvent.update({
      where: { id: eventId },
      data: {
        allowBookings: allowBookings ?? true,
        maxBookings: maxBookings ?? 1,
        availableServices: availableServices ?? ['consultation'],
      },
      include: {
        provider: {
          select: { name: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      event: {
        id: updatedEvent.id,
        title: updatedEvent.title,
        startTime: updatedEvent.startTime,
        endTime: updatedEvent.endTime,
        allowBookings: updatedEvent.allowBookings,
        maxBookings: updatedEvent.maxBookings,
        availableServices: updatedEvent.availableServices,
        provider: updatedEvent.provider.name,
      }
    });

  } catch (error) {
    console.error('Failed to update event booking settings:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update event',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const providerId = searchParams.get('providerId');

    if (!providerId) {
      return NextResponse.json({ error: 'providerId is required' }, { status: 400 });
    }

    // Get all calendar events for this provider
    const events: EventWithProvider[] = await prisma.calendarEvent.findMany({
      where: { 
        providerId,
        startTime: {
          gte: new Date() // Only future events
        }
      },
      include: {
        provider: {
          select: { name: true }
        }
      },
      orderBy: {
        startTime: 'asc'
      },
      take: 20 // Limit to first 20 events
    });

    return NextResponse.json({
      success: true,
      events: events.map((event: EventWithProvider) => ({
        id: event.id,
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
        allowBookings: event.allowBookings,
        maxBookings: event.maxBookings,
        availableServices: event.availableServices,
        provider: event.provider.name,
      }))
    });

  } catch (error) {
    console.error('Failed to fetch events:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch events',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
