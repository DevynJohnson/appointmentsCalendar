// Enhanced API endpoint that supports both manual events and automatic availability
import { NextRequest, NextResponse } from 'next/server';
import { AvailabilityService } from '@/lib/availability-service';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const providerId = searchParams.get('providerId');
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const serviceType = searchParams.get('serviceType');
    const daysAhead = parseInt(searchParams.get('daysAhead') || '30');
    const mode = searchParams.get('mode') || 'auto'; // Only 'auto' mode - calendar events are busy times

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

    // Skip manual event-based slots - calendar events represent busy times, not bookable slots
    // Manual slots are disabled to prevent booking over existing calendar events
    if (mode === 'manual') {
      console.log('Manual mode disabled - calendar events are treated as busy times');
      manualSlots = [];
    }

    // Get automatic availability slots (calendar events are treated as busy times)
    if (mode === 'auto' || mode === 'both' || mode === 'manual') {
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
