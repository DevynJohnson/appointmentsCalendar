// Updated open-slots endpoint that uses the new availability system
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CalendarSyncService } from "@/lib/calendar-sync";
import { AvailabilityService } from "@/lib/availability-service";

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
    try {
      console.log(`🔄 Syncing calendar for provider ${providerId} for date range ${syncStartDate.toDateString()} to ${maxBookingDate.toDateString()}...`);
      
      const connections = await prisma.calendarConnection.findMany({
        where: {
          providerId: providerId,
          isActive: true,
          syncEvents: true,
        }
      });

      const syncResult = await CalendarSyncService.syncForBookingLookup(providerId, {
        start: syncStartDate,
        end: maxBookingDate
      });
      const successfulSyncs = syncResult.synced || 0;

      console.log(`✅ Completed ${successfulSyncs}/${connections.length} calendar syncs for provider ${providerId}`);
    } catch (syncError) {
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
        allowedDurations: true,
      },
    });

    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    // Calculate date range
    const now = new Date();
    const maxDate = new Date();
    maxDate.setDate(now.getDate() + Math.min(daysAhead, provider.advanceBookingDays || 30));

    // Fetch provider locations
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

    // Helper function to find the appropriate location for a specific date
    const getLocationForDate = (appointmentDate: Date): string => {
      const dateSpecificLocation = providerLocations.find(location => 
        !location.isDefault &&
        appointmentDate >= location.startDate &&
        appointmentDate <= location.endDate
      );

      if (dateSpecificLocation) {
        return formatLocationDisplay(dateSpecificLocation);
      }

      const defaultLocation = providerLocations.find(location => location.isDefault);
      if (defaultLocation) {
        return formatLocationDisplay(defaultLocation);
      }

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

    // *** NEW: Use AvailabilityService instead of hardcoded business hours ***
    const slots = [];
    const slotDuration = provider.defaultBookingDuration;

    // Generate slots for each day in the range using the new availability system
    for (let date = new Date(now); date <= maxDate; date.setDate(date.getDate() + 1)) {
      // Use the new availability service to get available time slots for this date
      const availableTimeSlots = await AvailabilityService.getAvailableSlots(
        providerId,
        new Date(date), // Create new date object to avoid mutation
        slotDuration
      );

      // Convert time slots to the expected slot format
      for (const timeSlot of availableTimeSlots) {
        const slotStart = new Date(date);
        const [hours, minutes] = timeSlot.split(':').map(Number);
        slotStart.setHours(hours, minutes, 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);

        // Skip if slot is in the past (additional safety check)
        if (slotStart <= now) continue;

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

    // Filter by service type if specified
    const filteredSlots = serviceType 
      ? slots.filter(slot => slot.availableServices.includes(serviceType))
      : slots;

    console.log(`📅 Generated ${slots.length} total slots using availability templates, ${filteredSlots.length} after filtering for service type: ${serviceType || 'any'}`);

    return NextResponse.json({
      success: true,
      providerId,
      provider: {
        id: provider.id,
        name: provider.name,
      },
      totalSlots: filteredSlots.length,
      slots: filteredSlots,
      // Add information about the availability system being used
      availabilitySystem: {
        usingTemplates: true,
        allowedDurations: provider.allowedDurations || [15, 30, 45, 60, 90],
      }
    });

  } catch (error) {
    console.error("Open slots API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}