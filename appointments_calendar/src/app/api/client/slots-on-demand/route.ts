import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AvailabilityService } from "@/lib/availability-service";

/**
 * On-demand slot generation API
 * Generates specific slots only when user selects a date and duration
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("providerId");
    const date = searchParams.get("date");
    const duration = searchParams.get("duration");

    if (!providerId || !date || !duration) {
      return NextResponse.json({ 
        error: "Provider ID, date, and duration are required" 
      }, { status: 400 });
    }

    // Parse date in local timezone to avoid UTC midnight conversion issues
    const targetDate = new Date(date + 'T00:00:00');
    const slotDuration = parseInt(duration);

    // Validate date is not in the past
    const now = new Date();
    if (targetDate < now) {
      return NextResponse.json({ 
        error: "Cannot book appointments in the past" 
      }, { status: 400 });
    }

    // Fetch provider details
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      select: {
        id: true,
        name: true,
        allowedDurations: true,
        advanceBookingDays: true,
      },
    });

    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    // Validate duration is allowed
    const allowedDurations = provider.allowedDurations || [15, 30, 45, 60, 90];
    if (!allowedDurations.includes(slotDuration)) {
      return NextResponse.json({ 
        error: "Duration not allowed for this provider" 
      }, { status: 400 });
    }

    console.log('Slots on-demand request:', { providerId, date, duration: slotDuration });

    // Generate slots for this specific date and duration
    const availableTimeSlots = await AvailabilityService.getAvailableSlots(
      providerId,
      targetDate,
      slotDuration
    );

    console.log('Available time slots from service:', availableTimeSlots);

    // Get provider locations for location display
    const providerLocations = await prisma.providerLocation.findMany({
      where: {
        providerId: providerId,
        startDate: { lte: targetDate },
        endDate: { gte: targetDate },
        isActive: true,
      },
      select: {
        id: true,
        city: true,
        stateProvince: true,
        country: true,
        description: true,
        isDefault: true,
      },
      orderBy: [
        { isDefault: 'desc' },
        { startDate: 'desc' }
      ]
    });

    // Helper function to get location display
    const getLocationDisplay = (): string => {
      const defaultLocation = providerLocations.find(location => location.isDefault);
      if (defaultLocation) {
        const locationParts = [];
        if (defaultLocation.city) locationParts.push(defaultLocation.city);
        if (defaultLocation.stateProvince) locationParts.push(defaultLocation.stateProvince);
        if (defaultLocation.country) locationParts.push(defaultLocation.country);
        
        let locationString = locationParts.join(', ');
        if (defaultLocation.description) {
          locationString += ` - ${defaultLocation.description}`;
        }
        return locationString || "Contact provider for location details";
      }
      return "Contact provider for location details";
    };

    // Convert to slot format
    const slots = availableTimeSlots.map(timeSlot => {
      const slotStart = new Date(targetDate);
      const [hours, minutes] = timeSlot.split(':').map(Number);
      slotStart.setHours(hours, minutes, 0, 0);
      
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);

      return {
        id: `slot-${slotStart.getTime()}-${slotDuration}`,
        eventId: `auto-${slotStart.getTime()}-${slotDuration}`,
        startTime: slotStart.toISOString(),
        endTime: slotEnd.toISOString(),
        duration: slotDuration,
        provider: {
          id: provider.id,
          name: provider.name,
        },
        location: {
          display: getLocationDisplay(),
        },
        availableServices: ['consultation', 'maintenance', 'emergency', 'follow-up'],
        eventTitle: 'Available Appointment',
        slotsRemaining: 1,
        type: 'automatic',
      };
    });

    console.log('Generated slots:', slots);

    return NextResponse.json({
      success: true,
      date: date,
      duration: slotDuration,
      provider: {
        id: provider.id,
        name: provider.name,
      },
      slots,
      totalSlots: slots.length
    });

  } catch (error) {
    console.error("On-demand slots API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}