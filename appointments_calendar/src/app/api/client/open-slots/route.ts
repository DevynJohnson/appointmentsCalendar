// API endpoint to fetch open appointment slots for clients
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const providerId = searchParams.get('providerId');
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const serviceType = searchParams.get('serviceType');
    const daysAhead = parseInt(searchParams.get('daysAhead') || '30');

    if (!providerId) {
      return NextResponse.json({ error: 'providerId is required' }, { status: 400 });
    }

    // Get provider details for default booking settings
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      select: {
        id: true,
        name: true,
        defaultBookingDuration: true,
        bufferTime: true,
        advanceBookingDays: true,
      },
    });

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    // Calculate date range for available slots
    const now = new Date();
    const maxDate = new Date();
    maxDate.setDate(now.getDate() + Math.min(daysAhead, provider.advanceBookingDays));

    // Build filters for calendar events
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eventFilters: any = {
      providerId,
      allowBookings: true,
      startTime: {
        gte: now,
        lte: maxDate,
      },
    };

    // Add location filters if provided
    if (city) {
      eventFilters.city = {
        contains: city,
        mode: 'insensitive',
      };
    }
    if (state) {
      eventFilters.state = {
        contains: state,
        mode: 'insensitive',
      };
    }

    // Add service type filter if provided
    if (serviceType) {
      eventFilters.availableServices = {
        has: serviceType,
      };
    }

    // Get calendar events where bookings are allowed
    const calendarEvents = await prisma.calendarEvent.findMany({
      where: eventFilters,
      include: {
        bookings: {
          where: {
            status: {
              in: ['CONFIRMED', 'PENDING'],
            },
          },
          select: {
            id: true,
            scheduledAt: true,
            duration: true,
          },
        },
        provider: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    // Generate available slots for each event
    const availableSlots = [];

    for (const event of calendarEvents) {
      // Check if event has available booking slots
      const currentBookings = event.bookings.length;
      if (currentBookings >= event.maxBookings) {
        continue; // Event is fully booked
      }

      // Generate time slots within this event
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);
      const slotDuration = provider.defaultBookingDuration;
      const bufferTime = provider.bufferTime;

      // Skip if event is too short for a booking
      const eventDurationMinutes = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60);
      if (eventDurationMinutes < slotDuration) {
        continue;
      }

      // Generate slots every 30 minutes (or slot duration if smaller)
      const slotInterval = Math.min(30, slotDuration);
      let currentSlotStart = new Date(eventStart);

      while (currentSlotStart.getTime() + (slotDuration * 60 * 1000) <= eventEnd.getTime()) {
        const slotEnd = new Date(currentSlotStart.getTime() + (slotDuration * 60 * 1000));

        // Check if this slot conflicts with existing bookings
        const hasConflict = event.bookings.some(booking => {
          const bookingStart = new Date(booking.scheduledAt);
          const bookingEnd = new Date(bookingStart.getTime() + (booking.duration * 60 * 1000));

          // Add buffer time to check for conflicts
          const bufferStart = new Date(bookingStart.getTime() - (bufferTime * 60 * 1000));
          const bufferEnd = new Date(bookingEnd.getTime() + (bufferTime * 60 * 1000));

          return (
            (currentSlotStart >= bufferStart && currentSlotStart < bufferEnd) ||
            (slotEnd > bufferStart && slotEnd <= bufferEnd) ||
            (currentSlotStart <= bufferStart && slotEnd >= bufferEnd)
          );
        });

        if (!hasConflict) {
          availableSlots.push({
            id: `${event.id}-${currentSlotStart.getTime()}`,
            eventId: event.id,
            startTime: currentSlotStart.toISOString(),
            endTime: slotEnd.toISOString(),
            duration: slotDuration,
            provider: {
              id: provider.id,
              name: provider.name,
            },
            location: {
              display: event.location,
              city: event.city,
              state: event.state,
              address: event.address,
            },
            availableServices: event.availableServices,
            eventTitle: event.title,
            slotsRemaining: event.maxBookings - currentBookings,
          });
        }

        // Move to next slot
        currentSlotStart = new Date(currentSlotStart.getTime() + (slotInterval * 60 * 1000));
      }
    }

    return NextResponse.json({
      success: true,
      provider: {
        id: provider.id,
        name: provider.name,
      },
      totalSlots: availableSlots.length,
      slots: availableSlots,
      filters: {
        providerId,
        city,
        state,
        serviceType,
        daysAhead,
      },
    });

  } catch (error) {
    console.error('Failed to fetch open slots:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch open slots',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
