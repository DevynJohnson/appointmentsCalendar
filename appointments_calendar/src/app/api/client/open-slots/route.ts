import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CalendarSyncService } from "@/lib/calendar-sync";
import { AvailabilityService } from "@/lib/availability-service";
import { AdvancedAvailabilityService } from "@/lib/advanced-availability-service";
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
        availabilityTemplates: {
          where: { isDefault: true, isActive: true },
          select: { id: true },
          take: 1
        }
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
        addressLine1: true,
        addressLine2: true,
        timezone: true,
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
        addressLine1: loc.addressLine1,
        addressLine2: loc.addressLine2,
        city: loc.city,
        state: loc.stateProvince,
        timezone: loc.timezone,
        isDefault: loc.isDefault,
        startDate: loc.startDate,
        endDate: loc.endDate
      }))
    );

    // Helper function to get the timezone for a specific date
    const getTimezoneForDate = (appointmentDate: Date): string => {
      // First, try to find a date-specific location (non-default)
      const dateSpecificLocation = providerLocations.find(location => 
        !location.isDefault &&
        appointmentDate >= location.startDate &&
        appointmentDate <= location.endDate
      );

      if (dateSpecificLocation?.timezone) {
        return dateSpecificLocation.timezone;
      }

      // Fall back to default location timezone
      const defaultLocation = providerLocations.find(location => location.isDefault);
      return defaultLocation?.timezone || 'America/New_York';
    };

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
      addressLine1: string | null;
      addressLine2: string | null;
      city: string;
      stateProvince: string;
      country: string;
      timezone: string | null;
      description: string | null;
    }): string => {
      const locationParts = [];
      if (location.addressLine1) locationParts.push(location.addressLine1);
      if (location.addressLine2) locationParts.push(location.addressLine2);
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

    console.log(`🔧 CURRENT TIME: ${now.toISOString()} (UTC)`);
    
    // Convert the optimized results to the expected slot format
    const slots = [];
    for (const slotData of slotsData) {
      const { date, duration, timeSlots } = slotData;
      
      // Get the timezone for this specific date
      const providerTimezone = getTimezoneForDate(date);
      
      // Check for advanced availability schedules that might override or modify these slots
      const templateId = provider.availabilityTemplates?.[0]?.id;
      const advancedAvailability = templateId
        ? await AdvancedAvailabilityService.getEffectiveAvailabilityForDate(templateId, date)
        : { timeSlots: [], appliedSchedules: [] };
      
      // Generate final time slots (either from advanced schedules or templates)
let finalTimeSlots: string[];

if (advancedAvailability.appliedSchedules.length > 0) {
  // Generate time slots from advanced schedule time windows
  const timeWindows = AdvancedAvailabilityService.getTimeWindowsForDay(
    advancedAvailability.timeSlots,
    date.getDay()
  );
  
  console.log(`🔧 Advanced schedule time windows for ${date.toISOString()}:`, timeWindows);
  
  // Generate 15-minute interval slots within each time window
  finalTimeSlots = [];
  for (const window of timeWindows) {
    const [startHours, startMinutes] = window.start.split(':').map(Number);
    const [endHours, endMinutes] = window.end.split(':').map(Number);
    
    const windowStart = startHours * 60 + startMinutes;
    const windowEnd = endHours * 60 + endMinutes;
    
    // Generate slots in 15-minute intervals that can fit the duration
    for (let minutes = windowStart; minutes + duration <= windowEnd; minutes += 15) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const timeSlot = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      finalTimeSlots.push(timeSlot);
    }
  }
  
  console.log(`🔧 Generated ${finalTimeSlots.length} slots from advanced schedule for ${duration}min duration`);
} else {
  finalTimeSlots = timeSlots;
}
      
      for (const timeSlot of finalTimeSlots) {
        // Create the slot time in the provider's timezone, then convert to UTC
        const [hours, minutes] = timeSlot.split(':').map(Number);
        
        // Create a date string that represents the local time in the provider's timezone
        const year = date.getFullYear();
        const month = date.getMonth(); 
        const day = date.getDate();
        
        // Create a LOCAL date representing the time in the provider's timezone
        const localDateTime = new Date(year, month, day, hours, minutes, 0, 0);
        
        // Convert from provider's timezone to UTC
        const slotStart = fromZonedTime(localDateTime, providerTimezone);
        
        console.log('[SLOT DEBUG]', {
          localTime: timeSlot,
          providerTimezone,
          slotDate: date.toISOString(),
          localDateTime: localDateTime.toISOString(),
          slotStartUTC: slotStart.toISOString(),
        });
        
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + duration);

        // Skip if slot is in the past
        // Add a small buffer (15 minutes) to prevent booking slots that are too soon
        const currentTimeWithBuffer = new Date(now.getTime() + (15 * 60 * 1000));
        if (slotStart <= currentTimeWithBuffer) {
          console.log(`🔧 SKIP PAST: ${timeSlot} → ${slotStart.toISOString()} is before ${currentTimeWithBuffer.toISOString()}`);
          continue;
        }

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

    console.log(`📅 Generated ${slots.length} total slots using availability templates and advanced schedules, ${filteredSlots.length} after filtering for service type: ${serviceType || 'any'}`);

    // Get the default timezone for the response
    const defaultLocation = providerLocations.find(loc => loc.isDefault);
    const defaultTimezone = defaultLocation?.timezone || 'America/New_York';

    return NextResponse.json({
      success: true,
      providerId,
      provider: {
        id: provider.id,
        name: provider.name,
        timezone: defaultTimezone,
      },
      totalSlots: filteredSlots.length,
      slots: filteredSlots,
      // Add information about the availability system being used
      availabilitySystem: {
        usingTemplates: true,
        usingAdvancedSchedules: true,
        allowedDurations: provider.allowedDurations || [15, 30, 45, 60, 90],
      }
    });

  } catch (error) {
    console.error("Open slots API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}