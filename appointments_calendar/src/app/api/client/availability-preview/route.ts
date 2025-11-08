import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AvailabilityService } from "@/lib/availability-service";
import { AdvancedAvailabilityService } from "@/lib/advanced-availability-service";

/**
 * Preview API - Shows available days and duration counts without generating full slots
 * Much faster than full slot generation
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("providerId");
    const daysAhead = parseInt(searchParams.get("daysAhead") || "14");

    if (!providerId) {
      return NextResponse.json({ error: "Provider ID required" }, { status: 400 });
    }

    // Fetch provider details
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      select: {
        id: true,
        name: true,
        allowedDurations: true,
        advanceBookingDays: true,
        availabilityTemplates: {
          where: { isActive: true, isDefault: true },
          select: {
            timezone: true,
          },
          take: 1,
        },
        locations: {
          where: { isActive: true },
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
            { startDate: 'asc' },
          ],
        },
      },
    });

    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    // Calculate date range
    const now = new Date();
    const maxDate = new Date();
    maxDate.setDate(now.getDate() + Math.min(daysAhead, provider.advanceBookingDays || 30));

    const allowedDurations = provider.allowedDurations || [15, 30, 45, 60, 90];

    // Get availability preview - check which days have any availability
    // This uses both traditional templates and advanced scheduling
    const availabilityPreview = await AvailabilityService.getAvailabilityPreview(
      providerId,
      now,
      maxDate,
      allowedDurations
    );

    // Enhance availability preview by checking for advanced schedules
    // This ensures the preview accurately reflects the actual scheduling system
    const enhancedAvailability = await Promise.all(
      availabilityPreview.map(async (day) => {
        const dayDate = new Date(day.date);
        const advancedAvailability = await AdvancedAvailabilityService.getEffectiveAvailabilityForDate(
          providerId,
          dayDate
        );
        
        // If advanced schedules exist for this date, they take precedence
        if (advancedAvailability.appliedSchedules.length > 0) {
          // Check if advanced schedules actually provide availability for any of the allowed durations
          const advancedTimeSlots = (advancedAvailability.timeSlots as Array<{ startTime: string }>)
            .map(slot => slot.startTime)
            .filter((time: string, index: number, arr: string[]) => arr.indexOf(time) === index); // Remove duplicates
          
          // Return enhanced day info showing advanced scheduling is active
          return {
            ...day,
            hasAvailability: advancedTimeSlots.length > 0,
            availableDurations: advancedTimeSlots.length > 0 ? allowedDurations : [],
            usingAdvancedSchedules: true,
            schedulesApplied: advancedAvailability.appliedSchedules.length
          };
        }
        
        // No advanced schedules, use template availability as-is
        return {
          ...day,
          usingAdvancedSchedules: false,
          schedulesApplied: 0
        };
      })
    );

    // Helper function to get location for a specific date
    const getLocationForDate = (date: string) => {
      const targetDate = new Date(date);
      
      // Find location that covers this date
      const applicableLocation = provider.locations.find(location => {
        const startDate = new Date(location.startDate);
        const endDate = new Date(location.endDate);
        return targetDate >= startDate && targetDate <= endDate;
      });
      
      // If no specific location found, use default location
      if (!applicableLocation) {
        const defaultLocation = provider.locations.find(loc => loc.isDefault);
        return defaultLocation ? {
          city: defaultLocation.city,
          stateProvince: defaultLocation.stateProvince,
          country: defaultLocation.country,
          description: defaultLocation.description,
        } : null;
      }
      
      return {
        city: applicableLocation.city,
        stateProvince: applicableLocation.stateProvince,
        country: applicableLocation.country,
        description: applicableLocation.description,
      };
    };

    // Add location information to each availability day
    const availabilityWithLocation = enhancedAvailability.map(day => ({
      ...day,
      location: getLocationForDate(day.date),
    }));

    return NextResponse.json({
      success: true,
      provider: {
        id: provider.id,
        name: provider.name,
        timezone: provider.availabilityTemplates[0]?.timezone || 'America/New_York',
      },
      allowedDurations,
      availability: availabilityWithLocation,
      message: "Preview data - enhanced with advanced scheduling support",
      availabilitySystem: {
        usingTemplates: true,
        usingAdvancedSchedules: true,
        totalDaysWithAdvancedSchedules: availabilityWithLocation.filter(day => day.usingAdvancedSchedules).length
      }
    });

  } catch (error) {
    console.error("Availability preview API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}