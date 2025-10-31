// API endpoint for checking availability of a specific time slot
import { NextRequest, NextResponse } from 'next/server';
import { AvailabilityService } from '@/lib/availability-service';

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

    const isAvailable = await AvailabilityService.isAvailable(
      providerId,
      parsedDate,
      startTime,
      parsedDuration
    );
    
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