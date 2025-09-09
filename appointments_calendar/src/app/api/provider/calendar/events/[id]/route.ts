// API endpoint to manage individual calendar events
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { ProviderAuthService } from '@/lib/provider-auth';

const prisma = new PrismaClient();

// Update event settings
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const provider = await ProviderAuthService.verifyToken(token || '');
    
    if (!provider) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { allowBookings, maxBookings } = await request.json();

    // Verify the event belongs to the provider
    const event = await prisma.calendarEvent.findFirst({
      where: {
        id: id,
        providerId: provider.id,
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const updatedEvent = await prisma.calendarEvent.update({
      where: { id: id },
      data: {
        allowBookings: allowBookings !== undefined ? allowBookings : event.allowBookings,
        maxBookings: maxBookings !== undefined ? maxBookings : event.maxBookings,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updatedEvent);

  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get event details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const provider = await ProviderAuthService.verifyToken(token || '');
    
    if (!provider) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const event = await prisma.calendarEvent.findFirst({
      where: {
        id: id,
        providerId: provider.id,
      },
      include: {
        bookings: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            scheduledAt: true,
            customer: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json(event);

  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
