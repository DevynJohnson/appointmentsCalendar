// Automatic availability service - generates slots during free time
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AvailabilityService {
  /**
   * Generate automatic availability slots for a provider
   * Creates slots during free time between existing calendar events
   */
  static async generateAutomaticSlots(
    providerId: string, 
    startDate: Date, 
    endDate: Date,
    options: {
      businessHours?: {
        start: string; // "09:00"
        end: string;   // "17:00"
      };
      workingDays?: number[]; // [1,2,3,4,5] = Mon-Fri
      slotDuration?: number;  // minutes
      bufferTime?: number;    // minutes between slots
      includeWeekends?: boolean;
    } = {}
  ) {
    // Default settings
    const {
      businessHours = { start: "09:00", end: "17:00" },
      workingDays = [1, 2, 3, 4, 5], // Mon-Fri
      slotDuration = 60,
      bufferTime = 15,
      includeWeekends = false
    } = options;

    // Get provider settings
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      select: {
        defaultBookingDuration: true,
        bufferTime: true,
        advanceBookingDays: true,
      }
    });

    if (!provider) {
      throw new Error('Provider not found');
    }

    // Use provider settings as defaults
    const actualSlotDuration = slotDuration || provider.defaultBookingDuration;
    const actualBufferTime = bufferTime || provider.bufferTime;

    // Get all existing calendar events (busy times)
    const busyEvents = await prisma.calendarEvent.findMany({
      where: {
        providerId,
        startTime: { gte: startDate },
        endTime: { lte: endDate },
      },
      select: {
        startTime: true,
        endTime: true,
        title: true,
      },
      orderBy: { startTime: 'asc' }
    });

    // Get existing bookings that might not be in calendar events
    const existingBookings = await prisma.booking.findMany({
      where: {
        providerId,
        scheduledAt: { gte: startDate },
        status: { in: ['CONFIRMED', 'PENDING'] },
      },
      select: {
        scheduledAt: true,
        duration: true,
      }
    });

    // Combine busy times
    const busyPeriods = [
      ...busyEvents.map(event => ({
        start: new Date(event.startTime),
        end: new Date(event.endTime),
        type: 'calendar_event' as const,
        title: event.title,
      })),
      ...existingBookings.map(booking => ({
        start: new Date(booking.scheduledAt),
        end: new Date(booking.scheduledAt.getTime() + (booking.duration * 60 * 1000)),
        type: 'booking' as const,
        title: 'Existing Booking',
      }))
    ].sort((a, b) => a.start.getTime() - b.start.getTime());

    const availableSlots = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      
      // Skip weekends if not included
      if (!includeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
        currentDate.setDate(currentDate.getDate() + 1);
        currentDate.setHours(0, 0, 0, 0);
        continue;
      }

      // Skip if not a working day
      if (!workingDays.includes(dayOfWeek)) {
        currentDate.setDate(currentDate.getDate() + 1);
        currentDate.setHours(0, 0, 0, 0);
        continue;
      }

      // Create business hours for this day
      const [startHour, startMin] = businessHours.start.split(':').map(Number);
      const [endHour, endMin] = businessHours.end.split(':').map(Number);
      
      const dayStart = new Date(currentDate);
      dayStart.setHours(startHour, startMin, 0, 0);
      
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(endHour, endMin, 0, 0);

      // Get busy periods for this day
      const dayBusyPeriods = busyPeriods.filter(period => 
        period.start.toDateString() === currentDate.toDateString() ||
        period.end.toDateString() === currentDate.toDateString() ||
        (period.start < dayStart && period.end > dayStart)
      );

      // Generate slots for this day
      let slotStart = new Date(dayStart);
      
      while (slotStart.getTime() + (actualSlotDuration * 60 * 1000) <= dayEnd.getTime()) {
        const slotEnd = new Date(slotStart.getTime() + (actualSlotDuration * 60 * 1000));
        
        // Check if this slot conflicts with any busy period
        const hasConflict = dayBusyPeriods.some(busyPeriod => {
          const busyStart = new Date(busyPeriod.start.getTime() - (actualBufferTime * 60 * 1000));
          const busyEnd = new Date(busyPeriod.end.getTime() + (actualBufferTime * 60 * 1000));
          
          return (
            (slotStart >= busyStart && slotStart < busyEnd) ||
            (slotEnd > busyStart && slotEnd <= busyEnd) ||
            (slotStart <= busyStart && slotEnd >= busyEnd)
          );
        });

        if (!hasConflict && slotStart >= new Date()) { // Only future slots
          availableSlots.push({
            id: `auto-${providerId}-${slotStart.getTime()}`,
            providerId,
            startTime: slotStart.toISOString(),
            endTime: slotEnd.toISOString(),
            duration: actualSlotDuration,
            type: 'automatic' as const,
            isAvailable: true,
          });
        }

        // Move to next slot (with buffer time)
        slotStart = new Date(slotStart.getTime() + ((actualSlotDuration + actualBufferTime) * 60 * 1000));
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(0, 0, 0, 0);
    }

    return availableSlots;
  }

  /**
   * Get provider's business hour settings
   */
  static async getProviderBusinessHours() {
    // For now, return default business hours
    // In the future, this could be stored in the database per provider
    return {
      businessHours: { start: "09:00", end: "17:00" },
      workingDays: [1, 2, 3, 4, 5], // Mon-Fri
      includeWeekends: false,
      timezone: 'America/New_York',
    };
  }

  /**
   * Check if a specific time slot is available
   */
  static async isSlotAvailable(
    providerId: string,
    startTime: Date,
    duration: number
  ): Promise<boolean> {
    const endTime = new Date(startTime.getTime() + (duration * 60 * 1000));

    // Check against calendar events
    const conflictingEvents = await prisma.calendarEvent.count({
      where: {
        providerId,
        OR: [
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } }
            ]
          },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } }
            ]
          },
          {
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } }
            ]
          }
        ]
      }
    });

    // Check against existing bookings
    const conflictingBookings = await prisma.booking.count({
      where: {
        providerId,
        status: { in: ['CONFIRMED', 'PENDING'] },
        OR: [
          {
            AND: [
              { scheduledAt: { lte: startTime } },
              { 
                scheduledAt: { 
                  gte: new Date(startTime.getTime() - 60 * 60 * 1000) // Rough check
                }
              }
            ]
          }
        ]
      }
    });

    return conflictingEvents === 0 && conflictingBookings === 0;
  }
}
