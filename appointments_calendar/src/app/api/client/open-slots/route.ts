import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CalendarSyncService } from "@/lib/calendar-sync";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("providerId");
    const serviceType = searchParams.get("serviceType");
    const daysAhead = parseInt(searchParams.get("daysAhead") || "14");

    if (!providerId) {
      return NextResponse.json({ error: "Provider ID required" }, { status: 400 });
    }

    // Calculate the booking date range
    const syncStartDate = new Date();
    const maxBookingDate = new Date();
    maxBookingDate.setDate(syncStartDate.getDate() + daysAhead);

    // Trigger calendar sync for this provider before fetching slots
    // This ensures we have the most up-to-date calendar data
    try {
      console.log(`🔄 Syncing calendar for provider ${providerId} for date range ${syncStartDate.toDateString()} to ${maxBookingDate.toDateString()}...`);
      
      // Get active calendar connections for this provider
      const connections = await prisma.calendarConnection.findMany({
        where: {
          providerId: providerId,
          isActive: true,
          syncEvents: true,
        }
      });

      // Use the optimized booking sync method with date range filtering
      const syncResult = await CalendarSyncService.syncForBookingLookup(providerId, {
        start: syncStartDate,
        end: maxBookingDate
      });
      const successfulSyncs = syncResult.synced || 0;

      console.log(`✅ Completed ${successfulSyncs}/${connections.length} calendar syncs for provider ${providerId}`);
    } catch (syncError) {
      // Don't fail the entire request if sync fails, just log it
      console.warn(`⚠️ Calendar sync failed for provider ${providerId}:`, syncError);
    }

    // Fetch provider details
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
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    // Calculate date range
    const now = new Date();
    const maxDate = new Date();
    maxDate.setDate(now.getDate() + Math.min(daysAhead, provider.advanceBookingDays || 30));

    // Fetch provider locations using the foreign key relationship
    const providerLocations = await prisma.providerLocation.findMany({
      where: {
        providerId: providerId,
        startDate: { lte: maxDate },
        endDate: { gte: now },
        isActive: true,
      },
      select: {
        id: true,
        city: true,
        stateProvince: true,
        country: true,
        description: true,
        startDate: true,
        endDate: true,
        isDefault: true,
      },
      orderBy: [
        { isDefault: 'desc' },
        { startDate: 'desc' }
      ]
    });

    console.log(`📍 Found ${providerLocations.length} locations for provider ${providerId}:`, 
      providerLocations.map(loc => ({
        id: loc.id,
        city: loc.city,
        state: loc.stateProvince,
        isDefault: loc.isDefault,
        startDate: loc.startDate,
        endDate: loc.endDate
      }))
    );

    // Helper function to find the appropriate location for a specific date
    const getLocationForDate = (appointmentDate: Date): string => {
      // First, try to find a date-specific location (non-default)
      const dateSpecificLocation = providerLocations.find(location => 
        !location.isDefault &&
        appointmentDate >= location.startDate &&
        appointmentDate <= location.endDate
      );

      if (dateSpecificLocation) {
        return formatLocationDisplay(dateSpecificLocation);
      }

      // Fall back to default location
      const defaultLocation = providerLocations.find(location => location.isDefault);
      if (defaultLocation) {
        return formatLocationDisplay(defaultLocation);
      }

      // Final fallback
      return "Contact provider for location details";
    };

    // Helper function to format location display string
    const formatLocationDisplay = (location: {
      city: string;
      stateProvince: string;
      country: string;
      description: string | null;
    }): string => {
      const locationParts = [];
      
      if (location.city) locationParts.push(location.city);
      if (location.stateProvince) locationParts.push(location.stateProvince);
      if (location.country) locationParts.push(location.country);
      
      let locationString = locationParts.join(', ');
      
      if (location.description) {
        locationString += ` - ${location.description}`;
      }
      
      return locationString || "Contact provider for location details";
    };

    // Fetch existing calendar events to find busy times
    const existingEvents = await prisma.calendarEvent.findMany({
      where: {
        providerId,
        startTime: {
          gte: now,
          lte: maxDate,
        },
      },
      select: {
        startTime: true,
        endTime: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    // Fetch existing bookings to find busy times
    const existingBookings = await prisma.booking.findMany({
      where: {
        providerId,
        scheduledAt: {
          gte: now,
          lte: maxDate,
        },
        status: {
          notIn: ['CANCELLED', 'NO_SHOW']
        }
      },
      select: {
        scheduledAt: true,
        duration: true,
      },
    });

    // Helper function to check if a time slot conflicts with existing events/bookings
    const isTimeSlotBusy = (startTime: Date, endTime: Date): boolean => {
      // Check against calendar events
      for (const event of existingEvents) {
        if (startTime < event.endTime && endTime > event.startTime) {
          return true; // Overlaps with existing event
        }
      }

      // Check against existing bookings
      for (const booking of existingBookings) {
        const bookingEnd = new Date(booking.scheduledAt.getTime() + booking.duration * 60000);
        if (startTime < bookingEnd && endTime > booking.scheduledAt) {
          return true; // Overlaps with existing booking
        }
      }

      return false;
    };

    // Generate available time slots
    const slots = [];
    const slotDuration = provider.defaultBookingDuration;
    const bufferTime = provider.bufferTime;

    // Business hours (could be made configurable per provider)
    const businessHours = {
      start: 9, // 9 AM
      end: 17,  // 5 PM
    };

    // Generate slots for each day in the range
    for (let date = new Date(now); date <= maxDate; date.setDate(date.getDate() + 1)) {
      // Skip weekends (could be made configurable)
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      // Generate slots for this day
      for (let hour = businessHours.start; hour < businessHours.end; hour++) {
        for (let minute = 0; minute < 60; minute += slotDuration + bufferTime) {
          const slotStart = new Date(date);
          slotStart.setHours(hour, minute, 0, 0);
          
          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);

          // Skip if slot is in the past
          if (slotStart <= now) continue;

          // Skip if slot end would go beyond business hours
          if (slotEnd.getHours() > businessHours.end) break;

          // Skip if this time slot is busy
          if (isTimeSlotBusy(slotStart, slotEnd)) continue;

          // This is an available slot!
          const locationDisplay = getLocationForDate(slotStart);
          
          slots.push({
            id: `slot-${slotStart.getTime()}`,
            eventId: `auto-${slotStart.getTime()}`,
            startTime: slotStart.toISOString(),
            endTime: slotEnd.toISOString(),
            duration: slotDuration,
            provider: {
              id: provider.id,
              name: provider.name,
            },
            location: {
              display: locationDisplay,
            },
            availableServices: ['consultation', 'maintenance', 'emergency', 'follow-up'],
            eventTitle: 'Available Appointment',
            slotsRemaining: 1,
            type: 'automatic',
          });

          console.log(`🎯 Generated slot for ${slotStart.toISOString()} with location: ${locationDisplay}`);
        }
      }
    }

    // Filter by service type if specified
    const filteredSlots = serviceType 
      ? slots.filter(slot => slot.availableServices.includes(serviceType))
      : slots;

    console.log(`📅 Generated ${slots.length} total slots, ${filteredSlots.length} after filtering for service type: ${serviceType || 'any'}`);

    return NextResponse.json({
      success: true,
      providerId,
      provider: {
        id: provider.id,
        name: provider.name,
      },
      totalSlots: filteredSlots.length,
      slots: filteredSlots,
    });

  } catch (error) {
    console.error("Open slots API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
