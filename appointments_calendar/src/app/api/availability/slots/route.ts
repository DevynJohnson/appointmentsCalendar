// API endpoint for getting available time slots for booking
import { NextRequest, NextResponse } from 'next/server';
import { AdvancedAvailabilityService } from '@/lib/advanced-availability-service';


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('providerId');
    const date = searchParams.get('date');
    const duration = searchParams.get('duration');

    if (!providerId || !date || !duration) {
      return NextResponse.json(
        { error: 'Provider ID, date, and duration are required' },
        { status: 400 }
      );
    }

    const parsedDate = new Date(date);
    const parsedDuration = parseInt(duration);


    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // If duration is not a number (e.g. 'Select a duration'), return empty slots instead of error
    if (isNaN(parsedDuration)) {
      return NextResponse.json({ availableSlots: [] });
    }

    if (parsedDate < new Date()) {
      return NextResponse.json(
        { availableSlots: [] }
      );
    }


    // Use AdvancedAvailabilityService to get effective slots for provider and date
  const { timeSlots } = await AdvancedAvailabilityService.getEffectiveAvailabilityForDate(providerId, parsedDate);

    // Filter time slots for requested duration
    const availableSlots = timeSlots
      .filter((slot: { startTime: string; endTime: string; isEnabled: boolean; dayOfWeek: number }) => {
        // Check if slot is enabled and long enough for the requested duration
        const startMinutes = parseInt(slot.startTime.split(':')[0], 10) * 60 + parseInt(slot.startTime.split(':')[1], 10);
        const endMinutes = parseInt(slot.endTime.split(':')[0], 10) * 60 + parseInt(slot.endTime.split(':')[1], 10);
        return slot.isEnabled && (endMinutes - startMinutes) >= parsedDuration;
      })
      .map((slot: { startTime: string; endTime: string; isEnabled: boolean; dayOfWeek: number }) => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        dayOfWeek: slot.dayOfWeek
      }));
    
    return NextResponse.json({ 
      availableSlots,
      date: date,
      duration: parsedDuration,
      providerId 
    });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available slots' },
      { status: 500 }
    );
  }
}