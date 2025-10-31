// API endpoint for getting available time slots for booking
import { NextRequest, NextResponse } from 'next/server';
import { AvailabilityService } from '@/lib/availability-service';

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

    if (isNaN(parsedDate.getTime()) || isNaN(parsedDuration)) {
      return NextResponse.json(
        { error: 'Invalid date or duration format' },
        { status: 400 }
      );
    }

    if (parsedDate < new Date()) {
      return NextResponse.json(
        { availableSlots: [] }
      );
    }

    const availableSlots = await AvailabilityService.getAvailableSlots(
      providerId,
      parsedDate,
      parsedDuration
    );
    
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