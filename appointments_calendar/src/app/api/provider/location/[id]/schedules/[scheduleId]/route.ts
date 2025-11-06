import { NextRequest, NextResponse } from 'next/server';
import { ProviderAuthService } from '@/lib/provider-auth';
import { prisma } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scheduleId: string }> }
) {
  try {
    const { id, scheduleId } = await params;
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

    // Verify the schedule exists and belongs to this location
    const existingSchedule = await prisma.locationSchedule.findFirst({
      where: {
        id: scheduleId,
        locationId: id
      }
    });

    if (!existingSchedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
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
      occurrenceCount,
      isActive
    } = await request.json();

    // Validate dates if provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start >= end) {
        return NextResponse.json(
          { error: 'Start date must be before end date' },
          { status: 400 }
        );
      }
    }

    // Update the schedule
    const schedule = await prisma.locationSchedule.update({
      where: {
        id: scheduleId
      },
      data: {
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(isRecurring !== undefined && { isRecurring: Boolean(isRecurring) }),
        ...(recurrenceType !== undefined && { recurrenceType: isRecurring ? recurrenceType : null }),
        ...(recurrenceInterval !== undefined && { recurrenceInterval: isRecurring ? recurrenceInterval : null }),
        ...(daysOfWeek !== undefined && { daysOfWeek: daysOfWeek || [] }),
        ...(weekOfMonth !== undefined && { weekOfMonth }),
        ...(monthOfYear !== undefined && { monthOfYear }),
        ...(recurrenceEndDate !== undefined && { recurrenceEndDate: recurrenceEndDate ? new Date(recurrenceEndDate) : null }),
        ...(occurrenceCount !== undefined && { occurrenceCount }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) })
      }
    });

    return NextResponse.json({ schedule });

  } catch (error) {
    console.error('Error updating location schedule:', error);
    return NextResponse.json(
      { error: 'Failed to update schedule' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scheduleId: string }> }
) {
  try {
    const { id, scheduleId } = await params;
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

    // Verify the schedule exists and belongs to this location
    const existingSchedule = await prisma.locationSchedule.findFirst({
      where: {
        id: scheduleId,
        locationId: id
      }
    });

    if (!existingSchedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Delete the schedule
    await prisma.locationSchedule.delete({
      where: {
        id: scheduleId
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting location schedule:', error);
    return NextResponse.json(
      { error: 'Failed to delete schedule' },
      { status: 500 }
    );
  }
}