// Enhanced API endpoint that supports both manual events and automatic availability
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { AvailabilityService } from '@/lib/availability-service';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const providerId = searchParams.get('providerId');
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const serviceType = searchParams.get('serviceType');
    const daysAhead = parseInt(searchParams.get('daysAhead') || '30');
    const mode = searchParams.get('mode') || 'auto'; // 'manual' or 'auto' or 'both'

    if (!providerId) {
      return NextResponse.json({ error: 'providerId is required' }, { status: 400 });
    }

    // Get provider details
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

    // Calculate date range
    const now = new Date();
    const maxDate = new Date();
    maxDate.setDate(now.getDate() + Math.min(daysAhead, provider.advanceBookingDays));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let manualSlots: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let autoSlots: any[] = [];

    // Get manual event-based slots if requested
    if (mode === 'manual' || mode === 'both') {
      manualSlots = await getManualEventSlots(providerId, now, maxDate, city, state, serviceType, provider);
    }

    // Get automatic availability slots if requested  
    if (mode === 'auto' || mode === 'both') {
      try {
        const automaticSlots = await AvailabilityService.generateAutomaticSlots(
          providerId,
          now,
          maxDate,
          {
            businessHours: { start: "09:00", end: "17:00" },
            workingDays: [1, 2, 3, 4, 5], // Mon-Fri
            slotDuration: provider.defaultBookingDuration,
            bufferTime: provider.bufferTime,
            includeWeekends: false,
          }
        );

        // Convert automatic slots to the same format as manual slots
        autoSlots = automaticSlots.map(slot => ({
          id: slot.id,
          eventId: `auto-${slot.id}`,
          startTime: slot.startTime,
          endTime: slot.endTime,
          duration: slot.duration,
          provider: {
            id: provider.id,
            name: provider.name,
          },
          location: {
            display: 'Provider Office', // Default location for auto slots
            city: city || '',
            state: state || '',
            address: '',
          },
          availableServices: serviceType ? [serviceType] : ['consultation', 'maintenance'],
          eventTitle: 'Available Appointment',
          slotsRemaining: 1,
          type: 'automatic',
        }));

        // Filter auto slots by location if specified
        if (city || state) {
          autoSlots = autoSlots.filter(slot => {
            if (city && !slot.location.city.toLowerCase().includes(city.toLowerCase())) {
              return false;
            }
            if (state && !slot.location.state.toLowerCase().includes(state.toLowerCase())) {
              return false;
            }
            return true;
          });
        }
      } catch (error) {
        console.error('Failed to generate automatic slots:', error);
        // Continue with manual slots only
      }
    }

    // Combine and sort all slots
    const allSlots = [...manualSlots, ...autoSlots].sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    return NextResponse.json({
      success: true,
      provider: {
        id: provider.id,
        name: provider.name,
      },
      totalSlots: allSlots.length,
      manualSlots: manualSlots.length,
      autoSlots: autoSlots.length,
      mode: mode,
      slots: allSlots,
      filters: {
        providerId,
        city,
        state,
        serviceType,
        daysAhead,
        mode,
      },
    });

  } catch (error) {
    console.error('Failed to fetch availability:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch availability',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to get manual event-based slots (original logic)
async function getManualEventSlots(
  providerId: string,
  startDate: Date,
  endDate: Date,
  city?: string | null,
  state?: string | null,
  serviceType?: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  provider?: any
) {
  // Build filters for calendar events
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eventFilters: any = {
    providerId,
    allowBookings: true,
    startTime: {
      gte: startDate,
      lte: endDate,
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
    },
    orderBy: {
      startTime: 'asc',
    },
  });

  // Generate available slots for each event (original logic)
  const availableSlots = [];

  for (const event of calendarEvents) {
    const currentBookings = event.bookings.length;
    if (currentBookings >= event.maxBookings) {
      continue;
    }

    const eventStart = new Date(event.startTime);
    const eventEnd = new Date(event.endTime);
    const slotDuration = provider?.defaultBookingDuration || 60;
    const bufferTime = provider?.bufferTime || 15;

    const eventDurationMinutes = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60);
    if (eventDurationMinutes < slotDuration) {
      continue;
    }

    const slotInterval = Math.min(30, slotDuration);
    let currentSlotStart = new Date(eventStart);

    while (currentSlotStart.getTime() + (slotDuration * 60 * 1000) <= eventEnd.getTime()) {
      const slotEnd = new Date(currentSlotStart.getTime() + (slotDuration * 60 * 1000));

      const hasConflict = event.bookings.some(booking => {
        const bookingStart = new Date(booking.scheduledAt);
        const bookingEnd = new Date(bookingStart.getTime() + (booking.duration * 60 * 1000));

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
            id: provider?.id || providerId,
            name: provider?.name || 'Provider',
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
          type: 'manual',
        });
      }

      currentSlotStart = new Date(currentSlotStart.getTime() + (slotInterval * 60 * 1000));
    }
  }

  return availableSlots;
}
