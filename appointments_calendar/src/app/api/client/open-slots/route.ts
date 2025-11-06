import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CalendarSyncService } from "@/lib/calendar-sync";
import { AvailabilityService } from "@/lib/availability-service";
import { fromZonedTime } from 'date-fns-tz';

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

    // Fetch provider details including timezone from default template
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      select: {
        id: true,
        name: true,
        defaultBookingDuration: true,
        bufferTime: true,
        advanceBookingDays: true,
        allowedDurations: true,
        availabilityTemplates: {
          where: { isDefault: true, isActive: true },
          select: { timezone: true },
          take: 1
        }
      },
    });

    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    // Get the provider's timezone (fallback to Eastern if no template)
    const providerTimezone = provider.availabilityTemplates[0]?.timezone || 'America/New_York';

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

    // Generate available time slots using the optimized availability system
    const allowedDurations = provider.allowedDurations || [15, 30, 45, 60, 90];
    
    // Use the optimized method to get all slots at once
    const slotsData = await AvailabilityService.getAvailableSlotsOptimized(
      providerId,
      now,
      maxDate,
      allowedDurations
    );

    // Convert the optimized results to the expected slot format
    const slots = [];
    for (const slotData of slotsData) {
      const { date, duration, timeSlots } = slotData;
      
      for (const timeSlot of timeSlots) {
        // Create the slot time in the provider's timezone, then convert to UTC
        const dateStr = date.toISOString().split('T')[0]; // Get YYYY-MM-DD
        const slotStartLocal = new Date(`${dateStr}T${timeSlot}:00`);
        const slotStart = fromZonedTime(slotStartLocal, providerTimezone);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + duration);

        // Skip if slot is in the past (additional safety check)
        if (slotStart <= now) continue;

        const locationDisplay = getLocationForDate(slotStart);
        
        slots.push({
          id: `slot-${slotStart.getTime()}-${duration}`,
          eventId: `auto-${slotStart.getTime()}-${duration}`,
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
          duration: duration,
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

        console.log(`🎯 Generated ${duration}min slot for ${slotStart.toISOString()} with location: ${locationDisplay}`);
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
