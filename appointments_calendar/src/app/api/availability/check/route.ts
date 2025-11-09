// API endpoint for checking availability of a specific time slot
import { NextRequest, NextResponse } from 'next/server';
import { AdvancedAvailabilityService } from '@/lib/advanced-availability-service';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { providerId, date, startTime, duration } = await request.json();

    if (!providerId || !date || !startTime || !duration) {
      return NextResponse.json(
        { error: 'Provider ID, date, start time, and duration are required' },
        { status: 400 }
      );
    }

    const parsedDate = new Date(date);
    const parsedDuration = parseInt(duration);

    if (isNaN(parsedDate.getTime()) || isNaN(parsedDuration)) {
      return NextResponse.json(
        { error: 'Invalid date or duration format' },
        { status: 400 }
      );
    }

    // Fetch provider's default availability template
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      select: {
        availabilityTemplates: {
          where: { isDefault: true, isActive: true },
          select: { id: true },
          take: 1
        }
      }
    });

    const templateId = provider?.availabilityTemplates[0]?.id;
    if (!templateId) {
      return NextResponse.json({ error: 'No default availability template found for provider' }, { status: 404 });
    }

    // Use AdvancedAvailabilityService to get effective slots
    const { timeSlots } = await AdvancedAvailabilityService.getEffectiveAvailabilityForDate(templateId, parsedDate);

    // Check if any slot matches the requested start time and duration
    const requestedStartMinutes = parseInt(startTime.split(':')[0], 10) * 60 + parseInt(startTime.split(':')[1], 10);
    const isAvailable = timeSlots.some((slot: { startTime: string; endTime: string; isEnabled: boolean; dayOfWeek: number }) => {
      const slotStartMinutes = parseInt(slot.startTime.split(':')[0], 10) * 60 + parseInt(slot.startTime.split(':')[1], 10);
      const slotEndMinutes = parseInt(slot.endTime.split(':')[0], 10) * 60 + parseInt(slot.endTime.split(':')[1], 10);
      return slot.isEnabled &&
        slotStartMinutes <= requestedStartMinutes &&
        slotEndMinutes - requestedStartMinutes >= parsedDuration;
    });
    
    return NextResponse.json({ 
      isAvailable,
      providerId,
      date,
      startTime,
      duration: parsedDuration
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    return NextResponse.json(
      { error: 'Failed to check availability' },
      { status: 500 }
    );
  }
}