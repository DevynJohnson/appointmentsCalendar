import { NextRequest, NextResponse } from 'next/server';
import { ProviderAuthService } from '@/lib/provider-auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const provider = await ProviderAuthService.verifyToken(token);
    if (!provider) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the location belongs to the provider
    const location = await prisma.providerLocation.findFirst({
      where: {
        id: id,
        providerId: provider.id
      }
    });

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    // Get all schedules for this location
    const schedules = await prisma.locationSchedule.findMany({
      where: {
        locationId: id
      },
      orderBy: {
        startDate: 'asc'
      }
    });

    return NextResponse.json({ schedules });

  } catch (error) {
    console.error('Error fetching location schedules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedules' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const provider = await ProviderAuthService.verifyToken(token);
    if (!provider) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the location belongs to the provider
    const location = await prisma.providerLocation.findFirst({
      where: {
        id: id,
        providerId: provider.id
      }
    });

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    const {
      startDate,
      endDate,
      isRecurring,
      recurrenceType,
      recurrenceInterval,
      daysOfWeek,
      weekOfMonth,
      monthOfYear,
      recurrenceEndDate,
      occurrenceCount
    } = await request.json();

    // Validate required fields
    if (!startDate) {
      return NextResponse.json(
        { error: 'Start date is required' },
        { status: 400 }
      );
    }

    // Validate dates
    const start = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      if (start >= end) {
        return NextResponse.json(
          { error: 'Start date must be before end date' },
          { status: 400 }
        );
      }
    }

    // Create the schedule
    const schedule = await prisma.locationSchedule.create({
      data: {
        locationId: id,
        startDate: start,
        endDate: endDate ? new Date(endDate) : null,
        isRecurring: Boolean(isRecurring),
        recurrenceType: isRecurring ? recurrenceType : null,
        recurrenceInterval: isRecurring ? recurrenceInterval : null,
        daysOfWeek: daysOfWeek || [],
        weekOfMonth,
        monthOfYear,
        recurrenceEndDate: recurrenceEndDate ? new Date(recurrenceEndDate) : null,
        occurrenceCount
      }
    });

    return NextResponse.json({ schedule }, { status: 201 });

  } catch (error) {
    console.error('Error creating location schedule:', error);
    return NextResponse.json(
      { error: 'Failed to create schedule' },
      { status: 500 }
    );
  }
}